package com.garajim.wear;

import android.animation.AnimatorSet;
import android.animation.ObjectAnimator;
import android.app.Activity;
import android.app.AlertDialog;
import android.content.Context;
import android.graphics.drawable.Drawable;
import android.graphics.drawable.GradientDrawable;
import android.os.Build;
import android.os.Bundle;
import android.os.Handler;
import android.os.Looper;
import android.os.VibrationEffect;
import android.os.Vibrator;
import android.os.VibratorManager;
import android.view.View;
import android.view.animation.DecelerateInterpolator;
import android.view.animation.OvershootInterpolator;
import android.widget.Button;
import android.widget.TextView;
import android.widget.Toast;
import com.google.android.gms.tasks.Tasks;
import com.google.android.gms.wearable.DataClient;
import com.google.android.gms.wearable.DataEvent;
import com.google.android.gms.wearable.DataEventBuffer;
import com.google.android.gms.wearable.DataItem;
import com.google.android.gms.wearable.DataMap;
import com.google.android.gms.wearable.DataMapItem;
import com.google.android.gms.wearable.Node;
import com.google.android.gms.wearable.Wearable;
import org.json.JSONArray;
import org.json.JSONObject;
import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

/** Garajım Wear OS: araç seçimi, sürüş kontrolü ve sürüş bitirme/kayıt kararları saatten yapılır. */
public class WearMainActivity extends Activity implements DataClient.OnDataChangedListener {
    private static final String PATH_STATE = "/garajim/ride_state";
    private static final String PATH_VEHICLES = "/garajim/vehicles";
    private static final String PATH_ALERT = "/garajim/alert";
    private static final String PATH_CMD = "/garajim/cmd";
    private static final ExecutorService IO = Executors.newSingleThreadExecutor();

    private TextView speed, meta, status, connection, alert, track, parkInfo;
    private Button btnToggle, btnVehicle, btnPendingSummary;
    private View speedRing;
    private boolean running, paused, pendingSummary;
    private volatile long lastAlertTs = 0;
    private String visibleAlertKind = "";
    private boolean lastOverLimit = false;
    private boolean haveInitialState = false;
    private boolean lastStateRunning = false;
    private boolean lastStatePaused = false;
    private double parkDist = -1;
    private String parkDir = "";
    private int lastShownSpeed = -1;
    private boolean entered;
    private boolean phoneConnected = false;
    private boolean connectionChecked = false;
    private boolean gpsReady = false;
    private volatile long lastStateAt = 0L;
    private long lastSyncRequestAt = 0L;
    private volatile String lastCommandSent = "";
    private volatile long lastCommandSentAt = 0L;
    private final Handler mainHandler = new Handler(Looper.getMainLooper());
    private final Runnable connectionTicker = new Runnable() {
        @Override public void run() {
            refreshPhoneConnection();
            mainHandler.postDelayed(this, 8000L);
        }
    };
    private String selectedVehicleId = "";
    private String selectedPlate = "";
    private String pendingSummaryId = "";
    private String lastPromptedSummaryId = "";
    private String summaryPlate = "";
    private double summaryDistM = 0, summaryAvgKmh = 0, summaryMaxKmh = 0;
    private int summaryElapsedSec = 0;
    private AlertDialog summaryDialog;
    private final List<VehicleOption> vehicles = new ArrayList<>();

    private static final class VehicleOption {
        final String id, plate, name, brand, model;
        VehicleOption(String id, String plate, String name, String brand, String model) {
            this.id = id; this.plate = plate; this.name = name; this.brand = brand; this.model = model;
        }
        String label() {
            String title = !plate.isEmpty() ? plate : (!name.isEmpty() ? name : (brand + " " + model).trim());
            String detail = (brand + " " + model).trim();
            if (title.isEmpty()) title = "Araç";
            if (!detail.isEmpty() && !detail.equalsIgnoreCase(title)) return title + " · " + detail;
            return title;
        }
    }

