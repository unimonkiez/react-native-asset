const fs = require('fs-extra');
const path = require('path');
const migartions = require('./migartion/index');

const migartionsLength = migartions.length;

const fileName = 'link-assets-manifest.json';

const readManifest = folderPath => fs.readJsonSync(path.resolve(folderPath, fileName));
const writeManifest = (folderPath, obj) => {
  if (!fs.existsSync(folderPath)) fs.mkdirSync(folderPath, { recursive: true });
  return fs.writeJsonSync(path.resolve(folderPath, fileName), obj, { spaces: 2 });
};
module.exports = folderPath => ({
  read: () => {
    const initialData = readManifest(folderPath);

    const data = migartions
      .filter((_, i) => i > (initialData.migIndex || -1))
      .reduce((currData, mig, i) => ({
        migIndex: i,
        data: mig(currData.data || currData),
      }), initialData);

    return data.data;
  },
  write: data => writeManifest(folderPath, { migIndex: migartionsLength - 1, data }),
});
