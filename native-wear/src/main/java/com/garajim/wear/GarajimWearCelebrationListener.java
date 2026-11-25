package com.garajim.wear;

import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.content.Context;
import android.content.Intent;
import android.media.AudioAttributes;
import android.os.Build;
import android.os.VibrationEffect;
import android.os.VibrationAttributes;
import android.os.Vibrator;
import android.os.VibratorManager;
import android.util.Log;
import com.google.android.gms.wearable.MessageEvent;
import com.google.android.gms.wearable.WearableListenerService;
import org.json.JSONArray;
import org.json.JSONObject;
import java.nio.charset.StandardCharsets;
import java.util.Locale;

/** Wear OS uygulama ekranı kapalıyken de başarı kutlamasını bildirime ve nadirliğe uygun titreşime dönüştürür. */
public final class GarajimWearCelebrationListener extends WearableListenerService {
    private static final String TAG = "GarajimCelebration";
    private static final String PATH_ACHIEVEMENT = "/garajim/achievement";
    private static final String PATH_ALERT = "/garajim/alert";
    private static final String CHANNEL_PREFIX = "garajim_achievement_v2_";

    @Override public void onMessageReceived(MessageEvent event) {
        super.onMessageReceived(event);
        if (event == null || event.getPath() == null || event.getData() == null) return;
        final String raw = new String(event.getData(), StandardCharsets.UTF_8);
        try {
            if (PATH_ACHIEVEMENT.equals(event.getPath())) {
                if (WearMainActivity.isVisibleNow()) return;
                postAchievementNotification(raw, false);
            } else if (PATH_ALERT.equals(event.getPath())) {
                JSONObject alert = new JSONObject(raw);
                if (!"dna".equalsIgnoreCase(alert.optString("kind", "")) || WearMainActivity.isVisibleNow()) return;
                JSONObject item = new JSONObject();
                item.put("id", "dna-" + alert.optLong("ts", System.currentTimeMillis()));
                item.put("name", "Yeni Sürüş DNA'sı");
                item.put("rarity", "rare");
                item.put("rarityLabel", "Nadir");
                item.put("description", alert.optString("msg", "Yeni sürüş profilin keşfedildi."));
                JSONObject payload = new JSONObject();
                payload.put("eventId", item.optString("id"));
                payload.put("source", "dna");
                payload.put("items", new JSONArray().put(item));
                postAchievementNotification(payload.toString(), true);
            }
        } catch (Exception e) {
            Log.w(TAG, "Kutlama mesajı işlenemedi: " + e.getMessage());
        }
    }

    private void postAchievementNotification(String raw, boolean dna) throws Exception {
        JSONObject payload = new JSONObject(raw);
        JSONArray items = payload.optJSONArray("items");
        if (items == null || items.length() == 0) {
            if (payload.has("name")) items = new JSONArray().put(payload);
            else return;
        }
        JSONObject first = items.optJSONObject(0);
        if (first == null) return;
        String rarity = first.optString("rarity", "common").toLowerCase(Locale.ROOT);
        String name = first.optString("name", dna ? "Sürüş DNA'sı" : "Yeni başarım");
        String title = dna ? "🧬 Yeni Sürüş DNA'sı" : (items.length() > 1 ? "🏆 " + items.length() + " yeni başarım kazandın!" : "🏆 Başarım kazandın!");
        String text = items.length() > 1
                ? name + " ve " + (items.length() - 1) + " başarım daha"
                : name + " · " + first.optString("rarityLabel", rarityLabel(rarity));
        String eventId = payload.optString("eventId", first.optString("id", String.valueOf(System.currentTimeMillis())));
        String channelId = CHANNEL_PREFIX + safeRarity(rarity);
        ensureChannel(channelId, rarity);

        Intent open = new Intent(this, WearMainActivity.class);
        open.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TOP | Intent.FLAG_ACTIVITY_SINGLE_TOP);
        open.putExtra(WearMainActivity.EXTRA_ACHIEVEMENT_PAYLOAD, payload.toString());
        int requestCode = Math.abs(eventId.hashCode() % 1000000) + 1000;
        PendingIntent contentIntent = PendingIntent.getActivity(this, requestCode, open,
                PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);

