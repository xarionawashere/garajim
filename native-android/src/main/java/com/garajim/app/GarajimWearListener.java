package com.garajim.app;

import com.google.android.gms.wearable.MessageEvent;
import com.google.android.gms.wearable.WearableListenerService;
import org.json.JSONObject;
import java.nio.charset.StandardCharsets;
import java.util.Locale;

/**
 * Saatten gelen komutlar. Saat JSON zarf gönderir: {"id":"...","cmd":"start","arg":"..."}.
 * Eski JSON ve düz metin komutlar da desteklenir. Her komuta Data Layer ACK döner.
 */
public class GarajimWearListener extends WearableListenerService {
    @Override
    public void onMessageReceived(MessageEvent event) {
        if (event == null || event.getPath() == null) return;
        if (!GarajimWearSync.PATH_CMD.equals(event.getPath())) return;
        String raw = new String(event.getData() == null ? new byte[0] : event.getData(), StandardCharsets.UTF_8).trim();
        if (raw.isEmpty()) return;

        String cmd = raw;
        String arg = null;
        String ackId = "";
        try {
            if (raw.startsWith("{")) {
                JSONObject o = new JSONObject(raw);
                ackId = o.optString("id", "");
                cmd = firstNonBlank(o, "cmd", "command", "action", "type", "event", "name");
                arg = firstNonBlank(o, "arg", "vehicle", "vehicleId", "vehicle_id", "summaryId", "summary_id");
            } else {
                int sep = raw.indexOf('|');
                if (sep >= 0) {
                    cmd = raw.substring(0, sep).trim();
                    arg = raw.substring(sep + 1).trim();
                }
            }
        } catch (Exception e) {
            GarajimWearSync.pushAck(this, ackId, false, "Komut okunamadı");
            return;
        }

        // Eski saat sürümleri, JSON zarfı içinde de "select_vehicle|ID" veya "start|ID" gönderebilir.
        // Komut adını ve kimliği ayırarak hem eski hem de yeni saat sürümleriyle uyumlu çalış.
        int packedSeparator = cmd.indexOf('|');
        if (packedSeparator >= 0) {
            String packedArgument = cmd.substring(packedSeparator + 1).trim();
            cmd = cmd.substring(0, packedSeparator).trim();
            if (arg == null || arg.trim().isEmpty()) arg = packedArgument;
        }
        cmd = cmd.replaceAll("([a-z0-9])([A-Z])", "$1_$2").toLowerCase(Locale.ROOT);

        String action = mapCmd(cmd);
        if (action.isEmpty()) {
            GarajimWearSync.pushAck(this, ackId, false, "Bilinmeyen komut: " + cmd);
            return;
        }

        if (isWearLogSaveAction(action) && !isValidWearLogPayload(action, arg)) {
            GarajimWearSync.pushAck(this, ackId, false, "Saat kaydı okunamadı; bilgileri kontrol edip yeniden dene.");
            return;
        }
        boolean delivered = MainActivity.dispatchWearCommand(this, action, arg);
        if (delivered) {
            String ackMessage = isWearLogSaveAction(action)
                    ? "Kayıt telefonda sıraya alındı; Garajım açılınca işlenecek."
                    : "Telefon komutu aldı";
            GarajimWearSync.pushAck(this, ackId, true, ackMessage);
            // Bağlantı nabzı
            GarajimWearSync.pushLink(this, true, "ok");
        } else {
            String msg;
            if ("wear_select_vehicle".equals(action)) {
                msg = "Araç seçimi sıraya alındı. Telefon hazır olunca uygulanacak.";
            } else if ("wear_request_sync".equals(action)) {
                msg = "Saat arka plan servisi hazır değil. Garajım'ı telefonda bir kez aç.";
            } else {
                msg = "Saatten sürüş için Garajım'ı telefonda bir kez açıp servisi hazırla.";
            }
            // Kuyruğa alındıysa (select_vehicle) yine de accepted sayılabilir
            boolean soft = "wear_select_vehicle".equals(action);
            GarajimWearSync.pushAck(this, ackId, soft, msg);
            GarajimWearSync.pushAlert(this, "info", msg);
        }
    }

    private static boolean isWearLogSaveAction(String action) {
        return "wear_fuel_save".equals(action) || "wear_km_save".equals(action);
    }

    private static boolean isValidWearLogPayload(String action, String raw) {
        try {
            JSONObject payload = new JSONObject(raw == null ? "" : raw);
            String vehicleId = payload.optString("vehicleId", "").trim();
            String entryId = payload.optString("entryId", "").trim();
            double km = payload.optDouble("km", Double.NaN);
            if (vehicleId.isEmpty() || entryId.isEmpty() || Double.isNaN(km) || Double.isInfinite(km) || km <= 0) return false;
            if ("wear_fuel_save".equals(action)) {
                double liters = payload.optDouble("liters", Double.NaN);
                double cost = payload.optDouble("cost", 0);
                return !Double.isNaN(liters) && !Double.isInfinite(liters) && liters > 0
                        && !Double.isNaN(cost) && !Double.isInfinite(cost) && cost >= 0;
            }
            return true;
        } catch (Exception ignored) { return false; }
    }

    private static String firstNonBlank(JSONObject object, String... keys) {
        for (String key : keys) {
            if (object == null || !object.has(key) || object.isNull(key)) continue;
            String value = object.optString(key, "").trim();
            if (!value.isEmpty()) return value;
        }
        return "";
    }

    private static String mapCmd(String cmd) {
        if (cmd == null) return "";
        switch (cmd.toLowerCase(Locale.ROOT).trim()) {
            case "start": return "wear_start";
            case "resume": return "wear_resume";
            case "toggle": return "wear_toggle";
            case "pause": return "wear_pause";
            case "stop":
            case "finish": return "wear_stop_request";
            case "stop_confirmed":
            case "finish_confirmed":
            case "finish_ride": return "wear_finish_confirmed";
            case "select_vehicle": return "wear_select_vehicle";
            case "summary_save": return "wear_summary_save";
            case "summary_discard": return "wear_summary_discard";
            case "request_sync": return "wear_request_sync";
            case "next": return "wear_music_next";
            case "prev": return "wear_music_prev";
            case "playpause": return "wear_music_playpause";
            case "park_where": return "wear_park_where";
            case "fuel_quick": return "wear_fuel_quick";
            case "km_quick": return "wear_km_quick";
            case "fuel_save": return "wear_fuel_save";
            case "km_save": return "wear_km_save";
            case "voice_pin": return "wear_voice_pin";
            case "ping": return "wear_request_sync";
            case "wear_toggle": case "wear_pause": case "wear_stop_request":
            case "wear_finish_confirmed": case "wear_select_vehicle":
            case "wear_summary_save": case "wear_summary_discard": case "wear_request_sync":
            case "wear_music_next": case "wear_music_prev": case "wear_music_playpause":
            case "wear_park_where": case "wear_fuel_quick": case "wear_km_quick":
            case "wear_fuel_save": case "wear_km_save":
            case "wear_voice_pin": case "wear_start": case "wear_resume":
                return cmd.toLowerCase(Locale.ROOT).trim();
            default: return "";
        }
    }
}
