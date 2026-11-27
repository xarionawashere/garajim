package com.garajim.app;

import android.content.Context;
import android.util.Log;
import com.google.android.gms.tasks.Tasks;
import com.google.android.gms.wearable.Node;
import com.google.android.gms.wearable.PutDataMapRequest;
import com.google.android.gms.wearable.Wearable;
import org.json.JSONObject;
import java.nio.charset.StandardCharsets;
import java.util.List;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

/** Telefon ↔ Wear OS veri köprüsü. */
public final class GarajimWearSync {
    private static final String TAG = "GarajimWear";
    public static final String PATH_STATE = "/garajim/ride_state";
    public static final String PATH_VEHICLES = "/garajim/vehicles";
    public static final String PATH_CMD = "/garajim/cmd";
    public static final String PATH_ALERT = "/garajim/alert";
    public static final String PATH_ACHIEVEMENT = "/garajim/achievement";
    public static final String PATH_ACK = "/garajim/ack";
    public static final String PATH_LINK = "/garajim/link";
    public static final String PATH_THEME = "/garajim/theme";
    private static final ExecutorService EX = Executors.newSingleThreadExecutor();
    private static volatile String lastJson = "";
    private static volatile String pendingStateJson = "";
    private static volatile boolean stateDrainScheduled = false;
    private static volatile Context appCtx = null;
    private static volatile String lastVehiclesJson = "";
    private static volatile String sendingVehiclesJson = "";
    private static volatile long lastPushMs = 0;
    private static volatile long stateSeq = 0;

    private GarajimWearSync() {}


    /** Telefonun aktif renk temasını kalıcı Wear Data Layer öğesiyle saate eşitler. */
    public static void pushTheme(Context ctx, String pack, String mode) {
        if (ctx == null) return;
        final Context app = ctx.getApplicationContext();
        final String safePack = (pack == null || pack.trim().isEmpty()) ? "dark-red" : pack.trim();
        final String safeMode = (mode == null || mode.trim().isEmpty()) ? "dark" : mode.trim();
        EX.execute(() -> {
            try {
                PutDataMapRequest req = PutDataMapRequest.create(PATH_THEME);
                req.getDataMap().putString("pack", safePack);
                req.getDataMap().putString("mode", safeMode);
                req.getDataMap().putLong("updatedAt", System.currentTimeMillis());
                req.setUrgent();
                Tasks.await(Wearable.getDataClient(app).putDataItem(req.asPutDataRequest()));
            } catch (Exception e) { Log.w(TAG, "pushTheme: " + e.getMessage()); }
        });
    }

    public static void pushState(Context ctx, String json) {
        if (ctx == null || json == null) return;
        synchronized (GarajimWearSync.class) {
            appCtx = ctx.getApplicationContext();
            pendingStateJson = json;
            if (!stateDrainScheduled) {
                stateDrainScheduled = true;
                EX.execute(GarajimWearSync::drainPendingState);
            }
        }
    }

