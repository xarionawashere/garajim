package com.garajim.app;

import android.Manifest;
import android.app.AlarmManager;
import android.app.PendingIntent;
import android.content.Context;
import android.app.Activity;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.os.Build;
import android.provider.Settings;
import android.speech.tts.TextToSpeech;
import android.media.AudioAttributes;
import android.webkit.JavascriptInterface;
import org.json.JSONArray;
import org.json.JSONObject;

public class GarajimNativeBridge {
    private final Context context;
    private final Activity activity;
    private TextToSpeech navigationTts;
    private boolean navigationTtsReady;
    private String pendingNavigationSpeech = "";
    public GarajimNativeBridge(Activity activity) { this.activity = activity; this.context = activity.getApplicationContext(); }

    @JavascriptInterface
    public void speakNavigation(String text) {
        final String message = text == null ? "" : text.trim();
        if (message.isEmpty()) return;
        activity.runOnUiThread(() -> {
            pendingNavigationSpeech = message.length() > 240 ? message.substring(0, 240) : message;
            if (navigationTtsReady && navigationTts != null) {
                navigationTts.speak(pendingNavigationSpeech, TextToSpeech.QUEUE_FLUSH, null, "garajim-navigation");
                pendingNavigationSpeech = "";
                return;
            }
            if (navigationTts != null) return;
            navigationTts = new TextToSpeech(context, status -> {
                if (status != TextToSpeech.SUCCESS || navigationTts == null) return;
                try {
                    navigationTts.setAudioAttributes(new AudioAttributes.Builder()
                            .setUsage(AudioAttributes.USAGE_ASSISTANCE_NAVIGATION_GUIDANCE)
                            .setContentType(AudioAttributes.CONTENT_TYPE_SPEECH).build());
                    int language = navigationTts.setLanguage(new java.util.Locale("tr", "TR"));
                    if (language == TextToSpeech.LANG_MISSING_DATA || language == TextToSpeech.LANG_NOT_SUPPORTED) {
                        navigationTts.setLanguage(java.util.Locale.getDefault());
                    }
                    navigationTts.setSpeechRate(1.0f);
                    navigationTtsReady = true;
                    if (!pendingNavigationSpeech.isEmpty()) {
                        navigationTts.speak(pendingNavigationSpeech, TextToSpeech.QUEUE_FLUSH, null, "garajim-navigation");
                        pendingNavigationSpeech = "";
                    }
                } catch (Exception ignored) { }
            });
        });
    }

    @JavascriptInterface
    public void stopNavigationSpeech() {
        activity.runOnUiThread(() -> {
            pendingNavigationSpeech = "";
            try { if (navigationTts != null) navigationTts.stop(); } catch (Exception ignored) { }
        });
    }

    /** Tüm araçların özeti (JSON dizisi: id, name, plate, km, cons, svc). Widget seçili aracı gösterir. */
    @JavascriptInterface
    public void syncWidget(String json) {
        try {
            JSONArray vehicles = new JSONArray(json == null ? "[]" : json);
            context.getSharedPreferences("garajim_widget", Context.MODE_PRIVATE).edit()
                .putString("vehicles_json", vehicles.toString()).putInt("count", vehicles.length()).apply();
            GarajimWidgetProvider.refresh(context);
        } catch (Exception ignored) { }
    }

    /** Uygulamadan "widget'ta bu aracı göster". */
    @JavascriptInterface
    public void setWidgetVehicle(String id) {
        context.getSharedPreferences("garajim_widget", Context.MODE_PRIVATE).edit().putString("sel_id", id == null ? "" : id).apply();
        GarajimWidgetProvider.refresh(context);
    }

    @JavascriptInterface
    public void scheduleDailyReminder() {
        GarajimReminderReceiver.schedule(context);
        context.getSharedPreferences("garajim_widget", Context.MODE_PRIVATE).edit().putBoolean("reminders", true).apply();
    }

    /** Uygulamadan gelen yaklaşan/geciken kalemler (JSON dizisi: ["34ABC123: Muayene...", ...]) */
    @JavascriptInterface
    public void setReminders(String json) {
        try {
            JSONArray arr = new JSONArray(json == null ? "[]" : json);
            JSONArray safe = new JSONArray();
            for (int i = 0; i < arr.length() && i < 20; i++) safe.put(arr.getString(i));
            context.getSharedPreferences("garajim_widget", Context.MODE_PRIVATE).edit()
                .putString("reminder_lines", safe.toString()).apply();
            GarajimWidgetProvider.refresh(context);
        } catch (Exception ignored) { }
    }

