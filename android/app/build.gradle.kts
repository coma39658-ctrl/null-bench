plugins {
    id("com.android.application")
    id("org.jetbrains.kotlin.android")
}

if (file("google-services.json").exists()) {
    apply(plugin = "com.google.gms.google-services")
}

// Stable staging APK signing is supplied only through GitHub Actions Secrets.
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

// This is a PUBLIC verification key only. Its matching private key must remain
// in the isolated sender's secret store and must never enter the APK/repository.
val wakePublicKeySpki = System.getenv("EZERO_CALL_WAKE_STAGING_PUBLIC_KEY_SPKI_BASE64").orEmpty().trim()
if (wakePublicKeySpki.isNotEmpty()) {
    require(Regex("^[A-Za-z0-9+/]+={0,2}$").matches(wakePublicKeySpki)) {
        "Invalid E-ZERO wake public-key encoding; expected Base64 DER SubjectPublicKeyInfo."
    }
    val decoded = try {
        java.util.Base64.getDecoder().decode(wakePublicKeySpki)
    } catch (_: IllegalArgumentException) {
        throw GradleException("Invalid E-ZERO wake public-key Base64.")
    }
    val publicKey = try {
        java.security.KeyFactory.getInstance("EC").generatePublic(
            java.security.spec.X509EncodedKeySpec(decoded)
        ) as java.security.interfaces.ECPublicKey
    } catch (_: Exception) {
        throw GradleException("E-ZERO wake key must be a valid EC SubjectPublicKeyInfo public key.")
    }
    require(publicKey.params.curve.field.fieldSize == 256) {
        "E-ZERO wake key must use a 256-bit EC curve."
    }
}

android {
    namespace = "com.ezero.connect"
    compileSdk = 35

    buildFeatures {
        buildConfig = true
    }

    defaultConfig {
        applicationId = "com.ezero.connect.staging53"
        minSdk = 24
        targetSdk = 35
        versionCode = 54
        versionName = "0.1.0-staging54"
        buildConfigField(
            "String",
            "EZERO_CALL_WAKE_STAGING_PUBLIC_KEY_SPKI_BASE64",
            "\"$wakePublicKeySpki\""
        )
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
