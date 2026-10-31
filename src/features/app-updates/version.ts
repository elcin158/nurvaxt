import Constants from 'expo-constants';

// The embedded Android value describes the installed binary, including in a dev client.
export const installedVersionCode =
  Constants.platform?.android?.versionCode ?? Constants.expoConfig?.android?.versionCode ?? 0;
export const installedVersion = Constants.expoConfig?.version;