    /** Widget düğmesinden gelen eylemi bir kez döndürür ("" = yok). */
    @JavascriptInterface
    public String consumeAction() {
        String a = MainActivity.pendingAction, v = MainActivity.pendingVehicle;
        MainActivity.pendingAction = null;
        MainActivity.pendingVehicle = null;
        if (a == null) {
            android.content.SharedPreferences q = context.getSharedPreferences(MainActivity.WEAR_QUEUE_PREFS, Context.MODE_PRIVATE);
            a = q.getString("action", null);
            v = q.getString("vehicle", null);
            q.edit().remove("action").remove("vehicle").apply();
        }
        if (a == null) {
            String wearCommand = MainActivity.consumeWearCommand(context);
            if (wearCommand != null && !wearCommand.isEmpty()) return wearCommand;
            return "";
        }
        return (v == null || v.isEmpty()) ? a : a + "|" + v;
    }

    @JavascriptInterface
    public void requestNotifications() {
        if (Build.VERSION.SDK_INT >= 33 && activity.checkSelfPermission(Manifest.permission.POST_NOTIFICATIONS) != PackageManager.PERMISSION_GRANTED) {
            activity.runOnUiThread(() -> activity.requestPermissions(new String[]{Manifest.permission.POST_NOTIFICATIONS}, 7405));
        }
        scheduleDailyReminder();
    }

    @JavascriptInterface
    public boolean notificationsAllowed() {
        return Build.VERSION.SDK_INT < 33 || context.checkSelfPermission(Manifest.permission.POST_NOTIFICATIONS) == PackageManager.PERMISSION_GRANTED;
    }

    /** Sürüş arka plana geçince silinemeyen bildirim + foreground service. */
    @JavascriptInterface
    public void startRideNotification(String title, String text) {
        try {
            if (Build.VERSION.SDK_INT >= 33 && activity.checkSelfPermission(Manifest.permission.POST_NOTIFICATIONS) != PackageManager.PERMISSION_GRANTED) {
                activity.runOnUiThread(() -> activity.requestPermissions(new String[]{Manifest.permission.POST_NOTIFICATIONS}, 7405));
            }
            final String t = (title == null || title.isEmpty()) ? "Garajım · Açık Dünya" : title;
            final String m = (text == null || text.isEmpty()) ? "Sürüş arka planda devam ediyor…" : text;
            activity.runOnUiThread(() -> GarajimRideService.start(context, t, m));
        } catch (Exception ignored) { }
    }

    /** Uygulamaya dönünce veya sürüş bitince bildirimi kapat. */
    @JavascriptInterface
    public void stopRideNotification() {
        try {
            activity.runOnUiThread(() -> GarajimRideService.stop(context));
        } catch (Exception ignored) { }
    }

    // ---------- Müzik (Spotify dahil) ----------
    @JavascriptInterface
    public String mediaState() {
        try { return GarajimMedia.state(context); } catch (Exception e) { return "{\"access\":false,\"session\":false}"; }
    }

    @JavascriptInterface
    public String mediaArt() {
        try { return GarajimMedia.art(context); } catch (Exception e) { return ""; }
    }

    @JavascriptInterface
    public void mediaCmd(String cmd) {
        try { GarajimMedia.command(context, cmd == null ? "toggle" : cmd); } catch (Exception ignored) { }
    }

    /** Ayarlar > Bildirim erişimi ekranını açar (şarkı bilgisini okuyabilmek için). */
    @JavascriptInterface
    public void mediaOpenAccess() {
        try {
            Intent i = new Intent(Settings.ACTION_NOTIFICATION_LISTENER_SETTINGS);
            i.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
            context.startActivity(i);
        } catch (Exception ignored) { }
    }

