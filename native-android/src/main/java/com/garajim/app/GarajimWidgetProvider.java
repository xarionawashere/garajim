package com.garajim.app;

import android.app.PendingIntent;
import android.appwidget.AppWidgetManager;
import android.appwidget.AppWidgetProvider;
import android.content.ComponentName;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.graphics.Color;
import android.view.View;
import android.widget.RemoteViews;
import org.json.JSONArray;
import org.json.JSONObject;
import java.util.Locale;

public class GarajimWidgetProvider extends AppWidgetProvider {
    static final String EXTRA_ACTION = "garajim_action";
    static final String EXTRA_VEHICLE = "garajim_vehicle";
    static final String ACTION_SWITCH = "com.garajim.app.WIDGET_SWITCH";

    @Override public void onReceive(Context context, Intent intent) {
        if (intent != null && ACTION_SWITCH.equals(intent.getAction())) {   // widget'tan araç değiştir
            switchVehicle(context);
            refresh(context);
            return;
        }
        super.onReceive(context, intent);
    }

    @Override public void onUpdate(Context context, AppWidgetManager manager, int[] ids) {
        for (int id : ids) updateOne(context, manager, id);
    }

    static SharedPreferences prefs(Context c) { return c.getSharedPreferences("garajim_widget", Context.MODE_PRIVATE); }

    static JSONArray vehicles(SharedPreferences p) {
        try { return new JSONArray(p.getString("vehicles_json", "[]")); } catch (Exception e) { return new JSONArray(); }
    }

    static int selectedIndex(SharedPreferences p, JSONArray a) {
        String id = p.getString("sel_id", "");
        for (int i = 0; i < a.length(); i++) {
            JSONObject o = a.optJSONObject(i);
            if (o != null && id.equals(o.optString("id"))) return i;
        }
        return 0;
    }

    static void switchVehicle(Context c) {
        SharedPreferences p = prefs(c);
        JSONArray a = vehicles(p);
        if (a.length() < 2) return;
        JSONObject next = a.optJSONObject((selectedIndex(p, a) + 1) % a.length());
        if (next != null) p.edit().putString("sel_id", next.optString("id")).apply();
    }

    /** Uygulamayı belirli bir eylem + araçla açan PendingIntent. */
    static PendingIntent actionIntent(Context context, String action, int requestCode, String vehicleId) {
        Intent launch = context.getPackageManager().getLaunchIntentForPackage(context.getPackageName());
        if (launch == null) return null;
        launch.putExtra(EXTRA_ACTION, action);
        if (vehicleId != null && !vehicleId.isEmpty()) launch.putExtra(EXTRA_VEHICLE, vehicleId);
        return PendingIntent.getActivity(context, requestCode, launch,
            PendingIntent.FLAG_UPDATE_CURRENT | (android.os.Build.VERSION.SDK_INT >= 23 ? PendingIntent.FLAG_IMMUTABLE : 0));
    }

    static String fmt(long n) { return String.format(Locale.forLanguageTag("tr-TR"), "%,d", n); }

