const { withMainActivity } = require('expo/config-plugins');

const marker = '// NurVaxt development launcher lifecycle guard';

module.exports = (config) =>
  withMainActivity(config, (mod) => {
    if (mod.modResults.language !== 'kt') {
      throw new Error('NurVaxt development launcher lifecycle guard requires Kotlin.');
    }
    const contents = mod.modResults.contents;
    if (contents.includes(marker)) return mod;

    const declaration = /class MainActivity\s*:\s*ReactActivity\(\)\s*\{/;
    if (!declaration.test(contents)) {
      throw new Error('Could not find NurVaxt MainActivity for the lifecycle guard.');
    }
    mod.modResults.contents = contents.replace(
      declaration,
      (match) => `${match}
  ${marker}
  override fun onUserLeaveHint() {
    // Expo's debug launcher can install a no-op delegate before React is loaded.
    if (BuildConfig.DEBUG && reactDelegate == null) return
    super.onUserLeaveHint()
  }
`,
    );
    return mod;
  });
