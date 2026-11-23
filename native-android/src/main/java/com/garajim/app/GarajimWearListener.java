package com.garajim.app;

import com.google.android.gms.wearable.MessageEvent;
import com.google.android.gms.wearable.WearableListenerService;
import java.nio.charset.StandardCharsets;

/** Saatten gelen komutları mevcut telefon WebView oturumuna, ekranı öne getirmeden iletir. */
public class GarajimWearListener extends WearableListenerService {
    @Override
    public void onMessageReceived(MessageEvent event) {
        if (event == null || event.getPath() == null) return;
        if (!GarajimWearSync.PATH_CMD.equals(event.getPath())) return;
        String raw = new String(event.getData() == null ? new byte[0] : event.getData(), StandardCharsets.UTF_8).trim();
        if (raw.isEmpty()) return;
        String cmd = raw;
        String arg = null;
        int sep = raw.indexOf('|');
        if (sep >= 0) {
            cmd = raw.substring(0, sep).trim();
            arg = raw.substring(sep + 1).trim();
        }
        String action = mapCmd(cmd);
        if (action.isEmpty()) return;

        boolean delivered = MainActivity.dispatchWearCommand(this, action, arg);
        if (!delivered) {
            if ("wear_select_vehicle".equals(action)) {
                GarajimWearSync.pushAlert(this, "info", "Araç seçimi sıraya alındı. Telefon Garajım oturumu hazır olduğunda uygulanacak.");
            } else if ("wear_request_sync".equals(action)) {
                GarajimWearSync.pushAlert(this, "info", "Saat arka plan servisi hazır değil. Telefonu açıp Garajım'ı bir kez başlat ve konum iznini ver.");
            } else {
                GarajimWearSync.pushAlert(this, "info", "Saatten sürüş için Garajım'ı telefonda bir kez açıp arka plan servisini hazırlamalısın.");
            }
        }
    }

    private static String mapCmd(String cmd) {
        switch (cmd.toLowerCase()) {
            case "start": return "wear_start";
            case "resume": return "wear_resume";
            case "toggle": return "wear_toggle"; // eski saat sürümüyle geriye dönük uyumluluk
            case "pause": return "wear_pause";
            case "stop":
            case "finish": return "wear_stop_request";
            case "stop_confirmed": return "wear_finish_confirmed";
            case "select_vehicle": return "wear_select_vehicle";
            case "summary_save": return "wear_summary_save";
            case "summary_discard": return "wear_summary_discard";
            case "request_sync": return "wear_request_sync";
            case "next": return "wear_music_next";
            case "prev": return "wear_music_prev";
            case "playpause": return "wear_music_playpause";
            case "park_where": return "wear_park_where";
            default:
                // Geriye dönük uyum: yalnızca tanınan Wear OS eylemlerine izin ver.
                switch (cmd.toLowerCase()) {
                    case "wear_toggle": case "wear_pause": case "wear_stop_request":
                    case "wear_finish_confirmed": case "wear_select_vehicle":
                    case "wear_summary_save": case "wear_summary_discard": case "wear_request_sync":
                    case "wear_music_next": case "wear_music_prev": case "wear_music_playpause":
                    case "wear_park_where": case "wear_start": case "wear_resume":
                        return cmd.toLowerCase();
                    default: return "";
                }
        }
    }
}
