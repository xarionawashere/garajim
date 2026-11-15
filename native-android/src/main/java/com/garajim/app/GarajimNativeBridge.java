package com.garajim.app;

import android.Manifest;
import android.app.AlarmManager;
import android.app.PendingIntent;
import android.content.Context;
import android.app.Activity;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.os.Build;
import android.webkit.JavascriptInterface;
import org.json.JSONArray;
import org.json.JSONObject;

public class GarajimNativeBridge {
    private final Context context;
    private final Activity activity;
    public GarajimNativeBridge(Activity activity) { this.activity = activity; this.context = activity.getApplicationContext(); }

    @JavascriptInterface
    public void syncWidget(String json) {
        try {
            JSONArray vehicles = new JSONArray(json == null ? "[]" : json);
            JSONObject first = vehicles.length() > 0 ? vehicles.getJSONObject(0) : new JSONObject();
            String title = first.optString("name", first.optString("brand", "Aracınız"));
            String plate = first.optString("plate", "Araç ekleyin");
            String km = first.has("km") ? first.optString("km", "") : first.optString("mileage", "");
            try { if (!km.isEmpty()) km = String.format(java.util.Locale.forLanguageTag("tr-TR"), "%,d", (long) Double.parseDouble(km)); } catch (Exception ignoredFmt) { }
            context.getSharedPreferences("garajim_widget", Context.MODE_PRIVATE).edit()
                .putString("title", title).putString("plate", plate).putString("km", km)
                .putInt("count", vehicles.length()).apply();
            Intent update = new Intent(context, GarajimWidgetProvider.class).setAction(android.appwidget.AppWidgetManager.ACTION_APPWIDGET_UPDATE);
            int[] ids = android.appwidget.AppWidgetManager.getInstance(context).getAppWidgetIds(new android.content.ComponentName(context, GarajimWidgetProvider.class));
            update.putExtra(android.appwidget.AppWidgetManager.EXTRA_APPWIDGET_IDS, ids);
            context.sendBroadcast(update);
        } catch (Exception ignored) { }
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
        } catch (Exception ignored) { }
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
}
