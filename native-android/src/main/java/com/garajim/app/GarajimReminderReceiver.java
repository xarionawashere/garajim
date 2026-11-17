package com.garajim.app;

import android.Manifest;
import android.app.AlarmManager;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.content.pm.PackageManager;
import android.os.Build;
import androidx.core.app.NotificationCompat;
import org.json.JSONArray;
import org.json.JSONObject;
import java.text.SimpleDateFormat;
import java.util.Calendar;
import java.util.Date;
import java.util.Locale;

public class GarajimReminderReceiver extends BroadcastReceiver {
    static final int REQ = 7401;
    static final String CHANNEL = "garajim_daily_reminder";

    @Override public void onReceive(Context context, Intent intent) {
        try {
            SharedPreferences p = context.getSharedPreferences("garajim_widget", Context.MODE_PRIVATE);
            JSONArray lines = buildCurrentReminderLines(context, p);
            boolean allowed = Build.VERSION.SDK_INT < 33
                || context.checkSelfPermission(Manifest.permission.POST_NOTIFICATIONS) == PackageManager.PERMISSION_GRANTED;
            // Kayıtlı araç verisinden bu anın tarih/km uyarılarını yeniden hesapla.
            if (allowed && lines.length() > 0) notifyUser(context, lines);
        } catch (Exception ignored) {
        } finally {
            schedule(context);   // bir sonraki güne kur
        }
    }

    /**
     * Uygulama son açıldığından beri değişmiş olabilecek tarih hatırlatmalarını
     * ve son kaydedilmiş kilometreye göre bakım uyarısını tekrar hesaplar.
     * Eski sürümden gelen preference verileri için reminder_lines yedeği korunur.
     */
    private JSONArray buildCurrentReminderLines(Context context, SharedPreferences p) {
        String raw = p.getString("reminder_data", null);
        if (raw == null || raw.trim().isEmpty()) {
            try { return new JSONArray(p.getString("reminder_lines", "[]")); }
            catch (Exception e) { return new JSONArray(); }
        }
        try {
            JSONObject root = new JSONObject(raw);
            JSONArray vehicles = root.optJSONArray("vehicles");
            JSONArray lines = new JSONArray();
            if (vehicles == null) return lines;
            int remindDays = Math.max(0, Math.min(365, root.optInt("remindDays", 30)));
            String[] dateKeys = {"muayene", "trafikSigorta", "kasko", "kisLastigi", "yazLastigi", "dortMevsim"};
            String[] labels = {"Muayene", "Trafik Sigortası", "Kasko", "Kış Lastiği", "Yaz Lastiği", "4 Mevsim Lastik"};
            for (int i = 0; i < vehicles.length() && lines.length() < 20; i++) {
                JSONObject v = vehicles.optJSONObject(i);
                if (v == null) continue;
                String plate = v.optString("plate", "Araç");
                if (plate.trim().isEmpty()) plate = "Araç";

                double km = v.optDouble("km", 0d);
                double nextKm = v.optDouble("nextServiceKm", 0d);
                if (km > 0d && nextKm > 0d) {
                    double remaining = nextKm - km;
                    double interval = v.optDouble("interval", 15000d);
                    if (interval <= 0d) interval = 15000d;
                    double warnThreshold = Math.min(1200d, Math.max(600d, Math.round(interval * 0.12d)));
                    if (remaining <= 0d) {
                        lines.put(plate + ": Bakım KM’si geçti (" + formatKm(Math.abs(remaining)) + " gecikme)");
                    } else if (remaining <= warnThreshold) {
                        lines.put(plate + ": Bakım KM’si yaklaşıyor — " + formatKm(remaining) + " kaldı");
                    }
                }

                for (int j = 0; j < dateKeys.length && lines.length() < 20; j++) {
                    String value = v.optString(dateKeys[j], "");
                    if (value.trim().isEmpty()) continue;
                    Integer days = daysUntil(value);
                    if (days == null) continue;
                    String alert = null;
                    if (days < 0) alert = labels[j] + " süresi dolmuş";
                    else if (days == 0) alert = labels[j] + " bugün bitiyor";
                    else if (days <= remindDays) alert = labels[j] + " " + days + " gün";
                    if (alert != null) lines.put(plate + ": " + alert);
                }
            }
            p.edit().putString("reminder_lines", lines.toString()).apply();
            GarajimWidgetProvider.refresh(context);
            return lines;
        } catch (Exception e) {
            try { return new JSONArray(p.getString("reminder_lines", "[]")); }
            catch (Exception ignored) { return new JSONArray(); }
        }
    }

