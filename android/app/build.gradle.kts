plugins {
    id("com.android.application")
    id("org.jetbrains.kotlin.android")
}

android {
    namespace = "com.behnamazimi.knots"
    compileSdk = 35

    val resolvedVersionName = System.getenv("APP_VERSION")
        ?.removePrefix("v")
        ?.trim()
        ?.takeIf { it.isNotEmpty() }
        ?: "0.1.0"
    val semverParts = resolvedVersionName.split(".").map { it.toIntOrNull() ?: 0 }
    val resolvedVersionCode = (
        (semverParts.getOrElse(0) { 0 } * 10000) +
            (semverParts.getOrElse(1) { 0 } * 100) +
            semverParts.getOrElse(2) { 0 }
        ).coerceAtLeast(2)

    defaultConfig {
        applicationId = "com.behnamazimi.knots"
        minSdk = 24
        targetSdk = 35
        versionCode = resolvedVersionCode
        versionName = resolvedVersionName

        testInstrumentationRunner = "androidx.test.runner.AndroidJUnitRunner"
    }

    // Release signing: checks for knots-release.jks (decoded by CI or provided locally)
    // and passwords in env. Falls back to debug signing when absent.
    val keystoreFile = file("knots-release.jks")
    val keystorePassword = System.getenv("KEYSTORE_PASSWORD")
    val keyAlias = System.getenv("KEY_ALIAS")
    val keyPassword = System.getenv("KEY_PASSWORD")
    val hasReleaseKey = keystoreFile.exists() && listOf(keystorePassword, keyAlias, keyPassword).all { !it.isNullOrBlank() }

    if (hasReleaseKey) {
        signingConfigs {
            create("release") {
                storeFile = keystoreFile
                storePassword = keystorePassword
                this.keyAlias = keyAlias
                this.keyPassword = keyPassword
            }
        }
    }

    buildTypes {
        release {
            isMinifyEnabled = true
            isShrinkResources = true
            proguardFiles(
                getDefaultProguardFile("proguard-android-optimize.txt"),
                "proguard-rules.pro"
            )
            signingConfig = if (hasReleaseKey) signingConfigs.getByName("release")
                            else signingConfigs.getByName("debug")
        }
        debug {
            applicationIdSuffix = ".debug"
            isDebuggable = true
        }
    }

    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
    }

    kotlinOptions {
        jvmTarget = "17"
    }

    buildFeatures {
        buildConfig = true
    }

    packaging {
        resources {
            excludes += "/META-INF/{AL2.0,LGPL2.1}"
        }
    }
}

dependencies {
    implementation("androidx.core:core-ktx:1.15.0")
    implementation("androidx.appcompat:appcompat:1.7.0")
    implementation("androidx.activity:activity-ktx:1.10.1")
    implementation("androidx.webkit:webkit:1.12.1")
    implementation("androidx.core:core-splashscreen:1.0.1")
    implementation("com.google.android.gms:play-services-code-scanner:16.1.0")
}

val copyWebAssets = tasks.register<Sync>("copyWebAssets") {
    description = "Copies knots web client production build into Android assets"
    val webBuildDir = rootProject.file("../build/client")
    from(webBuildDir)
    into(layout.projectDirectory.dir("src/main/assets"))
}

tasks.named("preBuild") {
    dependsOn(copyWebAssets)
}