    static void updateOne(Context context, AppWidgetManager manager, int id) {
        SharedPreferences p = prefs(context);
        RemoteViews views = new RemoteViews(context.getPackageName(), R.layout.garajim_widget);
        JSONArray all = vehicles(p);
        JSONObject v = all.length() > 0 ? all.optJSONObject(selectedIndex(p, all)) : null;
        String vid = v == null ? "" : v.optString("id", "");

        String title = v == null ? "Garajım" : v.optString("name", "Aracınız");
        String plate = v == null ? "Uygulamayı açıp araç ekleyin" : v.optString("plate", "Plaka girilmedi");
        String cons = v == null ? "" : v.optString("cons", "");
        String km = v == null ? "" : v.optString("km", "");
        try { if (!km.isEmpty()) km = fmt((long) Double.parseDouble(km)); } catch (Exception ignored) { }
        views.setTextViewText(R.id.widget_title, title);
        views.setTextViewText(R.id.widget_plate, cons.isEmpty() ? plate : plate + "  ·  " + cons + " L/100km");
        views.setTextViewText(R.id.widget_km, km.isEmpty() ? (all.length() > 0 ? all.length() + " araç" : "") : km + " km");

        // Birden çok araç varsa değiştirme tuşu
        if (all.length() > 1) {
            views.setViewVisibility(R.id.widget_switch, View.VISIBLE);
            views.setTextViewText(R.id.widget_switch, "⇄ " + (selectedIndex(p, all) + 1) + "/" + all.length());
            Intent sw = new Intent(context, GarajimWidgetProvider.class).setAction(ACTION_SWITCH);
            views.setOnClickPendingIntent(R.id.widget_switch, PendingIntent.getBroadcast(context, 7420, sw,
                PendingIntent.FLAG_UPDATE_CURRENT | (android.os.Build.VERSION.SDK_INT >= 23 ? PendingIntent.FLAG_IMMUTABLE : 0)));
        } else {
            views.setViewVisibility(R.id.widget_switch, View.GONE);
        }

        // Bir sonraki bakıma kalan km + ilerleme çubuğu
        views.setViewVisibility(R.id.widget_progress_ok, View.GONE);
        views.setViewVisibility(R.id.widget_progress_warn, View.GONE);
        views.setViewVisibility(R.id.widget_progress_bad, View.GONE);
        JSONObject svc = v == null ? null : v.optJSONObject("svc");
        if (svc != null) {
            int rem = svc.optInt("remaining", 0), pct = Math.max(0, Math.min(100, svc.optInt("percent", 0)));
            String st = svc.optString("state", "ok");
            String n = fmt(Math.abs((long) rem));
            views.setTextViewText(R.id.widget_service, rem <= 0 ? "🔧 Bakım " + n + " km geçti!" : "🔧 Bakıma " + n + " km kaldı");
            views.setTextColor(R.id.widget_service, Color.parseColor("bad".equals(st) ? "#F87171" : "warn".equals(st) ? "#FBBF24" : "#34D399"));
            views.setViewVisibility(R.id.widget_service, View.VISIBLE);
            int bar = "bad".equals(st) ? R.id.widget_progress_bad : "warn".equals(st) ? R.id.widget_progress_warn : R.id.widget_progress_ok;
            views.setProgressBar(bar, 100, pct, false);
            views.setViewVisibility(bar, View.VISIBLE);
        } else {
            views.setViewVisibility(R.id.widget_service, View.GONE);
        }

        // En acil uyarı (varsa) tek satırda; dokununca bildirim paneli açılır
        String alert = null;
        try {
            JSONArray a = new JSONArray(p.getString("reminder_lines", "[]"));
            if (a.length() > 0) alert = "⚠ " + a.getString(0) + (a.length() > 1 ? "  (+" + (a.length() - 1) + ")" : "");
        } catch (Exception ignored) { }
        if (alert != null) {
            views.setTextViewText(R.id.widget_alert, alert);
            views.setViewVisibility(R.id.widget_alert, View.VISIBLE);
            PendingIntent al = actionIntent(context, "alerts", 7410, vid);
            if (al != null) views.setOnClickPendingIntent(R.id.widget_alert, al);
        } else {
            views.setViewVisibility(R.id.widget_alert, View.GONE);
        }

        PendingIntent open = actionIntent(context, "open", 7402, vid);
        if (open != null) {
            views.setOnClickPendingIntent(R.id.widget_root, open);
            views.setOnClickPendingIntent(R.id.widget_title, open);
            views.setOnClickPendingIntent(R.id.widget_plate, open);
        }
        int[] btn = { R.id.widget_btn_fuel, R.id.widget_btn_km, R.id.widget_btn_service, R.id.widget_btn_ride, R.id.widget_btn_park };
        String[] act = { "fuel", "km", "service", "ride", "park" };
        for (int i = 0; i < btn.length; i++) {
            PendingIntent pi = actionIntent(context, act[i], 7411 + i, vid);
            if (pi != null) views.setOnClickPendingIntent(btn[i], pi);
        }
        manager.updateAppWidget(id, views);
    }

    public static void refresh(Context context) {
        AppWidgetManager manager = AppWidgetManager.getInstance(context);
        int[] ids = manager.getAppWidgetIds(new ComponentName(context, GarajimWidgetProvider.class));
        for (int id : ids) updateOne(context, manager, id);
    }
}
