#!/usr/bin/env bash
set -euo pipefail

# Build script for Lecture Whisper Android Release APK (API 35+ / Android 17 ready)

DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "$DIR/.." && pwd)"

ANDROID_SDK_ROOT="${ANDROID_HOME:-$HOME/Library/Android/sdk}"
BUILD_TOOLS="$ANDROID_SDK_ROOT/build-tools/35.0.0"
PLATFORM="$ANDROID_SDK_ROOT/platforms/android-35"

if [ ! -d "$BUILD_TOOLS" ]; then
  # Fallback to newest build-tools found
  BUILD_TOOLS="$(ls -d "$ANDROID_SDK_ROOT/build-tools/"* | sort -V | tail -n 1)"
fi

if [ ! -d "$PLATFORM" ]; then
  PLATFORM="$(ls -d "$ANDROID_SDK_ROOT/platforms/android-"* | sort -V | tail -n 1)"
fi

echo "==> Using Android SDK Build-Tools: $BUILD_TOOLS"
echo "==> Using Android Platform: $PLATFORM"

AAPT2="$BUILD_TOOLS/aapt2"
D8="$BUILD_TOOLS/d8"
ZIPALIGN="$BUILD_TOOLS/zipalign"
APKSIGNER="$BUILD_TOOLS/apksigner"
ANDROID_JAR="$PLATFORM/android.jar"

BUILD_DIR="$DIR/build"
RELEASE_DIR="$DIR/release"
rm -rf "$BUILD_DIR"
mkdir -p "$BUILD_DIR/gen" "$BUILD_DIR/classes" "$RELEASE_DIR"

echo "==> 1. Compiling resources with aapt2..."
"$AAPT2" compile --dir "$DIR/android/app/src/main/res" -o "$BUILD_DIR/compiled.zip"

echo "==> 2. Linking APK and generating R.java..."
"$AAPT2" link -I "$ANDROID_JAR" \
  --manifest "$DIR/android/app/src/main/AndroidManifest.xml" \
  --java "$BUILD_DIR/gen" \
  -o "$BUILD_DIR/base.apk" \
  "$BUILD_DIR/compiled.zip" \
  --auto-add-overlay

echo "==> 3. Compiling Java sources with javac..."
JAVA_FILES=("$BUILD_DIR/gen/com/lecturewhisper/R.java")
while IFS= read -r -d '' file; do
  JAVA_FILES+=("$file")
done < <(find "$DIR/android/app/src/main/java" -name "*.java" -print0)

javac --release 17 -cp "$ANDROID_JAR" "${JAVA_FILES[@]}" -d "$BUILD_DIR/classes"

echo "==> 4. Converting bytecode to Dalvik dex via d8..."
CLASS_FILES=()
while IFS= read -r -d '' file; do
  CLASS_FILES+=("$file")
done < <(find "$BUILD_DIR/classes" -name "*.class" -print0)

"$D8" --lib "$ANDROID_JAR" --min-api 26 --output "$BUILD_DIR/" "${CLASS_FILES[@]}"

echo "==> 5. Packaging classes.dex into APK..."
(cd "$BUILD_DIR" && zip -u base.apk classes.dex)

echo "==> 6. Aligning APK with zipalign..."
"$ZIPALIGN" -p -f 4 "$BUILD_DIR/base.apk" "$BUILD_DIR/aligned.apk"

echo "==> 7. Signing APK with apksigner..."
KEYSTORE="$RELEASE_DIR/lecturewhisper-release.keystore"
if [ ! -f "$KEYSTORE" ]; then
  keytool -genkeypair -v \
    -keystore "$KEYSTORE" \
    -alias lecturewhisper \
    -keyalg RSA \
    -keysize 2048 \
    -validity 10000 \
    -storepass lecturewhisper \
    -keypass lecturewhisper \
    -dname "CN=Lecture Whisper, OU=Mobile, O=Lecture Whisper, L=Local, ST=CA, C=US"
fi

APK_OUT="$RELEASE_DIR/LectureWhisper-v1.0.0-release.apk"
"$APKSIGNER" sign \
  --ks "$KEYSTORE" \
  --ks-pass pass:lecturewhisper \
  --ks-key-alias lecturewhisper \
  --key-pass pass:lecturewhisper \
  --out "$APK_OUT" \
  "$BUILD_DIR/aligned.apk"

echo "==> 8. Verifying release signature..."
"$APKSIGNER" verify --verbose "$APK_OUT"

echo "==> APK Badging Summary:"
"$AAPT2" dump badging "$APK_OUT" | head -n 12

SHA256="$(shasum -a 256 "$APK_OUT" | awk '{print $1}')"
echo "==> SHA-256 Checksum: $SHA256"
echo "$SHA256  LectureWhisper-v1.0.0-release.apk" > "$RELEASE_DIR/LectureWhisper-v1.0.0-release.apk.sha256"

echo "SUCCESS: Built $APK_OUT"
