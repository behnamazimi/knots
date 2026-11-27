package com.behnamazimi.knots

import android.annotation.SuppressLint
import android.app.UiModeManager
import android.content.ClipData
import android.content.ClipboardManager
import android.content.Context
import android.content.Intent
import android.content.res.Configuration
import android.graphics.Color
import android.net.Uri
import android.os.Build
import android.os.Bundle
import android.provider.Settings
import android.view.Gravity
import android.view.View
import android.view.ViewGroup
import android.webkit.WebResourceError
import android.webkit.WebResourceRequest
import android.webkit.WebResourceResponse
import android.webkit.WebSettings
import android.webkit.WebView
import android.webkit.WebViewClient
import android.widget.FrameLayout
import android.widget.ImageView
import android.widget.Toast
import androidx.appcompat.app.AppCompatActivity
import androidx.appcompat.app.AppCompatDelegate
import androidx.activity.OnBackPressedCallback
import androidx.activity.SystemBarStyle
import androidx.activity.enableEdgeToEdge
import androidx.core.splashscreen.SplashScreen.Companion.installSplashScreen
import androidx.core.view.ViewCompat
import androidx.core.view.WindowCompat
import androidx.core.view.WindowInsetsCompat
import androidx.webkit.WebViewAssetLoader
import com.google.mlkit.vision.barcode.common.Barcode
import com.google.mlkit.vision.codescanner.GmsBarcodeScannerOptions
import com.google.mlkit.vision.codescanner.GmsBarcodeScanning

class MainActivity : AppCompatActivity() {

    private lateinit var rootLayout: FrameLayout
    private lateinit var webView: WebView
    private lateinit var assetLoader: WebViewAssetLoader
    private var isPageReady = false
    private var lastAppliedIsNightMode: Boolean? = null

    private fun updateSystemBarsTheme(theme: String? = null) {
        val prefs = getSharedPreferences("knots_prefs", Context.MODE_PRIVATE)
        val currentTheme = theme ?: prefs.getString("theme", "system") ?: "system"
        val isNightMode = when (currentTheme) {
            "light" -> false
            "dark" -> true
            else -> (resources.configuration.uiMode and Configuration.UI_MODE_NIGHT_MASK) == Configuration.UI_MODE_NIGHT_YES
        }
        if (lastAppliedIsNightMode == isNightMode) return
        lastAppliedIsNightMode = isNightMode
        val bg = if (isNightMode) Color.parseColor("#14171c") else Color.parseColor("#f6f6f3")

        window.decorView.setBackgroundColor(bg)
        window.statusBarColor = bg
        window.navigationBarColor = bg
        if (::rootLayout.isInitialized) {
            rootLayout.setBackgroundColor(bg)
        }
        if (::webView.isInitialized) {
            webView.setBackgroundColor(bg)
        }

        val insetsController = WindowCompat.getInsetsController(window, window.decorView)
        insetsController.isAppearanceLightStatusBars = !isNightMode
        insetsController.isAppearanceLightNavigationBars = !isNightMode
    }

    private fun applyAppNightMode(theme: String?) {
        val prefs = getSharedPreferences("knots_prefs", Context.MODE_PRIVATE)
        if (theme != null) {
            prefs.edit().putString("theme", theme).apply()
        }
        val currentTheme = prefs.getString("theme", "system") ?: "system"

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
            val uiModeManager = getSystemService(UiModeManager::class.java)
            val osMode = when (currentTheme) {
                "light" -> UiModeManager.MODE_NIGHT_NO
                "dark" -> UiModeManager.MODE_NIGHT_YES
                else -> UiModeManager.MODE_NIGHT_AUTO
            }
            uiModeManager?.setApplicationNightMode(osMode)
        }

