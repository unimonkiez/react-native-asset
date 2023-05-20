const path = require('path');
const { fontTypes } = require('../../file-types');

module.exports = (assets, platform) => assets.map(asset => ({
  ...asset,
  shouldRelinkAndroidFonts: platform === 'android' && fontTypes.includes(path.extname(asset.path).substring(1)),
}));