    private static void drainPendingState() {
        final Context app;
        final String json;
        synchronized (GarajimWearSync.class) {
            app = appCtx;
            json = pendingStateJson;
            pendingStateJson = "";
            stateDrainScheduled = false;
        }
        if (app == null || json == null || json.isEmpty()) return;
        if (json.equals(lastJson)) {
            // Aynı içerik; yine de bekleyen yeni paket varsa dene
            synchronized (GarajimWearSync.class) {
                if (!pendingStateJson.isEmpty() && !stateDrainScheduled) {
                    stateDrainScheduled = true;
                    EX.execute(GarajimWearSync::drainPendingState);
                }
            }
            return;
        }
        try {
            org.json.JSONObject o = new org.json.JSONObject(json);
            PutDataMapRequest req = PutDataMapRequest.create(PATH_STATE);
            req.getDataMap().putBoolean("nativeMode", o.optBoolean("nativeMode", false));
            req.getDataMap().putBoolean("running", o.optBoolean("running", false));
            req.getDataMap().putBoolean("paused", o.optBoolean("paused", false));
            req.getDataMap().putBoolean("gpsReady", o.optBoolean("gpsReady", false));
            req.getDataMap().putDouble("kmh", o.optDouble("kmh", 0));
            req.getDataMap().putDouble("distM", o.optDouble("distM", 0));
            req.getDataMap().putInt("elapsedSec", o.optInt("elapsedSec", 0));
            req.getDataMap().putDouble("maxKmh", o.optDouble("maxKmh", 0));
            req.getDataMap().putString("plate", o.optString("plate", ""));
            req.getDataMap().putString("vehicleId", o.optString("vehicleId", ""));
            req.getDataMap().putString("mode", o.optString("mode", ""));
            req.getDataMap().putString("track", o.optString("track", ""));
            req.getDataMap().putString("artist", o.optString("artist", ""));
            req.getDataMap().putString("mediaApp", o.optString("mediaApp", ""));
            req.getDataMap().putBoolean("mediaAccess", o.optBoolean("mediaAccess", false));
            req.getDataMap().putBoolean("playing", o.optBoolean("playing", false));
            req.getDataMap().putLong("mediaPos", o.optLong("mediaPos", 0));
            req.getDataMap().putLong("mediaDur", o.optLong("mediaDur", 0));
            req.getDataMap().putString("mediaArt", o.optString("mediaArt", ""));
            req.getDataMap().putString("routeJson", o.optString("routeJson", "[]"));
            req.getDataMap().putBoolean("overLimit", o.optBoolean("overLimit", false));
            req.getDataMap().putString("alert", o.optString("alert", ""));
            req.getDataMap().putBoolean("pendingSummary", o.optBoolean("pendingSummary", false));
            req.getDataMap().putString("summaryId", o.optString("summaryId", ""));
            req.getDataMap().putString("summaryPlate", o.optString("summaryPlate", ""));
            req.getDataMap().putDouble("summaryDistM", o.optDouble("summaryDistM", 0));
            req.getDataMap().putInt("summaryElapsedSec", o.optInt("summaryElapsedSec", 0));
            req.getDataMap().putDouble("summaryAvgKmh", o.optDouble("summaryAvgKmh", 0));
            req.getDataMap().putDouble("summaryMaxKmh", o.optDouble("summaryMaxKmh", 0));
            req.getDataMap().putDouble("parkLat", o.optDouble("parkLat", 0));
            req.getDataMap().putDouble("parkLng", o.optDouble("parkLng", 0));
            req.getDataMap().putDouble("parkDistM", o.optDouble("parkDistM", -1));
            req.getDataMap().putString("parkDir", o.optString("parkDir", ""));
            req.getDataMap().putBoolean("parkSaved", o.optBoolean("parkSaved", false));
            req.getDataMap().putBoolean("navActive", o.optBoolean("navActive", false));
            req.getDataMap().putString("navDest", o.optString("navDest", ""));
            req.getDataMap().putDouble("navRemainingM", o.optDouble("navRemainingM", -1));
            req.getDataMap().putDouble("navStepDistanceM", o.optDouble("navStepDistanceM", -1));
            req.getDataMap().putDouble("navRotation", o.optDouble("navRotation", 0));
            req.getDataMap().putInt("navEtaSec", o.optInt("navEtaSec", 0));
            req.getDataMap().putString("navText", o.optString("navText", ""));
            req.getDataMap().putDouble("navDistM", o.optDouble("navDistM", -1));
            req.getDataMap().putDouble("limitKmh", o.optDouble("limitKmh", 0));
            req.getDataMap().putDouble("dailyKm", o.optDouble("dailyKm", 0));
            req.getDataMap().putDouble("dailyGoalKm", o.optDouble("dailyGoalKm", 50));
            req.getDataMap().putString("badgeText", o.optString("badgeText", ""));
            req.getDataMap().putString("convoyText", o.optString("convoyText", ""));
            long seq = ++stateSeq;
            req.getDataMap().putLong("seq", seq);
            req.getDataMap().putLong("ts", System.currentTimeMillis());
            req.setUrgent();
            Tasks.await(Wearable.getDataClient(app).putDataItem(req.asPutDataRequest()));
            lastJson = json;
            lastPushMs = System.currentTimeMillis();
        } catch (Exception e) {
            Log.w(TAG, "pushState: " + e.getMessage());
        } finally {
            synchronized (GarajimWearSync.class) {
                if (!pendingStateJson.isEmpty() && !stateDrainScheduled) {
                    stateDrainScheduled = true;
                    EX.execute(GarajimWearSync::drainPendingState);
                }
            }
        }
    }

