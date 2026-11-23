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
    private static final ExecutorService EX = Executors.newSingleThreadExecutor();
    private static volatile String lastJson = "";
    private static volatile String sendingStateJson = "";
    private static volatile long sendingStateAt = 0L;
    private static volatile String lastVehiclesJson = "";
    private static volatile String sendingVehiclesJson = "";
    private static volatile long lastPushMs = 0;

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
}
