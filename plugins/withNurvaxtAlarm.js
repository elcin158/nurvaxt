const { withDangerousMod } = require('expo/config-plugins');
const fs = require('node:fs');
const path = require('node:path');
module.exports = (config) =>
  withDangerousMod(config, [
    'android',
    async (mod) => {
      const output = path.join(mod.modRequest.platformProjectRoot, 'app/src/main/res/raw');
      fs.mkdirSync(output, { recursive: true });
      for (const file of fs.readdirSync(path.join(mod.modRequest.projectRoot, 'assets'))) {
        if (/^nurvaxt_\w+\.wav$/.test(file)) {
          fs.copyFileSync(
            path.join(mod.modRequest.projectRoot, 'assets', file),
            path.join(output, file),
          );
        }
      }
      return mod;
    },
  ]);