    private static Integer daysUntil(String value) {
        try {
            SimpleDateFormat format = new SimpleDateFormat("yyyy-MM-dd", Locale.US);
            format.setLenient(false);
            Date due = format.parse(value);
            if (due == null) return null;
            Calendar target = Calendar.getInstance();
            target.setTime(due);
            target.set(Calendar.HOUR_OF_DAY, 0); target.set(Calendar.MINUTE, 0);
            target.set(Calendar.SECOND, 0); target.set(Calendar.MILLISECOND, 0);
            Calendar today = Calendar.getInstance();
            today.set(Calendar.HOUR_OF_DAY, 0); today.set(Calendar.MINUTE, 0);
            today.set(Calendar.SECOND, 0); today.set(Calendar.MILLISECOND, 0);
            return (int) Math.round((target.getTimeInMillis() - today.getTimeInMillis()) / 86400000.0d);
        } catch (Exception e) { return null; }
    }

    private static String formatKm(double value) {
        return String.format(Locale.forLanguageTag("tr-TR"), "%,d km", Math.round(value));
    }

    private void notifyUser(Context context, JSONArray lines) throws Exception {
        NotificationManager nm = (NotificationManager) context.getSystemService(Context.NOTIFICATION_SERVICE);
        if (nm == null) return;
        if (Build.VERSION.SDK_INT >= 26) {
            nm.createNotificationChannel(new NotificationChannel(CHANNEL, "Garajım bakım hatırlatmaları", NotificationManager.IMPORTANCE_DEFAULT));
        }
        StringBuilder big = new StringBuilder();
        for (int i = 0; i < lines.length() && i < 6; i++) {
            if (i > 0) big.append('\n');
            big.append(lines.getString(i));
        }
        String first = lines.getString(0);
        String text = lines.length() > 1 ? first + " (+" + (lines.length() - 1) + " uyarı daha)" : first;
        Intent launch = context.getPackageManager().getLaunchIntentForPackage(context.getPackageName());
        PendingIntent content = launch == null ? null : PendingIntent.getActivity(context, 7403, launch,
            PendingIntent.FLAG_UPDATE_CURRENT | (Build.VERSION.SDK_INT >= 23 ? PendingIntent.FLAG_IMMUTABLE : 0));
        NotificationCompat.Builder b = new NotificationCompat.Builder(context, CHANNEL)
            .setSmallIcon(R.drawable.ic_stat_garajim)
            .setContentTitle("Garajım · Araç kontrolü")
            .setContentText(text)
            .setStyle(new NotificationCompat.BigTextStyle().bigText(big.toString()))
            .setPriority(NotificationCompat.PRIORITY_DEFAULT)
            .setAutoCancel(true);
        if (content != null) b.setContentIntent(content);
        nm.notify(7404, b.build());
    }

    /** Bir sonraki 09:00 için alarm kurar (bugün 09:00 geçmediyse bugün). */
    static void schedule(Context context) {
        try {
            Context app = context.getApplicationContext();
            Intent i = new Intent(app, GarajimReminderReceiver.class);
            PendingIntent pi = PendingIntent.getBroadcast(app, REQ, i,
                PendingIntent.FLAG_UPDATE_CURRENT | (Build.VERSION.SDK_INT >= 23 ? PendingIntent.FLAG_IMMUTABLE : 0));
            Calendar c = Calendar.getInstance();
            c.set(Calendar.HOUR_OF_DAY, 9); c.set(Calendar.MINUTE, 0); c.set(Calendar.SECOND, 0); c.set(Calendar.MILLISECOND, 0);
            if (c.getTimeInMillis() <= System.currentTimeMillis() + 60000L) c.add(Calendar.DAY_OF_YEAR, 1);
            AlarmManager am = (AlarmManager) app.getSystemService(Context.ALARM_SERVICE);
            if (am == null) return;
            if (Build.VERSION.SDK_INT >= 23) am.setAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, c.getTimeInMillis(), pi);
            else am.set(AlarmManager.RTC_WAKEUP, c.getTimeInMillis(), pi);
        } catch (Exception ignored) { }
    }
}