    @Override protected void onCreate(Bundle b) {
        super.onCreate(b);
        setContentView(R.layout.activity_wear);
        speed = findViewById(R.id.wearSpeed);
        meta = findViewById(R.id.wearMeta);
        status = findViewById(R.id.wearStatus);
        connection = findViewById(R.id.wearConnection);
        alert = findViewById(R.id.wearAlert);
        track = findViewById(R.id.wearTrack);
        parkInfo = findViewById(R.id.wearPark);
        btnToggle = findViewById(R.id.btnToggle);
        btnVehicle = findViewById(R.id.btnVehicle);
        btnPendingSummary = findViewById(R.id.btnPendingSummary);
        speedRing = findViewById(R.id.wearSpeedRing);
        if (speedRing == null && speed != null) {
            View par = (View) speed.getParent();
            if (par != null) speedRing = (View) par.getParent();
        }

        wirePress(btnToggle, v -> onTogglePressed());
        wirePress(findViewById(R.id.btnStop), v -> confirmStopOnWatch());
        wirePress(findViewById(R.id.btnNext), v -> send("next"));
        wirePress(findViewById(R.id.btnPrev), v -> send("prev"));
        wirePress(findViewById(R.id.btnPlay), v -> send("playpause"));
        wirePress(findViewById(R.id.btnPark), v -> { send("park_where"); showPark(); });
        wirePress(btnVehicle, v -> showVehiclePicker());
        wirePress(btnPendingSummary, v -> showPendingSummaryDialog());
        if (status != null) status.setText("Hazır");
        updateConnectionUi();

        playEnter();
    }

    private void wirePress(View v, View.OnClickListener click) {
        if (v == null) return;
        v.setOnClickListener(view -> {
            press(view);
            click.onClick(view);
        });
    }

    private void onTogglePressed() {
        if (!running && pendingSummary) {
            showPendingSummaryDialog();
            Toast.makeText(this, "Önce bekleyen sürüş özetini tamamla", Toast.LENGTH_SHORT).show();
            return;
        }
        if (!running) {
            if (vehicles.isEmpty()) {
                send("request_sync");
                Toast.makeText(this, "Araç listesi telefondan bekleniyor", Toast.LENGTH_SHORT).show();
                return;
            }
            if (selectedVehicleId.isEmpty() || findVehicle(selectedVehicleId) == null) {
                showVehiclePicker();
                return;
            }
        }
        // Toggle yerine açık komut kullan: gecikmiş/tekrarlanmış mesaj sürüş durumunu tersine çevirmesin.
        if (!running) send("start");
        else if (paused) send("resume");
        else send("pause");
    }

    private void confirmStopOnWatch() {
        if (!running && !pendingSummary) {
            Toast.makeText(this, "Aktif sürüş yok", Toast.LENGTH_SHORT).show();
            return;
        }
        if (pendingSummary && !running) {
            showPendingSummaryDialog();
            return;
        }
        boolean veryShort = lastDistM < 30 && lastElapsedSec < 20;
        String message = veryShort ? "Çok kısa sürüş. Bitirilsin mi?" : "Sürüşü bitirip özeti göster?";
        new AlertDialog.Builder(this)
                .setTitle("Sürüşü bitir")
                .setMessage(message)
                .setNegativeButton("Vazgeç", (d, w) -> { })
                .setPositiveButton("Bitir", (d, w) -> send("stop_confirmed"))
                .show();
    }

    private double lastDistM = 0;
    private int lastElapsedSec = 0;

    private VehicleOption findVehicle(String id) {
        for (VehicleOption v : vehicles) if (v.id.equals(id)) return v;
        return null;
    }