    /** Çalan oturumun (yoksa Spotify'ın) uygulamasını açar. */
    @JavascriptInterface
    public void mediaOpenApp() {
        try {
            android.media.session.MediaController mc = GarajimMedia.hasAccess(context) ? GarajimMedia.active(context) : null;
            String pkg = mc != null ? mc.getPackageName() : GarajimMedia.SPOTIFY;
            Intent i = context.getPackageManager().getLaunchIntentForPackage(pkg);
            if (i == null) i = context.getPackageManager().getLaunchIntentForPackage(GarajimMedia.SPOTIFY);
            if (i != null) { i.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK); context.startActivity(i); }
        } catch (Exception ignored) { }
    }

    /** Saat uygulamasına araç listesini gönder (JSON dizisi: id, plate, name, brand, model). */
    @JavascriptInterface
    public void pushWearVehicles(String json) {
        try {
            GarajimRideService.setVehicles(context, json);
            GarajimWearSync.pushVehicles(context, json);
        } catch (Exception ignored) { }
    }

    /** JS sürüş seçimini native SharedPreferences'a kaydet; saatten soğuk başlatma bunu kullanır. */
    @JavascriptInterface
    public void setRideVehicle(String vehicleId) {
        try { GarajimRideService.setSelectedVehicle(context, vehicleId); } catch (Exception ignored) { }
    }

    /** WebView'deki sürüş durumunun dayanıklı kopyası; Activity kapanırsa servis buradan devralabilir. */
    @JavascriptInterface
    public void syncRideSnapshot(String json) {
        try { GarajimRideService.syncWebSnapshot(context, json); } catch (Exception ignored) { }
    }

    /** Active phone turn-by-turn navigation sent to the watch route card. */
    @JavascriptInterface
    public void syncWearNavigation(String json) {
        try { GarajimRideService.syncWearNavigation(context, json); } catch (Exception ignored) { }
    }

    /** Native sürüş aktifken JS'nin eski durumla saatin güncel durumunu ezmesini engeller. */
    @JavascriptInterface
    public boolean isNativeRideManaged() {
        try { return GarajimRideService.isNativeRideManaged(context); } catch (Exception ignored) { return false; }
    }

    @JavascriptInterface
    public String getNativeRideState() {
        try { return GarajimRideService.getNativeStateJson(context); } catch (Exception ignored) { return "{}"; }
    }

    /** Saatten kaydedilen native sürüş özetleri telefondaki yerel geçmişe güvenli aktarım için bekler. */
    @JavascriptInterface
    public String getNativeRideHandoffs() {
        try { return GarajimRideService.getHandoffsJson(context); } catch (Exception ignored) { return "[]"; }
    }

    @JavascriptInterface
    public void ackNativeRideHandoffs(String idsJson) {
        try { GarajimRideService.ackHandoffs(context, idsJson); } catch (Exception ignored) { }
    }

    /** Saat uygulamasına sürüş durumu gönder (JSON). Native servis sürüşün sahibiyse JS yayını bastırılır. */
    /** Tema seçildiğinde telefonun aktif paketini saate anında gönderir. */
    @JavascriptInterface
    public void pushWearTheme(String pack, String mode) {
        try { GarajimWearSync.pushTheme(context, pack, mode); } catch (Exception ignored) { }
    }

    /** Changes the phone app's launcher icon to the selected design. */
    @JavascriptInterface
    public void setLauncherLogo(String logoId) {
        try { LauncherIconManager.apply(context, logoId); } catch (Exception ignored) { }
    }

    /** Seçilen uygulama logosunu aktif tema ile birlikte Wear OS'a eşitler. */
    @JavascriptInterface
    public void pushWearBranding(String pack, String mode, String logoId) {
        try { GarajimWearSync.pushTheme(context, pack, mode, logoId); } catch (Exception ignored) { }
    }

    @JavascriptInterface
    public void pushWearState(String json) {
        try {
            if (GarajimRideService.isNativeRideManaged(context)) return;
            JSONObject state = new JSONObject(json == null ? "{}" : json);
            String vehicleId = state.optString("vehicleId", "");
            if (!vehicleId.isEmpty()) GarajimRideService.setSelectedVehicle(context, vehicleId);
            GarajimWearSync.pushState(context, json);
        } catch (Exception ignored) { }
    }

    @JavascriptInterface
    public void wearCmd(String cmd) {
        try { GarajimWearSync.sendCmdToWatch(context, cmd == null ? "" : cmd); } catch (Exception ignored) { }
    }

    @JavascriptInterface
    public void pushWearAlert(String kind, String msg) {
        try { GarajimWearSync.pushAlert(context, kind, msg); } catch (Exception ignored) { }
    }

    /** Yeni kazanılan rozetleri yalnızca o anda bağlı saata yollar; geriye dönük/eski kutlama kuyruğu oluşturmaz. */
    @JavascriptInterface
    public void pushWearAchievements(String json) {
        try { GarajimWearSync.pushAchievements(context, json); }
        catch (Exception ignored) { }
    }

    /** DNA kutlaması yalnızca o anda bağlı saata iletilir; bağlantı yoksa bekletilmez. */
    @JavascriptInterface
    public void pushWearDnaCelebration(String msg) {
        try { GarajimWearSync.pushAlertLive(context, "dna", msg == null ? "🎉 Yeni sürüş DNA'sı kazandın" : msg); }
        catch (Exception ignored) { }
    }

    @JavascriptInterface
    public void pushWearLink(boolean online, String detail) {
        try { GarajimWearSync.pushLink(context, online, detail); } catch (Exception ignored) { }
    }

    @JavascriptInterface
    public void openWearSettings() {
        try {
            activity.runOnUiThread(() -> {
                String[] packages = { "com.google.android.wearable.app", "com.samsung.android.app.watchmanager" };
                for (String packageName : packages) {
                    android.content.Intent launch = context.getPackageManager().getLaunchIntentForPackage(packageName);
                    if (launch != null) {
                        launch.addFlags(android.content.Intent.FLAG_ACTIVITY_NEW_TASK);
                        context.startActivity(launch);
                        return;
                    }
                }
                android.content.Intent settings = new android.content.Intent(android.provider.Settings.ACTION_BLUETOOTH_SETTINGS);
                settings.addFlags(android.content.Intent.FLAG_ACTIVITY_NEW_TASK);
                context.startActivity(settings);
            });
        } catch (Exception ignored) { }
    }

    @JavascriptInterface
    public String getWearStatus() {
        try { return GarajimWearSync.getStatusJson(context); } catch (Exception e) { return "{\"connected\":false}"; }
    }
}
