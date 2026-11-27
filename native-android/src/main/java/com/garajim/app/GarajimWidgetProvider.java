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
    static final int TYPE_CONTROL = 0, TYPE_GARAGE = 1, TYPE_MAINTENANCE = 2, TYPE_FUEL = 3, TYPE_ACHIEVEMENT = 4;

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

    /** Accepts both legacy vehicle arrays and the richer widget payload. */
    static void sync(Context context, String json) {
        if (context == null || json == null) return;
        try {
            SharedPreferences.Editor edit = prefs(context).edit();
            JSONArray list = null;
            JSONObject payload = null;
            String trimmed = json.trim();
            if (trimmed.startsWith("[")) list = new JSONArray(trimmed);
            else {
                payload = new JSONObject(trimmed);
                list = payload.optJSONArray("vehicles");
            }
            if (list != null) edit.putString("vehicles_json", list.toString()).putInt("count", list.length());
            if (payload != null && payload.has("achievements")) {
                JSONObject achievements = payload.optJSONObject("achievements");
                if (achievements != null) edit.putString("achievement_json", achievements.toString());
            }
            edit.apply();
            refresh(context);
        } catch (Exception ignored) { }
    }

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

    static void updateTyped(Context context, AppWidgetManager manager, int id, int type) {
        if (type == TYPE_CONTROL) { updateOne(context, manager, id); return; }
        if (type == TYPE_GARAGE) { updateGarageCard(context, manager, id); return; }
        if (type == TYPE_MAINTENANCE) { updateMaintenance(context, manager, id); return; }
        if (type == TYPE_FUEL) { updateFuel(context, manager, id); return; }
        if (type == TYPE_ACHIEVEMENT) { updateAchievements(context, manager, id); return; }
    }

    private static JSONObject selectedVehicle(SharedPreferences p, JSONArray all) {
        return all.length() > 0 ? all.optJSONObject(selectedIndex(p, all)) : null;
    }

    private static String vehicleName(JSONObject v) {
        if (v == null) return "Garajın hazır";
        String name = v.optString("name", "Aracınız");
        return name.isEmpty() ? "Aracınız" : name;
    }

    private static String vehiclePlate(JSONObject v) {
        if (v == null) return "İlk aracını ekle";
        String plate = v.optString("plate", "");
        return plate.isEmpty() ? "Plaka eklenmedi" : plate;
    }

    private static String vehicleKm(JSONObject v) {
        if (v == null) return "— km";
        String km = v.optString("km", "");
        try { return km.isEmpty() ? "— km" : fmt((long) Double.parseDouble(km)) + " km"; }
        catch (Exception ignored) { return km + " km"; }
    }

    private static PendingIntent switchIntent(Context context) {
        Intent sw = new Intent(context, GarajimWidgetProvider.class).setAction(ACTION_SWITCH);
        return PendingIntent.getBroadcast(context, 7420, sw,
                PendingIntent.FLAG_UPDATE_CURRENT | (android.os.Build.VERSION.SDK_INT >= 23 ? PendingIntent.FLAG_IMMUTABLE : 0));
    }

    private static void setVehicleSwitch(Context context, RemoteViews views, int viewId, JSONArray all) {
        if (all.length() > 1) {
            views.setViewVisibility(viewId, View.VISIBLE);
            views.setTextViewText(viewId, "⇄ " + (selectedIndex(prefs(context), all) + 1) + "/" + all.length());
            views.setOnClickPendingIntent(viewId, switchIntent(context));
        } else views.setViewVisibility(viewId, View.GONE);
    }

    private static void attachOpen(Context context, RemoteViews views, String vehicleId) {
        PendingIntent open = actionIntent(context, "open", 7402, vehicleId);
        if (open != null) views.setOnClickPendingIntent(R.id.widget_root, open);
    }

    private static void updateGarageCard(Context context, AppWidgetManager manager, int id) {
        SharedPreferences p = prefs(context); JSONArray all = vehicles(p); JSONObject v = selectedVehicle(p, all);
        String vid = v == null ? "" : v.optString("id", "");
        RemoteViews views = new RemoteViews(context.getPackageName(), R.layout.widget_garage_card);
        views.setTextViewText(R.id.widget_card_name, vehicleName(v));
        StringBuilder vehicleLines = new StringBuilder();
        for (int i=0; i<Math.min(3, all.length()); i++) {
            JSONObject item = all.optJSONObject(i);
            if (item == null) continue;
            String itemPlate = item.optString("plate", "Araç");
            String itemName = item.optString("name", "");
            String itemKm = item.optString("km", item.optString("mileage", ""));
            try { if (!itemKm.isEmpty()) itemKm = fmt((long) Double.parseDouble(itemKm)); } catch (Exception ignored) { }
            if (vehicleLines.length() > 0) vehicleLines.append("\n");
            vehicleLines.append("• ").append(itemPlate);
            if (!itemName.isEmpty()) vehicleLines.append(" · ").append(itemName);
            if (!itemKm.isEmpty()) vehicleLines.append("  —  ").append(itemKm).append(" km");
        }
        if (all.length() > 3) vehicleLines.append("\n+ ").append(all.length()-3).append(" araç daha");
        views.setTextViewText(R.id.widget_card_list, vehicleLines.length() == 0 ? "İlk aracını ekle" : vehicleLines.toString());
        views.setTextViewText(R.id.widget_card_km, vehicleKm(v));
        views.setTextViewText(R.id.widget_card_total, all.length() + " ARAÇ");
        String cons = v == null ? "" : v.optString("cons", "");
        int fuelCount = v == null ? 0 : v.optInt("fuelCount", 0);
        views.setTextViewText(R.id.widget_card_fuel, !cons.isEmpty() ? cons + " L/100" : fuelCount > 0 ? fuelCount + " yakıt kaydı" : "Yakıt kaydı ekle");
        JSONObject svc = v == null ? null : v.optJSONObject("svc");
        if (svc == null) views.setTextViewText(R.id.widget_card_service, "Bakım planını takip et");
        else {
            int rem = svc.optInt("remaining", 0); String state = svc.optString("state", "ok");
            views.setTextViewText(R.id.widget_card_service, rem <= 0 ? "Bakım zamanı · " + fmt(Math.abs((long)rem)) + " km geçti" : "Bakıma " + fmt(rem) + " km kaldı");
            views.setTextColor(R.id.widget_card_service, Color.parseColor("bad".equals(state) ? "#F17870" : "warn".equals(state) ? "#F6C35B" : "#7FE0B1"));
        }
        setVehicleSwitch(context, views, R.id.widget_card_switch, all);
        attachOpen(context, views, vid);
        manager.updateAppWidget(id, views);
    }

    private static void updateMaintenance(Context context, AppWidgetManager manager, int id) {
        SharedPreferences p = prefs(context); JSONArray all = vehicles(p); JSONObject v = selectedVehicle(p, all);
        String vid = v == null ? "" : v.optString("id", "");
        RemoteViews views = new RemoteViews(context.getPackageName(), R.layout.widget_maintenance);
        views.setTextViewText(R.id.widget_maintenance_vehicle, v == null ? "Garajım" : vehiclePlate(v) + " · " + vehicleName(v));
        JSONObject svc = v == null ? null : v.optJSONObject("svc");
        if (svc == null) {
            views.setTextViewText(R.id.widget_maintenance_title, "Bu araç için bakım kilometresi ekle");
            views.setTextViewText(R.id.widget_maintenance_value, "Plan bekleniyor");
            views.setTextViewText(R.id.widget_maintenance_detail, "Uygulamada araç detayından bakım planı oluştur.");
            views.setProgressBar(R.id.widget_maintenance_progress, 100, 0, false);
        } else {
            int rem = svc.optInt("remaining", 0), pct = Math.max(0, Math.min(100, svc.optInt("percent", 0)));
            String state = svc.optString("state", "ok");
            views.setTextViewText(R.id.widget_maintenance_title, "Periyodik bakım · " + vehicleKm(v));
            views.setTextViewText(R.id.widget_maintenance_value, rem <= 0 ? fmt(Math.abs((long)rem)) + " km geçti" : fmt(rem) + " km kaldı");
            views.setTextColor(R.id.widget_maintenance_value, Color.parseColor("bad".equals(state) ? "#F17870" : "warn".equals(state) ? "#F6C35B" : "#7FE0B1"));
            views.setProgressBar(R.id.widget_maintenance_progress, 100, pct, false);
            views.setTextViewText(R.id.widget_maintenance_detail, "Bakım uyarılarını görmek için Garajım'ı aç.");
        }
        attachOpen(context, views, vid);
        manager.updateAppWidget(id, views);
    }

    private static void updateFuel(Context context, AppWidgetManager manager, int id) {
        SharedPreferences p = prefs(context); JSONArray all = vehicles(p); JSONObject v = selectedVehicle(p, all);
        String vid = v == null ? "" : v.optString("id", "");
        RemoteViews views = new RemoteViews(context.getPackageName(), R.layout.widget_fuel);
        views.setTextViewText(R.id.widget_fuel_vehicle, v == null ? "Garajım" : vehiclePlate(v));
        String cons = v == null ? "" : v.optString("cons", "");
        views.setTextViewText(R.id.widget_fuel_avg, cons.isEmpty() ? "—" : cons);
        views.setTextViewText(R.id.widget_fuel_km, vehicleKm(v));
        int fuelCount = v == null ? 0 : v.optInt("fuelCount", 0);
        views.setTextViewText(R.id.widget_fuel_count, fuelCount + " dolum kaydı");
        views.setTextViewText(R.id.widget_fuel_summary, fuelCount == 0 ? "İlk yakıt kaydını ekle" : "Tüketim ve kilometre takibin güncel");
        PendingIntent fuel = actionIntent(context, "fuel", 7411, vid);
        if (fuel != null) views.setOnClickPendingIntent(R.id.widget_fuel_summary, fuel);
        attachOpen(context, views, vid);
        manager.updateAppWidget(id, views);
    }

    private static void updateAchievements(Context context, AppWidgetManager manager, int id) {
        SharedPreferences p = prefs(context); JSONArray all = vehicles(p); JSONObject v = selectedVehicle(p, all);
        String vid = v == null ? "" : v.optString("id", "");
        RemoteViews views = new RemoteViews(context.getPackageName(), R.layout.widget_achievements);
        JSONObject a;
        try { a = new JSONObject(p.getString("achievement_json", "{}")); } catch (Exception ignored) { a = new JSONObject(); }
        int count = Math.max(0, a.optInt("count", 0)), total = Math.max(1, a.optInt("total", 53));
        String next = a.optString("nextName", count >= total ? "Koleksiyon tamamlandı" : "İlk aracını ekle");
        int current = Math.max(0, a.optInt("current", 0)), target = Math.max(1, a.optInt("target", 1));
        views.setTextViewText(R.id.widget_achievement_count, count + " / " + total + " kazanıldı");
        views.setTextViewText(R.id.widget_achievement_next, next);
        views.setProgressBar(R.id.widget_achievement_progress, target, Math.min(current, target), false);
        views.setTextViewText(R.id.widget_achievement_progress_text, current + " / " + target);
        attachOpen(context, views, vid);
        manager.updateAppWidget(id, views);
    }

    private static void refreshProvider(Context context, AppWidgetManager manager, Class<?> provider, int type) {
        int[] ids = manager.getAppWidgetIds(new ComponentName(context, provider));
        for (int id : ids) updateTyped(context, manager, id, type);
    }

    public static void refresh(Context context) {
        if (context == null) return;
        AppWidgetManager manager = AppWidgetManager.getInstance(context);
        refreshProvider(context, manager, GarajimWidgetProvider.class, TYPE_CONTROL);
        refreshProvider(context, manager, GarajimGarageCardWidgetProvider.class, TYPE_GARAGE);
        refreshProvider(context, manager, GarajimMaintenanceWidgetProvider.class, TYPE_MAINTENANCE);
        refreshProvider(context, manager, GarajimFuelWidgetProvider.class, TYPE_FUEL);
        refreshProvider(context, manager, GarajimAchievementWidgetProvider.class, TYPE_ACHIEVEMENT);
    }
}
