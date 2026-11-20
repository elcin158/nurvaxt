const { withAndroidManifest } = require('expo/config-plugins');

module.exports = (config) =>
  withAndroidManifest(config, (mod) => {
    const features = (mod.modResults.manifest['uses-feature'] ??= []);
    const name = 'android.hardware.screen.portrait';
    const portrait = features.find((feature) => feature.$['android:name'] === name);

    // Allow installation on devices with landscape-only displays.
    if (portrait) {
      portrait.$['android:required'] = 'false';
    } else {
      features.push({ $: { 'android:name': name, 'android:required': 'false' } });
    }
    return mod;
  });
