package com.garajim.app;

import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.os.Bundle;
import android.webkit.WebView;
import com.getcapacitor.BridgeActivity;
import org.json.JSONArray;
import org.json.JSONObject;
import java.lang.ref.WeakReference;

public class MainActivity extends BridgeActivity {
    /** Widget düğmesinden gelen, henüz uygulamaya (JS) iletilmemiş eylem. */
    static volatile String pendingAction = null;
    static volatile String pendingVehicle = null;
    private static volatile WeakReference<MainActivity> active = new WeakReference<>(null);
    static final String WEAR_QUEUE_PREFS = "garajim_wear_queue";
    private static final String WEAR_COMMANDS_KEY = "commands_json";
    private static final long WEAR_COMMAND_TTL_MS = 25_000L;
    private static final long WEAR_LOG_COMMAND_TTL_MS = 7L * 24 * 60 * 60 * 1000;
    private static final int WEAR_COMMAND_QUEUE_LIMIT = 16;

    /**
     * Saat komutlarını tek bir volatile alanda tutmak yerine kısa ömürlü FIFO kuyruğuna alır.
     * Kuyruk yalnızca çalışan WebView'e iletilebilen komutlar için kullanılır; sürüş başlat/bitir
     * komutları uygulama kapalıyken daha sonra kendiliğinden çalıştırılmak üzere saklanmaz.
     */
    static boolean dispatchWearCommand(Context context, String action, String vehicleId) {
        if (context == null || action == null) return false;

        // MediaSession/media-key routing is native, so it works even while the ride service owns GPS.
        String mediaCommand = null;
        if ("wear_music_next".equals(action)) mediaCommand = "next";
        else if ("wear_music_prev".equals(action)) mediaCommand = "prev";
        else if ("wear_music_playpause".equals(action)) mediaCommand = "toggle";
        if (mediaCommand != null) {
            GarajimMedia.command(context.getApplicationContext(), mediaCommand);
            return true;
        }

        MainActivity target = active.get();
        boolean canDeliver = target != null && !target.isFinishing()
                && target.getBridge() != null && target.getBridge().getWebView() != null;
        boolean quickLog = isWearQuickLogAction(action);

        // Fuel/KM forms belong to the WebView. Preserve the request if the phone UI is not open.
        if (quickLog) {
            if (canDeliver) {
                if (!enqueueWearCommand(context, action, vehicleId)) return false;
                target.runOnUiThread(target::notifyJs);
                return true;
            }
            if (!enqueueWearCommand(context, action, vehicleId)) return false;
            String queuedMessage = isWearLogSaveAction(action)
                    ? "Saat kaydı telefona alındı; Garajım açılınca araç kaydına işlenecek."
                    : "Kaydı tamamlamak için telefonda Garajım’ı aç; form sıraya alındı.";
            GarajimWearSync.pushAlertLive(context, "info", queuedMessage);
            return true;
        }

        // Ride control stays with the native service while it owns the background session.
        if (GarajimRideService.isNativeRideManaged(context)) {
            GarajimRideService.dispatchWatchCommand(context, action, vehicleId);
            return true;
        }
        if (canDeliver && enqueueWearCommand(context, action, vehicleId)) {
            target.runOnUiThread(target::notifyJs);
            return true;
        }

        // Activity/WebView yokken, daha önce görünür ekrandan başlatılmış foreground service komutları alır.
        if (GarajimRideService.isArmed(context)) {
            GarajimRideService.dispatchWatchCommand(context, action, vehicleId);
            return true;
        }

        if ("wear_select_vehicle".equals(action)) {
            context.getApplicationContext().getSharedPreferences(WEAR_QUEUE_PREFS, Context.MODE_PRIVATE).edit()
                    .putString("action", action)
                    .putString("vehicle", vehicleId == null ? "" : vehicleId)
                    .apply();
        }
        return false;
    }

    static boolean hasLiveBridge() {
        MainActivity target = active.get();
        return target != null && !target.isFinishing()
                && target.getBridge() != null && target.getBridge().getWebView() != null;
    }

    private static boolean isWearLogSaveAction(String action) {
        return "wear_fuel_save".equals(action) || "wear_km_save".equals(action);
    }

    private static boolean isWearQuickLogAction(String action) {
        return isWearLogSaveAction(action) || "wear_fuel_quick".equals(action) || "wear_km_quick".equals(action);
    }

    private static long wearCommandTtlMs(String action) {
        return isWearLogSaveAction(action) ? WEAR_LOG_COMMAND_TTL_MS : WEAR_COMMAND_TTL_MS;
    }

