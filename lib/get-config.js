const fs = require('fs');
const path = require('path');

module.exports = ({ rootPath, androidProjectPath, iosProjectPath }) => {
  const iosPath = path.resolve(rootPath, iosProjectPath);
  const androidPath = path.resolve(rootPath, androidProjectPath);

  const iosExists = fs.existsSync(iosPath);
  const xcodeprojName = iosExists
    ? fs.readdirSync(iosPath).find(file => path.extname(file) === '.xcodeproj')
    : null;
  const pbxprojPath = (xcodeprojName !== null)
    ? path.resolve(iosPath, xcodeprojName, 'project.pbxproj')
    : null;

  return {
    ios: {
      exists: iosExists,
      path: iosPath,
      pbxprojPath,
      sourceDir: iosPath,
    },
    android: {
      exists: fs.existsSync(androidPath),
      path: androidPath,
    },
  };
};
