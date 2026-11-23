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

/** Telefon ↔ Wear OS veri köprüsü */
public final class GarajimWearSync {
    private static final String TAG = "GarajimWear";
    public static final String PATH_STATE = "/garajim/ride_state";
    public static final String PATH_CMD = "/garajim/cmd";
    public static final String PATH_ALERT = "/garajim/alert";
    private static final ExecutorService EX = Executors.newSingleThreadExecutor();
    private static volatile String lastJson = "";
    private static volatile long lastPushMs = 0;

    private GarajimWearSync() {}

    public static void pushState(Context ctx, String json) {
        if (ctx == null || json == null) return;
        final long now = System.currentTimeMillis();
        if (json.equals(lastJson) && now - lastPushMs < 1000) return;
        lastJson = json;
        lastPushMs = now;
        final Context app = ctx.getApplicationContext();
        EX.execute(() -> {
            try {
                JSONObject o = new JSONObject(json);
                PutDataMapRequest req = PutDataMapRequest.create(PATH_STATE);
                req.getDataMap().putBoolean("running", o.optBoolean("running", false));
                req.getDataMap().putBoolean("paused", o.optBoolean("paused", false));
                req.getDataMap().putDouble("kmh", o.optDouble("kmh", 0));
                req.getDataMap().putDouble("distM", o.optDouble("distM", 0));
                req.getDataMap().putInt("elapsedSec", o.optInt("elapsedSec", 0));
                req.getDataMap().putDouble("maxKmh", o.optDouble("maxKmh", 0));
                req.getDataMap().putString("plate", o.optString("plate", ""));
                req.getDataMap().putString("mode", o.optString("mode", ""));
                req.getDataMap().putString("track", o.optString("track", ""));
                req.getDataMap().putString("artist", o.optString("artist", ""));
                req.getDataMap().putBoolean("overLimit", o.optBoolean("overLimit", false));
                req.getDataMap().putString("alert", o.optString("alert", ""));
                // park
                req.getDataMap().putDouble("parkLat", o.optDouble("parkLat", 0));
                req.getDataMap().putDouble("parkLng", o.optDouble("parkLng", 0));
                req.getDataMap().putDouble("parkDistM", o.optDouble("parkDistM", -1));
                req.getDataMap().putString("parkDir", o.optString("parkDir", ""));
                req.getDataMap().putLong("ts", now);
                req.setUrgent();
                Wearable.getDataClient(app).putDataItem(req.asPutDataRequest());
            } catch (Exception e) {
                Log.w(TAG, "pushState: " + e.getMessage());
            }
        });
    }

    /** Anlık titreşim uyarısı (limit / kör nokta) */
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
                for (Node n : nodes) {
                    Wearable.getMessageClient(app).sendMessage(n.getId(), PATH_CMD, data);
                }
            } catch (Exception e) {
                Log.w(TAG, "sendCmd: " + e.getMessage());
            }
        });
    }
}
