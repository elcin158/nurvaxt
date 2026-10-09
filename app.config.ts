import type { ExpoConfig } from 'expo/config';
const config: ExpoConfig = {
  name: 'NurVaxt',
  slug: 'nurvaxt',
  version: '1.0.5',
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
    versionCode: 6,
    allowBackup: false,
    adaptiveIcon: {
      foregroundImage: './assets/adaptive-icon.png',
      backgroundColor: '#155E4B',
      monochromeImage: './assets/monochrome.png',
    },
    blockedPermissions: [
      'android.permission.RECORD_AUDIO',
      'android.permission.CAMERA',
      'android.permission.ACCESS_FINE_LOCATION',
      'android.permission.ACCESS_COARSE_LOCATION',
      'android.permission.USE_EXACT_ALARM',
      'android.permission.READ_EXTERNAL_STORAGE',
      'android.permission.WRITE_EXTERNAL_STORAGE',
      'android.permission.SYSTEM_ALERT_WINDOW',
    ],
    permissions: [
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
        imageWidth: 144,
        resizeMode: 'contain',
        backgroundColor: '#F7F8F5',
        dark: { backgroundColor: '#0C1714' },
      },
    ],
    [
      'expo-notifications',
      {
        icon: './assets/notification-icon.png',
        color: '#155E4B',
        sounds: ['./assets/nurvaxt_tone.wav'],
      },
    ],
    './plugins/withNurvaxtAlarm',
    './plugins/withNurvaxtDevLauncherLifecycle',
    './plugins/withNurvaxtReleaseSigning',
  ],
  experiments: { typedRoutes: true },
};
export default config;
