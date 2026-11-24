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
import com.google.android.gms.wearable.MessageClient;
import com.google.android.gms.wearable.MessageEvent;
import com.google.android.gms.wearable.PutDataMapRequest;
import com.google.android.gms.wearable.Node;
import com.google.android.gms.wearable.Wearable;
import org.json.JSONArray;
import org.json.JSONObject;
import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
import java.util.UUID;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

/** Garajım Wear OS: araç seçimi, sürüş kontrolü ve sürüş bitirme/kayıt kararları saatten yapılır. */
public class WearMainActivity extends Activity implements DataClient.OnDataChangedListener, MessageClient.OnMessageReceivedListener {
    private static final String PATH_STATE = "/garajim/ride_state";
    private static final String PATH_VEHICLES = "/garajim/vehicles";
    private static final String PATH_ALERT = "/garajim/alert";
    private static final String PATH_CMD = "/garajim/cmd";
    private static final String PATH_ACK = "/garajim/ack";
    private static final String PATH_LINK = "/garajim/link";
    private static final String PENDING_PREFS = "garajim_wear_pending_command";
    private static final String KEY_PENDING_ID = "id";
    private static final String KEY_PENDING_TEXT = "command";
    private static final String KEY_PENDING_AT = "createdAt";
    private static final long COMMAND_ACK_TTL_MS = 6_500L;
    private static final long PENDING_RESTORE_TTL_MS = 120_000L;
    private static final ExecutorService IO = Executors.newSingleThreadExecutor();

    private TextView speed, meta, distanceView, durationView, maxSpeedView, status, connection, alert, track, parkInfo, mapStatus, navStrip, limitTxt, goalTxt, badgeTxt, convoyTxt;
    private android.view.View pageCockpit, pageMore;
    private MiniRouteView miniMap;
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
    private boolean parkSaved = false;
    private int lastShownSpeed = -1;
    private boolean entered;
    private boolean phoneConnected = false;
    private Boolean lastPhoneLinkUi = null; // toast için önceki durum
    private boolean connectionChecked = false;
    private boolean gpsReady = false;
    private volatile long lastStateAt = 0L;
    private long lastSyncRequestAt = 0L;
    private volatile String lastCommandSent = "";
    private volatile long lastCommandSentAt = 0L;
    private volatile String pendingCommandId = "";
    private volatile String pendingCommandText = "";
    private volatile long pendingCommandAt = 0L;
    private volatile boolean pendingResumeGrace = false;
    private volatile boolean activityResumed = false;
    private Runnable commandAckTimeout;
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
        restorePendingCommand();
        speed = findViewById(R.id.wearSpeed);
        meta = findViewById(R.id.wearMeta);
        distanceView = findViewById(R.id.wearDistance);
        durationView = findViewById(R.id.wearDuration);
        maxSpeedView = findViewById(R.id.wearMaxSpeed);
        status = findViewById(R.id.wearStatus);
        connection = findViewById(R.id.wearConnection);
        navStrip = findViewById(R.id.wearNavStrip);
        limitTxt = findViewById(R.id.wearLimitTxt);
        goalTxt = findViewById(R.id.wearGoal);
        badgeTxt = findViewById(R.id.wearBadge);
        convoyTxt = findViewById(R.id.wearConvoy);
        pageCockpit = findViewById(R.id.pageCockpit);
        pageMore = findViewById(R.id.pageMore);
        distanceView = findViewById(R.id.wearDistance);
        durationView = findViewById(R.id.wearDuration);
        maxSpeedView = findViewById(R.id.wearMaxSpeed);

