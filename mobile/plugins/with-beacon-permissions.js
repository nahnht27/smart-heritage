const {
  withAndroidManifest,
  withInfoPlist,
} = require('expo/config-plugins');

const REQUIRED_ANDROID_PERMISSIONS = [
  'android.permission.ACCESS_FINE_LOCATION',
  'android.permission.BLUETOOTH_SCAN',
  'android.permission.BLUETOOTH_CONNECT',
];

const REMOVED_ANDROID_PERMISSIONS = [
  'android.permission.ACCESS_BACKGROUND_LOCATION',
  'android.permission.BLUETOOTH_ADVERTISE',
  'android.permission.FOREGROUND_SERVICE',
  'android.permission.FOREGROUND_SERVICE_CONNECTED_DEVICE',
  'android.permission.FOREGROUND_SERVICE_LOCATION',
  'android.permission.POST_NOTIFICATIONS',
];

function withBeaconAndroidManifest(config) {
  return withAndroidManifest(config, (config) => {
    const manifest = config.modResults.manifest;
    manifest.$ = manifest.$ || {};
    manifest.$['xmlns:tools'] =
      manifest.$['xmlns:tools'] || 'http://schemas.android.com/tools';

    const usesPermission = manifest['uses-permission'] || [];
    const existingNames = new Set(
      usesPermission
        .map((entry) => entry.$ && entry.$['android:name'])
        .filter(Boolean),
    );

    for (const name of REQUIRED_ANDROID_PERMISSIONS) {
      if (!existingNames.has(name)) {
        usesPermission.push({ $: { 'android:name': name } });
      }
    }

    for (const name of REMOVED_ANDROID_PERMISSIONS) {
      if (!existingNames.has(name)) {
        usesPermission.push({
          $: {
            'android:name': name,
            'tools:node': 'remove',
          },
        });
      }
    }

    manifest['uses-permission'] = usesPermission;

    const usesFeature = manifest['uses-feature'] || [];
    if (
      !usesFeature.some(
        (entry) =>
          entry.$ &&
          entry.$['android:name'] === 'android.hardware.bluetooth_le',
      )
    ) {
      usesFeature.push({
        $: {
          'android:name': 'android.hardware.bluetooth_le',
          'android:required': 'false',
        },
      });
    }
    manifest['uses-feature'] = usesFeature;

    return config;
  });
}

function withBeaconInfoPlist(config) {
  return withInfoPlist(config, (config) => {
    config.modResults.NSBluetoothAlwaysUsageDescription =
      'Ứng dụng dùng Bluetooth để phát hiện beacon tại hiện vật gần bạn.';
    config.modResults.NSBluetoothPeripheralUsageDescription =
      'Ứng dụng dùng Bluetooth để phát hiện beacon tại hiện vật gần bạn.';
    config.modResults.NSLocationWhenInUseUsageDescription =
      'Ứng dụng dùng vị trí khi đang mở để quét beacon tại hiện vật gần bạn.';
    config.modResults.NSLocationAlwaysAndWhenInUseUsageDescription =
      'Ứng dụng dùng vị trí để phát hiện beacon tại hiện vật gần bạn.';
    return config;
  });
}

module.exports = function withBeaconPermissions(config) {
  return withBeaconInfoPlist(withBeaconAndroidManifest(config));
};
