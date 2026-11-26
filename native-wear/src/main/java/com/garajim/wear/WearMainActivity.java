package com.garajim.wear;

import android.animation.AnimatorSet;
import android.animation.ObjectAnimator;
import android.app.Activity;
import android.app.AlertDialog;
import android.content.Context;
import android.graphics.drawable.Drawable;
import android.graphics.Color;
import android.graphics.drawable.GradientDrawable;
import android.os.Build;
import android.os.Bundle;
import android.os.Handler;
import android.os.Looper;
import android.os.VibrationEffect;
import android.os.Vibrator;
import android.os.VibratorManager;
import android.view.View;
import android.view.Gravity;
import android.view.ViewGroup;
import android.view.animation.DecelerateInterpolator;
import android.view.animation.OvershootInterpolator;
import android.widget.Button;
import android.widget.FrameLayout;
import android.widget.LinearLayout;
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
import java.util.ArrayDeque;
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
    private static final String PATH_ACHIEVEMENT = "/garajim/achievement";
    public static final String EXTRA_ACHIEVEMENT_PAYLOAD = "garajim_achievement_payload";
    public static volatile boolean activityVisible = false;
    public static boolean isVisibleNow() { return activityVisible; }
    private static final String PATH_CMD = "/garajim/cmd";
    private static final String PATH_ACK = "/garajim/ack";
    private static final String PATH_LINK = "/garajim/link";
    private static final String PATH_THEME = "/garajim/theme";
    private static final String PENDING_PREFS = "garajim_wear_pending_command";
    private static final String KEY_PENDING_ID = "id";
    private static final String KEY_PENDING_TEXT = "command";
    private static final String KEY_PENDING_AT = "createdAt";
    private static final long COMMAND_ACK_TTL_MS = 6_500L;
    private static final long PENDING_RESTORE_TTL_MS = 120_000L;
    private static final ExecutorService IO = Executors.newSingleThreadExecutor();

    private TextView speed, meta, distanceView, durationView, maxSpeedView, status, connection, alert, track, parkInfo, mapStatus, navStrip, limitTxt, goalTxt, badgeTxt, convoyTxt;
    private android.view.View pageCockpit, pageMore;
    private final java.util.ArrayList<LinearLayout> wearPages = new java.util.ArrayList<>();
    private TextView wearPageDots;
    private int currentWearPage = 0;
    private float swipeDownX, swipeDownY;
    private int themeBg = Color.rgb(10,10,10), themeSurface = Color.rgb(20,20,20), themeAccent = Color.rgb(239,68,68), themeText = Color.rgb(241,245,249), themeMuted = Color.rgb(148,163,184);
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
    private final ArrayDeque<JSONObject> achievementCelebrationQueue = new ArrayDeque<>();
    private FrameLayout achievementOverlay;
    private boolean achievementCelebrationShowing = false;
    private Runnable achievementOverlayTimeout;
    private static final int REQ_POST_NOTIFICATIONS = 6811;

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

    @Override public boolean dispatchTouchEvent(android.view.MotionEvent ev) {
        if (ev.getAction()==android.view.MotionEvent.ACTION_DOWN) { swipeDownX=ev.getX(); swipeDownY=ev.getY(); }
        if (ev.getAction()==android.view.MotionEvent.ACTION_UP) {
            float dx=ev.getX()-swipeDownX, dy=ev.getY()-swipeDownY;
            if (!wearPages.isEmpty() && Math.abs(dx)>dp(48) && Math.abs(dx)>Math.abs(dy)*1.35f) {
                showWearPage(currentWearPage + (dx<0 ? 1 : -1)); return true;
            }
        }
        return super.dispatchTouchEvent(ev);
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
        setupWearPages();
        showWearPage(0);
        requestAchievementNotificationPermission();
        handleAchievementIntent(getIntent());

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
        activityVisible = true;
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
                    else if (PATH_THEME.equals(path)) applyPhoneTheme(map.getString("pack", "dark-red"), map.getString("mode", "dark"));
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
        activityVisible = false;
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

    @Override protected void onNewIntent(android.content.Intent intent) {
        super.onNewIntent(intent);
        setIntent(intent);
        handleAchievementIntent(intent);
    }

    private void requestAchievementNotificationPermission() {
        if (Build.VERSION.SDK_INT >= 33 && checkSelfPermission(android.Manifest.permission.POST_NOTIFICATIONS)
                != android.content.pm.PackageManager.PERMISSION_GRANTED) {
            try { requestPermissions(new String[]{android.Manifest.permission.POST_NOTIFICATIONS}, REQ_POST_NOTIFICATIONS); }
            catch (Exception ignored) { }
        }
    }

    private void handleAchievementIntent(android.content.Intent intent) {
        if (intent == null || !intent.hasExtra(EXTRA_ACHIEVEMENT_PAYLOAD)) return;
        String payload = intent.getStringExtra(EXTRA_ACHIEVEMENT_PAYLOAD);
        intent.removeExtra(EXTRA_ACHIEVEMENT_PAYLOAD);
        if (payload != null && !payload.isEmpty()) enqueueAchievementPayload(payload);
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
        activityVisible = false;
        if (achievementOverlayTimeout != null) mainHandler.removeCallbacks(achievementOverlayTimeout);
        mainHandler.removeCallbacks(connectionTicker);
        if (commandAckTimeout != null) mainHandler.removeCallbacks(commandAckTimeout);
        if (summaryDialog != null && summaryDialog.isShowing()) summaryDialog.dismiss();
        super.onDestroy();
    }

    @Override public void onMessageReceived(MessageEvent event) {
        if (event == null || event.getData() == null) return;
        if (PATH_ACHIEVEMENT.equals(event.getPath())) {
            try { enqueueAchievementPayload(new String(event.getData(), StandardCharsets.UTF_8)); }
            catch (Exception ignored) { }
            return;
        }
        if (PATH_ALERT.equals(event.getPath())) {
            try {
                JSONObject alertPayload = new JSONObject(new String(event.getData(), StandardCharsets.UTF_8));
                applyAlert(alertPayload.optString("kind", "info"),
                        alertPayload.optString("msg", "Uyarı"),
                        alertPayload.optLong("ts", System.currentTimeMillis()));
            } catch (Exception ignored) { }
            return;
        }
        if (!PATH_ACK.equals(event.getPath())) return;
        try {
            JSONObject ack = new JSONObject(new String(event.getData(), StandardCharsets.UTF_8));
            processAck(ack.optString("id", ""), ack.optBoolean("accepted", false),
                    ack.optString("message", "Telefon yanıt verdi."));
        } catch (Exception ignored) { }
    }

    private void enqueueAchievementPayload(String rawPayload) {
        try {
            JSONObject payload = new JSONObject(rawPayload);
            JSONArray items = payload.optJSONArray("items");
            final ArrayList<JSONObject> safeItems = new ArrayList<>();
            if (items != null) {
                for (int i = 0; i < items.length() && i < 30; i++) {
                    JSONObject item = items.optJSONObject(i);
                    if (item != null && !item.optString("name", "").trim().isEmpty()) safeItems.add(new JSONObject(item.toString()));
                }
            } else if (!payload.optString("name", "").trim().isEmpty()) {
                safeItems.add(new JSONObject(payload.toString()));
            }
            if (safeItems.isEmpty()) return;
            runOnUiThread(() -> {
                for (JSONObject item : safeItems) achievementCelebrationQueue.addLast(item);
                if (!achievementCelebrationShowing) showNextAchievementCelebration();
            });
        } catch (Exception ignored) { }
    }

    private void showNextAchievementCelebration() {
        JSONObject item = achievementCelebrationQueue.pollFirst();
        if (item == null) {
            achievementCelebrationShowing = false;
            removeAchievementOverlay(false);
            return;
        }
        achievementCelebrationShowing = true;
        removeAchievementOverlay(false);
        final String name = item.optString("name", "Yeni başarım");
        final String rarity = item.optString("rarity", "common").toLowerCase(Locale.ROOT);
        final String rarityLabel = item.optString("rarityLabel", rarityLabel(rarity));
        final String description = item.optString("description", "Garajım yolculuğunda yeni bir başarı kazandın.");
        final int accent = rarityColor(rarity);

        FrameLayout content = findViewById(android.R.id.content);
        if (content == null) {
            buzzAchievementRarity(rarity);
            mainHandler.postDelayed(this::showNextAchievementCelebration, 3500L);
            return;
        }
        FrameLayout overlay = new FrameLayout(this);
        overlay.setBackgroundColor(0xD900050D);
        overlay.setClickable(true);
        overlay.setFocusable(true);

        LinearLayout card = new LinearLayout(this);
        card.setOrientation(LinearLayout.VERTICAL);
        card.setGravity(Gravity.CENTER_HORIZONTAL);
        card.setPadding(dp(16), dp(17), dp(16), dp(15));
        GradientDrawable cardBg = new GradientDrawable();
        cardBg.setColor(0xFF111827);
        cardBg.setCornerRadius(dp(24));
        cardBg.setStroke(dp(2), accent);
        card.setBackground(cardBg);
        card.setElevation(dp(8));

        TextView kicker = new TextView(this);
        kicker.setText("✦  BAŞARIM KAZANDIN  ✦");
        kicker.setTextColor(accent);
        kicker.setTextSize(10);
        kicker.setTypeface(null, android.graphics.Typeface.BOLD);
        kicker.setGravity(Gravity.CENTER);
        card.addView(kicker, new LinearLayout.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.WRAP_CONTENT));

        TextView medal = new TextView(this);
        medal.setText("🏆");
        medal.setTextSize(34);
        medal.setGravity(Gravity.CENTER);
        LinearLayout.LayoutParams medalLp = new LinearLayout.LayoutParams(ViewGroup.LayoutParams.WRAP_CONTENT, ViewGroup.LayoutParams.WRAP_CONTENT);
        medalLp.topMargin = dp(5);
        card.addView(medal, medalLp);

        TextView title = new TextView(this);
        title.setText(name);
        title.setTextColor(Color.WHITE);
        title.setTextSize(18);
        title.setTypeface(null, android.graphics.Typeface.BOLD);
        title.setGravity(Gravity.CENTER);
        title.setMaxLines(2);
        LinearLayout.LayoutParams titleLp = new LinearLayout.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.WRAP_CONTENT);
        titleLp.topMargin = dp(4);
        card.addView(title, titleLp);

        TextView rarityView = new TextView(this);
        rarityView.setText(rarityLabel.toUpperCase(Locale.ROOT));
        rarityView.setTextColor(accent);
        rarityView.setTextSize(10);
        rarityView.setTypeface(null, android.graphics.Typeface.BOLD);
        rarityView.setGravity(Gravity.CENTER);
        LinearLayout.LayoutParams rarityLp = new LinearLayout.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.WRAP_CONTENT);
        rarityLp.topMargin = dp(3);
        card.addView(rarityView, rarityLp);

        TextView body = new TextView(this);
        body.setText(description);
        body.setTextColor(0xFFD1D5DB);
        body.setTextSize(11);
        body.setGravity(Gravity.CENTER);
        body.setMaxLines(3);
        LinearLayout.LayoutParams bodyLp = new LinearLayout.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.WRAP_CONTENT);
        bodyLp.topMargin = dp(8);
        bodyLp.bottomMargin = dp(12);
        card.addView(body, bodyLp);

        Button dismiss = new Button(this);
        dismiss.setText(achievementCelebrationQueue.isEmpty() ? "Harika!" : "Sıradaki başarım");
        dismiss.setTextColor(Color.WHITE);
        dismiss.setTextSize(12);
        dismiss.setAllCaps(false);
        GradientDrawable buttonBg = new GradientDrawable();
        buttonBg.setColor(accent);
        buttonBg.setCornerRadius(dp(18));
        dismiss.setBackground(buttonBg);
        dismiss.setOnClickListener(v -> removeAchievementOverlay(true));
        card.addView(dismiss, new LinearLayout.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, dp(40)));

        FrameLayout.LayoutParams cardLp = new FrameLayout.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.WRAP_CONTENT, Gravity.CENTER);
        cardLp.setMargins(dp(12), dp(12), dp(12), dp(12));
        overlay.addView(card, cardLp);
        content.addView(overlay, new FrameLayout.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.MATCH_PARENT));
        achievementOverlay = overlay;
        overlay.setAlpha(0f);
        card.setScaleX(0.94f);
        card.setScaleY(0.94f);
        overlay.animate().alpha(1f).setDuration(180L).start();
        card.animate().scaleX(1f).scaleY(1f).setDuration(220L).setInterpolator(new OvershootInterpolator(0.7f)).start();
        buzzAchievementRarity(rarity);
        achievementOverlayTimeout = () -> removeAchievementOverlay(true);
        mainHandler.postDelayed(achievementOverlayTimeout, 8500L);
    }

    private void removeAchievementOverlay(boolean advance) {
        if (achievementOverlayTimeout != null) mainHandler.removeCallbacks(achievementOverlayTimeout);
        achievementOverlayTimeout = null;
        if (achievementOverlay != null) {
            View old = achievementOverlay;
            achievementOverlay = null;
            ViewGroup parent = (ViewGroup) old.getParent();
            if (parent != null) {
                old.animate().cancel();
                old.animate().alpha(0f).setDuration(120L).withEndAction(() -> parent.removeView(old)).start();
            }
        }
        if (advance) {
            mainHandler.postDelayed(this::showNextAchievementCelebration, 130L);
        }
    }

    private void buzzAchievementRarity(String rarity) {
        try {
            Vibrator vib;
            if (Build.VERSION.SDK_INT >= 31) {
                VibratorManager vm = (VibratorManager) getSystemService(Context.VIBRATOR_MANAGER_SERVICE);
                vib = vm != null ? vm.getDefaultVibrator() : null;
            } else vib = (Vibrator) getSystemService(Context.VIBRATOR_SERVICE);
            if (vib == null || !vib.hasVibrator()) return;
            long[] pattern;
            switch (rarity) {
                case "legendary": pattern = new long[]{0, 70, 35, 70, 35, 150, 55, 230}; break;
                case "epic": pattern = new long[]{0, 70, 40, 70, 80, 120}; break;
                case "rare": pattern = new long[]{0, 60, 45, 100}; break;
                case "uncommon": pattern = new long[]{0, 45, 60, 50}; break;
                default: pattern = new long[]{0, 45}; break;
            }
            if (Build.VERSION.SDK_INT >= 26) vib.vibrate(VibrationEffect.createWaveform(pattern, -1));
            else vib.vibrate(pattern, -1);
        } catch (Exception ignored) { }
    }

    private int rarityColor(String rarity) {
        switch (rarity) {
            case "uncommon": return 0xFF34D399;
            case "rare": return 0xFF60A5FA;
            case "epic": return 0xFFC084FC;
            case "legendary": return 0xFFFBBF24;
            default: return 0xFF9CA3AF;
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
                else if (PATH_THEME.equals(path)) applyPhoneTheme(map.getString("pack", "dark-red"), map.getString("mode", "dark"));
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
        if (map == null) return;
        applyAlert(map.getString("kind", "info"), map.getString("msg", "Uyarı"), map.getLong("ts", 0L));
    }

    private void applyAlert(String kind, String msg, long ts) {
        if (ts > 0 && ts <= lastAlertTs) return;
        lastAlertTs = ts > 0 ? ts : System.currentTimeMillis();
        final String safeMsg = msg == null ? "Uyarı" : msg;
        final String safeKind = kind == null ? "info" : kind;
        final int color = "limit".equals(safeKind) ? 0xFFEF4444
                : ("dna".equals(safeKind) ? 0xFF4ADE80 : 0xFFFBBF24);
        runOnUiThread(() -> {
            visibleAlertKind = safeKind;
            showAlertAnimated(safeMsg, color);
            if (!"limit".equals(safeKind)) {
                mainHandler.postDelayed(() -> {
                    if (safeKind.equals(visibleAlertKind) && !lastOverLimit) hideAlertAnimated();
                }, 6500L);
            }
        });
        buzz("limit".equals(safeKind) ? 2 : ("dna".equals(safeKind) ? 3 : 1));
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

    private void setupWearPages() {
        try {
            android.widget.ScrollView scroll = (android.widget.ScrollView) findViewById(android.R.id.content).getRootView().findViewById(R.id.wearConnection).getParent().getParent();
            // Existing XML has one content column. Move its existing controls into four real pages
            // without recreating IDs, so the mature ride/navigation/media wiring remains intact.
            View contentCandidate = findViewById(R.id.wearConnection);
            ViewGroup content = (ViewGroup) contentCandidate.getParent();
            while (content != null && !(content instanceof LinearLayout && content.getParent() instanceof android.widget.ScrollView)) content = (ViewGroup) content.getParent();
            if (!(content instanceof LinearLayout)) return;
            LinearLayout column = (LinearLayout) content;
            java.util.ArrayList<View> old = new java.util.ArrayList<>();
            for (int i=0; i<column.getChildCount(); i++) old.add(column.getChildAt(i));
            column.removeAllViews();
            String[] names = {"◉  KOKPİT", "♫  MÜZİK", "➤  NAVİGASYON", "▦  GARAJ"};
            for (int p=0; p<4; p++) {
                LinearLayout page = new LinearLayout(this); page.setOrientation(LinearLayout.VERTICAL); page.setGravity(Gravity.CENTER_HORIZONTAL);
                page.setPadding(dp(8), dp(5), dp(8), dp(5)); page.setTag("wear-page-"+p);
                TextView heading = new TextView(this); heading.setText(names[p]); heading.setGravity(Gravity.CENTER); heading.setTextSize(10); heading.setLetterSpacing(.12f); heading.setTextColor(themeAccent);
                LinearLayout.LayoutParams hp = new LinearLayout.LayoutParams(-1, dp(24)); hp.bottomMargin=dp(3); page.addView(heading,hp);
                wearPages.add(page); column.addView(page, new LinearLayout.LayoutParams(-1, -2));
            }
            for (int i=0; i<old.size(); i++) {
                View v=old.get(i); int id=v.getId(); int target;
                if (i==14 || id==R.id.wearTrack || id==R.id.btnPrev || id==R.id.btnPlay || id==R.id.btnNext) target=1;
                else if (id==R.id.wearNavStrip || id==R.id.wearMapCard || id==R.id.wearMiniMap || id==R.id.wearMapStatus) target=2;
                else if (i==17 || id==R.id.btnPark || id==R.id.wearPark || id==R.id.btnFuelQuick || id==R.id.btnKmQuick || id==R.id.btnVoicePin || id==R.id.wearBadge || id==R.id.wearConvoy) target=3;
                else if (id==R.id.pageCockpit || id==R.id.pageMore || id==R.id.tabCockpit || id==R.id.tabMore) continue;
                else target=0;
                if (v.getParent() instanceof ViewGroup) ((ViewGroup)v.getParent()).removeView(v);
                wearPages.get(target).addView(v);
            }
            wearPageDots = new TextView(this); wearPageDots.setGravity(Gravity.CENTER); wearPageDots.setTextSize(11); wearPageDots.setTextColor(themeMuted);
            column.addView(wearPageDots, new LinearLayout.LayoutParams(-1, dp(22)));
            // Gesture handling lives in dispatchTouchEvent so buttons remain fully clickable.
            scroll.setOnTouchListener((v, e) -> false);
        } catch (Exception e) { android.util.Log.w("GarajimWear", "page setup: "+e.getMessage()); }
    }

    private int dp(float value) { return (int)(value * getResources().getDisplayMetrics().density + .5f); }

    private void showWearPage(boolean cockpit) { showWearPage(cockpit ? 0 : 3); }
    private void showWearPage(int page) {
        if (wearPages.isEmpty()) return;
        currentWearPage = Math.max(0, Math.min(wearPages.size()-1, page));
        for (int i=0; i<wearPages.size(); i++) wearPages.get(i).setVisibility(i==currentWearPage ? View.VISIBLE : View.GONE);
        if (wearPageDots != null) {
            StringBuilder dots=new StringBuilder(); for(int i=0;i<wearPages.size();i++) dots.append(i==currentWearPage ? "●" : "○").append(i==wearPages.size()-1?"":"  ");
            wearPageDots.setText(dots.toString());
        }
    }

    private void applyPhoneTheme(String pack, String mode) {
        String id = pack == null ? "dark-red" : pack;
        int bg=Color.rgb(10,10,10), surface=Color.rgb(20,20,20), accent=Color.rgb(239,68,68), fg=Color.rgb(241,245,249), muted=Color.rgb(148,163,184);
        switch(id) {
            case "white-red": bg=0xFFF5F5F7; surface=Color.WHITE; accent=0xFFE11D48; fg=0xFF0F172A; muted=0xFF64748B; break;
            case "gunmetal": bg=0xFF12141A; surface=0xFF1C1F28; accent=0xFF64748B; fg=0xFFE2E8F0; muted=0xFF94A3B8; break;
            case "gold": bg=0xFF0C0A09; surface=0xFF1C1917; accent=0xFFEAB308; fg=0xFFFAFAF9; muted=0xFFA8A29E; break;
            case "carbon-orange": bg=0xFF0A0A0A; surface=0xFF141414; accent=0xFFF97316; fg=0xFFFAFAFA; muted=0xFFA3A3A3; break;
            case "ocean": bg=0xFF0B1220; surface=0xFF111D30; accent=0xFF0EA5E9; fg=0xFFE0F2FE; muted=0xFF93C5FD; break;
            case "forest": bg=0xFF0A120E; surface=0xFF102018; accent=0xFF10B981; fg=0xFFECFDF5; muted=0xFF6EE7B7; break;
            case "royal": bg=0xFF0F0A1A; surface=0xFF1B1230; accent=0xFF8B5CF6; fg=0xFFF5F3FF; muted=0xFFC4B5FD; break;
            case "rose-gold": bg=0xFF140F10; surface=0xFF241719; accent=0xFFF472B6; fg=0xFFFDF2F8; muted=0xFFF9A8D4; break;
            case "snow-blue": bg=0xFFF0F7FF; surface=Color.WHITE; accent=0xFF2563EB; fg=0xFF0C1929; muted=0xFF52677F; break;
            case "cream-brown": bg=0xFFFAF6F1; surface=0xFFFFFCF8; accent=0xFFB45309; fg=0xFF1C1410; muted=0xFF78685B; break;
            case "neon-mint": bg=0xFF050805; surface=0xFF0D160D; accent=0xFF4ADE80; fg=0xFFF0FDF4; muted=0xFF86EFAC; break;
            case "mist-teal": bg=0xFF101A1B; surface=0xFF192526; accent=0xFF5F938A; fg=0xFFE3EEEB; muted=0xFFA6BEB8; break;
            case "lavender-dusk": bg=0xFF18171D; surface=0xFF24222B; accent=0xFF9A88B8; fg=0xFFECE8F1; muted=0xFFB6AEC4; break;
            case "slate-blue": bg=0xFF131A22; surface=0xFF1D2630; accent=0xFF7798B2; fg=0xFFE5EBF1; muted=0xFFA9BAC8; break;
            case "soft-sage": bg=0xFFE9EEE5; surface=0xFFF5F7F1; accent=0xFF5E795F; fg=0xFF28352C; muted=0xFF647364; break;
            case "warm-sand": bg=0xFFEFE7DB; surface=0xFFFAF5EC; accent=0xFF896B4D; fg=0xFF342A20; muted=0xFF756552; break;
            case "dusty-rose": bg=0xFFF1E7E7; surface=0xFFFBF4F3; accent=0xFF955E67; fg=0xFF382B2E; muted=0xFF78666A; break;
            case "moss-stone": bg=0xFF171B17; surface=0xFF222720; accent=0xFF84976F; fg=0xFFE5E9DF; muted=0xFFAFB8A6; break;
            case "plum-ash": bg=0xFF1B181D; surface=0xFF262128; accent=0xFF9A7DA1; fg=0xFFE9E3EA; muted=0xFFBBAFBD; break;
            case "copper-smoke": bg=0xFF1C1917; surface=0xFF28231F; accent=0xFFA77D5D; fg=0xFFEEE6DF; muted=0xFFB8A99A; break;
            case "blue-hour": bg=0xFF121A27; surface=0xFF1A2636; accent=0xFF7E97BD; fg=0xFFE2EAF4; muted=0xFFA6B5CC; break;
            case "soft-olive": bg=0xFFECEEE3; surface=0xFFF7F8F1; accent=0xFF646F4A; fg=0xFF2E3629; muted=0xFF68725E; break;
            case "paper-ink": bg=0xFFECEBE4; surface=0xFFF7F6EF; accent=0xFF5E7268; fg=0xFF30322E; muted=0xFF696E67; break;
        }
        if ("light".equals(mode) && !id.equals("dark-red") && !id.equals("gunmetal") && !id.equals("gold") && !id.equals("carbon-orange") && !id.equals("ocean") && !id.equals("forest") && !id.equals("royal") && !id.equals("rose-gold") && !id.equals("neon-mint")) { /* palette already light */ }
        themeBg=bg; themeSurface=surface; themeAccent=accent; themeText=fg; themeMuted=muted;
        runOnUiThread(() -> {
            View root=findViewById(android.R.id.content); if(root!=null) root.setBackgroundColor(themeBg);
            for (LinearLayout page: wearPages) { page.setBackgroundColor(themeBg); tintThemeTree(page); if (page.getChildCount()>0 && page.getChildAt(0) instanceof TextView) ((TextView)page.getChildAt(0)).setTextColor(themeAccent); }
            if (wearPageDots!=null) wearPageDots.setTextColor(themeMuted);
        });
    }

    private void tintThemeTree(View view) {
        if (view instanceof Button) {
            Button b=(Button)view; GradientDrawable d=new GradientDrawable(); d.setColor(themeSurface); d.setCornerRadius(dp(14)); d.setStroke(dp(1), withAlpha(themeAccent, 150)); b.setBackground(d); b.setTextColor(themeText);
            if (b.getId()==R.id.btnToggle) { d.setColor(themeAccent); b.setTextColor(contrastText(themeAccent)); }
        } else if (view instanceof TextView) {
            TextView t=(TextView)view; int id=t.getId();
            if (id==R.id.wearConnection || id==R.id.wearAlert || id==R.id.wearBadge) return;
            if (id==R.id.wearNavStrip || id==R.id.wearMapCard || id==R.id.wearSpeedRing) {
                GradientDrawable d=new GradientDrawable(); d.setColor(themeSurface); d.setCornerRadius(dp(14)); d.setStroke(dp(1), withAlpha(themeAccent, 80)); t.setBackground(d);
            }
            t.setTextColor((id==R.id.wearStatus || id==R.id.wearDuration || id==R.id.wearMaxSpeed || id==R.id.wearDistance || id==R.id.wearMapStatus || id==R.id.wearLimitTxt) ? themeMuted : themeText);
        } else if (view instanceof ViewGroup) {
            ViewGroup g=(ViewGroup)view;
            if (view.getId()==R.id.wearSpeedRing || view.getId()==R.id.wearMapCard || view.getId()==R.id.wearNavStrip) {
                GradientDrawable d=new GradientDrawable(); d.setColor(themeSurface); d.setCornerRadius(dp(16)); d.setStroke(dp(1), withAlpha(themeAccent, 100)); view.setBackground(d);
            }
            for(int i=0;i<g.getChildCount();i++) tintThemeTree(g.getChildAt(i));
        }
    }
    /** Kontrastı korumak için vurgu renginin parlaklığına göre siyah/beyaz metin seçer. */
    private int contrastText(int color) {
        double r = Color.red(color) / 255.0, g = Color.green(color) / 255.0, b = Color.blue(color) / 255.0;
        r = r <= 0.04045 ? r / 12.92 : Math.pow((r + 0.055) / 1.055, 2.4);
        g = g <= 0.04045 ? g / 12.92 : Math.pow((g + 0.055) / 1.055, 2.4);
        b = b <= 0.04045 ? b / 12.92 : Math.pow((b + 0.055) / 1.055, 2.4);
        double luminance = 0.2126 * r + 0.7152 * g + 0.0722 * b;
        return luminance > 0.179 ? 0xFF101010 : Color.WHITE;
    }

    private int withAlpha(int color, int alpha) { return (color & 0x00FFFFFF) | ((alpha & 0xFF) << 24); }

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
