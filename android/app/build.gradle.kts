plugins {
    id("com.android.application")
    id("org.jetbrains.kotlin.android")
}

if (file("google-services.json").exists()) {
    apply(plugin = "com.google.gms.google-services")
}

// Stable staging signing is supplied only through GitHub Actions Secrets.
// Never commit a keystore or signing passwords to the repository.
val stagingKeystorePath = System.getenv("EZERO_STAGING_KEYSTORE_PATH")
val stagingStorePassword = System.getenv("EZERO_STAGING_STORE_PASSWORD")
val stagingKeyAlias = System.getenv("EZERO_STAGING_KEY_ALIAS")
val stagingKeyPassword = System.getenv("EZERO_STAGING_KEY_PASSWORD")
val stagingSigningValues = listOf(
    stagingKeystorePath,
    stagingStorePassword,
    stagingKeyAlias,
    stagingKeyPassword
)
val stagingSigningConfigured = stagingSigningValues.all { !it.isNullOrBlank() }

if (stagingSigningValues.any { !it.isNullOrBlank() } && !stagingSigningConfigured) {
    throw GradleException("Incomplete E-ZERO staging signing configuration; all four signing environment values are required.")
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

    signingConfigs {
        if (stagingSigningConfigured) {
            create("staging") {
                storeFile = file(stagingKeystorePath!!)
                storePassword = stagingStorePassword
                keyAlias = stagingKeyAlias
                keyPassword = stagingKeyPassword
                storeType = "JKS"
            }
        }
    }

    buildTypes {
        getByName("debug") {
            if (stagingSigningConfigured) {
                signingConfig = signingConfigs.getByName("staging")
            }
        }
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