    /** Araç listesi ayrı Data Item'da tutulur; hız her saniye değişirken liste gereksiz yere gönderilmez. */
    public static void pushVehicles(Context ctx, String json) {
        if (ctx == null || json == null) return;
        final String clean = json.trim().isEmpty() ? "[]" : json;
        if (clean.equals(lastVehiclesJson) || clean.equals(sendingVehiclesJson)) return;
        sendingVehiclesJson = clean;
        final Context app = ctx.getApplicationContext();
        EX.execute(() -> {
            try {
                PutDataMapRequest req = PutDataMapRequest.create(PATH_VEHICLES);
                req.getDataMap().putString("json", clean);
                req.getDataMap().putLong("ts", System.currentTimeMillis());
                req.setUrgent();
                Tasks.await(Wearable.getDataClient(app).putDataItem(req.asPutDataRequest()));
                lastVehiclesJson = clean; // sadece başarılı gönderimden sonra önbelleğe al
            } catch (Exception e) {
                Log.w(TAG, "pushVehicles: " + e.getMessage());
            } finally {
                if (clean.equals(sendingVehiclesJson)) sendingVehiclesJson = "";
            }
        });
    }

    /**
     * Yeni kazanılmış başarı paketini bağlı Wear düğümlerine canlı mesaj olarak gönderir.
     * MessageClient, saatteki WearableListenerService tarafından uygulama ekranı kapalıyken de alınır.
     * Bağlantı yoksa saklanmaz; geçmiş kazanımlar daha sonra yanlışlıkla kutlama üretmez.
     */
    public static void pushAchievements(Context ctx, String json) {
        if (ctx == null || json == null || json.trim().isEmpty()) return;
        final Context app = ctx.getApplicationContext();
        final String payload = json;
        EX.execute(() -> {
            try {
                JSONObject parsed = new JSONObject(payload);
                if (parsed.optJSONArray("items") == null || parsed.optJSONArray("items").length() == 0) return;
                byte[] data = parsed.toString().getBytes(StandardCharsets.UTF_8);
                List<Node> nodes = Tasks.await(Wearable.getNodeClient(app).getConnectedNodes());
                if (nodes == null || nodes.isEmpty()) {
                    Log.d(TAG, "pushAchievements: bağlı saat yok; kutlama kuyruğa alınmadı");
                    return;
                }
                for (Node node : nodes) {
                    try {
                        Tasks.await(Wearable.getMessageClient(app).sendMessage(node.getId(), PATH_ACHIEVEMENT, data));
                    } catch (Exception e) {
                        Log.w(TAG, "pushAchievements node " + node.getDisplayName() + ": " + e.getMessage());
                    }
                }
            } catch (Exception e) {
                Log.w(TAG, "pushAchievements: " + e.getMessage());
            }
        });
    }

    /**
     * Tek seferlik canlı uyarı: yalnızca o anda bağlı cihazlara MessageClient ile yollar.
     * DataItem oluşturmadığı için saat bağlantısı yokken eski kutlama sonradan görünmez.
     */
    public static void pushAlertLive(Context ctx, String kind, String msg) {
        if (ctx == null) return;
        final Context app = ctx.getApplicationContext();
        final String alertKind = kind == null ? "info" : kind;
        final String alertMsg = msg == null ? "" : msg;
        EX.execute(() -> {
            try {
                List<Node> nodes = Tasks.await(Wearable.getNodeClient(app).getConnectedNodes());
                if (nodes == null || nodes.isEmpty()) return;
                JSONObject payload = new JSONObject();
                payload.put("kind", alertKind);
                payload.put("msg", alertMsg);
                payload.put("ts", System.currentTimeMillis());
                byte[] data = payload.toString().getBytes(StandardCharsets.UTF_8);
                for (Node node : nodes) {
                    try { Tasks.await(Wearable.getMessageClient(app).sendMessage(node.getId(), PATH_ALERT, data)); }
                    catch (Exception e) { Log.w(TAG, "pushAlertLive node: " + e.getMessage()); }
                }
            } catch (Exception e) {
                Log.w(TAG, "pushAlertLive: " + e.getMessage());
            }
        });
    }

    /** Anlık titreşim uyarısı (limit / park / iletişim durumu). */
    public static void pushAlert(Context ctx, String kind, String msg) {
        if (ctx == null) return;
        final Context app = ctx.getApplicationContext();
        final long now = System.currentTimeMillis();
        EX.execute(() -> {
            try {
                PutDataMapRequest req = PutDataMapRequest.create(PATH_ALERT);
                req.getDataMap().putString("kind", kind == null ? "info" : kind);
                req.getDataMap().putString("msg", msg == null ? "" : msg);
                req.getDataMap().putLong("ts", now);
                req.setUrgent();
                Wearable.getDataClient(app).putDataItem(req.asPutDataRequest());
            } catch (Exception e) {
                Log.w(TAG, "pushAlert: " + e.getMessage());
            }
        });
    }

