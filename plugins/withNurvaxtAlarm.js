const { withDangerousMod } = require('expo/config-plugins');
const fs = require('node:fs');
const path = require('node:path');
module.exports = (config) =>
  withDangerousMod(config, [
    'android',
    async (mod) => {
      const output = path.join(mod.modRequest.platformProjectRoot, 'app/src/main/res/raw');
      fs.mkdirSync(output, { recursive: true });
      fs.copyFileSync(
        path.join(mod.modRequest.projectRoot, 'assets/nurvaxt_tone.wav'),
        path.join(output, 'nurvaxt_tone.wav'),
      );
      return mod;
    },
  ]);
