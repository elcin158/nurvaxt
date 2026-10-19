import type { ExpoConfig } from 'expo/config';
const config: ExpoConfig = {
  name: 'NurVaxt',
  slug: 'nurvaxt',
  version: '1.0.7',
  scheme: 'nurvaxt',
  orientation: 'portrait',
  userInterfaceStyle: 'automatic',
  icon: './assets/icon.png',
  ios: {
    bundleIdentifier: 'az.nurvaxt.app',
    supportsTablet: false,
    infoPlist: { CFBundleDisplayName: 'NurVaxt', ITSAppUsesNonExemptEncryption: false },
  },
  android: {
    package: 'az.nurvaxt.app',
    versionCode: 9,
    allowBackup: false,
    adaptiveIcon: {
      foregroundImage: './assets/adaptive-icon.png',
      backgroundColor: '#0649D6',
      monochromeImage: './assets/monochrome.png',
    },
    blockedPermissions: [
      // expo-sensors includes the pedometer permission; Qibla only uses compass sensors.
      'android.permission.ACTIVITY_RECOGNITION',
      'android.permission.RECORD_AUDIO',
      'android.permission.CAMERA',
      'android.permission.ACCESS_FINE_LOCATION',
      'android.permission.ACCESS_BACKGROUND_LOCATION',
      'android.permission.USE_EXACT_ALARM',
      'android.permission.READ_EXTERNAL_STORAGE',
      'android.permission.WRITE_EXTERNAL_STORAGE',
      'android.permission.SYSTEM_ALERT_WINDOW',
    ],
    permissions: [
      'ACCESS_COARSE_LOCATION',
      'POST_NOTIFICATIONS',
      'RECEIVE_BOOT_COMPLETED',
      'SCHEDULE_EXACT_ALARM',
      'VIBRATE',
    ],
  },
  web: { bundler: 'metro', output: 'single', favicon: './assets/icon.png' },
  plugins: [
    'expo-router',
    'expo-sqlite',
    'expo-localization',
    [
      'expo-font',
      {
        fonts: [
          './node_modules/@expo-google-fonts/manrope/400Regular/Manrope_400Regular.ttf',
          './node_modules/@expo-google-fonts/manrope/500Medium/Manrope_500Medium.ttf',
          './node_modules/@expo-google-fonts/manrope/600SemiBold/Manrope_600SemiBold.ttf',
          './node_modules/@expo-google-fonts/manrope/700Bold/Manrope_700Bold.ttf',
        ],
      },
    ],
    [
      'expo-splash-screen',
      {
        image: './assets/splash.png',
        // A 144 dp rounded badge fits inside Android's 192 dp safe circle.
        // Expo centers it on the required 288 dp canvas during prebuild.
        imageWidth: 144,
        resizeMode: 'contain',
        backgroundColor: '#F3F6FC',
        dark: { backgroundColor: '#080F21' },
        // Android rasterizes the padding; give night mode its own matching drawable.
        android: { dark: { image: './assets/splash.png', backgroundColor: '#080F21' } },
      },
    ],
    [
      'expo-notifications',
      {
        icon: './assets/notification-icon.png',
        color: '#2D5CE3',
        sounds: ['tone', 'soft', 'bell', 'melody'].map((sound) => `./assets/nurvaxt_${sound}.wav`),
      },
    ],
    [
      'expo-audio',
      { microphonePermission: false, recordAudioAndroid: false, enableBackgroundPlayback: false },
    ],
    [
      'expo-location',
      {
        // Qibla only needs a rough position: a kilometre of error moves the bearing by a
        // hundredth of a degree, so the precise-location permission stays blocked.
        locationWhenInUsePermission:
          'Qiblə istiqamətini dəqiqləşdirmək üçün təxmini məkanınız yalnız həmin anda oxunur.',
        locationAlwaysPermission: false,
        locationAlwaysAndWhenInUsePermission: false,
        isAndroidBackgroundLocationEnabled: false,
        isAndroidForegroundServiceEnabled: false,
      },
    ],
    './plugins/withNurvaxtAlarm',
    './plugins/withNurvaxtDevLauncherLifecycle',
    './plugins/withNurvaxtReleaseSigning',
  ],
  experiments: { typedRoutes: true },
};
export default config;
