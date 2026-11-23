package com.garajim.wear;

import android.animation.AnimatorSet;
import android.animation.ObjectAnimator;
import android.animation.ValueAnimator;
import android.app.Activity;
import android.content.Context;
import android.os.Build;
import android.os.Bundle;
import android.os.VibrationEffect;
import android.os.Vibrator;
import android.os.VibratorManager;
import android.view.View;
import android.view.animation.DecelerateInterpolator;
import android.view.animation.OvershootInterpolator;
import android.widget.Button;
import android.widget.TextView;
import com.google.android.gms.tasks.Tasks;
import com.google.android.gms.wearable.DataClient;
import com.google.android.gms.wearable.DataEvent;
import com.google.android.gms.wearable.DataEventBuffer;
import com.google.android.gms.wearable.DataMap;
import com.google.android.gms.wearable.DataMapItem;
import com.google.android.gms.wearable.Node;
import com.google.android.gms.wearable.Wearable;
import java.nio.charset.StandardCharsets;
import java.util.List;
import java.util.Locale;
import java.util.concurrent.Executors;

/** Premium his: kısa, pahalı animasyonlar — ağır loop yok. */
public class WearMainActivity extends Activity implements DataClient.OnDataChangedListener {
    private TextView speed, meta, status, alert, track, parkInfo;
    private Button btnToggle;
    private View speedRing;
    private boolean running, paused;
    private long lastAlertTs = 0;
    private double parkDist = -1;
    private String parkDir = "";
    private int lastShownSpeed = -1;
    private boolean entered;

    @Override protected void onCreate(Bundle b) {
        super.onCreate(b);
        setContentView(R.layout.activity_wear);
        speed = findViewById(R.id.wearSpeed);
        meta = findViewById(R.id.wearMeta);
        status = findViewById(R.id.wearStatus);
        alert = findViewById(R.id.wearAlert);
        track = findViewById(R.id.wearTrack);
        parkInfo = findViewById(R.id.wearPark);
        btnToggle = findViewById(R.id.btnToggle);
        speedRing = findViewById(R.id.wearSpeedRing);
        if (speedRing == null && speed != null) {
            View par = (View) speed.getParent();
            if (par != null) speedRing = (View) par.getParent();
        }

        wirePress(btnToggle, v -> send("toggle"));
        wirePress(findViewById(R.id.btnStop), v -> send("stop"));
        wirePress(findViewById(R.id.btnNext), v -> send("next"));
        wirePress(findViewById(R.id.btnPrev), v -> send("prev"));
        wirePress(findViewById(R.id.btnPlay), v -> send("playpause"));
        wirePress(findViewById(R.id.btnPark), v -> { send("park_where"); showPark(); });

        playEnter();
    }

    private void wirePress(View v, View.OnClickListener click) {
        if (v == null) return;
        v.setOnClickListener(view -> {
            press(view);
            click.onClick(view);
        });
    }

    /** İlk açılışta yumuşak giriş (profesyonel uygulamalar gibi). */
    private void playEnter() {
        if (entered) return;
        entered = true;
        View root = findViewById(android.R.id.content);
        if (root == null) return;
        root.setAlpha(0f);
        root.setTranslationY(12f);
        root.animate()
                .alpha(1f)
                .translationY(0f)
                .setDuration(320)
                .setInterpolator(new DecelerateInterpolator(1.4f))
                .start();
        if (speedRing != null) {
            speedRing.setScaleX(0.86f);
            speedRing.setScaleY(0.86f);
            speedRing.setAlpha(0.5f);
            speedRing.animate()
                    .scaleX(1f).scaleY(1f).alpha(1f)
                    .setDuration(420)
                    .setStartDelay(80)
                    .setInterpolator(new OvershootInterpolator(0.9f))
                    .start();
        }
    }

