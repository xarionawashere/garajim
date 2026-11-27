package com.garajim.app;

import android.content.ComponentName;
import android.content.Context;
import android.content.SharedPreferences;
import android.content.pm.PackageManager;

/** Switches the one enabled launcher alias while preserving the chosen logo across app starts. */
public final class LauncherIconManager {
    private static final String PREFS = "garajim_branding";
    private static final String KEY_LOGO = "logoId";
    private static final String[] IDS = {
        "garage", "monogram", "route", "sport", "heritage", "turbo", "electric", "rally"
    };

    private LauncherIconManager() {}

    public static String normalize(String requested) {
        if (requested != null) {
            for (String id : IDS) if (id.equals(requested)) return id;
        }
        return "garage";
    }

    public static void apply(Context context, String requested) {
        if (context == null) return;
        Context app = context.getApplicationContext();
        String selected = normalize(requested);
        PackageManager pm = app.getPackageManager();
        String appId = app.getPackageName();
        for (String id : IDS) {
            String suffix = Character.toUpperCase(id.charAt(0)) + id.substring(1);
            ComponentName alias = new ComponentName(appId, appId + ".LauncherLogo" + suffix);
            pm.setComponentEnabledSetting(alias,
                    id.equals(selected) ? PackageManager.COMPONENT_ENABLED_STATE_ENABLED
                            : PackageManager.COMPONENT_ENABLED_STATE_DISABLED,
                    PackageManager.DONT_KILL_APP);
        }
        SharedPreferences prefs = app.getSharedPreferences(PREFS, Context.MODE_PRIVATE);
        prefs.edit().putString(KEY_LOGO, selected).apply();
    }
}
