#!/usr/bin/env bash
# =============================================================================
# build-cliente-apk.sh
# Compila el APK del Cliente Agrobiciufa  (com.agrobiciufa.cliente)
# El APK resultante carga: https://doncandidoia.com/app-cliente
#
# PREREQUISITOS:
#   - Android Studio instalado (incluye SDK + Gradle)
#   - ANDROID_HOME o ANDROID_SDK_ROOT apuntando al SDK
#   - Java 17+ en el PATH
#
# USO:
#   bash scripts/build-cliente-apk.sh
#
# OUTPUT:
#   android/app/build/outputs/apk/release/AgroBiciufa-Cliente-v1.apk
# =============================================================================

set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
ANDROID_DIR="$ROOT/android"
ASSETS_DIR="$ANDROID_DIR/app/src/main/assets"
GRADLE_BUILD="$ANDROID_DIR/app/build.gradle"

CONFIG_BACKUP="$ASSETS_DIR/capacitor.config.json.bak"
GRADLE_BACKUP="$GRADLE_BUILD.bak"
APK_OUTPUT="$ANDROID_DIR/app/build/outputs/apk/release/app-release-unsigned.apk"
APK_FINAL="$ANDROID_DIR/app/build/outputs/apk/release/AgroBiciufa-Cliente-v1.apk"

echo "=============================="
echo " Build APK: Agro Biciufa Cliente"
echo "=============================="

# ---- Backup de archivos actuales ----
echo "[1/5] Haciendo backup de config..."
cp "$ASSETS_DIR/capacitor.config.json" "$CONFIG_BACKUP"
cp "$GRADLE_BUILD" "$GRADLE_BACKUP"

# Trap para restaurar automáticamente si algo falla
cleanup() {
  echo "[!] Restaurando configuración original..."
  cp "$CONFIG_BACKUP" "$ASSETS_DIR/capacitor.config.json"
  cp "$GRADLE_BACKUP" "$GRADLE_BUILD"
  rm -f "$CONFIG_BACKUP" "$GRADLE_BACKUP"
  echo "[!] Restauración completa."
}
trap cleanup ERR EXIT

# ---- Inyectar config cliente en Android ----
echo "[2/5] Inyectando config cliente..."
cat > "$ASSETS_DIR/capacitor.config.json" << 'JSON'
{
  "appId": "com.agrobiciufa.cliente",
  "appName": "Agro Biciufa",
  "webDir": "public",
  "server": {
    "url": "https://doncandidoia.com/app-cliente",
    "cleartext": true,
    "androidScheme": "https",
    "allowNavigation": ["doncandidoia.com", "*.doncandidoia.com"]
  },
  "android": {
    "allowMixedContent": true,
    "captureInput": true,
    "webContentsDebuggingEnabled": false
  },
  "plugins": {
    "SplashScreen": {
      "launchShowDuration": 2000,
      "backgroundColor": "#dc2626",
      "androidScaleType": "CENTER_CROP",
      "showSpinner": true,
      "spinnerColor": "#ffffff"
    }
  }
}
JSON

# ---- Cambiar applicationId en build.gradle ----
echo "[3/5] Cambiando applicationId → com.agrobiciufa.cliente..."
sed -i \
  's|applicationId "com.doncandido.vendedor"|applicationId "com.agrobiciufa.cliente"|g' \
  "$GRADLE_BUILD"
sed -i \
  's|namespace "com.doncandido.vendedor"|namespace "com.agrobiciufa.cliente"|g' \
  "$GRADLE_BUILD"

# ---- Compilar con Gradle ----
echo "[4/5] Compilando APK (assembleRelease)..."
cd "$ANDROID_DIR"

# En Windows usar gradlew.bat si no hay gradlew unix
if [[ -f "./gradlew" ]]; then
  ./gradlew assembleRelease --no-daemon --quiet
elif [[ -f "./gradlew.bat" ]]; then
  cmd.exe /c "gradlew.bat assembleRelease --no-daemon --quiet"
else
  echo "ERROR: No se encontró gradlew ni gradlew.bat"
  exit 1
fi

# ---- Renombrar APK ----
echo "[5/5] Renombrando APK..."
if [[ -f "$APK_OUTPUT" ]]; then
  mv "$APK_OUTPUT" "$APK_FINAL"
  echo ""
  echo "✓ APK generado:"
  echo "  $APK_FINAL"
else
  echo "ERROR: No se encontró el APK compilado en $APK_OUTPUT"
  exit 1
fi

# ---- Restaurar (el trap EXIT se encarga) ----
# Eliminamos el trap para que no "restaure en error" al salir limpio
trap - ERR EXIT
cp "$CONFIG_BACKUP" "$ASSETS_DIR/capacitor.config.json"
cp "$GRADLE_BACKUP" "$GRADLE_BUILD"
rm -f "$CONFIG_BACKUP" "$GRADLE_BACKUP"
echo ""
echo "✓ Configuración restaurada a Don Cándido Vendedor."
echo ""
echo "============================="
echo " PRÓXIMOS PASOS:"
echo "============================="
echo " 1. Firmar el APK con tu keystore (o usar debug para pruebas):"
echo "    Android Studio → Build → Generate Signed APK"
echo "    O usar apksigner / jarsigner desde CLI."
echo ""
echo " 2. Subir el APK a GitHub Releases:"
echo "    gh release create v1.0-cliente --title 'Agro Biciufa Cliente v1.0' \\"
echo "      '$APK_FINAL'"
echo ""
echo " 3. Copiar la URL del release y setearla en Vercel:"
echo "    NEXT_PUBLIC_CLIENTE_APK_URL=https://github.com/Sergiocharata1977/9001app-v8/releases/download/v1.0-cliente/AgroBiciufa-Cliente-v1.apk"
echo ""
