const fs = require('fs');
const path = require('path');

module.exports = ({ rootPath }) => {
  const iosPath = path.resolve(rootPath, 'ios');
  const androidPath = path.resolve(rootPath, 'android');

  const iosExists = fs.existsSync(iosPath);
  const xcodeprojName = iosExists
    ? fs.readdirSync(iosPath).find(file => path.extname(file) === '.xcodeproj')
    : null;
  const pbxprojPath = (xcodeprojName !== null)
    ? path.resolve(iosPath, xcodeprojName, 'project.pbxproj')
    : null;

  return {
    ios: {
      rootPath,
      exists: iosExists,
      path: iosPath,
      pbxprojPath,
      sourceDir: iosPath,
    },
    android: {
      rootPath,
      exists: fs.existsSync(androidPath),
      path: androidPath,
    },
  };
};
