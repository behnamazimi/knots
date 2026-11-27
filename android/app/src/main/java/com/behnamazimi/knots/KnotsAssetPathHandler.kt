package com.behnamazimi.knots

import android.content.Context
import android.webkit.WebResourceResponse
import androidx.webkit.WebViewAssetLoader
import java.io.InputStream

class KnotsAssetPathHandler(private val context: Context) : WebViewAssetLoader.PathHandler {

    override fun handle(path: String): WebResourceResponse? {
        val cleanPath = path.trimStart('/')

        // For page navigations, always serve the clean SPA shell (__spa-fallback.html)
        // so that prerendered website markup never flashes on app startup.
        val isHtmlRequest = cleanPath.isEmpty() ||
                cleanPath == "index.html" ||
                cleanPath.endsWith("/") ||
                cleanPath.endsWith(".html") ||
                !cleanPath.contains(".")

        val resolved = if (isHtmlRequest) {
            resolveAsset("__spa-fallback.html") ?: resolveAsset(cleanPath)
        } else {
            resolveAsset(cleanPath)
        } ?: return null

        val mimeType = getMimeType(resolved.path)
        val encoding = if (mimeType.startsWith("text/") || mimeType.contains("javascript") || mimeType.contains("json")) "utf-8" else null
        val cacheControl = if (isHtmlRequest) {
            "no-cache"
        } else {
            "public, max-age=31536000, immutable"
        }
        val headers = mapOf(
            "Access-Control-Allow-Origin" to "*",
            "Cache-Control" to cacheControl
        )

        return WebResourceResponse(mimeType, encoding, 200, "OK", headers, resolved.stream)
    }

    private data class AssetMatch(val path: String, val stream: InputStream)

    private fun resolveAsset(assetPath: String): AssetMatch? {
        return try {
            val stream = context.assets.open(assetPath)
            AssetMatch(assetPath, stream)
        } catch (_: Exception) {
            null
        }
    }

    private fun getMimeType(filePath: String): String {
        val ext = filePath.substringAfterLast('.', "").lowercase()
        return when (ext) {
            "html", "htm" -> "text/html"
            "js", "mjs" -> "application/javascript"
            "css" -> "text/css"
            "json" -> "application/json"
            "png" -> "image/png"
            "jpg", "jpeg" -> "image/jpeg"
            "webp" -> "image/webp"
            "svg" -> "image/svg+xml"
            "wasm" -> "application/wasm"
            "ico" -> "image/x-icon"
            "woff" -> "font/woff"
            "woff2" -> "font/woff2"
            "ttf" -> "font/ttf"
            "otf" -> "font/otf"
            "mp4" -> "video/mp4"
            else -> "application/octet-stream"
        }
    }
}
