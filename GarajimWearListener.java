package com.garajim.app;

import com.google.android.gms.wearable.MessageEvent;
import com.google.android.gms.wearable.WearableListenerService;
import android.util.Log;
import org.json.JSONObject;
import java.nio.charset.StandardCharsets;
import java.util.Locale;

/**
 * Saatten gelen komutlar. Saat JSON zarf gönderir: {"id":"...","cmd":"start","arg":"..."}.
 * Eski düz metin komutlar da desteklenir. Her komuta Data Layer ACK döner.
 */
public class GarajimWearListener extends WearableListenerService {
    private static final String TAG = "GarajimWearCmd";
    @Override
    public void onMessageReceived(MessageEvent event) {
        if (event == null || event.getPath() == null) return;
        if (!GarajimWearSync.PATH_CMD.equals(event.getPath())) return;
        String raw = new String(event.getData() == null ? new byte[0] : event.getData(), StandardCharsets.UTF_8).trim();
        if (raw.isEmpty()) return;
        Log.i(TAG, "RX path=" + event.getPath() + " raw=" + abbreviate(raw));

        String cmd = raw;
        String arg = null;
        String ackId = "";
        try {
            if (raw.startsWith("{")) {
                JSONObject o = new JSONObject(raw);
                ackId = o.optString("id", "");
                // Eski/yeni saat sürümleri aynı eylemi farklı zarf alanlarıyla gönderebilir.
                // İlk boş olmayan komut alanını seç; boş bir "cmd" alanı diğer alanları gölgelemesin.
                cmd = firstNonBlank(o, "cmd", "command", "action", "type", "event", "name");
                if ((cmd == null || cmd.trim().isEmpty()) && o.optJSONObject("data") != null) {
                    JSONObject nested = o.optJSONObject("data");
                    cmd = firstNonBlank(nested, "cmd", "command", "action", "type", "event", "name");
                    if (arg == null) arg = firstNonBlank(nested, "arg", "vehicle", "vehicleId", "vehicle_id", "summaryId", "summary_id");
                }
                if (arg == null || arg.trim().isEmpty()) {
                    arg = firstNonBlank(o, "arg", "vehicle", "vehicleId", "vehicle_id", "summaryId", "summary_id");
                }
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

        // Geriye dönük uyumluluk: bazı Wear sürümleri JSON zarfının cmd alanına
        // "start|vehicleId" biçiminde argümanı da ekleyebiliyor. Ayırıcıyı JSON
        // ayrıştırmasından sonra da işle; aksi halde mapCmd tüm ifadeyi tanıyamaz.
        int packedSeparator = cmd.indexOf('|');
        if (packedSeparator >= 0) {
            String packedArgument = cmd.substring(packedSeparator + 1).trim();
            cmd = cmd.substring(0, packedSeparator).trim();
            if (arg == null || arg.trim().isEmpty()) arg = packedArgument;
        }

        String action = mapCmd(cmd);
        Log.i(TAG, "PARSED cmd=[" + abbreviate(cmd) + "] arg=[" + abbreviate(arg == null ? "" : arg) + "] action=[" + action + "] ackId=[" + ackId + "]");
        if (action.isEmpty()) {
            String unknown = abbreviate(cmd == null ? "" : cmd.replace('\n', ' ').replace('\r', ' '));
            Log.w(TAG, "UNKNOWN_COMMAND cmd=[" + unknown + "] raw=[" + abbreviate(raw) + "]");
            GarajimWearSync.pushAck(this, ackId, false, "Bilinmeyen komut [" + unknown + "]");
            return;
        }

        boolean delivered = MainActivity.dispatchWearCommand(this, action, arg);
        if (delivered) {
            GarajimWearSync.pushAck(this, ackId, true, "Telefon komutu aldı");
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

    private static String abbreviate(String value) {
        if (value == null) return "";
        String clean = value.replace('\n', ' ').replace('\r', ' ').trim();
        return clean.length() > 96 ? clean.substring(0, 96) : clean;
    }

    private static String firstNonBlank(JSONObject object, String... keys) {
        if (object == null || keys == null) return null;
        for (String key : keys) {
            if (key == null || !object.has(key) || object.isNull(key)) continue;
            Object value = object.opt(key);
            if (value == null || value == JSONObject.NULL) continue;
            String text = String.valueOf(value).trim();
            if (!text.isEmpty() && !"null".equalsIgnoreCase(text)) return text;
        }
        return null;
    }

    private static String mapCmd(String cmd) {
        if (cmd == null) return "";
        // CamelCase, namespace ve eski sürüm adlarını tek normal forma indir.
        String normalized = cmd.trim()
                .replaceAll("([a-z0-9])([A-Z])", "$1_$2")
                .replace('\\', '/')
                .replace('-', '_')
                .replace(' ', '_')
                .toLowerCase(Locale.ROOT);
        normalized = normalized.replaceFirst("^/garajim/", "");
        normalized = normalized.replaceFirst("^(garajim|command|cmd|wear)[:/.]+", "");
        normalized = normalized.replaceAll("^[\"']+|[\"']+$", "").trim();
        switch (normalized) {
            case "start":
            case "start_ride":
            case "ride_start":
            case "begin_ride":
            case "start_ride_now":
            case "start_trip":
            case "start_drive":
            case "begin_drive":
            case "ride_begin": return "wear_start";
            case "resume":
            case "resume_ride":
            case "ride_resume":
            case "resume_trip":
            case "resume_drive":
            case "continue_ride": return "wear_resume";
            case "toggle":
            case "toggle_ride":
            case "toggle_trip":
            case "ride_toggle": return "wear_toggle";
            case "pause":
            case "pause_ride":
            case "ride_pause":
            case "pause_trip":
            case "pause_drive": return "wear_pause";
            case "stop":
            case "finish":
            case "stop_ride":
            case "ride_stop":
            case "finish_ride":
            case "stop_trip":
            case "finish_trip":
            case "end_ride":
            case "end_trip":
            case "wear_stop": return "wear_stop_request";
            case "stop_confirmed":
            case "finish_confirmed":
            case "finish_ride_confirmed":
            case "stop_ride_confirmed":
            case "confirm_finish":
            case "confirm_stop":
            case "stop_confirm":
            case "confirm_finish_ride":
            case "confirm_end_ride":
            case "end_ride_confirmed": return "wear_finish_confirmed";
            case "select_vehicle":
            case "selectvehicle":
            case "vehicle_select":
            case "choose_vehicle":
            case "select_car":
            case "choose_car":
            case "switch_vehicle":
            case "vehicle_changed": return "wear_select_vehicle";
            case "summary_save":
            case "save_summary":
            case "ride_summary_save": return "wear_summary_save";
            case "summary_discard":
            case "discard_summary":
            case "ride_summary_discard": return "wear_summary_discard";
            case "request_sync":
            case "sync":
            case "refresh": return "wear_request_sync";
            case "next": return "wear_music_next";
            case "prev": return "wear_music_prev";
            case "playpause": return "wear_music_playpause";
            case "park_where": return "wear_park_where";
            case "fuel_quick": return "wear_fuel_quick";
            case "km_quick": return "wear_km_quick";
            case "voice_pin": return "wear_voice_pin";
            case "ping": return "wear_request_sync";
            case "wear_toggle": case "wear_pause": case "wear_stop_request":
            case "wear_finish_confirmed": case "wear_select_vehicle":
            case "wear_summary_save": case "wear_summary_discard": case "wear_request_sync":
            case "wear_music_next": case "wear_music_prev": case "wear_music_playpause":
            case "wear_park_where": case "wear_fuel_quick": case "wear_km_quick": case "wear_voice_pin": case "wear_start": case "wear_resume":
                return normalized;
            default: return "";
        }
    }
}