    private void showVehiclePicker() {
        if (running) {
            new AlertDialog.Builder(this).setTitle("Araç değiştirilemiyor")
                    .setMessage("Aktif sürüş sırasında araç değiştirilemez. Önce sürüşü bitir.")
                    .setPositiveButton("Tamam", null).show();
            return;
        }
        if (vehicles.isEmpty()) {
            send("request_sync");
            new AlertDialog.Builder(this).setTitle("Araç seç")
                    .setMessage("Araç listesi henüz telefondan gelmedi. Telefon ve saat bağlantısını kontrol edip tekrar dene.")
                    .setPositiveButton("Tekrar dene", (d, w) -> send("request_sync"))
                    .setNegativeButton("Kapat", null).show();
            return;
        }
        String[] labels = new String[vehicles.size()];
        int checked = -1;
        for (int i = 0; i < vehicles.size(); i++) {
            labels[i] = vehicles.get(i).label();
            if (vehicles.get(i).id.equals(selectedVehicleId)) checked = i;
        }
        new AlertDialog.Builder(this)
                .setTitle("Sürüş aracı")
                .setSingleChoiceItems(labels, checked, (dialog, which) -> {
                    VehicleOption v = vehicles.get(which);
                    selectedVehicleId = v.id;
                    selectedPlate = v.plate.isEmpty() ? v.label() : v.plate;
                    updateVehicleButton();
                    dialog.dismiss();
                    send("select_vehicle|" + v.id);
                    Toast.makeText(this, "Araç seçimi gönderildi", Toast.LENGTH_SHORT).show();
                })
                .setNegativeButton("Kapat", null)
                .show();
    }

    private void updateVehicleButton() {
        if (btnVehicle == null) return;
        VehicleOption chosen = findVehicle(selectedVehicleId);
        if (chosen != null) {
            String label = chosen.plate.isEmpty() ? chosen.label() : chosen.plate;
            btnVehicle.setText("Araç: " + label);
        } else if (!selectedPlate.isEmpty()) {
            btnVehicle.setText("Araç: " + selectedPlate);
        } else {
            btnVehicle.setText("Araç seç");
        }
    }

    private void showPendingSummaryDialog() {
        if (!pendingSummary || pendingSummaryId.isEmpty()) {
            Toast.makeText(this, "Bekleyen sürüş kaydı yok", Toast.LENGTH_SHORT).show();
            return;
        }
        if (summaryDialog != null && summaryDialog.isShowing()) return;
        String dist = String.format(Locale.US, "%.2f km", summaryDistM / 1000.0);
        int m = summaryElapsedSec / 60, s = summaryElapsedSec % 60;
        StringBuilder msg = new StringBuilder();
        if (!summaryPlate.isEmpty()) msg.append(summaryPlate).append("\n");
        msg.append(dist).append(" · ").append(m).append(":").append(String.format(Locale.US, "%02d", s));
        msg.append("\nOrt. ").append(String.format(Locale.US, "%.0f", summaryAvgKmh)).append(" km/sa");
        msg.append(" · Maks. ").append(String.format(Locale.US, "%.0f", summaryMaxKmh)).append(" km/sa");
        final String id = pendingSummaryId;
        summaryDialog = new AlertDialog.Builder(this)
                .setTitle("Sürüş tamamlandı")
                .setMessage(msg.toString())
                .setPositiveButton("Kaydet", (d, w) -> send("summary_save|" + id))
                .setNegativeButton("Sil", (d, w) -> confirmDiscardSummary(id))
                .setNeutralButton("Sonra", (d, w) -> { })
                .create();
        summaryDialog.setOnDismissListener(d -> summaryDialog = null);
        summaryDialog.show();
    }

    private void confirmDiscardSummary(String id) {
        new AlertDialog.Builder(this)
                .setTitle("Sürüş kaydı silinsin mi?")
                .setMessage("Bu sürüş kaydedilmeyecek.")
                .setNegativeButton("Vazgeç", (d, w) -> showPendingSummaryDialog())
                .setPositiveButton("Sil", (d, w) -> send("summary_discard|" + id))
                .show();
    }

    private void applyVehicles(String json) {
        List<VehicleOption> parsed = new ArrayList<>();
        try {
            JSONArray arr = new JSONArray(json == null ? "[]" : json);
            for (int i = 0; i < arr.length() && i < 60; i++) {
                JSONObject o = arr.optJSONObject(i);
                if (o == null) continue;
                String id = o.optString("id", "");
                if (id.isEmpty()) continue;
                parsed.add(new VehicleOption(id, o.optString("plate", ""), o.optString("name", ""),
                        o.optString("brand", ""), o.optString("model", "")));
            }
        } catch (Exception ignored) { }
        runOnUiThread(() -> {
            vehicles.clear();
            vehicles.addAll(parsed);
            if (!selectedVehicleId.isEmpty()) {
                VehicleOption chosen = findVehicle(selectedVehicleId);
                if (chosen != null) selectedPlate = chosen.plate;
                else { selectedVehicleId = ""; selectedPlate = ""; }
            }
            updateVehicleButton();
        });
    }

