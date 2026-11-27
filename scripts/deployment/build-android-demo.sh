#!/usr/bin/env bash
# Build the arm64 demo APK in the Android builder container.
#
# Usage (from anywhere):
#   scripts/deployment/build-android-demo.sh http://192.168.1.48:8081/api
#
# The argument is the default server address built into the app. It can still be
# changed on the phone ("Máy chủ" button). The APK allows cleartext HTTP and is
# signed with the debug key, so it is for demonstrations only.
#
# Needs: Docker, Node on the host (mounted into the container), `npm ci
# --legacy-peer-deps` already run in mobile/, and the image named by
# ANDROID_BUILDER_IMAGE (JDK 21, Android SDK 36, NDK 27.1, CMake 3.22).
set -euo pipefail

API_URL="${1:?Usage: $0 <api base url ending in /api>}"
[[ "$API_URL" =~ ^https?://[^[:space:]]+/api$ ]] || {
    echo "The address must look like http://host:port/api" >&2
    exit 2
}

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
IMAGE="${ANDROID_BUILDER_IMAGE:-smart-heritage-android-builder:latest}"
GRADLE_CACHE="${GRADLE_CACHE_DIR:-$HOME/.cache/smart-heritage-gradle}"
NODE_BIN="$(command -v node)" || { echo "node not found on PATH" >&2; exit 1; }
NODE_HOME="$(dirname "$(dirname "$(readlink -f "$NODE_BIN")")")"
mkdir -p "$GRADLE_CACHE" "$ROOT/mobile/artifacts"

(cd "$ROOT/mobile" && EXPO_DEMO_CLEARTEXT=1 CI=1 npx expo prebuild -p android --no-install)

docker run --rm -u "$(id -u):$(id -g)" \
    -v "$ROOT:$ROOT" -v "$NODE_HOME:/opt/node:ro" -v "$GRADLE_CACHE:/gradle" \
    -w "$ROOT/mobile/android" \
    -e HOME=/tmp -e GRADLE_USER_HOME=/gradle -e NODE_ENV=production \
    -e EXPO_DEMO_CLEARTEXT=1 -e EXPO_PUBLIC_API_BASE_URL="$API_URL" \
    "$IMAGE" bash -c '
        export PATH="/opt/node/bin:$PATH"
        ./gradlew :app:assembleRelease -PreactNativeArchitectures=arm64-v8a \
            -Dorg.gradle.jvmargs="-Xmx3g -XX:MaxMetaspaceSize=1g" \
            --no-daemon --console=plain'

VERSION="$(sed -n 's/.*versionName "\(.*\)".*/\1/p' "$ROOT/mobile/android/app/build.gradle")"
OUTPUT="$ROOT/mobile/artifacts/SmartHeritage-$VERSION-demo-arm64.apk"
cp "$ROOT/mobile/android/app/build/outputs/apk/release/app-release.apk" "$OUTPUT"

docker run --rm -v "$ROOT/mobile/artifacts:/apk:ro" "$IMAGE" bash -c "
    tools=\$ANDROID_HOME/build-tools/36.0.0
    \$tools/apksigner verify --print-certs '/apk/$(basename "$OUTPUT")' | grep -E 'SHA-256'
    \$tools/aapt dump badging '/apk/$(basename "$OUTPUT")' | grep -E '^package|native-code'
    \$tools/aapt dump permissions '/apk/$(basename "$OUTPUT")'"

echo
echo "APK:    $OUTPUT"
echo "Size:   $(du -h "$OUTPUT" | cut -f1)"
echo "SHA256: $(sha256sum "$OUTPUT" | cut -d' ' -f1)"
