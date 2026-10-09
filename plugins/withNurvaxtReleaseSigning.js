const { withAppBuildGradle, withGradleProperties } = require('expo/config-plugins');
const marker = '// NurVaxt local release signing';
module.exports = (config) => {
  config = withGradleProperties(config, (mod) => {
    for (const [key, value] of [
      ['android.enableMinifyInReleaseBuilds', 'true'],
      ['android.enableShrinkResourcesInReleaseBuilds', 'true'],
    ]) {
      mod.modResults = mod.modResults.filter((entry) => entry.key !== key);
      mod.modResults.push({ type: 'property', key, value });
    }
    return mod;
  });
  return withAppBuildGradle(config, (mod) => {
    if (!mod.modResults.contents.includes(marker)) {
      mod.modResults.contents += `
${marker}
def nurvaxtSigningFile = rootProject.file('../.signing/keystore.properties')
if (nurvaxtSigningFile.exists()) {
    def nurvaxtSigning = new Properties()
    nurvaxtSigningFile.withInputStream { nurvaxtSigning.load(it) }
    android.signingConfigs.create('nurvaxtRelease') {
        storeFile new File(projectRoot, nurvaxtSigning.getProperty('storeFile'))
        storePassword nurvaxtSigning.getProperty('storePassword')
        keyAlias nurvaxtSigning.getProperty('keyAlias')
        keyPassword nurvaxtSigning.getProperty('keyPassword')
    }
    android.buildTypes.release.signingConfig = android.signingConfigs.nurvaxtRelease
} else if (gradle.startParameter.taskNames.any { it.toLowerCase().contains('release') } && System.getenv('EAS_BUILD') != 'true') {
    throw new GradleException('Missing NurVaxt release key. Run npm run android:release-key before a local release build.')
}
`;
    }
    return mod;
  });
};
