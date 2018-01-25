const fs = require('fs-extra');
const path = require('path');

module.exports = function cleanAssetsAndroid(files = [], _, { path: assetPath }) {
  files.forEach(asset => (
    fs.removeSync(path.join(assetPath, path.basename(asset)))
  ));
};