    public static void sendCmdToWatch(Context ctx, String cmd) {
        if (ctx == null || cmd == null) return;
        final Context app = ctx.getApplicationContext();
        final byte[] data = cmd.getBytes(StandardCharsets.UTF_8);
        EX.execute(() -> {
            try {
                List<Node> nodes = Tasks.await(Wearable.getNodeClient(app).getConnectedNodes());
                for (Node n : nodes) Wearable.getMessageClient(app).sendMessage(n.getId(), PATH_CMD, data);
            } catch (Exception e) {
                Log.w(TAG, "sendCmd: " + e.getMessage());
            }
        });
    }

    /** Saate komut onayı — path: /garajim/ack/{id} */
    public static void pushAck(Context ctx, String id, boolean accepted, String message) {
        if (ctx == null) return;
        final String ackId = (id == null || id.trim().isEmpty()) ? ("na-" + System.currentTimeMillis()) : id.trim();
        final Context app = ctx.getApplicationContext();
        final boolean ok = accepted;
        final String msg = message == null ? "" : message;
        EX.execute(() -> {
            try {
                PutDataMapRequest req = PutDataMapRequest.create(PATH_ACK + "/" + ackId);
                req.getDataMap().putString("id", ackId);
                req.getDataMap().putBoolean("accepted", ok);
                req.getDataMap().putString("message", msg);
                req.getDataMap().putLong("ts", System.currentTimeMillis());
                req.setUrgent();
                try {
                    Tasks.await(Wearable.getDataClient(app).putDataItem(req.asPutDataRequest()));
                } catch (Exception first) {
                    try { Thread.sleep(200); } catch (InterruptedException ignored) {}
                    Tasks.await(Wearable.getDataClient(app).putDataItem(req.asPutDataRequest()));
                }
                // Hızlı kanal: MessageClient ile de dene
                try {
                    org.json.JSONObject o = new org.json.JSONObject();
                    o.put("id", ackId);
                    o.put("accepted", ok);
                    o.put("message", msg);
                    byte[] data = o.toString().getBytes(StandardCharsets.UTF_8);
                    for (Node n : Tasks.await(Wearable.getNodeClient(app).getConnectedNodes())) {
                        Wearable.getMessageClient(app).sendMessage(n.getId(), PATH_ACK, data);
                    }
                } catch (Exception ignored) { }
            } catch (Exception e) {
                Log.w(TAG, "pushAck: " + e.getMessage());
            }
        });
    }

    /** Bağlantı nabzı — saatin "telefon çevrimiçi" göstermesi için. */
    public static void pushLink(Context ctx, boolean online, String detail) {
        if (ctx == null) return;
        final Context app = ctx.getApplicationContext();
        EX.execute(() -> {
            try {
                PutDataMapRequest req = PutDataMapRequest.create(PATH_LINK);
                req.getDataMap().putBoolean("online", online);
                req.getDataMap().putString("detail", detail == null ? "" : detail);
                req.getDataMap().putLong("ts", System.currentTimeMillis());
                req.setUrgent();
                Tasks.await(Wearable.getDataClient(app).putDataItem(req.asPutDataRequest()));
            } catch (Exception e) {
                Log.w(TAG, "pushLink: " + e.getMessage());
            }
        });
    }

    /** Telefonun gördüğü Wear düğüm özeti (JS durum çipi için). */
    public static String getStatusJson(Context ctx) {
        if (ctx == null) return "{\"connected\":false,\"count\":0,\"nearby\":0}";
        final Context app = ctx.getApplicationContext();
        android.content.SharedPreferences prefs = app.getSharedPreferences("garajim_wear_status", Context.MODE_PRIVATE);
        String cached = prefs.getString("status", "{\"connected\":false,\"count\":0,\"nearby\":0}");
        EX.execute(() -> {
            try {
                java.util.List<Node> nodes = Tasks.await(Wearable.getNodeClient(app).getConnectedNodes());
                int count = nodes == null ? 0 : nodes.size();
                int nearby = 0;
                String name = "";
                if (nodes != null) for (Node node : nodes) {
                    if (node.isNearby()) nearby++;
                    if (name.isEmpty()) name = node.getDisplayName() == null ? "" : node.getDisplayName();
                }
                org.json.JSONObject o = new org.json.JSONObject();
                o.put("connected", count > 0);
                o.put("count", count);
                o.put("nearby", nearby);
                o.put("name", name);
                o.put("ts", System.currentTimeMillis());
                prefs.edit().putString("status", o.toString()).apply();
            } catch (Exception e) {
                Log.w(TAG, "getStatusJson: " + e.getMessage());
            }
        });
        return cached;
    }
}
