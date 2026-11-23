package com.garajim.app;

import android.Manifest;
import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.app.Service;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.content.pm.PackageManager;
import android.content.pm.ServiceInfo;
import android.location.Location;
import android.location.LocationListener;
import android.location.LocationManager;
import android.os.Build;
import android.os.Handler;
import android.os.IBinder;
import android.os.Looper;
import android.os.SystemClock;
import android.util.Log;
import android.widget.Toast;

import androidx.core.app.NotificationCompat;

import org.json.JSONArray;
import org.json.JSONException;
import org.json.JSONObject;

import java.util.Locale;
import java.util.UUID;

/**
 * Garajım için kalıcı saat-kontrol/yerel sürüş servisi.
 * WebView çalışırken mevcut JS sürüş motoru kullanılmaya devam eder. Activity/WebView yoksa
 * saat komutları bu servis tarafından işlenir ve GPS/özet, SharedPreferences'a dayanıklı yazılır.
 */
public class GarajimRideService extends Service {
    public static final String CHANNEL_ID = "garajim_ride";
    public static final int NOTIF_ID = 7411;
    public static final String EXTRA_TITLE = "title";
    public static final String EXTRA_TEXT = "text";

    private static final String TAG = "GarajimRideService";
    private static final String PREFS = "garajim_native_ride";
    private static final String KEY_ARMED = "armed";
    private static final String KEY_STATE = "native_state_json";
    private static final String KEY_WEB_SNAPSHOT = "web_snapshot_json";
    private static final String KEY_VEHICLES = "vehicles_json";
    private static final String KEY_HANDOFFS = "handoffs_json";

    private static final String ACTION_ARM = "com.garajim.app.ride.ARM";
    private static final String ACTION_UPDATE = "com.garajim.app.ride.UPDATE";
    private static final String ACTION_COMMAND = "com.garajim.app.ride.COMMAND";
    private static final String ACTION_TAKEOVER = "com.garajim.app.ride.TAKEOVER";
    private static final String ACTION_VEHICLES = "com.garajim.app.ride.VEHICLES";
    private static final String EXTRA_COMMAND = "command";
    private static final String EXTRA_ARGUMENT = "argument";
    private static final long TICK_MS = 1000L;
    private static final long PERSIST_INTERVAL_MS = 10_000L;
    private static final long SNAPSHOT_STALE_MS = 18_000L;
    private static final int MAX_POINTS = 6000;

    private final Handler handler = new Handler(Looper.getMainLooper());
    private SharedPreferences prefs;
    private LocationManager locationManager;
    private LocationListener locationListener;
    private JSONObject state;
    private long lastTickElapsedRealtime;
    private long lastPersistAt;
    private long lastNotificationAt;
    private boolean locationRegistered;
    private boolean startedInForeground;
    private static volatile long lastLocationOffToastAt;

    public static boolean hasForegroundLocationPermission(Context ctx) {
        return ctx.checkSelfPermission(Manifest.permission.ACCESS_FINE_LOCATION) == PackageManager.PERMISSION_GRANTED
                || ctx.checkSelfPermission(Manifest.permission.ACCESS_COARSE_LOCATION) == PackageManager.PERMISSION_GRANTED;
    }

