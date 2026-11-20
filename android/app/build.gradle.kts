plugins {
    id("com.android.application")
    id("org.jetbrains.kotlin.android")
}

if (file("google-services.json").exists()) {
    apply(plugin = "com.google.gms.google-services")
}

android {
    namespace = "com.ezero.connect"
    compileSdk = 35

    defaultConfig {
        applicationId = "com.ezero.connect.staging53"
        minSdk = 24
        targetSdk = 35
        versionCode = 53
        versionName = "0.1.0-staging53"
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
