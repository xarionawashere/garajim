package com.garajim.app;

import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.os.Bundle;
import android.webkit.WebView;
import com.getcapacitor.BridgeActivity;
import org.json.JSONArray;
import org.json.JSONObject;
import java.lang.ref.WeakReference;

public class MainActivity extends BridgeActivity {
    /** Widget düğmesinden gelen, henüz uygulamaya (JS) iletilmemiş eylem. */
    static volatile String pendingAction = null;
    static volatile String pendingVehicle = null;
    private static volatile WeakReference<MainActivity> active = new WeakReference<>(null);
    static final String WEAR_QUEUE_PREFS = "garajim_wear_queue";
    private static final String WEAR_COMMANDS_KEY = "commands_json";
    private static final long WEAR_COMMAND_TTL_MS = 25_000L;
    private static final int WEAR_COMMAND_QUEUE_LIMIT = 16;

    /**
     * Saat komutlarını tek bir volatile alanda tutmak yerine kısa ömürlü FIFO kuyruğuna alır.
     * Kuyruk yalnızca çalışan WebView'e iletilebilen komutlar için kullanılır; sürüş başlat/bitir
     * komutları uygulama kapalıyken daha sonra kendiliğinden çalıştırılmak üzere saklanmaz.
     */
    static boolean dispatchWearCommand(Context context, String action, String vehicleId) {
        MainActivity target = active.get();
        boolean canDeliver = target != null && !target.isFinishing()
                && target.getBridge() != null && target.getBridge().getWebView() != null;
        if (canDeliver && enqueueWearCommand(context, action, vehicleId)) {
            target.runOnUiThread(target::notifyJs);
            return true;
        }

        // Araç seçimi güvenle ertelenebilir; sürüş komutları güvenlik nedeniyle ertelenmez.
        if ("wear_select_vehicle".equals(action)) {
            context.getApplicationContext().getSharedPreferences(WEAR_QUEUE_PREFS, Context.MODE_PRIVATE).edit()
                    .putString("action", action)
                    .putString("vehicle", vehicleId == null ? "" : vehicleId)
                    .apply();
        }
        return false;
    }

    private static synchronized boolean enqueueWearCommand(Context context, String action, String vehicleId) {
        if (context == null || action == null || action.trim().isEmpty()) return false;
        SharedPreferences prefs = context.getApplicationContext().getSharedPreferences(WEAR_QUEUE_PREFS, Context.MODE_PRIVATE);
        long now = System.currentTimeMillis();
        JSONArray cleaned = new JSONArray();
        try {
            JSONArray old = new JSONArray(prefs.getString(WEAR_COMMANDS_KEY, "[]"));
            for (int i = 0; i < old.length(); i++) {
                JSONObject item = old.optJSONObject(i);
                if (item == null) continue;
                long createdAt = item.optLong("createdAt", 0L);
                if (createdAt > 0 && now - createdAt <= WEAR_COMMAND_TTL_MS) cleaned.put(item);
            }
        } catch (Exception ignored) { }

        while (cleaned.length() >= WEAR_COMMAND_QUEUE_LIMIT) cleaned.remove(0);
        JSONObject next = new JSONObject();
        try {
            next.put("action", action.trim());
            next.put("vehicle", vehicleId == null ? "" : vehicleId);
            next.put("createdAt", now);
            cleaned.put(next);
            return prefs.edit().putString(WEAR_COMMANDS_KEY, cleaned.toString()).commit();
        } catch (Exception ignored) {
            return false;
        }
    }

    /** WebView'in tükettiği bir sonraki saat komutu; eski komutlar çalıştırılmadan atılır. */
    static synchronized String consumeWearCommand(Context context) {
        if (context == null) return "";
        SharedPreferences prefs = context.getApplicationContext().getSharedPreferences(WEAR_QUEUE_PREFS, Context.MODE_PRIVATE);
        long now = System.currentTimeMillis();
        try {
            JSONArray old = new JSONArray(prefs.getString(WEAR_COMMANDS_KEY, "[]"));
            JSONArray remaining = new JSONArray();
            String result = "";
            boolean consumed = false;
            for (int i = 0; i < old.length(); i++) {
                JSONObject item = old.optJSONObject(i);
                if (item == null) continue;
                long createdAt = item.optLong("createdAt", 0L);
                if (createdAt <= 0 || now - createdAt > WEAR_COMMAND_TTL_MS) continue;
                if (!consumed) {
                    String action = item.optString("action", "");
                    String vehicle = item.optString("vehicle", "");
                    if (!action.isEmpty()) {
                        result = vehicle.isEmpty() ? action : action + "|" + vehicle;
                        consumed = true;
                        continue;
                    }
                }
                remaining.put(item);
            }
            prefs.edit().putString(WEAR_COMMANDS_KEY, remaining.toString()).commit();
            return result;
        } catch (Exception ignored) {
            prefs.edit().remove(WEAR_COMMANDS_KEY).apply();
            return "";
        }
    }

    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        active = new WeakReference<>(this);
        capture(getIntent());
        attachNativeBridge();
        notifyJs();
    }

    @Override
    protected void onNewIntent(Intent intent) {
        super.onNewIntent(intent);
        setIntent(intent);
        capture(intent);
        notifyJs();
    }

    @Override
    public void onResume() {
        super.onResume();
        active = new WeakReference<>(this);
        attachNativeBridge();
        notifyJs();
    }

    @Override
    protected void onDestroy() {
        MainActivity current = active.get();
        if (current == this) active = new WeakReference<>(null);
        super.onDestroy();
    }

    private void capture(Intent i) {
        if (i == null) return;
        String a = i.getStringExtra(GarajimWidgetProvider.EXTRA_ACTION);
        if (a == null) return;
        String vid = i.getStringExtra(GarajimWidgetProvider.EXTRA_VEHICLE);
        i.removeExtra(GarajimWidgetProvider.EXTRA_ACTION);
        i.removeExtra(GarajimWidgetProvider.EXTRA_VEHICLE);
        switch (a) {
            case "fuel": case "km": case "service": case "ride": case "park": case "alerts": case "open":
                pendingAction = a;
                pendingVehicle = vid;
                break;
            default: break;
        }
    }

    private void notifyJs() {
        try {
            if (getBridge() != null && getBridge().getWebView() != null) {
                WebView web = getBridge().getWebView();
                web.post(() -> {
                    try { web.evaluateJavascript("window.garajimCheckAction&&window.garajimCheckAction()", null); }
                    catch (Exception ignored) { }
                });
            }
        } catch (Exception ignored) { }
    }

    private void attachNativeBridge() {
        try {
            if (getBridge() != null && getBridge().getWebView() != null) {
                getBridge().getWebView().addJavascriptInterface(new GarajimNativeBridge(this), "GarajimNative");
            }
        } catch (Exception ignored) { }
    }
}
