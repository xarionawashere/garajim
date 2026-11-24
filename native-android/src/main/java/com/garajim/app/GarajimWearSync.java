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
    public static final String PATH_ACK = "/garajim/ack";
    public static final String PATH_LINK = "/garajim/link";
    private static final ExecutorService EX = Executors.newSingleThreadExecutor();
    private static volatile String lastJson = "";
    private static volatile String sendingStateJson = "";
    private static volatile long sendingStateAt = 0L;
    private static volatile String lastVehiclesJson = "";
    private static volatile String sendingVehiclesJson = "";
    private static volatile long lastPushMs = 0;
    private static volatile long stateSeq = 0;

    private GarajimWearSync() {}

    public static synchronized void pushState(Context ctx, String json) {
        if (ctx == null || json == null) return;
        final long now = System.currentTimeMillis();
        if (json.equals(lastJson) && now - lastPushMs < 1000L) return;
        if (json.equals(sendingStateJson) && now - sendingStateAt < 1000L) return;
        sendingStateJson = json;
        sendingStateAt = now;
        final Context app = ctx.getApplicationContext();
        EX.execute(() -> {
            try {
                JSONObject o = new JSONObject(json);
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
                // En fazla 24 koordinat çifti: harita gerçek sokak karoları indirmez ve yükü küçüktür.
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
                // park
                req.getDataMap().putDouble("parkLat", o.optDouble("parkLat", 0));
                req.getDataMap().putDouble("parkLng", o.optDouble("parkLng", 0));
                req.getDataMap().putDouble("parkDistM", o.optDouble("parkDistM", -1));
                req.getDataMap().putString("parkDir", o.optString("parkDir", ""));
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
                    if (json.equals(sendingStateJson)) sendingStateJson = "";
                }
            }
        });
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
        try {
            java.util.List<Node> nodes = Tasks.await(Wearable.getNodeClient(ctx.getApplicationContext()).getConnectedNodes());
            int count = nodes == null ? 0 : nodes.size();
            int nearby = 0;
            String name = "";
            if (nodes != null) {
                for (Node n : nodes) {
                    if (n.isNearby()) nearby++;
                    if (name.isEmpty()) name = n.getDisplayName() == null ? "" : n.getDisplayName();
                }
            }
            org.json.JSONObject o = new org.json.JSONObject();
            o.put("connected", count > 0);
            o.put("count", count);
            o.put("nearby", nearby);
            o.put("name", name);
            o.put("ts", System.currentTimeMillis());
            return o.toString();
        } catch (Exception e) {
            return "{\"connected\":false,\"count\":0,\"nearby\":0,\"error\":true}";
        }
    }
}
