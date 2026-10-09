const { withAppBuildGradle } = require('expo/config-plugins');

// Release builds are signed with the app's own key instead of the template's debug key, so every
// APK installs over the last one and keeps the device's records. The key and its passwords come
// from credentials/keystore.properties in the app folder (git-ignored, never committed), and a
// value in ~/.gradle/gradle.properties or ORG_GRADLE_PROJECT_* overrides it. Without them AGP would
// quietly produce an unsigned APK, so packaging a release stops with a message instead.
const marker = 'EVTAS_RELEASE_STORE_FILE';
// Read before `android {`; a relative store path is taken from the app folder, not android/app.
const keyLookup = `
def evtasCredentials = new Properties()
def evtasCredentialsFile = new File(rootDir.parentFile, 'credentials/keystore.properties')
if (evtasCredentialsFile.exists()) evtasCredentialsFile.withInputStream { evtasCredentials.load(it) }
def evtasKey = { String name -> findProperty(name) ?: evtasCredentials.getProperty(name) }
`;
const releaseConfig = `
        release {
            if (evtasKey('${marker}')) {
                def store = new File(evtasKey('${marker}'))
                storeFile store.absolute ? store : new File(rootDir.parentFile, store.path)
                storePassword evtasKey('EVTAS_RELEASE_STORE_PASSWORD')
                keyAlias evtasKey('EVTAS_RELEASE_KEY_ALIAS')
                keyPassword evtasKey('EVTAS_RELEASE_KEY_PASSWORD')
            }
        }`;
const guard = `
// EVTAS: without the release key the APK would be unsigned and fail to install.
tasks.matching { it.name in ['packageRelease', 'signReleaseBundle'] }.configureEach {
    doFirst {
        if (!evtasKey('${marker}'))
            throw new GradleException('Release imza açarı təyin edilməyib (EVTAS_RELEASE_*). README-dəki "Release imzası" bölməsinə baxın.')
    }
}

// EVTAS: beside app-release.apk (which expo run:android installs), a copy named for distribution:
// evtas-<environment>-<version>-<versionCode>.apk, e.g. evtas-dev-1.2.0-5.apk.
tasks.matching { it.name == 'assembleRelease' }.configureEach {
    doLast {
        def environment = System.getenv('EXPO_PUBLIC_APP_ENV') ?: 'release'
        def name = "evtas-\${environment}-\${android.defaultConfig.versionName}-\${android.defaultConfig.versionCode}.apk"
        copy {
            from layout.buildDirectory.dir('outputs/apk/release')
            include 'app-release.apk'
            into layout.buildDirectory.dir('outputs/apk/release')
            rename { name }
        }
        println "EVTAS APK: outputs/apk/release/\${name}"
    }
}
`;

module.exports = function withReleaseSigning(config) {
  return withAppBuildGradle(config, result => {
    let gradle = result.modResults.contents;
    if (gradle.includes(marker)) return result;
    // The first `release {` is the build type; the signing configs have only `debug` until below.
    const buildType = /(buildTypes\s*\{[\s\S]*?release\s*\{[\s\S]*?)signingConfig signingConfigs\.debug/;
    if (!buildType.test(gradle) || !/signingConfigs\s*\{/.test(gradle))
      throw new Error('withReleaseSigning: android/app/build.gradle does not match the expected template.');
    gradle = gradle.replace(buildType, '$1signingConfig signingConfigs.release');
    gradle = gradle.replace(/signingConfigs\s*\{/, match => match + releaseConfig);
    gradle = gradle.replace(/^android\s*\{/m, match => keyLookup + '\n' + match);
    result.modResults.contents = gradle + guard;
    return result;
  });
};