    private void press(View v) {
        v.animate().cancel();
        v.animate()
                .scaleX(0.94f).scaleY(0.94f)
                .setDuration(70)
                .withEndAction(() -> v.animate()
                        .scaleX(1f).scaleY(1f)
                        .setDuration(140)
                        .setInterpolator(new OvershootInterpolator(1.1f))
                        .start())
                .start();
    }

    private void pulseSpeed() {
        if (speed == null) return;
        speed.animate().cancel();
        ObjectAnimator sx = ObjectAnimator.ofFloat(speed, View.SCALE_X, 1f, 1.08f, 1f);
        ObjectAnimator sy = ObjectAnimator.ofFloat(speed, View.SCALE_Y, 1f, 1.08f, 1f);
        AnimatorSet set = new AnimatorSet();
        set.playTogether(sx, sy);
        set.setDuration(220);
        set.setInterpolator(new DecelerateInterpolator());
        set.start();
        if (speedRing != null) {
            speedRing.animate().cancel();
            speedRing.animate().scaleX(1.04f).scaleY(1.04f).setDuration(100)
                    .withEndAction(() -> speedRing.animate().scaleX(1f).scaleY(1f).setDuration(160).start())
                    .start();
        }
    }

    private void flashLimit(boolean on) {
        if (speedRing == null) return;
        speedRing.animate().cancel();
        if (on) {
            ObjectAnimator a = ObjectAnimator.ofFloat(speedRing, View.ALPHA, 1f, 0.55f, 1f);
            a.setDuration(500);
            a.setRepeatCount(1);
            a.start();
        } else {
            speedRing.setAlpha(1f);
        }
    }

    private void showAlertAnimated(String msg, int color) {
        if (alert == null) return;
        alert.setTextColor(color);
        alert.setText(msg);
        if (alert.getVisibility() != View.VISIBLE) {
            alert.setVisibility(View.VISIBLE);
            alert.setAlpha(0f);
            alert.setTranslationY(-6f);
            alert.animate().alpha(1f).translationY(0f).setDuration(220)
                    .setInterpolator(new DecelerateInterpolator()).start();
        } else {
            alert.animate().cancel();
            alert.setAlpha(0.4f);
            alert.animate().alpha(1f).setDuration(160).start();
        }
    }

    @Override protected void onResume() {
        super.onResume();
        Wearable.getDataClient(this).addListener(this);
    }

    @Override protected void onPause() {
        Wearable.getDataClient(this).removeListener(this);
        super.onPause();
    }

    @Override public void onDataChanged(DataEventBuffer events) {
        for (DataEvent e : events) {
            if (e.getType() != DataEvent.TYPE_CHANGED) continue;
            String path = e.getDataItem().getUri().getPath();
            if (path == null) continue;
            DataMap map = DataMapItem.fromDataItem(e.getDataItem()).getDataMap();
            if (path.endsWith("/garajim/ride_state")) applyState(map);
            else if (path.endsWith("/garajim/alert")) applyAlert(map);
        }
    }