        val targetMode = when (currentTheme) {
            "light" -> AppCompatDelegate.MODE_NIGHT_NO
            "dark" -> AppCompatDelegate.MODE_NIGHT_YES
            else -> AppCompatDelegate.MODE_NIGHT_FOLLOW_SYSTEM
        }
        if (AppCompatDelegate.getDefaultNightMode() != targetMode) {
            AppCompatDelegate.setDefaultNightMode(targetMode)
        }
    }

    @SuppressLint("SetJavaScriptEnabled")
    override fun onCreate(savedInstanceState: Bundle?) {
        applyAppNightMode(null)
        val splashScreen = installSplashScreen()
        splashScreen.setKeepOnScreenCondition { !isPageReady }
        splashScreen.setOnExitAnimationListener { splashScreenViewProvider ->
            splashScreenViewProvider.view.animate()
                .alpha(0f)
                .setDuration(250L)
                .withEndAction {
                    splashScreenViewProvider.remove()
                }
                .start()
        }
        val prefs = getSharedPreferences("knots_prefs", Context.MODE_PRIVATE)
        val currentTheme = prefs.getString("theme", "system") ?: "system"
        val isNightMode = when (currentTheme) {
            "light" -> false
            "dark" -> true
            else -> (resources.configuration.uiMode and Configuration.UI_MODE_NIGHT_MASK) == Configuration.UI_MODE_NIGHT_YES
        }
        val statusBarStyle = if (isNightMode) {
            SystemBarStyle.dark(Color.TRANSPARENT)
        } else {
            SystemBarStyle.light(Color.TRANSPARENT, Color.TRANSPARENT)
        }
        val navBarStyle = if (isNightMode) {
            SystemBarStyle.dark(Color.TRANSPARENT)
        } else {
            SystemBarStyle.light(Color.TRANSPARENT, Color.TRANSPARENT)
        }
        super.onCreate(savedInstanceState)
        enableEdgeToEdge(statusBarStyle = statusBarStyle, navigationBarStyle = navBarStyle)

        assetLoader = WebViewAssetLoader.Builder()
            .setDomain("knots.local")
            .addPathHandler("/", KnotsAssetPathHandler(this))
            .build()

        val initialBg = if (isNightMode) Color.parseColor("#14171c") else Color.parseColor("#f6f6f3")

        rootLayout = FrameLayout(this).apply {
            layoutParams = ViewGroup.LayoutParams(
                ViewGroup.LayoutParams.MATCH_PARENT,
                ViewGroup.LayoutParams.MATCH_PARENT
            )
            setBackgroundColor(initialBg)
        }

        webView = WebView(this).apply {
            layoutParams = FrameLayout.LayoutParams(
                ViewGroup.LayoutParams.MATCH_PARENT,
                ViewGroup.LayoutParams.MATCH_PARENT
            )
            setBackgroundColor(initialBg)
        }
        rootLayout.addView(webView)

        setContentView(rootLayout)
        updateSystemBarsTheme(currentTheme)

        ViewCompat.setOnApplyWindowInsetsListener(webView) { view, insets ->
            val systemBars = insets.getInsets(WindowInsetsCompat.Type.systemBars())
            val lp = view.layoutParams as? FrameLayout.LayoutParams ?: FrameLayout.LayoutParams(view.layoutParams)
            lp.leftMargin = systemBars.left
            lp.topMargin = systemBars.top
            lp.rightMargin = systemBars.right
            lp.bottomMargin = systemBars.bottom
            view.layoutParams = lp
            WindowInsetsCompat.CONSUMED
        }

        if (BuildConfig.DEBUG) {
            WebView.setWebContentsDebuggingEnabled(true)
        }

        with(webView.settings) {
            javaScriptEnabled = true
            domStorageEnabled = true
            allowFileAccess = false
            allowContentAccess = false
            loadsImagesAutomatically = true
            mixedContentMode = WebSettings.MIXED_CONTENT_NEVER_ALLOW
            userAgentString = "$userAgentString KnotsApp/1.0"
        }

        webView.addJavascriptInterface(object {
            @android.webkit.JavascriptInterface
            fun onThemeChanged(theme: String) {
                runOnUiThread {
                    applyAppNightMode(theme)
                    updateSystemBarsTheme(theme)
                }
            }

            @android.webkit.JavascriptInterface
            fun onAppReady(theme: String?) {
                android.util.Log.d("KnotsNative", "onAppReady signal received with theme: $theme")
                runOnUiThread {
                    if (!theme.isNullOrEmpty()) {
                        applyAppNightMode(theme)
                        updateSystemBarsTheme(theme)
                    }
                    isPageReady = true
                }
            }

            @android.webkit.JavascriptInterface
            fun getAppVersion(): String {
                return BuildConfig.VERSION_NAME
            }

            @android.webkit.JavascriptInterface
            fun isAppDebug(): Boolean {
                return BuildConfig.DEBUG
            }

            @android.webkit.JavascriptInterface
            fun shareText(text: String, title: String?) {
                runOnUiThread {
                    try {
                        val intent = Intent(Intent.ACTION_SEND).apply {
                            type = "text/plain"
                            putExtra(Intent.EXTRA_TEXT, text)
                            if (!title.isNullOrEmpty()) {
                                putExtra(Intent.EXTRA_TITLE, title)
                            }
                        }
                        startActivity(Intent.createChooser(intent, title ?: "Share favorites"))
                    } catch (e: Exception) {
                        android.util.Log.e("KnotsNative", "Failed to share text", e)
                    }
                }
            }

            @android.webkit.JavascriptInterface
            fun getClipboardText(): String? {
                var text: String? = null
                val latch = java.util.concurrent.CountDownLatch(1)
                runOnUiThread {
                    try {
                        val clipboard = getSystemService(Context.CLIPBOARD_SERVICE) as ClipboardManager
                        val clip = clipboard.primaryClip
                        if (clip != null && clip.itemCount > 0) {
                            text = clip.getItemAt(0).text?.toString()
                        }
                    } catch (e: Exception) {
                        android.util.Log.e("KnotsNative", "Failed to get clipboard text", e)
                    } finally {
                        latch.countDown()
                    }
                }
                try {
                    latch.await(500, java.util.concurrent.TimeUnit.MILLISECONDS)
                } catch (e: InterruptedException) {
                    android.util.Log.e("KnotsNative", "Interrupted waiting for clipboard", e)
                }
                return text
            }

            @android.webkit.JavascriptInterface
            fun copyToClipboard(text: String) {
                runOnUiThread {
                    try {
                        val clipboard = getSystemService(Context.CLIPBOARD_SERVICE) as ClipboardManager
                        val clip = ClipData.newPlainText("Knots Favorites", text)
                        clipboard.setPrimaryClip(clip)
                    } catch (e: Exception) {
                        android.util.Log.e("KnotsNative", "Failed to copy to clipboard", e)
                    }
                }
            }

            @android.webkit.JavascriptInterface
            fun scanQrCode() {
                runOnUiThread {
                    try {
                        val options = GmsBarcodeScannerOptions.Builder()
                            .setBarcodeFormats(Barcode.FORMAT_QR_CODE)
                            .build()
                        val scanner = GmsBarcodeScanning.getClient(this@MainActivity, options)
                        scanner.startScan()
                            .addOnSuccessListener { barcode ->
                                val rawValue = barcode.rawValue ?: ""
                                val escaped = rawValue
                                    .replace("\\", "\\\\")
                                    .replace("'", "\\'")
                                    .replace("\n", "\\n")
                                    .replace("\r", "")
                                webView.evaluateJavascript("window.__onQrScanned && window.__onQrScanned('$escaped');", null)
                            }
                            .addOnCanceledListener {
                                webView.evaluateJavascript("window.__onQrScanCanceled && window.__onQrScanCanceled();", null)
                            }
                            .addOnFailureListener { e ->
                                android.util.Log.e("KnotsNative", "QR scan failed", e)
                                val msg = (e.message ?: "Scan failed")
                                    .replace("\\", "\\\\")
                                    .replace("'", "\\'")
                                    .replace("\n", "\\n")
                                webView.evaluateJavascript("window.__onQrScanError && window.__onQrScanError('$msg');", null)
                            }
                    } catch (e: Exception) {
                        android.util.Log.e("KnotsNative", "Could not start scanner", e)
                        val msg = (e.message ?: "Scanner unavailable")
                            .replace("\\", "\\\\")
                            .replace("'", "\\'")
                            .replace("\n", "\\n")
                        webView.evaluateJavascript("window.__onQrScanError && window.__onQrScanError('$msg');", null)
                    }
                }
            }
        }, "KnotsNative")

        webView.postDelayed({
            isPageReady = true
        }, 3000)

        webView.webViewClient = object : WebViewClient() {
            override fun shouldInterceptRequest(
                view: WebView,
                request: WebResourceRequest
            ): WebResourceResponse? {
                return assetLoader.shouldInterceptRequest(request.url)
            }

            override fun shouldOverrideUrlLoading(
                view: WebView,
                request: WebResourceRequest
            ): Boolean {
                val url = request.url ?: return false
                val host = url.host ?: ""

                if (host == "knots.local") {
                    return false
                }

                // External links (e.g. GitHub, social, author links) open in the system browser
                return try {
                    val intent = Intent(Intent.ACTION_VIEW, url)
                    startActivity(intent)
                    true
                } catch (_: Exception) {
                    true
                }
            }

            override fun onReceivedError(
                view: WebView,
                request: WebResourceRequest,
                error: WebResourceError
            ) {
                super.onReceivedError(view, request, error)
                android.util.Log.e("KnotsNative", "WebView error on ${request.url}: ${error.description} (${error.errorCode})")
                if (request.isForMainFrame) {
                    view.loadUrl("https://knots.local/")
                }
            }

            override fun onPageFinished(view: WebView, url: String?) {
                super.onPageFinished(view, url)
                // Remove web chrome (footer and external social links) in native app view
                val js = """
                    (function() {
                        document.documentElement.classList.add('is-native-app');
                        var id = 'knots-native-clean';
                        if (!document.getElementById(id)) {
                            var style = document.createElement('style');
                            style.id = id;
                            style.textContent = 'footer { display: none !important; } header nav a[href*="github.com"] { display: none !important; }';
                            document.head.appendChild(style);
                        }
                    })();
                """.trimIndent()
                view.evaluateJavascript(js, null)
            }
        }

        setupBackNavigation()

        var restored = false
        if (savedInstanceState != null) {
            restored = (webView.restoreState(savedInstanceState) != null)
        }
        if (!restored || webView.url.isNullOrEmpty()) {
            webView.loadUrl("https://knots.local/")
        }
    }

    private fun setupBackNavigation() {
        onBackPressedDispatcher.addCallback(this, object : OnBackPressedCallback(true) {
            override fun handleOnBackPressed() {
                webView.evaluateJavascript("window.__onSystemBack ? window.__onSystemBack() : false") { result ->
                    if (result == "true") return@evaluateJavascript
                    val uri = Uri.parse(webView.url ?: "")
                    val path = uri.path ?: ""
                    if (webView.canGoBack() && path != "/" && path.isNotEmpty()) {
                        webView.goBack()
                    } else {
                        finish()
                    }
                }
            }
        })
    }

    override fun onConfigurationChanged(newConfig: Configuration) {
        super.onConfigurationChanged(newConfig)
        updateSystemBarsTheme()
    }

    override fun onSaveInstanceState(outState: Bundle) {
        super.onSaveInstanceState(outState)
        webView.saveState(outState)
    }

    override fun onResume() {
        super.onResume()
        webView.onResume()
    }

    override fun onPause() {
        webView.onPause()
        super.onPause()
    }

    override fun onDestroy() {
        webView.destroy()
        super.onDestroy()
    }
}

