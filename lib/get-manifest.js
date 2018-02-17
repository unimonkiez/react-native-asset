const fs = require('fs-extra');
const path = require('path');

const readManifest = folderPath => fs.readJsonSync(path.resolve(folderPath, 'link-assets-manifest.json'));
const writeManifest = (folderPath, obj) => fs.writeJsonSync(path.resolve(folderPath, 'link-assets-manifest.json'), obj, { spaces: 2 });

module.exports = folderPath => ({
  read: () => readManifest(folderPath),
  write: obj => writeManifest(folderPath, obj),
});
