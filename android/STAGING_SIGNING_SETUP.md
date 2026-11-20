# E-ZERO isolated staging APK signing

This configuration is for the isolated `com.ezero.connect.staging53` application only.
It does not change production signing or the existing installed app.

## Required GitHub Actions repository secrets

Create these four repository Actions secrets in **Settings → Secrets and variables → Actions → New repository secret**:

- `EZERO_STAGING_KEYSTORE_BASE64`: base64 encoding of the JKS keystore bytes
- `EZERO_STAGING_STORE_PASSWORD`: JKS store password
- `EZERO_STAGING_KEY_ALIAS`: alias inside the JKS keystore
- `EZERO_STAGING_KEY_PASSWORD`: private-key password

Never commit the JKS file, put passwords in source code, or paste any secret into a chat or issue. Keep an offline backup of the JKS file and its passwords. Losing this key means future APKs cannot update an installation signed by it.

## Create the keystore on a trusted device

Use a trusted local device. On Termux, install a JDK if `keytool` is not already available:

```sh
pkg install openjdk-17
```

Create a persistent JKS keystore. Enter passwords only at the interactive prompts; do not put them in the command line:

```sh
keytool -genkeypair -v -keystore "$HOME/ezero-staging-signing.jks" -storetype JKS -alias ezero-staging -keyalg RSA -keysize 3072 -validity 10000
```

Use a strong unique password and keep the alias exactly `ezero-staging`. Store the keystore and passwords in a secure offline backup. Do not delete or regenerate this key for later builds.

To prepare the base64 secret without printing it to the terminal:

```sh
base64 -w 0 "$HOME/ezero-staging-signing.jks" > "$HOME/ezero-staging-signing.base64"
```

Copy the contents of that file directly into the GitHub secret field for `EZERO_STAGING_KEYSTORE_BASE64`. Enter the two passwords into their respective secret fields and `ezero-staging` for the alias. Do not send these values to anyone.

## Build gate

The staging workflow intentionally fails closed if any secret is missing or the keystore/alias/password cannot be validated. It provisions the keystore in the ephemeral runner's temporary directory, runs unit tests, builds the APK, verifies the APK signature and staging application ID, then uploads the artifact. The temporary keystore is not uploaded as an artifact.

A successful workflow after the four secrets are added is the first CI confirmation that stable signing is active. Compare the APK signing certificate fingerprint with the certificate of the already-installed staging app before attempting an update. Do not uninstall the installed app as a workaround.
