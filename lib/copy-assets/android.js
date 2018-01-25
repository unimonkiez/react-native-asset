const fs = require('fs-extra');
const path = require('path');

module.exports = function copyAssetsAndroid(files = [], _, { path: assetPath }) {
  files.forEach(asset => (
    fs.copySync(asset, path.join(assetPath, path.basename(asset)))
  ));
};
