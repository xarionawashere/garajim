package com.garajim.app;

import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;

public class GarajimBootReceiver extends BroadcastReceiver {
    @Override public void onReceive(Context context, Intent intent) {
        if (intent == null) return;
        String a = intent.getAction();
        // Yeniden başlatma ve uygulama güncellemesi alarmları siler; tekrar kur.
        if (!Intent.ACTION_BOOT_COMPLETED.equals(a) && !Intent.ACTION_MY_PACKAGE_REPLACED.equals(a)) return;
        boolean enabled = context.getSharedPreferences("garajim_widget", Context.MODE_PRIVATE).getBoolean("reminders", false);
        if (enabled) GarajimReminderReceiver.schedule(context);
        GarajimWidgetProvider.refresh(context);
    }
}
