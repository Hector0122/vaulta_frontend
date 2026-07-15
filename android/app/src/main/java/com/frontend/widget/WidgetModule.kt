package com.frontend.widget

import android.content.Context
import android.content.SharedPreferences
import android.graphics.BitmapFactory
import com.facebook.react.bridge.Callback
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.bridge.ReadableArray
import org.json.JSONArray
import java.io.File
import java.io.FileOutputStream
import java.net.HttpURLConnection
import java.net.URL

class WidgetModule(reactContext: ReactApplicationContext) :
    ReactContextBaseJavaModule(reactContext) {

    companion object {
        private val downloadLock = Any()
    }

    override fun getName(): String = "WidgetModule"

    @ReactMethod
    fun updateWidget(photoCount: Int, thumbPaths: ReadableArray) {
        // No-op: widget count is derived from actual downloaded files
    }

    @ReactMethod
    fun clearWidget() {
        val context: Context = reactApplicationContext
        val prefs = PhotosWidgetProvider.getPrefs(context)
        prefs.edit().clear().apply()
        PhotosWidgetProvider.updateWidgetNow(context)
    }

    @ReactMethod
    fun pruneWidgetPhotos() {
        val context: Context = reactApplicationContext
        val prefs = PhotosWidgetProvider.getPrefs(context)

        val idsJson = prefs.getString("widget_photo_ids", "[]") ?: "[]"
        val pathsJson = prefs.getString("widget_photo_paths", "[]") ?: "[]"
        val ids = try { JSONArray(idsJson) } catch (_: Exception) { JSONArray() }
        val paths = try { JSONArray(pathsJson) } catch (_: Exception) { JSONArray() }

        val cleanIds = JSONArray()
        val cleanPaths = JSONArray()

        for (i in 0 until ids.length()) {
            val id = ids.getString(i)
            val path = if (i < paths.length()) paths.getString(i) else ""
            val file = File(path)
            if (path.isNotEmpty() && file.exists()) {
                val bmp = BitmapFactory.decodeFile(path)
                if (bmp != null) {
                    cleanIds.put(id)
                    cleanPaths.put(path)
                    bmp.recycle()
                } else {
                    file.delete()
                }
            }
        }

        val oldCount = ids.length()
        val newCount = cleanIds.length()

        prefs.edit()
            .putString("widget_photo_ids", cleanIds.toString())
            .putString("widget_photo_paths", cleanPaths.toString())
            .apply()

        if (oldCount != newCount) {
            android.util.Log.d("WidgetModule", "Pruned widget: $oldCount -> $newCount photos")
            PhotosWidgetProvider.updateWidgetNow(context)
        }
    }

    @ReactMethod
    fun addWidgetPhoto(photoId: String, photoUrl: String) {
        val context: Context = reactApplicationContext
        val prefs = PhotosWidgetProvider.getPrefs(context)

        // Check duplicate in existing IDs
        val existingIds = prefs.getString("widget_photo_ids", "[]") ?: "[]"
        val ids = try { JSONArray(existingIds) } catch (_: Exception) { JSONArray() }
        for (i in 0 until ids.length()) {
            if (ids.getString(i) == photoId) return
        }

        // Check duplicate in pending queue
        val pendingJson = prefs.getString("widget_pending_urls", "[]") ?: "[]"
        val pending = try { JSONArray(pendingJson) } catch (_: Exception) { JSONArray() }
        for (i in 0 until pending.length()) {
            try {
                val entry = pending.getJSONArray(i)
                if (entry.getString(0) == photoId) return
            } catch (_: Exception) {}
        }

        // Save to pending queue only (ID will be committed after successful download)
        pending.put(JSONArray().apply {
            put(photoId)
            put(photoUrl)
        })
        prefs.edit().putString("widget_pending_urls", pending.toString()).apply()

        // Start background download
        downloadPending(context, prefs)
    }

    @ReactMethod
    fun removeWidgetPhoto(photoId: String) {
        val context: Context = reactApplicationContext
        val prefs = PhotosWidgetProvider.getPrefs(context)

        val existingIds = prefs.getString("widget_photo_ids", "[]") ?: "[]"
        val ids = try { JSONArray(existingIds) } catch (_: Exception) { JSONArray() }
        val existingPaths = prefs.getString("widget_photo_paths", "[]") ?: "[]"
        val paths = try { JSONArray(existingPaths) } catch (_: Exception) { JSONArray() }

        val newIds = JSONArray()
        val newPaths = JSONArray()
        for (i in 0 until ids.length()) {
            if (ids.getString(i) != photoId) {
                newIds.put(ids.getString(i))
                if (i < paths.length()) {
                    newPaths.put(paths.getString(i))
                }
            }
        }

        prefs.edit()
            .putString("widget_photo_ids", newIds.toString())
            .putString("widget_photo_paths", newPaths.toString())
            .apply()
        PhotosWidgetProvider.updateWidgetNow(context)
    }

    @ReactMethod
    fun getWidgetPhotoIds(callback: Callback) {
        val prefs = PhotosWidgetProvider.getPrefs(reactApplicationContext)
        val json = prefs.getString("widget_photo_ids", "[]") ?: "[]"
        callback.invoke(json)
    }

    private fun downloadPending(context: Context, prefs: SharedPreferences) {
        Thread {
            try {
                val pendingJson = prefs.getString("widget_pending_urls", "[]") ?: "[]"
                val pending = try { JSONArray(pendingJson) } catch (_: Exception) { JSONArray() }
                if (pending.length() == 0) return@Thread

                val dir = File(context.cacheDir, "widget_photos")
                if (!dir.exists()) dir.mkdirs()

                val successfulIds = JSONArray()
                val successfulPaths = JSONArray()

                for (i in 0 until pending.length()) {
                    try {
                        val entry = pending.getJSONArray(i)
                        val pid = entry.getString(0)
                        val urlStr = entry.getString(1)
                        val dest = File(dir, "widget_${pid}.jpg")

                        val conn = URL(urlStr).openConnection() as HttpURLConnection
                        conn.connectTimeout = 15000
                        conn.readTimeout = 30000
                        conn.instanceFollowRedirects = true
                        conn.connect()

                        if (conn.responseCode == 200) {
                            conn.inputStream.use { input ->
                                FileOutputStream(dest).use { output ->
                                    input.copyTo(output)
                                }
                            }
                            // Verify it's a valid image
                            val bmp = BitmapFactory.decodeFile(dest.absolutePath)
                            if (bmp != null) {
                                successfulIds.put(pid)
                                successfulPaths.put(dest.absolutePath)
                                bmp.recycle()
                            } else {
                                dest.delete()
                            }
                        }
                        conn.disconnect()
                } catch (e: Exception) {
                    android.util.Log.e("WidgetModule", "Download failed for pending photo: ${e.message}")
                }
                }

                // Only commit IDs and paths for successfully downloaded photos
                if (successfulIds.length() > 0) {
                    val existingIds = prefs.getString("widget_photo_ids", "[]") ?: "[]"
                    val ids = try { JSONArray(existingIds) } catch (_: Exception) { JSONArray() }
                    val existingPaths = prefs.getString("widget_photo_paths", "[]") ?: "[]"
                    val paths = try { JSONArray(existingPaths) } catch (_: Exception) { JSONArray() }

                    for (i in 0 until successfulIds.length()) {
                        ids.put(successfulIds.getString(i))
                        paths.put(successfulPaths.getString(i))
                    }

                    prefs.edit()
                        .putString("widget_photo_ids", ids.toString())
                        .putString("widget_photo_paths", paths.toString())
                        .putString("widget_pending_urls", "[]")
                        .apply()

                    PhotosWidgetProvider.updateWidgetNow(context)
                } else {
                    prefs.edit().putString("widget_pending_urls", "[]").apply()
                }
            } catch (_: Exception) {}
        }.start()
    }
}
