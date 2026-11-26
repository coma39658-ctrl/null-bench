plugins {
    id("com.android.application")
    id("org.jetbrains.kotlin.android")
}

val ezeroConnectUrl = providers.gradleProperty("ezeroConnectUrl").orElse("").get()
    .replace("\\", "\\\\")
    .replace("\"", "\\\"")
val ezeroWakePublicKey = providers.gradleProperty("ezeroWakePublicKeySpkiBase64").orElse("").get()
    .replace("\\", "\\\\")
    .replace("\"", "\\\"")

if (file("google-services.json").exists()) {
    apply(plugin = "com.google.gms.google-services")
}

android {
    namespace = "com.ezero.connect"
    compileSdk = 35

    defaultConfig {
        applicationId = "com.ezero.connect"
        minSdk = 24
        targetSdk = 35
        versionCode = 1
        versionName = "0.1.0-staging"
        buildConfigField("String", "EZERO_CONNECT_URL", "\"$ezeroConnectUrl\"")
        buildConfigField("String", "EZERO_WAKE_PUBLIC_KEY_SPKI_BASE64", "\"$ezeroWakePublicKey\"")
    }

    buildFeatures {
        buildConfig = true
    }

    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
    }
    kotlinOptions {
        jvmTarget = "17"
    }
}

dependencies {
    implementation("androidx.core:core:1.15.0")
    implementation("androidx.activity:activity-ktx:1.10.1")
    implementation("androidx.camera:camera-camera2:1.4.2")
    implementation("androidx.camera:camera-lifecycle:1.4.2")
    implementation("androidx.camera:camera-view:1.4.2")
    implementation("com.google.zxing:core:3.5.3")
    implementation("androidx.core:core-telecom:1.0.0")
    implementation(platform("com.google.firebase:firebase-bom:35.2.0"))
    implementation("com.google.firebase:firebase-messaging")
    testImplementation("junit:junit:4.13.2")
}
