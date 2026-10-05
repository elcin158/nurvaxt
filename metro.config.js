const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// EXPO_PUBLIC_* values are inlined at transform time, so key the cache by them;
// otherwise switching env (scripts/with-env.mjs) can reuse a bundle with the old API URL.
config.cacheVersion = [config.cacheVersion, process.env.EXPO_PUBLIC_APP_ENV, process.env.EXPO_PUBLIC_API_URL]
  .filter(Boolean)
  .join(':');

module.exports = config;
