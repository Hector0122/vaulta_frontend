package com.frontend.widget

import android.app.AlarmManager
import android.app.PendingIntent
import android.appwidget.AppWidgetManager
import android.appwidget.AppWidgetProvider
import android.content.Context
import android.content.Intent
import android.content.ComponentName
import android.content.SharedPreferences
import android.graphics.BitmapFactory
import android.widget.RemoteViews
import com.frontend.MainActivity
import com.frontend.R
import org.json.JSONArray
import java.io.File

class PhotosWidgetProvider : AppWidgetProvider() {

    override fun onReceive(context: Context, intent: Intent) {
        if (ACTION_ADVANCE == intent.action) {
            advancePhoto(context)
            return
        }
        super.onReceive(context, intent)
    }

    override fun onUpdate(
        context: Context,
        appWidgetManager: AppWidgetManager,
        appWidgetIds: IntArray,
    ) {
        for (appWidgetId in appWidgetIds) {
            updateAppWidget(context, appWidgetManager, appWidgetId)
        }
        scheduleAutoAdvance(context)
    }

    override fun onEnabled(context: Context) {
        scheduleAutoAdvance(context)
    }

    override fun onDisabled(context: Context) {
        cancelAutoAdvance(context)
        getPrefs(context).edit().clear().apply()
    }

    companion object {
        private const val PREFS_NAME = "widget_prefs"
        private const val KEY_PATHS = "widget_photo_paths"
        private const val KEY_INDEX = "widget_photo_index"
        private const val ACTION_ADVANCE = "com.frontend.ADVANCE_WIDGET"

        fun getPrefs(context: Context): SharedPreferences {
            return context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
        }

        fun updateWidgetNow(context: Context) {
            val manager = AppWidgetManager.getInstance(context)
            val ids = manager.getAppWidgetIds(
                ComponentName(context, PhotosWidgetProvider::class.java)
            )
            for (id in ids) {
                updateAppWidget(context, manager, id)
            }
        }

        private fun getPhotoPaths(prefs: SharedPreferences): List<String> {
            val json = prefs.getString(KEY_PATHS, "[]") ?: "[]"
            return try {
                val arr = JSONArray(json)
                (0 until arr.length()).map { arr.getString(it) }
            } catch (_: Exception) { emptyList() }
        }

        fun updateAppWidget(
            context: Context,
            appWidgetManager: AppWidgetManager,
            appWidgetId: Int,
        ) {
            val views = RemoteViews(context.packageName, R.layout.widget_photos)

            // Open app
            val openIntent = Intent(context, MainActivity::class.java).apply {
                flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP
            }
            val openPending = PendingIntent.getActivity(
                context, 0, openIntent,
                PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
            )
            views.setOnClickPendingIntent(R.id.widget_icon, openPending)
            views.setOnClickPendingIntent(R.id.widget_title, openPending)

            // Camera
            val cameraIntent = Intent(context, MainActivity::class.java).apply {
                flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP
                putExtra("open_camera", true)
            }
            val cameraPending = PendingIntent.getActivity(
                context, 1, cameraIntent,
                PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
            )
            views.setOnClickPendingIntent(R.id.widget_camera_btn, cameraPending)

            // Show current photo
            val prefs = getPrefs(context)
            val paths = getPhotoPaths(prefs)
            val count = paths.size
            val index = prefs.getInt(KEY_INDEX, 0)

            views.setTextViewText(R.id.widget_count, "$count fotos")

            if (count > 0) {
                val path = paths[index % count]
                try {
                    val file = File(path)
                    if (file.exists()) {
                        val bitmap = BitmapFactory.decodeFile(path)
                        if (bitmap != null) {
                            views.setImageViewBitmap(R.id.widget_photo, bitmap)
                        } else {
                            views.setImageViewResource(R.id.widget_photo, R.drawable.ic_widget_placeholder)
                        }
                    } else {
                        views.setImageViewResource(R.id.widget_photo, R.drawable.ic_widget_placeholder)
                    }
                } catch (_: Exception) {
                    views.setImageViewResource(R.id.widget_photo, R.drawable.ic_widget_placeholder)
                }
            } else {
                views.setImageViewResource(R.id.widget_photo, R.drawable.ic_widget_placeholder)
            }

            appWidgetManager.updateAppWidget(appWidgetId, views)
        }

        private fun advancePhoto(context: Context) {
            val prefs = getPrefs(context)
            val paths = getPhotoPaths(prefs)
            if (paths.isEmpty()) return

            val currentIndex = prefs.getInt(KEY_INDEX, 0)
            val newIndex = (currentIndex + 1) % paths.size
            prefs.edit().putInt(KEY_INDEX, newIndex).apply()

            val manager = AppWidgetManager.getInstance(context)
            val ids = manager.getAppWidgetIds(
                ComponentName(context, PhotosWidgetProvider::class.java)
            )
            for (id in ids) {
                updateAppWidget(context, manager, id)
            }
        }

        private fun scheduleAutoAdvance(context: Context) {
            try {
                val intent = Intent(context, PhotosWidgetProvider::class.java).apply {
                    action = ACTION_ADVANCE
                }
                val pending = PendingIntent.getBroadcast(
                    context, 0, intent,
                    PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
                )
                val alarm = context.getSystemService(Context.ALARM_SERVICE) as AlarmManager
                alarm.setRepeating(
                    AlarmManager.RTC,
                    System.currentTimeMillis() + 5000,
                    5000,
                    pending
                )
            } catch (_: Exception) {}
        }

        private fun cancelAutoAdvance(context: Context) {
            try {
                val intent = Intent(context, PhotosWidgetProvider::class.java).apply {
                    action = ACTION_ADVANCE
                }
                val pending = PendingIntent.getBroadcast(
                    context, 0, intent,
                    PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
                )
                val alarm = context.getSystemService(Context.ALARM_SERVICE) as AlarmManager
                alarm.cancel(pending)
            } catch (_: Exception) {}
        }
    }
}