    /** Uygulama görünürken çağrılır; servis önceden çalışırsa ekran sonradan kapansa da saat komutlarını alabilir. */
    public static void armIfPermitted(Context ctx) {
        if (!hasForegroundLocationPermission(ctx)) return;
        if (!isLocationEnabled(ctx)) {
            // Servis daha önce kurulmuşsa onu yeniden başlatmaya zorlama; yoksa kullanıcıyı açıkça uyar.
            if (!isArmed(ctx) && ctx instanceof android.app.Activity) {
                long now = System.currentTimeMillis();
                if (now - lastLocationOffToastAt > 30_000L) {
                    lastLocationOffToastAt = now;
                    Toast.makeText(ctx, "Saatten sürüş için Konum/GPS'i aç ve Garajım'ı bir kez açık bırak.", Toast.LENGTH_LONG).show();
                }
            }
            return;
        }
        Intent i = new Intent(ctx, GarajimRideService.class);
        i.setAction(ACTION_ARM);
        try {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) ctx.startForegroundService(i);
            else ctx.startService(i);
        } catch (Exception e) {
            Log.w(TAG, "Arka plan kontrol servisi başlatılamadı: " + e.getMessage());
        }
    }

    public static boolean isLocationEnabled(Context ctx) {
        try {
            LocationManager lm = (LocationManager) ctx.getApplicationContext().getSystemService(Context.LOCATION_SERVICE);
            if (lm == null) return false;
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.P) return lm.isLocationEnabled();
            return lm.isProviderEnabled(LocationManager.GPS_PROVIDER)
                    || lm.isProviderEnabled(LocationManager.NETWORK_PROVIDER);
        } catch (Exception e) { return false; }
    }

    /** JS sürüş ekranından gelen bildirim isteği; servis kapatılmaz, yalnızca metni yenilenir. */
    public static void start(Context ctx, String title, String text) {
        Intent i = new Intent(ctx, GarajimRideService.class);
        i.setAction(ACTION_UPDATE);
        i.putExtra(EXTRA_TITLE, title);
        i.putExtra(EXTRA_TEXT, text);
        startServiceSafely(ctx, i);
    }

    /** Sürüş bittiğinde kalıcı saat-kontrol servisi açık kalsın; bildirimi hazır durumuna döndür. */
    public static void stop(Context ctx) {
        Intent i = new Intent(ctx, GarajimRideService.class);
        i.setAction(ACTION_UPDATE);
        i.putExtra(EXTRA_TITLE, "Garajım · Saat bağlantısı hazır");
        i.putExtra(EXTRA_TEXT, "Sürüşü Galaxy Watch üzerinden başlatabilirsin.");
        startServiceSafely(ctx, i);
    }

    private static void startServiceSafely(Context ctx, Intent i) {
        try {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) ctx.startForegroundService(i);
            else ctx.startService(i);
        } catch (Exception e) {
            Log.w(TAG, "Servis komutu başlatılamadı: " + e.getMessage());
        }
    }

    public static boolean isArmed(Context ctx) {
        return ctx.getApplicationContext().getSharedPreferences(PREFS, MODE_PRIVATE).getBoolean(KEY_ARMED, false);
    }

    public static boolean isNativeRideManaged(Context ctx) {
        try {
            JSONObject s = new JSONObject(ctx.getApplicationContext().getSharedPreferences(PREFS, MODE_PRIVATE)
                    .getString(KEY_STATE, "{}"));
            return s.optBoolean("nativeMode", false);
        } catch (Exception e) { return false; }
    }

    public static String getNativeStateJson(Context ctx) {
        return ctx.getApplicationContext().getSharedPreferences(PREFS, MODE_PRIVATE)
                .getString(KEY_STATE, "{}");
    }

    public static String getHandoffsJson(Context ctx) {
        return ctx.getApplicationContext().getSharedPreferences(PREFS, MODE_PRIVATE)
                .getString(KEY_HANDOFFS, "[]");
    }

    public static void ackHandoffs(Context ctx, String idsJson) {
        SharedPreferences p = ctx.getApplicationContext().getSharedPreferences(PREFS, MODE_PRIVATE);
        try {
            JSONArray ids = new JSONArray(idsJson == null ? "[]" : idsJson);
            java.util.HashSet<String> acknowledged = new java.util.HashSet<>();
            for (int i = 0; i < ids.length(); i++) acknowledged.add(ids.optString(i, ""));
            JSONArray old = new JSONArray(p.getString(KEY_HANDOFFS, "[]"));
            JSONArray kept = new JSONArray();
            for (int i = 0; i < old.length(); i++) {
                JSONObject item = old.optJSONObject(i);
                if (item != null && !acknowledged.contains(item.optString("id", ""))) kept.put(item);
            }
            p.edit().putString(KEY_HANDOFFS, kept.toString()).commit();
        } catch (Exception e) { Log.w(TAG, "handoff ack: " + e.getMessage()); }
    }

    /** Web uygulamasından gelen son sürüş taslağı; Activity kapanırsa native motor bu noktadan devralabilir. */
    public static synchronized void syncWebSnapshot(Context ctx, String json) {
        if (ctx == null || json == null) return;
        SharedPreferences p = ctx.getApplicationContext().getSharedPreferences(PREFS, MODE_PRIVATE);
        try {
            JSONObject incoming = new JSONObject(json);
            // Native sürüş artık tek otoritedir; eski WebView taslağının üzerine yazılmasına izin verme.
            JSONObject nativeState = new JSONObject(p.getString(KEY_STATE, "{}"));
            if (nativeState.optBoolean("nativeMode", false)) return;
            long now = System.currentTimeMillis();
            incoming.put("snapshotAt", now);
            String startedAt = incoming.optString("startedAt", "");
            JSONObject previous = new JSONObject(p.getString(KEY_WEB_SNAPSHOT, "{}"));
            boolean sameSession = !startedAt.isEmpty() && startedAt.equals(previous.optString("startedAt", ""));
            boolean reset = incoming.optBoolean("resetPoints", false) || !sameSession;
            JSONArray merged = reset ? new JSONArray() : previous.optJSONArray("pts");
            if (merged == null) merged = new JSONArray();
            JSONArray delta = incoming.optJSONArray("pts");
            int pointStart = Math.max(0, incoming.optInt("pointStart", 0));
            int previousTotal = reset ? pointStart : Math.max(0, previous.optInt("pointsTotal", merged.length()));
            if (delta != null) {
                if (pointStart > previousTotal && previousTotal > 0) incoming.put("gap", true);
                // pointStart, pointsTotal bütün rota için mutlak indekslerdir; depoda en son 6000 nokta tutulur.
                int skip = Math.max(0, previousTotal - pointStart);
                for (int i = skip; i < delta.length(); i++) {
                    merged.put(delta.opt(i));
                    while (merged.length() > MAX_POINTS) merged.remove(0);
                }
            }
            incoming.put("pts", merged);
            incoming.put("pointsTotal", Math.max(previousTotal, incoming.optInt("pointsTotal", pointStart + (delta == null ? 0 : delta.length()))));
            incoming.remove("resetPoints"); incoming.remove("pointStart");
            p.edit().putString(KEY_WEB_SNAPSHOT, incoming.toString()).commit();
        } catch (Exception e) { Log.w(TAG, "web snapshot: " + e.getMessage()); }
    }

    public static void setSelectedVehicle(Context ctx, String id) {
        if (ctx == null || id == null || id.trim().isEmpty()) return;
        SharedPreferences p = ctx.getApplicationContext().getSharedPreferences(PREFS, MODE_PRIVATE);
        try {
            JSONObject s = new JSONObject(p.getString(KEY_STATE, "{}"));
            if (s.optBoolean("nativeMode", false) || id.equals(s.optString("vehicleId", ""))) return;
            String plate = "";
            JSONArray arr = new JSONArray(p.getString(KEY_VEHICLES,
                    ctx.getApplicationContext().getSharedPreferences("garajim_widget", MODE_PRIVATE).getString("vehicles_json", "[]")));
            for (int i = 0; i < arr.length(); i++) {
                JSONObject v = arr.optJSONObject(i);
                if (v != null && id.equals(v.optString("id", ""))) {
                    plate = v.optString("plate", "");
                    if (plate.isEmpty()) plate = v.optString("name", (v.optString("brand", "") + " " + v.optString("model", "")).trim());
                    break;
                }
            }
            s.put("vehicleId", id); s.put("plate", plate);
            p.edit().putString(KEY_STATE, s.toString()).commit();
            Intent i = new Intent(ctx, GarajimRideService.class); i.setAction(ACTION_VEHICLES); startServiceSafely(ctx, i);
        } catch (Exception e) { Log.w(TAG, "vehicle selection persist: " + e.getMessage()); }
    }

    public static void setVehicles(Context ctx, String json) {
        if (ctx == null || json == null) return;
        String clean = json.trim().isEmpty() ? "[]" : json;
        SharedPreferences p = ctx.getApplicationContext().getSharedPreferences(PREFS, MODE_PRIVATE);
        if (clean.equals(p.getString(KEY_VEHICLES, null))) return;
        p.edit().putString(KEY_VEHICLES, clean).apply();
        Intent i = new Intent(ctx, GarajimRideService.class);
        i.setAction(ACTION_VEHICLES);
        startServiceSafely(ctx, i);
    }

    /** WearableListenerService çağırır. Servis zaten silinmeden önce kurulmuş olmalıdır. */
    public static void dispatchWatchCommand(Context ctx, String action, String argument) {
        Intent i = new Intent(ctx, GarajimRideService.class);
        i.setAction(ACTION_COMMAND);
        i.putExtra(EXTRA_COMMAND, action == null ? "" : action);
        i.putExtra(EXTRA_ARGUMENT, argument == null ? "" : argument);
        startServiceSafely(ctx, i);
    }

    /** Activity kapanırken son JS oturumunu native takip motoruna devret. */
    public static void takeOverWebRide(Context ctx) {
        Intent i = new Intent(ctx, GarajimRideService.class);
        i.setAction(ACTION_TAKEOVER);
        startServiceSafely(ctx, i);
    }

    @Override public void onCreate() {
        super.onCreate();
        prefs = getApplicationContext().getSharedPreferences(PREFS, MODE_PRIVATE);
        locationManager = (LocationManager) getSystemService(LOCATION_SERVICE);
        state = readState();
        locationListener = new LocationListener() {
            @Override public void onLocationChanged(Location location) { handleLocation(location); }
            @Override public void onProviderEnabled(String provider) { publishState(); }
            @Override public void onProviderDisabled(String provider) {
                if (LocationManager.GPS_PROVIDER.equals(provider) && isNativeRunning()) {
                    pushAlert("info", "GPS kapalı. Garajım sürüş kaydı konum bekliyor.");
                }
            }
        };
    }

    @Override public int onStartCommand(Intent intent, int flags, int startId) {
        if (prefs == null) prefs = getApplicationContext().getSharedPreferences(PREFS, MODE_PRIVATE);
        if (!ensureForeground()) {
            if (prefs != null && !startedInForeground) prefs.edit().putBoolean(KEY_ARMED, false).apply();
            stopSelf();
            return START_NOT_STICKY;
        }
        String action = intent == null ? ACTION_ARM : intent.getAction();
        if (action == null || ACTION_ARM.equals(action)) {
            prefs.edit().putBoolean(KEY_ARMED, true).apply();
            pushVehiclesSnapshot();
            maybeTakeOverStaleWebSession();
            publishState();
        } else if (ACTION_COMMAND.equals(action)) {
            if (!MainActivity.hasLiveBridge() && !state.optBoolean("nativeMode", false)) takeOverWebSession();
            handleCommand(intent.getStringExtra(EXTRA_COMMAND), intent.getStringExtra(EXTRA_ARGUMENT));
        } else if (ACTION_TAKEOVER.equals(action)) {
            takeOverWebSession();
        } else if (ACTION_VEHICLES.equals(action)) {
            state = readState();
            pushVehiclesSnapshot();
            publishState();
        } else if (ACTION_UPDATE.equals(action)) {
            String title = intent.getStringExtra(EXTRA_TITLE);
            String text = intent.getStringExtra(EXTRA_TEXT);
            updateNotification(title, text, true);
        }
        handler.removeCallbacks(ticker);
        handler.post(ticker);
        if (isNativeRunning() && !state.optBoolean("paused", false)) startLocationUpdates();
        return START_STICKY;
    }

    private boolean ensureForeground() {
        // Servis zaten foreground ise her Wearable mesajında startForeground'u yeniden çağırma.
        if (startedInForeground) return true;
        ensureChannel();
        if (!hasForegroundLocationPermission(this)) {
            pushAlert("info", "Saatten sürüş için Garajım konum izni gerekli. Uygulamayı açıp konumu etkinleştir.");
            return false;
        }
        if (!isLocationEnabled(this)) {
            pushAlert("info", "Konum/GPS kapalı. Konumu açıp Garajım'ı bir kez aç; sonra saatten sürüş başlatabilirsin.");
            return false;
        }
        Notification n = buildNotification(null, null);
        try {
            if (Build.VERSION.SDK_INT >= 29) {
                startForeground(NOTIF_ID, n, ServiceInfo.FOREGROUND_SERVICE_TYPE_LOCATION);
            } else {
                startForeground(NOTIF_ID, n);
            }
            startedInForeground = true;
            return true;
        } catch (Exception e) {
            Log.w(TAG, "startForeground başarısız: " + e.getMessage());
            return false;
        }
    }

    private void handleCommand(String action, String argument) {
        if (action == null) return;
        if ("wear_request_sync".equals(action)) {
            if (!MainActivity.hasLiveBridge() && !state.optBoolean("nativeMode", false)) takeOverWebSession();
            pushVehiclesSnapshot();
            publishState();
            return;
        }
        if ("wear_select_vehicle".equals(action)) {
            if (isNativeRunning()) {
                pushAlert("info", "Aktif sürüşte araç değiştirilemez. Önce sürüşü bitir.");
                return;
            }
            if (state.optBoolean("pendingSummary", false)) {
                pushAlert("info", "Önce bekleyen sürüş özetini kaydet veya sil.");
                return;
            }
            String id = argument == null ? "" : argument.trim();
            if (id.isEmpty() || findVehicle(id) == null) {
                pushAlert("info", "Araç listesi hazır değil. Garajım'ı açıp araçları eşitle.");
                return;
            }
            statePut("vehicleId", id);
            statePut("plate", plateFor(id));
            saveState();
            pushAlert("info", "Araç seçildi · " + plateFor(id));
            publishState();
            return;
        }
        if ("wear_music_next".equals(action) || "wear_music_prev".equals(action)
                || "wear_music_playpause".equals(action) || "wear_park_where".equals(action)) {
            pushAlert("info", "Bu kısayol için telefon Garajım oturumu açık olmalı.");
            return;
        }
        if ("wear_start".equals(action)) {
            // Eski/stale ekran yanlışlıkla start gönderirse aktif oturumun aracını asla değiştirme.
            if (isNativeRunning()) {
                if (state.optBoolean("paused", false)) resumeNativeRide();
                else publishState();
                return;
            }
            if (state.optBoolean("pendingSummary", false)) {
                pushAlert("info", "Önce bekleyen sürüş özetini kaydet veya sil.");
                return;
            }
            String id = argument == null ? "" : argument.trim();
            if (!id.isEmpty()) {
                if (findVehicle(id) == null) {
                    pushAlert("info", "Seçilen araç bulunamadı. Telefonu açıp araç listesini eşitle.");
                    return;
                }
                statePut("vehicleId", id);
                statePut("plate", plateFor(id));
            }
            startNativeRide();
            return;
        }
        if ("wear_resume".equals(action)) {
            if (state.optBoolean("pendingSummary", false)) {
                pushAlert("info", "Önce bekleyen sürüş özetini kaydet veya sil.");
                return;
            }
            if (!isNativeRunning()) {
                pushAlert("info", "Devam ettirilecek bir sürüş yok. Yeni sürüş için Başlat düğmesini kullan.");
                publishState();
                return;
            }
            if (state.optBoolean("paused", false)) resumeNativeRide(); else publishState();
            return;
        }
        if ("wear_pause".equals(action)) { pauseNativeRide(); return; }
        if ("wear_toggle".equals(action)) {
            if (state.optBoolean("pendingSummary", false)) {
                pushAlert("info", "Önce bekleyen sürüş özetini kaydet veya sil.");
                return;
            }
            if (!isNativeRunning()) { startNativeRide(); return; }
            if (state.optBoolean("paused", false)) resumeNativeRide(); else pauseNativeRide();
            return;
        }
        if ("wear_stop_request".equals(action)) {
            pushAlert("info", "Bitirme onayını saat ekranından ver.");
            return;
        }
        if ("wear_finish_confirmed".equals(action)) { finishNativeRide(); return; }
        if ("wear_summary_save".equals(action)) { saveNativeSummary(argument); return; }
        if ("wear_summary_discard".equals(action)) { discardNativeSummary(argument); return; }
    }

    private void startNativeRide() {
        if (state.optBoolean("pendingSummary", false)) {
            pushAlert("info", "Önce bekleyen sürüş özetini kaydet veya sil.");
            return;
        }
        String vehicleId = state.optString("vehicleId", "");
        if (vehicleId.isEmpty()) {
            JSONArray vehicles = vehiclesArray();
            if (vehicles.length() == 1) vehicleId = vehicles.optJSONObject(0).optString("id", "");
        }
        if (vehicleId.isEmpty() || findVehicle(vehicleId) == null) {
            pushAlert("info", "Önce saatten bir araç seç; araç listesi için telefonu bir kez aç.");
            return;
        }
        if (!hasForegroundLocationPermission(this)) {
            pushAlert("info", "Konum izni gerekli. Garajım ayarlarından konuma izin ver.");
            return;
        }
        if (!isLocationEnabled(this) || locationManager == null
                || !locationManager.isProviderEnabled(LocationManager.GPS_PROVIDER)) {
            pushAlert("info", "GPS kapalı. Telefonda Konum'u aç, sonra saatten yeniden başlat.");
            publishState();
            return;
        }
        // Once the native service starts a new session, an older WebView snapshot must not be replayed.
        prefs.edit().remove(KEY_WEB_SNAPSHOT).commit();
        state = new JSONObject();
        statePut("nativeMode", true);
        statePut("running", true);
        statePut("paused", false);
        statePut("gpsReady", false);
        statePut("vehicleId", vehicleId);
        statePut("plate", plateFor(vehicleId));
        statePut("startedAt", System.currentTimeMillis());
        statePut("elapsedMs", 0L);
        statePut("distM", 0.0);
        statePut("kmh", 0.0);
        statePut("maxKmh", 0.0);
        statePut("gap", false);
        statePut("points", new JSONArray());
        statePut("hasStart", false);
        statePut("hasLast", false);
        statePut("pendingSummary", false);
        statePut("summaryId", "");
        statePut("alert", "");
        lastTickElapsedRealtime = SystemClock.elapsedRealtime();
        saveState();
        startLocationUpdates();
        updateNotification("Garajım · Açık Dünya", "Sürüş başladı · " + plateFor(vehicleId), true);
        pushAlert("info", "Sürüş başladı · " + plateFor(vehicleId));
        publishState();
    }

    private void resumeNativeRide() {
        if (!state.optBoolean("nativeMode", false)) { startNativeRide(); return; }
        if (state.optBoolean("pendingSummary", false)) {
            pushAlert("info", "Önce bekleyen sürüş özetini kaydet veya sil.");
            return;
        }
        if (!hasForegroundLocationPermission(this)) {
            pushAlert("info", "Konum izni gerekli. Garajım ayarlarından konuma izin ver.");
            return;
        }
        if (!isLocationEnabled(this) || locationManager == null
                || !locationManager.isProviderEnabled(LocationManager.GPS_PROVIDER)) {
            pushAlert("info", "GPS kapalı. Telefonda Konum'u aç, sonra saatten devam et.");
            publishState();
            return;
        }
        statePut("running", true);
        statePut("paused", false);
        statePut("hasLast", false); // duraklatma sonrasında aradaki mesafe eklenmesin
        lastTickElapsedRealtime = SystemClock.elapsedRealtime();
        saveState();
        startLocationUpdates();
        updateNotification("Garajım · Açık Dünya", "Sürüş devam ediyor · " + state.optString("plate", ""), true);
        publishState();
    }

    private void pauseNativeRide() {
        if (!isNativeRunning() || state.optBoolean("paused", false)) {
            pushAlert("info", "Duraklatılacak aktif sürüş yok.");
            return;
        }
        accumulateElapsed();
        statePut("paused", true);
        statePut("kmh", 0.0);
        stopLocationUpdates();
        saveState();
        updateNotification("Garajım · Sürüş duraklatıldı", "Devam etmek için saatini kullan.", true);
        pushAlert("info", "Sürüş duraklatıldı.");
        publishState();
    }

    private void finishNativeRide() {
        if (!isNativeRunning()) {
            if (state.optBoolean("pendingSummary", false)) pushAlert("info", "Bekleyen sürüş özeti zaten hazır.");
            else pushAlert("info", "Bitirilecek aktif sürüş yok.");
            return;
        }
        accumulateElapsed();
        stopLocationUpdates();
        double dist = state.optDouble("distM", 0.0);
        double sec = Math.max(0, state.optLong("elapsedMs", 0L) / 1000.0);
        double max = state.optDouble("maxKmh", 0.0);
        JSONObject start = null, end = null;
        try {
            if (state.optBoolean("hasStart", false)) start = new JSONObject().put("lat", state.optDouble("startLat", 0)).put("lng", state.optDouble("startLng", 0));
            if (state.optBoolean("hasLast", false)) end = new JSONObject().put("lat", state.optDouble("lastLat", 0)).put("lng", state.optDouble("lastLng", 0));
            JSONObject summary = new JSONObject();
            summary.put("id", "native_" + UUID.randomUUID().toString().replace("-", "").substring(0, 16));
            summary.put("date", formatIso(state.optLong("startedAt", System.currentTimeMillis())));
            summary.put("endedAt", formatIso(System.currentTimeMillis()));
            summary.put("dist", dist);
            summary.put("time", sec);
            summary.put("avg", sec > 0 ? (dist / 1000.0) / (sec / 3600.0) : 0.0);
            summary.put("max", max);
            summary.put("pts", state.optJSONArray("points") == null ? new JSONArray() : state.optJSONArray("points"));
            summary.put("start", start == null ? JSONObject.NULL : start);
            summary.put("end", end == null ? JSONObject.NULL : end);
            summary.put("incompleteGps", !state.optBoolean("gpsReady", false) || state.optJSONArray("points") == null || state.optJSONArray("points").length() < 2);
            summary.put("gap", state.optBoolean("gap", false));
            summary.put("vehicleId", state.optString("vehicleId", ""));
            summary.put("hardBrakes", 0);
            summary.put("score", 0);
            summary.put("favorite", false);
            summary.put("nativeBackground", true);
            statePut("running", false);
            statePut("paused", false);
            statePut("kmh", 0.0);
            statePut("pendingSummary", true);
            statePut("summary", summary);
            statePut("summaryId", summary.optString("id", ""));
            statePut("summaryPlate", state.optString("plate", ""));
            statePut("summaryDistM", dist);
            statePut("summaryElapsedSec", (int) sec);
            statePut("summaryAvgKmh", summary.optDouble("avg", 0));
            statePut("summaryMaxKmh", max);
            saveState();
            updateNotification("Garajım · Sürüş tamamlandı", "Saatinden kaydet veya sil.", true);
            pushAlert("info", "Sürüş tamamlandı · özeti saatten kaydet veya sil.");
            publishState();
        } catch (Exception e) {
            Log.e(TAG, "Özet oluşturulamadı", e);
            pushAlert("info", "Sürüş özeti oluşturulamadı. Garajım'ı açıp tekrar dene.");
        }
    }

    private void saveNativeSummary(String requestedId) {
        JSONObject summary = state.optJSONObject("summary");
        if (!state.optBoolean("pendingSummary", false) || summary == null) {
            pushAlert("info", "Kaydedilecek sürüş özeti yok."); return;
        }
        String id = summary.optString("id", "");
        if (requestedId != null && requestedId.contains("|") ) requestedId = requestedId.substring(requestedId.lastIndexOf('|') + 1);
        if (requestedId != null && !requestedId.isEmpty() && !requestedId.equals(id)) {
            pushAlert("info", "Sürüş özeti değişmiş. Ekranı yenile."); return;
        }
        try {
            JSONArray handoffs = new JSONArray(prefs.getString(KEY_HANDOFFS, "[]"));
            boolean exists = false;
            for (int i = 0; i < handoffs.length(); i++) if (id.equals(handoffs.optJSONObject(i).optString("id", ""))) exists = true;
            if (!exists) handoffs.put(summary);
            prefs.edit().putString(KEY_HANDOFFS, handoffs.toString()).commit();
            statePut("nativeMode", false);
            statePut("pendingSummary", false);
            statePut("summary", JSONObject.NULL);
            statePut("summaryId", "");
            statePut("summaryPlate", "");
            statePut("summaryDistM", 0.0); statePut("summaryElapsedSec", 0); statePut("summaryAvgKmh", 0.0); statePut("summaryMaxKmh", 0.0);
            statePut("points", new JSONArray()); statePut("distM", 0.0); statePut("elapsedMs", 0L); statePut("maxKmh", 0.0);
            statePut("startedAt", 0L); statePut("hasStart", false); statePut("hasLast", false); statePut("gpsReady", false);
            saveState();
            updateNotification("Garajım · Saat bağlantısı hazır", "Kaydedilen sürüş telefonda açıldığında geçmişe aktarılacak.", true);
            pushAlert("info", "Sürüş saatte kaydedildi. Telefon uygulaması açılınca geçmişe aktarılacak.");
            publishState();
        } catch (Exception e) { Log.e(TAG, "Sürüş handoff kaydedilemedi", e); pushAlert("info", "Sürüş kaydedilemedi; tekrar dene."); }
    }

    private void discardNativeSummary(String requestedId) {
        JSONObject summary = state.optJSONObject("summary");
        if (!state.optBoolean("pendingSummary", false) || summary == null) { pushAlert("info", "Silinecek sürüş özeti yok."); return; }
        String id = summary.optString("id", "");
        if (requestedId != null && requestedId.contains("|")) requestedId = requestedId.substring(requestedId.lastIndexOf('|') + 1);
        if (requestedId != null && !requestedId.isEmpty() && !requestedId.equals(id)) { pushAlert("info", "Sürüş özeti değişmiş. Ekranı yenile."); return; }
        statePut("nativeMode", false); statePut("pendingSummary", false); statePut("summary", JSONObject.NULL);
        statePut("summaryId", ""); statePut("summaryPlate", ""); statePut("summaryDistM", 0.0); statePut("summaryElapsedSec", 0);
        statePut("summaryAvgKmh", 0.0); statePut("summaryMaxKmh", 0.0); statePut("points", new JSONArray());
        statePut("distM", 0.0); statePut("elapsedMs", 0L); statePut("maxKmh", 0.0); statePut("startedAt", 0L);
        statePut("hasStart", false); statePut("hasLast", false); statePut("gpsReady", false);
        saveState();
        updateNotification("Garajım · Saat bağlantısı hazır", "Yeni sürüş için saati kullanabilirsin.", true);
        pushAlert("info", "Sürüş özeti silindi.");
        publishState();
    }

    private void takeOverWebSession() {
        if (state.optBoolean("nativeMode", false) || MainActivity.hasLiveBridge()) return;
        try {
            JSONObject snap = new JSONObject(prefs.getString(KEY_WEB_SNAPSHOT, "{}"));
            long at = snap.optLong("snapshotAt", 0L);
            if (at <= 0 || System.currentTimeMillis() - at > 60_000L) return;
            if (!snap.optBoolean("active", false)
                    && !snap.optBoolean("running", false) && !snap.optBoolean("paused", false)) return;
            state = new JSONObject();
            statePut("nativeMode", true);
            statePut("running", snap.optBoolean("running", false));
            statePut("paused", snap.optBoolean("paused", false));
            statePut("vehicleId", snap.optString("vehicleId", ""));
            statePut("plate", snap.optString("plate", plateFor(snap.optString("vehicleId", ""))));
            statePut("startedAt", parseStartedAt(snap.optString("startedAt", "")));
            long elapsedMs = Math.max(0, Math.round(snap.optDouble("elapsed", 0) * 1000.0));
            if (snap.optBoolean("running", false) && !snap.optBoolean("paused", false)) {
                // JS'nin son snapshot'ından Activity kapanana kadar geçen aralığı da süreye ekle.
                elapsedMs += Math.max(0L, System.currentTimeMillis() - at);
            }
            statePut("elapsedMs", elapsedMs);
            statePut("distM", Math.max(0, snap.optDouble("dist", 0)));
            statePut("maxKmh", Math.max(0, snap.optDouble("maxSpeed", 0)));
            statePut("kmh", Math.max(0, snap.optDouble("lastSpeedKmh", 0)));
            statePut("gpsReady", snap.optBoolean("gotFix", false));
            statePut("gap", snap.optBoolean("gap", false));
            JSONArray points = snap.optJSONArray("pts");
            statePut("points", points == null ? new JSONArray() : points);
            JSONObject start = snap.optJSONObject("startCoord");
            statePut("hasStart", start != null);
            if (start != null) { statePut("startLat", start.optDouble("lat", 0)); statePut("startLng", start.optDouble("lng", 0)); }
            JSONObject last = snap.optJSONObject("last");
            statePut("hasLast", last != null);
            if (last != null) { statePut("lastLat", last.optDouble("lat", 0)); statePut("lastLng", last.optDouble("lng", 0)); statePut("lastLocationAt", last.optLong("t", 0)); }
            statePut("pendingSummary", false); statePut("summaryId", "");
            lastTickElapsedRealtime = SystemClock.elapsedRealtime();
            saveState();
            prefs.edit().remove(KEY_WEB_SNAPSHOT).commit();
            if (isNativeRunning()) startLocationUpdates();
            updateNotification("Garajım · Açık Dünya", "Telefon arka planda · " + state.optString("plate", "sürüş"), true);
            pushAlert("info", "Sürüş arka plan servisine devredildi.");
            publishState();
        } catch (Exception e) { Log.w(TAG, "Web sürüşü devralınamadı: " + e.getMessage()); }
    }

    private void maybeTakeOverStaleWebSession() {
        if (state.optBoolean("nativeMode", false) || MainActivity.hasLiveBridge()) return;
        try {
            JSONObject snap = new JSONObject(prefs.getString(KEY_WEB_SNAPSHOT, "{}"));
            long at = snap.optLong("snapshotAt", 0L);
            if (at > 0 && System.currentTimeMillis() - at < 60_000L
                    && (snap.optBoolean("running", false) || snap.optBoolean("paused", false))) takeOverWebSession();
        } catch (Exception ignored) { }
    }

    private void startLocationUpdates() {
        if (!isNativeRunning() || state.optBoolean("paused", false)) return;
        if (!hasForegroundLocationPermission(this) || locationManager == null) {
            pushAlert("info", "Konum izni yok. Garajım için konum iznini etkinleştir."); return;
        }
        if (locationRegistered) return;
        try {
            if (locationManager.isProviderEnabled(LocationManager.GPS_PROVIDER)) {
                locationManager.requestLocationUpdates(LocationManager.GPS_PROVIDER, 1000L, 3f, locationListener, Looper.getMainLooper());
                locationRegistered = true;
            } else {
                pushAlert("info", "GPS kapalı. Konumu aç; sürüş kaydı GPS bekliyor.");
            }
            Location last = locationManager.getLastKnownLocation(LocationManager.GPS_PROVIDER);
            if (last != null && System.currentTimeMillis() - last.getTime() < 10_000L) handleLocation(last);
        } catch (SecurityException e) {
            pushAlert("info", "Garajım'ın konum izni yok. Uygulama ayarlarından izin ver.");
        } catch (Exception e) {
            Log.w(TAG, "Konum başlatılamadı: " + e.getMessage());
            pushAlert("info", "GPS başlatılamadı. Konum ayarlarını kontrol et.");
        }
    }

    private void stopLocationUpdates() {
        if (locationRegistered && locationManager != null && locationListener != null) {
            try { locationManager.removeUpdates(locationListener); } catch (Exception ignored) { }
        }
        locationRegistered = false;
    }

    private void handleLocation(Location loc) {
        if (loc == null || !isNativeRunning() || state.optBoolean("paused", false)) return;
        if (loc.hasAccuracy() && loc.getAccuracy() > 100f) { publishState(); return; }
        double lat = loc.getLatitude(), lng = loc.getLongitude();
        long time = loc.getTime() > 0 ? loc.getTime() : System.currentTimeMillis();
        double speed = loc.hasSpeed() ? Math.max(0, loc.getSpeed() * 3.6) : 0;
        JSONArray points = state.optJSONArray("points"); if (points == null) points = new JSONArray();
        if (!state.optBoolean("hasStart", false)) {
            statePut("hasStart", true); statePut("startLat", lat); statePut("startLng", lng);
            statePut("gpsReady", true);
        }
        if (state.optBoolean("hasLast", false)) {
            Location prev = new Location("garajim");
            prev.setLatitude(state.optDouble("lastLat", lat)); prev.setLongitude(state.optDouble("lastLng", lng));
            long previousTime = state.optLong("lastLocationAt", time);
            double dt = Math.max(0.001, (time - previousTime) / 1000.0);
            float distance = prev.distanceTo(loc);
            if (dt > 30.0) {
                statePut("gap", true);
                if (!loc.hasSpeed()) speed = 0;
            } else if (distance > 2.5f && distance / dt * 3.6 < 220.0) {
                double total = state.optDouble("distM", 0) + distance;
                statePut("distM", total);
            }
            if (!loc.hasSpeed() && dt > 0 && distance / dt * 3.6 < 220.0) speed = distance / dt * 3.6;
        }
        if (speed > 220) speed = 0;
        statePut("kmh", speed);
        statePut("maxKmh", Math.max(state.optDouble("maxKmh", 0), speed));
        statePut("lastLat", lat); statePut("lastLng", lng); statePut("lastLocationAt", time); statePut("hasLast", true);
        try {
            JSONArray point = new JSONArray(); point.put(lat); point.put(lng); point.put(time); point.put(speed);
            points.put(point);
            while (points.length() > MAX_POINTS) points.remove(0);
            statePut("points", points);
        } catch (Exception ignored) { }
        statePut("gpsReady", true);
        // Tam rota dizisini her GPS noktasında diske yazmak pahalıdır; ticker 10 saniyede bir kalıcılaştırır.
        publishState();
    }

    private void accumulateElapsed() {
        if (lastTickElapsedRealtime > 0 && isNativeRunning() && !state.optBoolean("paused", false)) {
            long delta = Math.max(0, SystemClock.elapsedRealtime() - lastTickElapsedRealtime);
            statePut("elapsedMs", state.optLong("elapsedMs", 0L) + delta);
        }
        lastTickElapsedRealtime = SystemClock.elapsedRealtime();
    }

    private final Runnable ticker = new Runnable() {
        @Override public void run() {
            try {
                if (state == null) state = readState();
                if (!state.optBoolean("nativeMode", false)) {
                    maybeTakeOverStaleWebSession();
                }
                if (isNativeRunning() && !state.optBoolean("paused", false)) {
                    accumulateElapsed();
                    if (System.currentTimeMillis() - lastPersistAt >= PERSIST_INTERVAL_MS) saveState();
                    publishState();
                }
            } catch (Exception e) { Log.w(TAG, "tick: " + e.getMessage()); }
            if (!isFinishingService()) {
                long delay = isNativeRunning() && !state.optBoolean("paused", false) ? TICK_MS : 10_000L;
                handler.postDelayed(this, delay);
            }
        }
    };

    private boolean isFinishingService() { return !prefs.getBoolean(KEY_ARMED, false) && !state.optBoolean("nativeMode", false); }
    private boolean isNativeRunning() { return state != null && state.optBoolean("nativeMode", false) && state.optBoolean("running", false); }

    private JSONObject readState() {
        try { return new JSONObject(prefs.getString(KEY_STATE, "{}")); }
        catch (Exception e) { return new JSONObject(); }
    }

    private static long parseStartedAt(String value) {
        if (value == null || value.isEmpty()) return System.currentTimeMillis();
        try { return Long.parseLong(value); } catch (Exception ignored) { }
        try { return java.time.Instant.parse(value).toEpochMilli(); } catch (Exception ignored) { }
        try {
            java.text.SimpleDateFormat f = new java.text.SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss.SSSX", Locale.US);
            f.setTimeZone(java.util.TimeZone.getTimeZone("UTC"));
            return f.parse(value).getTime();
        } catch (Exception ignored) { }
        return System.currentTimeMillis();
    }

    private static String formatIso(long millis) {
        java.text.SimpleDateFormat f = new java.text.SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss.SSS'Z'", Locale.US);
        f.setTimeZone(java.util.TimeZone.getTimeZone("UTC"));
        return f.format(new java.util.Date(millis));
    }

    private void statePut(String key, Object value) {
        try { if (value == JSONObject.NULL) state.put(key, JSONObject.NULL); else state.put(key, value); }
        catch (JSONException e) { Log.w(TAG, "state put " + key + ": " + e.getMessage()); }
    }

    private void saveState() {
        try {
            if (state == null) return;
            prefs.edit().putString(KEY_STATE, state.toString()).putBoolean(KEY_ARMED, true).commit();
            lastPersistAt = System.currentTimeMillis();
        } catch (Exception e) { Log.w(TAG, "state save: " + e.getMessage()); }
    }

    private JSONArray vehiclesArray() {
        try { return new JSONArray(prefs.getString(KEY_VEHICLES, "[]")); }
        catch (Exception e) {
            try { return new JSONArray(getSharedPreferences("garajim_widget", MODE_PRIVATE).getString("vehicles_json", "[]")); }
            catch (Exception ignored) { return new JSONArray(); }
        }
    }

    private JSONObject findVehicle(String id) {
        JSONArray arr = vehiclesArray();
        for (int i = 0; i < arr.length(); i++) {
            JSONObject v = arr.optJSONObject(i);
            if (v != null && id.equals(v.optString("id", ""))) return v;
        }
        return null;
    }

    private String plateFor(String id) {
        JSONObject v = findVehicle(id);
        if (v == null) return "";
        String plate = v.optString("plate", "");
        if (!plate.isEmpty()) return plate;
        String name = v.optString("name", "");
        if (!name.isEmpty()) return name;
        return (v.optString("brand", "") + " " + v.optString("model", "")).trim();
    }

    private void pushVehiclesSnapshot() {
        String json = prefs.getString(KEY_VEHICLES, getSharedPreferences("garajim_widget", MODE_PRIVATE).getString("vehicles_json", "[]"));
        GarajimWearSync.pushVehicles(this, json);
    }

    /** Mini rota için tüm GPS geçmişini değil, rotanın şeklini temsil eden en fazla 24 örneği paylaş. */
    private String buildMiniRouteJson() {
        JSONArray source = state == null ? null : state.optJSONArray("points");
        JSONArray compact = new JSONArray();
        if (source == null || source.length() == 0) return compact.toString();
        int count = source.length();
        int limit = Math.min(24, count);
        for (int i = 0; i < limit; i++) {
            int index = limit == count ? i : (int) Math.round((double) i * (count - 1) / Math.max(1, limit - 1));
            JSONArray point = source.optJSONArray(index);
            if (point == null || point.length() < 2) continue;
            double lat = point.optDouble(0, Double.NaN);
            double lng = point.optDouble(1, Double.NaN);
            if (Double.isNaN(lat) || Double.isNaN(lng) || lat < -90 || lat > 90 || lng < -180 || lng > 180) continue;
            JSONArray xy = new JSONArray();
            xy.put(lat); xy.put(lng);
            compact.put(xy);
        }
        return compact.toString();
    }

    private void publishState() {
        if (state == null) state = readState();
        try {
            JSONObject outgoing = new JSONObject();
            boolean nativeMode = state.optBoolean("nativeMode", false);
            boolean running = state.optBoolean("running", false);
            boolean paused = state.optBoolean("paused", false);
            double elapsed = state.optDouble("elapsedMs", 0);
            if (running && !paused && nativeMode) {
                // Runtime elapsed is accumulated in ticker; never infer distance from elapsed time.
                elapsed = state.optDouble("elapsedMs", 0);
            }
            outgoing.put("nativeMode", nativeMode);
            outgoing.put("running", running); outgoing.put("paused", paused);
            outgoing.put("gpsReady", state.optBoolean("gpsReady", false));
            outgoing.put("kmh", state.optDouble("kmh", 0));
            outgoing.put("distM", state.optDouble("distM", 0));
            outgoing.put("elapsedSec", (int) Math.max(0, elapsed / 1000.0));
            outgoing.put("maxKmh", state.optDouble("maxKmh", 0));
            outgoing.put("plate", state.optString("plate", ""));
            outgoing.put("vehicleId", state.optString("vehicleId", ""));
            outgoing.put("mode", nativeMode ? "Yerel arka plan sürüşü" : "Hazır");
            outgoing.put("track", ""); outgoing.put("artist", "");
            outgoing.put("routeJson", buildMiniRouteJson());
            outgoing.put("overLimit", false); outgoing.put("alert", state.optString("alert", ""));
            outgoing.put("pendingSummary", state.optBoolean("pendingSummary", false));
            outgoing.put("summaryId", state.optString("summaryId", ""));
            outgoing.put("summaryPlate", state.optString("summaryPlate", ""));
            outgoing.put("summaryDistM", state.optDouble("summaryDistM", 0));
            outgoing.put("summaryElapsedSec", state.optInt("summaryElapsedSec", 0));
            outgoing.put("summaryAvgKmh", state.optDouble("summaryAvgKmh", 0));
            outgoing.put("summaryMaxKmh", state.optDouble("summaryMaxKmh", 0));
            outgoing.put("parkLat", 0); outgoing.put("parkLng", 0); outgoing.put("parkDistM", -1); outgoing.put("parkDir", "");
            GarajimWearSync.pushState(this, outgoing.toString());
        } catch (Exception e) { Log.w(TAG, "publish state: " + e.getMessage()); }
    }

    private void pushAlert(String kind, String message) { GarajimWearSync.pushAlert(this, kind, message); }

    private void updateNotification(String title, String text, boolean force) {
        long now = System.currentTimeMillis();
        if (!force && now - lastNotificationAt < 10_000L) return;
        lastNotificationAt = now;
        Notification n = buildNotification(title, text);
        try {
            if (Build.VERSION.SDK_INT >= 29) startForeground(NOTIF_ID, n, ServiceInfo.FOREGROUND_SERVICE_TYPE_LOCATION);
            else startForeground(NOTIF_ID, n);
        } catch (Exception e) { Log.w(TAG, "notification update: " + e.getMessage()); }
    }

    private Notification buildNotification(String title, String text) {
        if (title == null || title.isEmpty()) {
            if (state != null && state.optBoolean("pendingSummary", false)) {
                title = "Garajım · Sürüş tamamlandı"; text = "Özeti saatinden kaydet veya sil.";
            } else if (isNativeRunning()) {
                title = "Garajım · Açık Dünya"; text = "Sürüş devam ediyor · " + state.optString("plate", "");
            } else {
                title = "Garajım · Saat bağlantısı hazır"; text = "Sürüşü Galaxy Watch üzerinden başlatabilirsin.";
            }
        }
        Intent open = getPackageManager().getLaunchIntentForPackage(getPackageName());
        if (open == null) open = new Intent(this, MainActivity.class);
        open.addFlags(Intent.FLAG_ACTIVITY_SINGLE_TOP | Intent.FLAG_ACTIVITY_CLEAR_TOP);
        int piFlags = PendingIntent.FLAG_UPDATE_CURRENT;
        if (Build.VERSION.SDK_INT >= 23) piFlags |= PendingIntent.FLAG_IMMUTABLE;
        PendingIntent pi = PendingIntent.getActivity(this, 7430, open, piFlags);
        int icon = getResources().getIdentifier("ic_stat_garajim", "drawable", getPackageName());
        if (icon == 0) icon = android.R.drawable.ic_menu_mylocation;
        return new NotificationCompat.Builder(this, CHANNEL_ID)
                .setContentTitle(title).setContentText(text).setSmallIcon(icon)
                .setOngoing(true).setOnlyAlertOnce(true)
                .setCategory(NotificationCompat.CATEGORY_NAVIGATION)
                .setPriority(NotificationCompat.PRIORITY_LOW).setContentIntent(pi)
                .setShowWhen(false).build();
    }

    private void ensureChannel() {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) return;
        NotificationManager nm = (NotificationManager) getSystemService(NOTIFICATION_SERVICE);
        if (nm == null || nm.getNotificationChannel(CHANNEL_ID) != null) return;
        NotificationChannel ch = new NotificationChannel(CHANNEL_ID, "Açık Dünya sürüşü", NotificationManager.IMPORTANCE_LOW);
        ch.setDescription("Saat kontrolleri ve arka plan sürüş kaydı"); ch.setShowBadge(false); nm.createNotificationChannel(ch);
    }

    @Override public void onTaskRemoved(Intent rootIntent) {
        // Etkin WebView oturumu varsa son kaydedilen taslaktan devralmayı dene.
        try { takeOverWebSession(); } catch (Exception ignored) { }
        super.onTaskRemoved(rootIntent);
    }

    @Override public void onDestroy() {
        handler.removeCallbacksAndMessages(null);
        handler.removeCallbacks(ticker);
        stopLocationUpdates();
        if (state != null) saveState();
        stopForeground(STOP_FOREGROUND_REMOVE);
        super.onDestroy();
    }

    @Override public IBinder onBind(Intent intent) { return null; }
}
