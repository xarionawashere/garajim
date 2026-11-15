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
import java.util.Calendar;

public class GarajimReminderReceiver extends BroadcastReceiver {
    static final int REQ = 7401;
    static final String CHANNEL = "garajim_daily_reminder";

    @Override public void onReceive(Context context, Intent intent) {
        try {
            SharedPreferences p = context.getSharedPreferences("garajim_widget", Context.MODE_PRIVATE);
            JSONArray lines = new JSONArray(p.getString("reminder_lines", "[]"));
            boolean allowed = Build.VERSION.SDK_INT < 33
                || context.checkSelfPermission(Manifest.permission.POST_NOTIFICATIONS) == PackageManager.PERMISSION_GRANTED;
            // Yalnızca gerçekten yaklaşan/geciken bir kalem varsa bildirim göster
            if (allowed && lines.length() > 0) notifyUser(context, lines);
        } catch (Exception ignored) {
        } finally {
            schedule(context);   // bir sonraki güne kur
        }
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
