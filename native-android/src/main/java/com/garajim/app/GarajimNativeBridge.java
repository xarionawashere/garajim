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
        if (a == null) return "";
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
}