    private void applyState(DataMap map) {
        running = map.getBoolean("running", false);
        paused = map.getBoolean("paused", false);
        final double kmh = map.getDouble("kmh", 0);
        final double distM = map.getDouble("distM", 0);
        final int sec = map.getInt("elapsedSec", 0);
        final String plate = map.getString("plate", "");
        final boolean over = map.getBoolean("overLimit", false);
        final String tr = map.getString("track", "");
        final String ar = map.getString("artist", "");
        parkDist = map.getDouble("parkDistM", -1);
        parkDir = map.getString("parkDir", "");
        final String alertStr = map.getString("alert", "");
        final int shown = (int) Math.round(kmh);
        runOnUiThread(() -> {
            speed.setText(String.format(Locale.US, "%.0f", kmh));
            speed.setTextColor(over ? 0xFFEF4444 : 0xFFFFFFFF);
            if (shown != lastShownSpeed && Math.abs(shown - lastShownSpeed) >= 1) {
                if (lastShownSpeed >= 0) pulseSpeed();
                lastShownSpeed = shown;
            }
            flashLimit(over);
            int m = sec / 60, s = sec % 60;
            meta.setText(String.format(Locale.US, "%.2f km  ·  %d:%02d%s",
                    distM / 1000.0, m, s, plate.isEmpty() ? "" : "  ·  " + plate));
            String st;
            if (!running) { st = "Hazır"; btnToggle.setText("Başlat"); }
            else if (paused) { st = "Duraklatıldı"; btnToggle.setText("Devam"); }
            else { st = over ? "Limit üstü" : "Sürüş aktif"; btnToggle.setText("Duraklat"); }
            if (status != null && !st.contentEquals(status.getText())) {
                status.setAlpha(0.3f);
                status.setText(st);
                status.animate().alpha(1f).setDuration(180).start();
            }
            if (tr != null && !tr.isEmpty()) {
                String line = ar != null && !ar.isEmpty() ? (tr + " — " + ar) : tr;
                if (track != null && !line.contentEquals(track.getText())) {
                    track.setAlpha(0.4f);
                    track.setText(line);
                    track.animate().alpha(1f).setDuration(200).start();
                }
            }
            if (alertStr != null && !alertStr.isEmpty()) {
                showAlertAnimated(alertStr, over ? 0xFFEF4444 : 0xFFFBBF24);
            }
        });
    }

    private void applyAlert(DataMap map) {
        long ts = map.getLong("ts", 0);
        if (ts > 0 && ts <= lastAlertTs) return;
        lastAlertTs = ts;
        final String msg = map.getString("msg", "Uyarı");
        final String kind = map.getString("kind", "info");
        runOnUiThread(() -> showAlertAnimated(msg, "limit".equals(kind) ? 0xFFEF4444 : 0xFFFBBF24));
        buzz("limit".equals(kind) ? 2 : 1);
    }

    private void showPark() {
        if (parkInfo == null) return;
        parkInfo.setVisibility(View.VISIBLE);
        parkInfo.setAlpha(0f);
        if (parkDist < 0) {
            parkInfo.setText("Park kaydı yok / telefon bekleniyor");
        } else {
            String d = parkDist >= 1000
                    ? String.format(Locale.US, "%.1f km", parkDist / 1000.0)
                    : String.format(Locale.US, "%.0f m", parkDist);
            parkInfo.setText(d + (parkDir.isEmpty() ? "" : "  ·  " + parkDir));
        }
        parkInfo.animate().alpha(1f).setDuration(220).start();
        buzz(1);
    }

    private void buzz(int pattern) {
        try {
            Vibrator vib;
            if (Build.VERSION.SDK_INT >= 31) {
                VibratorManager vm = (VibratorManager) getSystemService(Context.VIBRATOR_MANAGER_SERVICE);
                vib = vm != null ? vm.getDefaultVibrator() : null;
            } else {
                vib = (Vibrator) getSystemService(Context.VIBRATOR_SERVICE);
            }
            if (vib == null || !vib.hasVibrator()) return;
            if (Build.VERSION.SDK_INT >= 26) {
                if (pattern >= 2) {
                    vib.vibrate(VibrationEffect.createWaveform(new long[]{0, 80, 60, 80, 60, 120}, -1));
                } else {
                    vib.vibrate(VibrationEffect.createOneShot(70, VibrationEffect.DEFAULT_AMPLITUDE));
                }
            } else {
                vib.vibrate(pattern >= 2 ? new long[]{0, 80, 60, 80} : new long[]{0, 70}, -1);
            }
        } catch (Exception ignored) { }
    }

    private void send(String cmd) {
        Executors.newSingleThreadExecutor().execute(() -> {
            try {
                byte[] data = cmd.getBytes(StandardCharsets.UTF_8);
                List<Node> nodes = Tasks.await(Wearable.getNodeClient(this).getConnectedNodes());
                for (Node n : nodes) {
                    Wearable.getMessageClient(this).sendMessage(n.getId(), "/garajim/cmd", data);
                }
            } catch (Exception ignored) { }
        });
    }
}