    private static synchronized boolean enqueueWearCommand(Context context, String action, String vehicleId) {
        if (context == null || action == null || action.trim().isEmpty()) return false;
        SharedPreferences prefs = context.getApplicationContext().getSharedPreferences(WEAR_QUEUE_PREFS, Context.MODE_PRIVATE);
        long now = System.currentTimeMillis();
        JSONArray cleaned = new JSONArray();
        try {
            JSONArray old = new JSONArray(prefs.getString(WEAR_COMMANDS_KEY, "[]"));
            for (int i = 0; i < old.length(); i++) {
                JSONObject item = old.optJSONObject(i);
                if (item == null) continue;
                long createdAt = item.optLong("createdAt", 0L);
                long ttl = wearCommandTtlMs(item.optString("action", ""));
                if (createdAt > 0 && now - createdAt <= ttl) cleaned.put(item);
            }
        } catch (Exception ignored) { }

        while (cleaned.length() >= WEAR_COMMAND_QUEUE_LIMIT) {
            int removable = -1;
            for (int i = 0; i < cleaned.length(); i++) {
                JSONObject queued = cleaned.optJSONObject(i);
                if (queued != null && !isWearLogSaveAction(queued.optString("action", ""))) { removable = i; break; }
            }
            if (removable < 0) return false; // Bekleyen yakıt/KM kayıtlarını sessizce silme.
            cleaned.remove(removable);
        }
        JSONObject next = new JSONObject();
        try {
            next.put("action", action.trim());
            next.put("vehicle", vehicleId == null ? "" : vehicleId);
            next.put("createdAt", now);
            cleaned.put(next);
            return prefs.edit().putString(WEAR_COMMANDS_KEY, cleaned.toString()).commit();
        } catch (Exception ignored) {
            return false;
        }
    }

    /** WebView'in tükettiği bir sonraki saat komutu; eski komutlar çalıştırılmadan atılır. */
    static synchronized String consumeWearCommand(Context context) {
        if (context == null) return "";
        SharedPreferences prefs = context.getApplicationContext().getSharedPreferences(WEAR_QUEUE_PREFS, Context.MODE_PRIVATE);
        long now = System.currentTimeMillis();
        try {
            JSONArray old = new JSONArray(prefs.getString(WEAR_COMMANDS_KEY, "[]"));
            JSONArray remaining = new JSONArray();
            String result = "";
            boolean consumed = false;
            for (int i = 0; i < old.length(); i++) {
                JSONObject item = old.optJSONObject(i);
                if (item == null) continue;
                long createdAt = item.optLong("createdAt", 0L);
                long ttl = wearCommandTtlMs(item.optString("action", ""));
                if (createdAt <= 0 || now - createdAt > ttl) continue;
                if (!consumed) {
                    String action = item.optString("action", "");
                    String vehicle = item.optString("vehicle", "");
                    if (!action.isEmpty()) {
                        result = vehicle.isEmpty() ? action : action + "|" + vehicle;
                        consumed = true;
                        continue;
                    }
                }
                remaining.put(item);
            }
            prefs.edit().putString(WEAR_COMMANDS_KEY, remaining.toString()).commit();
            return result;
        } catch (Exception ignored) {
            prefs.edit().remove(WEAR_COMMANDS_KEY).apply();
            return "";
        }
    }

    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        active = new WeakReference<>(this);
        capture(getIntent());
        attachNativeBridge();
        notifyJs();
        // Konum izni verilmişse servis Activity görünürken öne alınır; sonradan ekran kapansa da saatten komut alır.
        GarajimRideService.armIfPermitted(this);
    }

    @Override
    protected void onNewIntent(Intent intent) {
        super.onNewIntent(intent);
        setIntent(intent);
        capture(intent);
        notifyJs();
    }

    @Override
    public void onResume() {
        super.onResume();
        active = new WeakReference<>(this);
        attachNativeBridge();
        notifyJs();
        GarajimRideService.armIfPermitted(this);
    }

    @Override
    public void onDestroy() {
        MainActivity current = active.get();
        if (current == this) active = new WeakReference<>(null);
        if (isFinishing()) GarajimRideService.takeOverWebRide(getApplicationContext());
        super.onDestroy();
    }

    private void capture(Intent i) {
        if (i == null) return;
        String a = i.getStringExtra(GarajimWidgetProvider.EXTRA_ACTION);
        if (a == null) return;
        String vid = i.getStringExtra(GarajimWidgetProvider.EXTRA_VEHICLE);
        i.removeExtra(GarajimWidgetProvider.EXTRA_ACTION);
        i.removeExtra(GarajimWidgetProvider.EXTRA_VEHICLE);
        switch (a) {
            case "fuel": case "km": case "service": case "ride": case "park": case "alerts": case "open":
                pendingAction = a;
                pendingVehicle = vid;
                break;
            default: break;
        }
    }

    private void notifyJs() {
        try {
            if (getBridge() != null && getBridge().getWebView() != null) {
                WebView web = getBridge().getWebView();
                web.post(() -> {
                    try { web.evaluateJavascript("window.garajimCheckAction&&window.garajimCheckAction()", null); }
                    catch (Exception ignored) { }
                });
            }
        } catch (Exception ignored) { }
    }

    private void attachNativeBridge() {
        try {
            if (getBridge() != null && getBridge().getWebView() != null) {
                getBridge().getWebView().addJavascriptInterface(new GarajimNativeBridge(this), "GarajimNative");
            }
        } catch (Exception ignored) { }
    }
}
