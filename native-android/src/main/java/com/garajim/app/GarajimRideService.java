package com.garajim.app;

import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.app.Service;
import android.content.Context;
import android.content.Intent;
import android.os.Build;
import android.os.IBinder;
import androidx.core.app.NotificationCompat;

/**
 * Sürüş arka plandayken silinemeyen (ongoing) bildirim.
 * Konum takibi JS / BackgroundGeolocation tarafında sürer; bu servis
 * Android'in süreci öldürmesini engeller ve kullanıcıya durumu gösterir.
 */
public class GarajimRideService extends Service {
    public static final String CHANNEL_ID = "garajim_ride";
    public static final int NOTIF_ID = 7411;
    public static final String EXTRA_TITLE = "title";
    public static final String EXTRA_TEXT = "text";

    public static void start(Context ctx, String title, String text) {
        Intent i = new Intent(ctx, GarajimRideService.class);
        i.putExtra(EXTRA_TITLE, title);
        i.putExtra(EXTRA_TEXT, text);
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            ctx.startForegroundService(i);
        } else {
            ctx.startService(i);
        }
    }

    public static void stop(Context ctx) {
        ctx.stopService(new Intent(ctx, GarajimRideService.class));
    }

    @Override
    public int onStartCommand(Intent intent, int flags, int startId) {
        ensureChannel();
        String title = intent != null ? intent.getStringExtra(EXTRA_TITLE) : null;
        String text = intent != null ? intent.getStringExtra(EXTRA_TEXT) : null;
        if (title == null || title.isEmpty()) title = "Garajım · Açık Dünya";
        if (text == null || text.isEmpty()) text = "Sürüş arka planda devam ediyor…";

        Intent open = getPackageManager().getLaunchIntentForPackage(getPackageName());
        if (open == null) open = new Intent(this, MainActivity.class);
        open.addFlags(Intent.FLAG_ACTIVITY_SINGLE_TOP | Intent.FLAG_ACTIVITY_CLEAR_TOP);
        int piFlags = PendingIntent.FLAG_UPDATE_CURRENT;
        if (Build.VERSION.SDK_INT >= 23) piFlags |= PendingIntent.FLAG_IMMUTABLE;
        PendingIntent pi = PendingIntent.getActivity(this, 7411, open, piFlags);

        int icon = getResources().getIdentifier("ic_stat_garajim", "drawable", getPackageName());
        if (icon == 0) icon = android.R.drawable.ic_menu_mylocation;

        NotificationCompat.Builder b = new NotificationCompat.Builder(this, CHANNEL_ID)
            .setContentTitle(title)
            .setContentText(text)
            .setSmallIcon(icon)
            .setOngoing(true)
            .setOnlyAlertOnce(true)
            .setCategory(NotificationCompat.CATEGORY_NAVIGATION)
            .setPriority(NotificationCompat.PRIORITY_LOW)
            .setContentIntent(pi)
            .setShowWhen(false);

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
            b.setForegroundServiceBehavior(NotificationCompat.FOREGROUND_SERVICE_IMMEDIATE);
        }

        Notification n = b.build();
        startForeground(NOTIF_ID, n);
        return START_STICKY;
    }

    private void ensureChannel() {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) return;
        NotificationManager nm = (NotificationManager) getSystemService(NOTIFICATION_SERVICE);
        if (nm == null) return;
        NotificationChannel ch = nm.getNotificationChannel(CHANNEL_ID);
        if (ch != null) return;
        ch = new NotificationChannel(CHANNEL_ID, "Açık Dünya sürüşü", NotificationManager.IMPORTANCE_LOW);
        ch.setDescription("Sürüş arka plandayken kayıt devam ediyor");
        ch.setShowBadge(false);
        nm.createNotificationChannel(ch);
    }

    @Override
    public void onDestroy() {
        stopForeground(true);
        super.onDestroy();
    }

    @Override
    public IBinder onBind(Intent intent) { return null; }
}
