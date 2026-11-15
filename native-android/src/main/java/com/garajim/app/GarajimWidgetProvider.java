package com.garajim.app;

import android.app.PendingIntent;
import android.appwidget.AppWidgetManager;
import android.appwidget.AppWidgetProvider;
import android.content.ComponentName;
import android.content.Context;
import android.content.Intent;
import android.widget.RemoteViews;

public class GarajimWidgetProvider extends AppWidgetProvider {
    @Override public void onUpdate(Context context, AppWidgetManager manager, int[] ids) {
        for (int id : ids) updateOne(context, manager, id);
    }
    static void updateOne(Context context, AppWidgetManager manager, int id) {
        android.content.SharedPreferences p = context.getSharedPreferences("garajim_widget", Context.MODE_PRIVATE);
        RemoteViews views = new RemoteViews(context.getPackageName(), R.layout.garajim_widget);
        views.setTextViewText(R.id.widget_title, p.getString("title", "Garajım"));
        views.setTextViewText(R.id.widget_plate, p.getString("plate", "Uygulamayı açıp araç ekleyin"));
        String km = p.getString("km", "");
        views.setTextViewText(R.id.widget_km, km.isEmpty() ? p.getInt("count", 0) + " araç kayıtlı" : "KM: " + km);
        Intent launch = context.getPackageManager().getLaunchIntentForPackage(context.getPackageName());
        if (launch != null) {
            PendingIntent pi = PendingIntent.getActivity(context, 7402, launch,
                PendingIntent.FLAG_UPDATE_CURRENT | (android.os.Build.VERSION.SDK_INT >= 23 ? PendingIntent.FLAG_IMMUTABLE : 0));
            views.setOnClickPendingIntent(R.id.widget_root, pi);
        }
        manager.updateAppWidget(id, views);
    }
    public static void refresh(Context context) {
        AppWidgetManager manager = AppWidgetManager.getInstance(context);
        int[] ids = manager.getAppWidgetIds(new ComponentName(context, GarajimWidgetProvider.class));
        for (int id : ids) updateOne(context, manager, id);
    }
}