        Notification.Builder builder = new Notification.Builder(this, channelId)
                .setSmallIcon(R.mipmap.ic_launcher)
                .setContentTitle(title)
                .setContentText(text)
                .setStyle(new Notification.BigTextStyle().bigText(items.length() > 1 ? text + ". Saatte dokunarak her yeni başarımı görüntüle." : first.optString("description", text)))
                .setCategory(Notification.CATEGORY_EVENT)
                .setVisibility(Notification.VISIBILITY_PUBLIC)
                .setAutoCancel(true)
                .setOnlyAlertOnce(false)
                .setLocalOnly(true)
                .setContentIntent(contentIntent);
        NotificationManager nm = (NotificationManager) getSystemService(Context.NOTIFICATION_SERVICE);
        if (nm == null) return;
        int notificationId = Math.abs(("garajim:" + eventId).hashCode() % 1000000) + 8500;
        nm.notify(notificationId, builder.build());
        // Bildirim kanalı titreşimi bazı saatlerde/önceki kurulumlarda sessize alınmış
        // olabiliyor. Bildirim geldikten sonra başarı titreşimini saat servisinden
        // doğrudan da tetikle; kanal titreşimi kapalı olduğundan çift titreşim olmaz.
        vibrateAchievementRarity(rarity);
    }

    private void ensureChannel(String channelId, String rarity) {
        if (Build.VERSION.SDK_INT < 26) return;
        NotificationManager nm = (NotificationManager) getSystemService(Context.NOTIFICATION_SERVICE);
        if (nm == null || nm.getNotificationChannel(channelId) != null) return;
        NotificationChannel channel = new NotificationChannel(channelId, "Garajım · " + rarityLabel(rarity), NotificationManager.IMPORTANCE_HIGH);
        channel.setDescription("Yeni başarım ve Sürüş DNA kutlamaları; titreşim uygulama tarafından tetiklenir");
        // Titreşimi aşağıdaki service-side haptic çağrısı üretir. Kanalı da titreşimli
        // bırakmak bazı Wear OS sürümlerinde aynı mesaj için iki kez titreşim üretebilir.
        channel.enableVibration(false);
        channel.setShowBadge(false);
        nm.createNotificationChannel(channel);
    }


    private void vibrateAchievementRarity(String rarity) {
        try {
            long[] pattern = vibrationPattern(rarity);
            Vibrator vibrator;
            if (Build.VERSION.SDK_INT >= 31) {
                VibratorManager manager = (VibratorManager) getSystemService(Context.VIBRATOR_MANAGER_SERVICE);
                vibrator = manager != null ? manager.getDefaultVibrator() : null;
            } else {
                vibrator = (Vibrator) getSystemService(Context.VIBRATOR_SERVICE);
            }
            if (vibrator == null || !vibrator.hasVibrator()) {
                Log.w(TAG, "Saat titreşim motoru bulunamadı");
                return;
            }
            if (Build.VERSION.SDK_INT >= 26) {
                VibrationEffect effect = VibrationEffect.createWaveform(pattern, -1);
                if (Build.VERSION.SDK_INT >= 33) {
                    vibrator.vibrate(effect, VibrationAttributes.createForUsage(VibrationAttributes.USAGE_NOTIFICATION));
                } else {
                    // API 26–32: specify notification usage so a background service can vibrate.
                    AudioAttributes attributes = new AudioAttributes.Builder()
                            .setUsage(AudioAttributes.USAGE_NOTIFICATION)
                            .build();
                    vibrator.vibrate(effect, attributes);
                }
            } else {
                vibrator.vibrate(pattern, -1);
            }
        } catch (Exception e) {
            Log.w(TAG, "Başarım titreşimi başlatılamadı: " + e.getMessage());
        }
    }

    private String safeRarity(String rarity) {
        switch (rarity) {
            case "uncommon": case "rare": case "epic": case "legendary": return rarity;
            default: return "common";
        }
    }
    private String rarityLabel(String rarity) {
        switch (rarity) {
            case "uncommon": return "Gelişmiş";
            case "rare": return "Nadir";
            case "epic": return "Destansı";
            case "legendary": return "Efsanevi";
            default: return "Standart";
        }
    }
    private long[] vibrationPattern(String rarity) {
        switch (rarity) {
            case "legendary": return new long[]{0, 70, 35, 70, 35, 150, 55, 230};
            case "epic": return new long[]{0, 70, 40, 70, 80, 120};
            case "rare": return new long[]{0, 60, 45, 100};
            case "uncommon": return new long[]{0, 45, 60, 50};
            default: return new long[]{0, 45};
        }
    }
}