    /** İlk açılışta yumuşak giriş. */
    private void playEnter() {
        if (entered) return;
        entered = true;
        View root = findViewById(android.R.id.content);
        if (root == null) return;
        root.setAlpha(0f);
        root.setTranslationY(12f);
        root.animate().alpha(1f).translationY(0f).setDuration(320)
                .setInterpolator(new DecelerateInterpolator(1.4f)).start();
        if (speedRing != null) {
            speedRing.setScaleX(0.86f);
            speedRing.setScaleY(0.86f);
            speedRing.setAlpha(0.5f);
            speedRing.animate().scaleX(1f).scaleY(1f).alpha(1f).setDuration(420)
                    .setStartDelay(80).setInterpolator(new OvershootInterpolator(0.9f)).start();
        }
    }

    private void press(View v) {
        v.animate().cancel();
        v.animate().scaleX(0.94f).scaleY(0.94f).setDuration(70)
                .withEndAction(() -> v.animate().scaleX(1f).scaleY(1f).setDuration(140)
                        .setInterpolator(new OvershootInterpolator(1.1f)).start()).start();
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
                    .withEndAction(() -> speedRing.animate().scaleX(1f).scaleY(1f).setDuration(160).start()).start();
        }
    }

    private void flashLimit(boolean on) {
        if (speedRing == null) return;
        speedRing.animate().cancel();
        if (on) {
            ObjectAnimator a = ObjectAnimator.ofFloat(speedRing, View.ALPHA, 1f, 0.55f, 1f);
            a.setDuration(500); a.setRepeatCount(1); a.start();
        } else speedRing.setAlpha(1f);
    }

    private void showAlertAnimated(String msg, int color) {
        if (alert == null) return;
        alert.setTextColor(color); alert.setText(msg);
        if (alert.getVisibility() != View.VISIBLE) {
            alert.setVisibility(View.VISIBLE); alert.setAlpha(0f); alert.setTranslationY(-6f);
            alert.animate().alpha(1f).translationY(0f).setDuration(220).setInterpolator(new DecelerateInterpolator()).start();
        } else {
            alert.animate().cancel(); alert.setAlpha(0.4f); alert.animate().alpha(1f).setDuration(160).start();
        }
    }

    @Override protected void onResume() {
        super.onResume();
        Wearable.getDataClient(this).addListener(this);
        mainHandler.removeCallbacks(connectionTicker);
        refreshPhoneConnection();
        mainHandler.postDelayed(connectionTicker, 8000L);
        Wearable.getDataClient(this).getDataItems().addOnSuccessListener(items -> {
            try {
                for (DataItem item : items) {
                    String path = item.getUri() == null ? null : item.getUri().getPath();
                    if (path == null) continue;
                    DataMap map = DataMapItem.fromDataItem(item).getDataMap();
                    if (PATH_STATE.equals(path)) applyState(map);
                    else if (PATH_VEHICLES.equals(path)) applyVehicles(map.getString("json", "[]"));
                }
            } catch (Exception ignored) {
            } finally { items.release(); }
        });
    }

    @Override protected void onPause() {
        mainHandler.removeCallbacks(connectionTicker);
        Wearable.getDataClient(this).removeListener(this);
        super.onPause();
    }

    @Override protected void onDestroy() {
        mainHandler.removeCallbacks(connectionTicker);
        if (summaryDialog != null && summaryDialog.isShowing()) summaryDialog.dismiss();
        super.onDestroy();
    }

    @Override public void onDataChanged(DataEventBuffer events) {
        try {
            for (DataEvent e : events) {
                if (e.getType() != DataEvent.TYPE_CHANGED) continue;
                if (e.getDataItem() == null || e.getDataItem().getUri() == null) continue;
                String path = e.getDataItem().getUri().getPath();
                if (path == null) continue;
                DataMap map = DataMapItem.fromDataItem(e.getDataItem()).getDataMap();
                if (PATH_STATE.equals(path)) applyState(map);
                else if (PATH_VEHICLES.equals(path)) applyVehicles(map.getString("json", "[]"));
                else if (PATH_ALERT.equals(path)) applyAlert(map);
            }
        } finally {
            events.release();
        }
    }

    private void applyState(DataMap map) {
        final long incomingStateAt = map.getLong("ts", 0L);
        final boolean incomingRunning = map.getBoolean("running", false);
        final boolean incomingPaused = map.getBoolean("paused", false);
        final double kmh = map.getDouble("kmh", 0);
        final double distM = map.getDouble("distM", 0);
        final int sec = map.getInt("elapsedSec", 0);
        final String plate = map.getString("plate", "");
        final String vehicleId = map.getString("vehicleId", "");
        final boolean over = map.getBoolean("overLimit", false);
        final boolean incomingGpsReady = map.getBoolean("gpsReady", false);
        final String tr = map.getString("track", "");
        final String ar = map.getString("artist", "");
        final double incomingParkDist = map.getDouble("parkDistM", -1);
        final String incomingParkDir = map.getString("parkDir", "");
        final String alertStr = map.getString("alert", "");
        final boolean hasSummary = map.getBoolean("pendingSummary", false);
        final String sumId = map.getString("summaryId", "");
        final String sumPlate = map.getString("summaryPlate", "");
        final double sumDist = map.getDouble("summaryDistM", 0);
        final int sumSec = map.getInt("summaryElapsedSec", 0);
        final double sumAvg = map.getDouble("summaryAvgKmh", 0);
        final double sumMax = map.getDouble("summaryMaxKmh", 0);
        final int shown = (int) Math.round(kmh);

        runOnUiThread(() -> {
            if (incomingStateAt > 0 && lastStateAt > 0 && incomingStateAt < lastStateAt) return;
            lastStateAt = incomingStateAt > 0 ? incomingStateAt : System.currentTimeMillis();
            boolean stateTransition = haveInitialState && (lastStateRunning != incomingRunning || lastStatePaused != incomingPaused);
            running = incomingRunning;
            paused = incomingPaused;
            gpsReady = incomingGpsReady;
            lastStateRunning = incomingRunning;
            lastStatePaused = incomingPaused;
            if (!haveInitialState) haveInitialState = true;
            if (stateTransition) buzz(1);
            parkDist = incomingParkDist;
            parkDir = incomingParkDir;
            lastDistM = distM;
            lastElapsedSec = sec;

            speed.setText(String.format(Locale.US, "%.0f", kmh));
            int liveColor = over ? 0xFFEF4444 : (incomingRunning && !incomingPaused ? 0xFF4ADE80 : 0xFFFFFFFF);
            speed.setTextColor(liveColor);
            if (speedRing != null) {
                Drawable background = speedRing.getBackground();
                if (background instanceof GradientDrawable) {
                    GradientDrawable ring = (GradientDrawable) background.mutate();
                    ring.setStroke(dp(2), over ? 0xFFEF4444 : (incomingRunning && !incomingPaused ? 0xFF22C55E : 0xFFEF4444));
                    speedRing.setBackground(ring);
                }
            }
            if (shown != lastShownSpeed && Math.abs(shown - lastShownSpeed) >= 1) {
                if (lastShownSpeed >= 0) pulseSpeed();
                lastShownSpeed = shown;
            }
            if (over != lastOverLimit) {
                flashLimit(over);
                if (over) buzz(2);
                lastOverLimit = over;
            }
            int m = sec / 60, s = sec % 60;
            meta.setText(String.format(Locale.US, "%.2f km  ·  %d:%02d%s", distM / 1000.0, m, s,
                    plate.isEmpty() ? "" : "  ·  " + plate));
            selectedVehicleId = vehicleId == null ? "" : vehicleId;
            selectedPlate = plate == null ? "" : plate;
            updateVehicleButton();
            updateConnectionUi();
            String st;
            if (!running) { st = hasSummary ? "Kaydedilecek sürüş var" : "Hazır"; btnToggle.setText("Başlat"); }
            else if (paused) { st = "Duraklatıldı"; btnToggle.setText("Devam"); }
            else { st = over ? "Limit üstü" : "Sürüş aktif"; btnToggle.setText("Duraklat"); }
            if (status != null && !st.contentEquals(status.getText())) {
                status.setAlpha(0.3f); status.setText(st); status.animate().alpha(1f).setDuration(180).start();
            }
            if (status != null) {
                status.setTextColor(!running ? 0xFF94A3B8 : (paused ? 0xFFFBBF24 : (over ? 0xFFF87171 : 0xFF4ADE80)));
            }
            if (tr != null && !tr.isEmpty()) {
                String line = ar != null && !ar.isEmpty() ? (tr + " — " + ar) : tr;
                if (track != null && !line.contentEquals(track.getText())) {
                    track.setAlpha(0.4f); track.setText(line); track.animate().alpha(1f).setDuration(200).start();
                }
            }
            if (over) {
                if (alertStr != null && !alertStr.isEmpty()) {
                    visibleAlertKind = "limit";
                    showAlertAnimated(alertStr, 0xFFEF4444);
                }
            } else if ("limit".equals(visibleAlertKind)) {
                hideAlertAnimated();
            }
            pendingSummary = hasSummary;
            if (hasSummary && !sumId.isEmpty()) {
                pendingSummaryId = sumId; summaryPlate = sumPlate; summaryDistM = sumDist;
                summaryElapsedSec = sumSec; summaryAvgKmh = sumAvg; summaryMaxKmh = sumMax;
                if (btnPendingSummary != null) btnPendingSummary.setVisibility(View.VISIBLE);
                if (!sumId.equals(lastPromptedSummaryId)) {
                    lastPromptedSummaryId = sumId;
                    showPendingSummaryDialog();
                }
            } else {
                pendingSummaryId = "";
                if (btnPendingSummary != null) btnPendingSummary.setVisibility(View.GONE);
                lastPromptedSummaryId = "";
            }
        });
    }

    private void applyAlert(DataMap map) {
        long ts = map.getLong("ts", 0);
        if (ts > 0 && ts <= lastAlertTs) return;
        lastAlertTs = ts;
        final String msg = map.getString("msg", "Uyarı");
        final String kind = map.getString("kind", "info");
        runOnUiThread(() -> {
            visibleAlertKind = kind;
            showAlertAnimated(msg, "limit".equals(kind) ? 0xFFEF4444 : 0xFFFBBF24);
            if (!"limit".equals(kind)) {
                mainHandler.postDelayed(() -> {
                    if (kind.equals(visibleAlertKind) && !lastOverLimit) hideAlertAnimated();
                }, 6500L);
            }
        });
        buzz("limit".equals(kind) ? 2 : 1);
    }

    private void hideAlertAnimated() {
        if (alert == null || alert.getVisibility() != View.VISIBLE) return;
        alert.animate().cancel();
        alert.animate().alpha(0f).translationY(-4f).setDuration(180L).withEndAction(() -> {
            alert.setVisibility(View.GONE);
            alert.setAlpha(1f);
            alert.setTranslationY(0f);
        }).start();
        visibleAlertKind = "";
    }

    private int dp(float value) {
        return Math.round(value * getResources().getDisplayMetrics().density);
    }

    private void refreshPhoneConnection() {
        try {
            Wearable.getNodeClient(this).getConnectedNodes().addOnCompleteListener(task -> {
                boolean connected = task.isSuccessful() && task.getResult() != null && !task.getResult().isEmpty();
                phoneConnected = connected;
                connectionChecked = true;
                runOnUiThread(this::updateConnectionUi);
                long now = System.currentTimeMillis();
                if (connected && (lastStateAt == 0L || now - lastStateAt > 25_000L)
                        && now - lastSyncRequestAt > 30_000L) {
                    lastSyncRequestAt = now;
                    send("request_sync");
                }
            });
        } catch (Exception ignored) {
            phoneConnected = false;
            connectionChecked = true;
            updateConnectionUi();
        }
    }

    private void updateConnectionUi() {
        if (connection == null) return;
        long age = lastStateAt > 0 ? Math.max(0L, System.currentTimeMillis() - lastStateAt) : Long.MAX_VALUE;
        String text;
        int color;
        if (!connectionChecked) {
            text = "● Telefon aranıyor…";
            color = 0xFFFBBF24;
        } else if (!phoneConnected) {
            text = "● Telefon bağlantısı yok";
            color = 0xFFF87171;
        } else if (lastStateAt == 0L) {
            text = "● Telefon bağlı · eşitleme bekleniyor";
            color = 0xFFFBBF24;
        } else if (age > 25_000L) {
            text = "● Veri eski · " + Math.max(1L, age / 1000L) + " sn önce";
            color = 0xFFFBBF24;
        } else {
            text = running && !paused && !gpsReady ? "● Telefon bağlı · GPS bekleniyor" : "● Telefon bağlı · güncel";
            color = 0xFF4ADE80;
        }
        if (!text.contentEquals(connection.getText())) {
            connection.setAlpha(0.45f);
            connection.setText(text);
            connection.setTextColor(color);
            connection.animate().alpha(1f).setDuration(180L).start();
        } else {
            connection.setTextColor(color);
        }
    }

    private void showPark() {
        if (parkInfo == null) return;
        parkInfo.setVisibility(View.VISIBLE); parkInfo.setAlpha(0f);
        if (parkDist < 0) parkInfo.setText("Park kaydı yok / telefon bekleniyor");
        else {
            String d = parkDist >= 1000 ? String.format(Locale.US, "%.1f km", parkDist / 1000.0)
                    : String.format(Locale.US, "%.0f m", parkDist);
            parkInfo.setText(d + (parkDir.isEmpty() ? "" : "  ·  " + parkDir));
        }
        parkInfo.animate().alpha(1f).setDuration(220).start(); buzz(1);
    }

    private void buzz(int pattern) {
        try {
            Vibrator vib;
            if (Build.VERSION.SDK_INT >= 31) {
                VibratorManager vm = (VibratorManager) getSystemService(Context.VIBRATOR_MANAGER_SERVICE);
                vib = vm != null ? vm.getDefaultVibrator() : null;
            } else vib = (Vibrator) getSystemService(Context.VIBRATOR_SERVICE);
            if (vib == null || !vib.hasVibrator()) return;
            if (Build.VERSION.SDK_INT >= 26) {
                if (pattern >= 2) vib.vibrate(VibrationEffect.createWaveform(new long[]{0, 80, 60, 80, 60, 120}, -1));
                else vib.vibrate(VibrationEffect.createOneShot(70, VibrationEffect.DEFAULT_AMPLITUDE));
            } else vib.vibrate(pattern >= 2 ? new long[]{0, 80, 60, 80} : new long[]{0, 70}, -1);
        } catch (Exception ignored) { }
    }

    private void send(String cmd) {
        if (cmd == null || cmd.trim().isEmpty()) return;
        final long now = System.currentTimeMillis();
        // Saat ekranında çift dokunuşun aynı komutu iki kez göndermesini önle.
        if (cmd.equals(lastCommandSent) && now - lastCommandSentAt < 700L) return;
        lastCommandSent = cmd;
        lastCommandSentAt = now;
        IO.execute(() -> {
            try {
                byte[] data = cmd.getBytes(StandardCharsets.UTF_8);
                List<Node> nodes = Tasks.await(Wearable.getNodeClient(this).getConnectedNodes());
                if (nodes.isEmpty()) {
                    phoneConnected = false;
                    runOnUiThread(() -> {
                        updateConnectionUi();
                        Toast.makeText(this, "Telefonla bağlantı yok", Toast.LENGTH_SHORT).show();
                    });
                    return;
                }
                boolean sent = false;
                for (Node n : nodes) {
                    Tasks.await(Wearable.getMessageClient(this).sendMessage(n.getId(), PATH_CMD, data));
                    sent = true;
                }
                if (sent && ("request_sync".equals(cmd) || cmd.startsWith("select_vehicle|"))) {
                    runOnUiThread(() -> Toast.makeText(this, "Komut telefona iletildi", Toast.LENGTH_SHORT).show());
                }
            } catch (Exception e) {
                runOnUiThread(() -> Toast.makeText(this, "Komut iletilemedi · bağlantıyı kontrol et", Toast.LENGTH_SHORT).show());
            }
        });
    }
}
