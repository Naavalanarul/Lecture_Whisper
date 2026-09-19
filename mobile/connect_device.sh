#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"
APK_PATH="${PROJECT_ROOT}/mobile/release/LectureWhisper-v1.0.0-release.apk"
LOCAL_IP="$(ipconfig getifaddr en0 2>/dev/null || echo "127.0.0.1")"

echo "========================================================"
echo "🎙️  Lecture Whisper — Pixel 8a USB Auto-Link & Setup"
echo "========================================================"
echo ""

# Check adb installed
if ! command -v adb &>/dev/null; then
    echo "❌ Error: 'adb' command not found in PATH."
    exit 1
fi

echo "🔍 Detecting connected Android devices via ADB..."
DEVICE_COUNT=$(adb devices | grep -v "List of devices" | grep "device$" | wc -l | tr -d ' ')

if [ "${DEVICE_COUNT}" -eq "0" ]; then
    echo "⏳ No authorized Android device detected yet."
    echo ""
    echo "Please ensure:"
    echo "  1. Your Pixel 8a is plugged in via USB-C."
    echo "  2. USB Debugging is turned ON in Developer Options."
    echo "  3. When prompted on your phone screen, tap 'Allow USB Debugging'."
    echo ""
    echo "Waiting for device to connect (Press Ctrl+C to cancel)..."
    adb wait-for-device
fi

echo "✅ Device connected!"
DEVICE_MODEL=$(adb shell getprop ro.product.model 2>/dev/null | tr -d '\r' || echo "Android Device")
ANDROID_VER=$(adb shell getprop ro.build.version.release 2>/dev/null | tr -d '\r' || echo "Unknown")
echo "   Device:  ${DEVICE_MODEL} (Android ${ANDROID_VER})"

echo ""
echo "🔗 Setting up Zero-Latency USB Reverse Tethering (tcp:8000)..."
adb reverse tcp:8000 tcp:8000
echo "   ✓ adb reverse tcp:8000 tcp:8000 active"

echo ""
echo "📱 Checking app installation on device..."
if adb shell pm list packages | grep -q "com.lecturewhisper"; then
    echo "   ✓ Lecture Whisper is already installed."
    read -p "   Reinstall/Update latest release APK? (y/N): " -n 1 -r || true
    echo ""
    if [[ "${REPLY:-n}" =~ ^[Yy]$ ]]; then
        echo "   📦 Installing ${APK_PATH}..."
        adb install -r "${APK_PATH}"
        echo "   ✓ Installation successful!"
    fi
else
    echo "   📦 Installing ${APK_PATH}..."
    adb install -r "${APK_PATH}"
    echo "   ✓ Installation successful!"
fi

echo ""
echo "🚀 Launching Lecture Whisper on ${DEVICE_MODEL}..."
adb shell am start -n com.lecturewhisper/.MainActivity >/dev/null 2>&1 || true

echo ""
echo "========================================================"
echo "🎉 Phone connected and ready!"
echo "   • USB Host: 127.0.0.1 (Port 8000)"
echo "   • Wi-Fi Host: ${LOCAL_IP} (Port 8000)"
echo "   • Web Dashboard: http://localhost:8000"
echo "========================================================"
