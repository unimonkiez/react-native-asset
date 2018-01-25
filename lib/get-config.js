const fs = require('fs');
const path = require('path');

module.exports = ({ rootPath }) => {
  const iosPath = path.resolve(rootPath, 'ios');
  const androidPath = path.resolve(rootPath, 'android');

  const xcodeprojName = fs.readdirSync(iosPath).find(file => path.extname(file) === '.xcodeproj');

  return {
    ios: {
      exists: fs.existsSync(iosPath),
      path: iosPath,
      pbxprojPath: path.resolve(iosPath, xcodeprojName, 'project.pbxproj'),
      sourceDir: iosPath,
    },
    android: {
      exists: fs.existsSync(androidPath),
      path: androidPath,
    },
  };
};
