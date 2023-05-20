const fs = require('fs-extra');
const path = require('path');
const migrations = require('./migration/index');

const migrationsLength = migrations.length;

const readManifest = folderPath => fs.readJsonSync(path.resolve(folderPath, 'link-assets-manifest.json'));
const writeManifest = (folderPath, obj) => fs.writeJsonSync(path.resolve(folderPath, 'link-assets-manifest.json'), obj, { spaces: 2 });

module.exports = (folderPath, platform) => ({
  read: () => {
    const initialData = readManifest(folderPath);

    const data = migrations
      .filter((_, i) => i > (initialData.migIndex || -1))
      .reduce((currData, mig, i) => ({
        migIndex: i,
        data: mig(currData.data || currData, platform),
      }), initialData);

    return data.data;
  },
  write: data => writeManifest(folderPath, { migIndex: migrationsLength - 1, data }),
});