        alert = findViewById(R.id.wearAlert);
        track = findViewById(R.id.wearTrack);
        parkInfo = findViewById(R.id.wearPark);
        mapStatus = findViewById(R.id.wearMapStatus);
        miniMap = findViewById(R.id.wearMiniMap);
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
        View fuelQ = findViewById(R.id.btnFuelQuick);
        if (fuelQ != null) wirePress(fuelQ, v -> send("fuel_quick"));
        View kmQ = findViewById(R.id.btnKmQuick);
        if (kmQ != null) wirePress(kmQ, v -> send("km_quick"));
        View voice = findViewById(R.id.btnVoicePin);
        if (voice != null) wirePress(voice, v -> {
            try {
                android.content.Intent si = new android.content.Intent(android.speech.RecognizerIntent.ACTION_RECOGNIZE_SPEECH);
                si.putExtra(android.speech.RecognizerIntent.EXTRA_LANGUAGE_MODEL, android.speech.RecognizerIntent.LANGUAGE_MODEL_FREE_FORM);
                si.putExtra(android.speech.RecognizerIntent.EXTRA_PROMPT, "Pin notu söyle");
                startActivityForResult(si, 4401);
            } catch (Exception e) {
                send("voice_pin");
                Toast.makeText(this, "Ses yok · pin komutu telefona gitti", Toast.LENGTH_SHORT).show();
            }
        });
        View tabC = findViewById(R.id.tabCockpit);
        View tabM = findViewById(R.id.tabMore);
        if (tabC != null) tabC.setOnClickListener(v -> showWearPage(true));
        if (tabM != null) tabM.setOnClickListener(v -> showWearPage(false));
        showWearPage(true);


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
        if (!running) send(selectedVehicleId.isEmpty() ? "start" : "start|" + selectedVehicleId);
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
        activityResumed = true;
        if (!pendingCommandId.isEmpty() && pendingResumeGrace) {
            // Kurtarma süresini komutun gönderildiği andan değil, ekrana geri dönüldüğü andan başlat.
            pendingCommandAt = System.currentTimeMillis();
            persistPendingCommand();
        }
        Wearable.getDataClient(this).addListener(this);
        Wearable.getMessageClient(this).addListener(this);
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
                    else if (path.startsWith(PATH_ACK + "/")) {
                        processAck(map.getString("id", ""), map.getBoolean("accepted", false),
                                map.getString("message", "Telefon yanıt verdi."));
                        Wearable.getDataClient(this).deleteDataItems(item.getUri());
                    }
                }
            } catch (Exception ignored) {
            } finally {
                items.release();
                // First recover a durable ACK; only then show a timeout for any still-pending command.
                scheduleCommandAckTimeout();
            }
        }).addOnFailureListener(e -> scheduleCommandAckTimeout());
    }

    @Override protected void onPause() {
        activityResumed = false;
        if (!pendingCommandId.isEmpty()) {
            // Ekran uyursa, kısa ön plan zaman aşımı yerine sonradan gelecek Data Item ACK için
            // daha uzun kurtarma penceresi kalıcı olarak saklanır.
            pendingResumeGrace = true;
            persistPendingCommand();
        }
        mainHandler.removeCallbacks(connectionTicker);
        Wearable.getDataClient(this).removeListener(this);
        Wearable.getMessageClient(this).removeListener(this);
        if (commandAckTimeout != null) mainHandler.removeCallbacks(commandAckTimeout);
        commandAckTimeout = null;
        // Komut beklemedeyken ekranın uyuması sonucu kaybolmamalı; ACK Data Layer'da tutulur.
        super.onPause();
    }

    @Override protected void onActivityResult(int requestCode, int resultCode, android.content.Intent data) {
        super.onActivityResult(requestCode, resultCode, data);
        if (requestCode == 4401 && resultCode == RESULT_OK && data != null) {
            java.util.ArrayList<String> list = data.getStringArrayListExtra(android.speech.RecognizerIntent.EXTRA_RESULTS);
            String said = (list != null && !list.isEmpty()) ? list.get(0) : "";
            send("voice_pin");
            Toast.makeText(this, said.isEmpty() ? "Pin isteği gönderildi" : ("Pin: " + said), Toast.LENGTH_SHORT).show();
        }
    }

    @Override protected void onDestroy() {
        mainHandler.removeCallbacks(connectionTicker);
        if (commandAckTimeout != null) mainHandler.removeCallbacks(commandAckTimeout);
        if (summaryDialog != null && summaryDialog.isShowing()) summaryDialog.dismiss();
        super.onDestroy();
    }

    @Override public void onMessageReceived(MessageEvent event) {
        if (event == null || !PATH_ACK.equals(event.getPath()) || event.getData() == null) return;
        try {
            JSONObject ack = new JSONObject(new String(event.getData(), StandardCharsets.UTF_8));
            processAck(ack.optString("id", ""), ack.optBoolean("accepted", false),
                    ack.optString("message", "Telefon yanıt verdi."));
        } catch (Exception ignored) { }
    }

    private void processAck(String id, boolean accepted, String message) {
        if (id == null || id.isEmpty() || !id.equals(pendingCommandId)) return;
        String command = pendingCommandText;
        clearPendingCommand();
        if (commandAckTimeout != null) mainHandler.removeCallbacks(commandAckTimeout);
        commandAckTimeout = null;
        String safeMessage = message == null ? "Telefon yanıt verdi." : message;
        runOnUiThread(() -> {
            if (!accepted) {
                Toast.makeText(this, safeMessage.isEmpty() ? "Telefon komutu kabul etmedi" : safeMessage, Toast.LENGTH_LONG).show();
            } else if (command.startsWith("request_sync") || command.startsWith("select_vehicle|")
                    || command.startsWith("summary_save|") || command.startsWith("summary_discard|")) {
                Toast.makeText(this, "Telefon komutu aldı", Toast.LENGTH_SHORT).show();
            }
        });
    }

    private void restorePendingCommand() {
        android.content.SharedPreferences prefs = getSharedPreferences(PENDING_PREFS, MODE_PRIVATE);
        String id = prefs.getString(KEY_PENDING_ID, "");
        String cmd = prefs.getString(KEY_PENDING_TEXT, "");
        long at = prefs.getLong(KEY_PENDING_AT, 0L);
        long age = System.currentTimeMillis() - at;
        if (!id.isEmpty() && !cmd.isEmpty() && at > 0 && age >= 0 && age <= PENDING_RESTORE_TTL_MS) {
            pendingCommandId = id;
            pendingCommandText = cmd;
            // Activity/process yeniden yaratıldığı için ACK Data Layer üzerinden geç gelebilir.
            // onResume() bu zaman damgasını tekrar tazeleyerek geri dönüş penceresini başlatır.
            pendingCommandAt = at;
            pendingResumeGrace = true;
            persistPendingCommand();
        } else {
            clearPendingCommand();
        }
    }

    private void persistPendingCommand() {
        getSharedPreferences(PENDING_PREFS, MODE_PRIVATE).edit()
                .putString(KEY_PENDING_ID, pendingCommandId)
                .putString(KEY_PENDING_TEXT, pendingCommandText)
                .putLong(KEY_PENDING_AT, pendingCommandAt)
                .apply();
    }

    private void clearPendingCommand() {
        pendingCommandId = "";
        pendingCommandText = "";
        pendingCommandAt = 0L;
        pendingResumeGrace = false;
        getSharedPreferences(PENDING_PREFS, MODE_PRIVATE).edit()
                .remove(KEY_PENDING_ID).remove(KEY_PENDING_TEXT).remove(KEY_PENDING_AT).apply();
    }

    private void scheduleCommandAckTimeout() {
        if (pendingCommandId.isEmpty() || pendingCommandAt <= 0L) return;
        if (commandAckTimeout != null) mainHandler.removeCallbacks(commandAckTimeout);
        final String id = pendingCommandId;
        long age = Math.max(0L, System.currentTimeMillis() - pendingCommandAt);
        // Ön planda komutlar hızlı yanıt bekler. Uyku/yeniden yaratma sonrası ACK Data Item
        // gecikebileceğinden, restore penceresinin sonuna kadar korelasyon kimliğini koru.
        long ttl = pendingResumeGrace ? PENDING_RESTORE_TTL_MS : COMMAND_ACK_TTL_MS;
        long delay = Math.max(0L, ttl - age);
        commandAckTimeout = () -> {
            if (!id.equals(pendingCommandId)) return;
            if (!activityResumed) return;
            clearPendingCommand();
            commandAckTimeout = null;
            Toast.makeText(this, "Telefon yanıt vermedi · bağlantıyı kontrol et", Toast.LENGTH_SHORT).show();
        };
        if (activityResumed) mainHandler.postDelayed(commandAckTimeout, delay);
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
                    else if (PATH_LINK.equals(path)) { phoneConnected = map.getBoolean("online", true); runOnUiThread(this::updateConnectionUi); }
                else if (path.startsWith(PATH_ACK + "/")) {
                    processAck(map.getString("id", ""), map.getBoolean("accepted", false),
                            map.getString("message", "Telefon yanıt verdi."));
                    Wearable.getDataClient(this).deleteDataItems(e.getDataItem().getUri());
                }
            }
        } finally {
            events.release();
        }
    }

    private void applyState(DataMap map) {
        final long incomingStateAt = map.getLong("ts", 0L);
        final boolean incomingNativeMode = map.getBoolean("nativeMode", false);
        final boolean incomingRunning = map.getBoolean("running", false);
        final boolean incomingPaused = map.getBoolean("paused", false);
        final double kmh = map.getDouble("kmh", 0);
        final double maxKmh = map.getDouble("maxKmh", 0);
        final double distM = map.getDouble("distM", 0);
        final int sec = map.getInt("elapsedSec", 0);
        final String plate = map.getString("plate", "");
        final String vehicleId = map.getString("vehicleId", "");
        final boolean over = map.getBoolean("overLimit", false);
        final boolean incomingGpsReady = map.getBoolean("gpsReady", false);
        final String tr = map.getString("track", "");
        final String ar = map.getString("artist", "");
        final String routeJson = map.getString("routeJson", "[]");
        final double incomingParkDist = map.getDouble("parkDistM", -1);
        final String incomingParkDir = map.getString("parkDir", "");
        final double incomingParkLat = map.getDouble("parkLat", 0);
        final double incomingParkLng = map.getDouble("parkLng", 0);
        final boolean incomingParkSaved = map.getBoolean("parkSaved",
                incomingParkDist >= 0 || incomingParkLat != 0 || incomingParkLng != 0);
        final String alertStr = map.getString("alert", "");
        final boolean hasSummary = map.getBoolean("pendingSummary", false);
        final String sumId = map.getString("summaryId", "");
        final String sumPlate = map.getString("summaryPlate", "");
        final double sumDist = map.getDouble("summaryDistM", 0);
        final int sumSec = map.getInt("summaryElapsedSec", 0);
        final double sumAvg = map.getDouble("summaryAvgKmh", 0);
        final double sumMax = map.getDouble("summaryMaxKmh", 0);
        final String navText = map.getString("navText", "");
        final double navDistM = map.getDouble("navDistM", -1);
        final double limitKmh = map.getDouble("limitKmh", 0);
        final double dailyKm = map.getDouble("dailyKm", 0);
        final double dailyGoalKm = map.getDouble("dailyGoalKm", 50);
        final String badgeText = map.getString("badgeText", "");
        final String convoyText = map.getString("convoyText", "");
        final int shown = (int) Math.round(kmh);

        runOnUiThread(() -> {
            if (incomingStateAt > 0 && lastStateAt > 0 && incomingStateAt < lastStateAt) return;
            lastStateAt = incomingStateAt > 0 ? incomingStateAt : System.currentTimeMillis();
            phoneConnected = true;
            try { updateConnectionUi(); } catch (Exception ignored) {}
            boolean stateTransition = haveInitialState && (lastStateRunning != incomingRunning || lastStatePaused != incomingPaused);
            running = incomingRunning;
            paused = incomingPaused;
            gpsReady = incomingGpsReady;
            if (navStrip != null) {
                if (navText != null && !navText.isEmpty()) {
                    String nd = navDistM >= 0 ? (navDistM >= 1000 ? String.format(java.util.Locale.US, " · %.1f km", navDistM/1000.0) : String.format(java.util.Locale.US, " · %.0f m", navDistM)) : "";
                    navStrip.setText("➤ " + navText + nd);
                    navStrip.setVisibility(View.VISIBLE);
                } else navStrip.setText("Rota yok");
            }
            if (limitTxt != null) {
                if (limitKmh > 0) {
                    limitTxt.setText(over ? ("Limit " + (int)limitKmh + "+  · AŞILDI") : ("Limit " + (int)limitKmh + " km/sa"));
                    limitTxt.setTextColor(over ? 0xFFEF4444 : 0xFF94A3B8);
                    if (over) buzz(2);
                } else limitTxt.setText("Limit kapalı");
            }
            if (goalTxt != null) {
                int pct = dailyGoalKm > 0 ? (int)Math.min(100, Math.round(100.0 * dailyKm / dailyGoalKm)) : 0;
                goalTxt.setText(String.format(java.util.Locale.US, "Günlük %.1f / %.0f km · %%%d", dailyKm, dailyGoalKm, pct));
            }
            if (badgeTxt != null) {
                if (badgeText != null && !badgeText.isEmpty()) {
                    badgeTxt.setVisibility(View.VISIBLE);
                    badgeTxt.setText(badgeText);
                    Toast.makeText(this, badgeText, Toast.LENGTH_SHORT).show();
                    buzz(1);
                }
            }
            if (convoyTxt != null) {
                convoyTxt.setText((convoyText != null && !convoyText.isEmpty()) ? convoyText : "Konvoy · yakında");
            }
            if (distanceView != null) distanceView.setText(String.format(java.util.Locale.US, "%.2f km", distM / 1000.0));
            if (durationView != null) {
                int m = sec / 60, s = sec % 60;
                durationView.setText(String.format(java.util.Locale.US, "%d:%02d", m, s));
            }
            if (maxSpeedView != null) maxSpeedView.setText("max " + shown);

            lastStateRunning = incomingRunning;
            lastStatePaused = incomingPaused;
            if (!haveInitialState) haveInitialState = true;
            if (stateTransition) buzz(1);
            parkDist = incomingParkDist;
            parkDir = incomingParkDir;
            parkSaved = incomingParkSaved;
            if (parkInfo != null && parkInfo.getVisibility() == View.VISIBLE) renderParkInfoText();
            if (miniMap != null) miniMap.setRouteJson(routeJson, incomingGpsReady, incomingRunning, incomingPaused);
            if (mapStatus != null) {
                String mapText;
                int mapColor;
                if (!incomingGpsReady) { mapText = "GPS BEKLENİYOR"; mapColor = 0xFFFBBF24; }
                else if (incomingRunning && incomingPaused) { mapText = "DURAKLATILDI"; mapColor = 0xFFFBBF24; }
                else if (incomingRunning) { mapText = "CANLI ROTA"; mapColor = 0xFF67E8F9; }
                else if (routeJson != null && routeJson.length() > 4) { mapText = "SON ROTA"; mapColor = 0xFF93C5FD; }
                else { mapText = "GPS HAZIR"; mapColor = 0xFF94A3B8; }
                mapStatus.setText(mapText);
                mapStatus.setTextColor(mapColor);
            }
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
            if (meta != null) meta.setText(plate.isEmpty() ? "Araç seçilmedi" : plate);
            if (distanceView != null) distanceView.setText(String.format(Locale.US, "%.2f km", distM / 1000.0));
            if (durationView != null) durationView.setText(String.format(Locale.US, "%d:%02d", m, s));
            if (maxSpeedView != null) maxSpeedView.setText(String.format(Locale.US, "%.0f km/sa", maxKmh));
            selectedVehicleId = vehicleId == null ? "" : vehicleId;
            selectedPlate = plate == null ? "" : plate;
            updateVehicleButton();
            updateConnectionUi();
            String st;
            if (!running) { st = hasSummary ? "Kaydedilecek sürüş var" : (incomingNativeMode ? "Arka plan sürüşü hazır" : "Hazır"); btnToggle.setText("Başlat"); }
            else if (paused) { st = incomingNativeMode ? "Duraklatıldı · arka plan" : "Duraklatıldı"; btnToggle.setText("Devam"); }
            else { st = over ? "Limit üstü" : (incomingNativeMode ? "Sürüş aktif · arka plan" : "Sürüş aktif"); btnToggle.setText("Duraklat"); }
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

    private void showWearPage(boolean cockpit) {
        if (pageCockpit != null) pageCockpit.setVisibility(cockpit ? View.VISIBLE : View.GONE);
        if (pageMore != null) pageMore.setVisibility(cockpit ? View.GONE : View.VISIBLE);
        View tabC = findViewById(R.id.tabCockpit);
        View tabM = findViewById(R.id.tabMore);
        if (tabC instanceof android.widget.Button) {
            ((android.widget.Button) tabC).setText(cockpit ? "● Kokpit" : "Kokpit");
        }
        if (tabM instanceof android.widget.Button) {
            ((android.widget.Button) tabM).setText(!cockpit ? "● Daha fazla" : "Daha fazla");
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
        // Bağlantı değişim bildirimi (bir kez)
        boolean linked = phoneConnected && connectionChecked;
        if (lastPhoneLinkUi != null && lastPhoneLinkUi != linked) {
            if (linked) Toast.makeText(this, "Telefon bağlandı", Toast.LENGTH_SHORT).show();
            else Toast.makeText(this, "Telefon bağlantısı kesildi", Toast.LENGTH_SHORT).show();
            buzz(linked ? 1 : 2);
        }
        if (connectionChecked) lastPhoneLinkUi = linked;
    }

    private void showPark() {
        if (parkInfo == null) return;
        parkInfo.setVisibility(View.VISIBLE); parkInfo.setAlpha(0f);
        renderParkInfoText();
        parkInfo.animate().alpha(1f).setDuration(220).start(); buzz(1);
    }

    /** Durum verisi geç gelirse açık park kartının metnini güncelle; her tickte titreşim üretme. */
    private void renderParkInfoText() {
        if (parkInfo == null) return;
        if (!parkSaved) {
            parkInfo.setText("Park yeri kayıtlı değil");
            return;
        }
        if (parkDist < 0) {
            parkInfo.setText("Park kayıtlı · güncel GPS bekleniyor");
            return;
        }
        String d = parkDist >= 1000 ? String.format(Locale.US, "%.1f km", parkDist / 1000.0)
                : String.format(Locale.US, "%.0f m", parkDist);
        parkInfo.setText(d + (parkDir.isEmpty() ? "" : "  ·  " + parkDir));
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
        final String commandId = UUID.randomUUID().toString();
        final String payload;
        try {
            JSONObject envelope = new JSONObject();
            envelope.put("id", commandId);
            envelope.put("cmd", cmd);
            payload = envelope.toString();
        } catch (Exception e) {
            Toast.makeText(this, "Komut hazırlanamadı", Toast.LENGTH_SHORT).show();
            return;
        }
        pendingCommandId = commandId;
        pendingCommandText = cmd;
        pendingCommandAt = now;
        pendingResumeGrace = false;
        persistPendingCommand();
        if (commandAckTimeout != null) mainHandler.removeCallbacks(commandAckTimeout);
        IO.execute(() -> {
            try {
                byte[] data = payload.getBytes(StandardCharsets.UTF_8);
                List<Node> nodes = Tasks.await(Wearable.getNodeClient(this).getConnectedNodes());
                if (nodes.isEmpty()) {
                    if (commandId.equals(pendingCommandId)) clearPendingCommand();
                    phoneConnected = false;
                    runOnUiThread(() -> {
                        updateConnectionUi();
                        Toast.makeText(this, "Telefonla bağlantı yok", Toast.LENGTH_SHORT).show();
                    });
                    return;
                }
                boolean sent = false;
                for (Node n : nodes) {
                    // Bir düğüme gönderim hatası diğer eşleşmiş düğümlere denemeyi durdurmasın.
                    try {
                        Tasks.await(Wearable.getMessageClient(this).sendMessage(n.getId(), PATH_CMD, data));
                        sent = true;
                    } catch (Exception nodeError) {
                        // Başarılı bir başka gönderim varsa ACK beklemeye devam edilir.
                    }
                }
                if (sent) {
                    runOnUiThread(() -> {
                        if (!commandId.equals(pendingCommandId)) return;
                        pendingCommandAt = System.currentTimeMillis();
                        if (!activityResumed) pendingResumeGrace = true;
                        persistPendingCommand();
                        if (activityResumed) scheduleCommandAckTimeout();
                    });
                } else {
                    if (commandId.equals(pendingCommandId)) clearPendingCommand();
                    runOnUiThread(() -> Toast.makeText(this, "Komut hiçbir bağlı cihaza iletilemedi", Toast.LENGTH_SHORT).show());
                }
            } catch (Exception e) {
                if (commandId.equals(pendingCommandId)) clearPendingCommand();
                runOnUiThread(() -> Toast.makeText(this, "Komut iletilemedi · bağlantıyı kontrol et", Toast.LENGTH_SHORT).show());
            }
        });
    }
}
