const fs = require('fs');
const path = require('path');

module.exports = ({ rootPath, flavor }) => {
  const iosPath = path.resolve(rootPath, 'ios');
  const androidPath = path.resolve(rootPath, 'android');

  const iosExists = fs.existsSync(iosPath);
  const xcodeprojName = iosExists
    ? fs.readdirSync(iosPath).find(file => path.extname(file) === '.xcodeproj')
    : null;
  const pbxprojPath =
    xcodeprojName !== null
      ? path.resolve(iosPath, xcodeprojName, 'project.pbxproj')
      : null;

  return {
    ios: {
      exists: iosExists,
      manifestPath: flavor
        ? path.resolve(iosPath, 'targetManifests', flavor)
        : iosPath,
      pbxprojPath,
      sourceDir: iosPath,
      target: flavor,
    },
    android: {
      exists: fs.existsSync(androidPath),
      flavorPath: path.resolve(androidPath, 'app', 'src', flavor || 'main'),
    },
  };
};
