const fs = require('fs');
const path = require('path');

function xcodeProjPath(exists, platformPath) {
  const xcodeprojName = exists
    ? fs.readdirSync(platformPath).find(file => path.extname(file) === '.xcodeproj')
    : null;
  const pbxprojPath = (xcodeprojName !== null)
    ? path.resolve(platformPath, xcodeprojName, 'project.pbxproj')
    : null;

  return pbxprojPath;
}

module.exports = ({ rootPath }) => {
  const iosPath = path.resolve(rootPath, 'ios');
  const androidPath = path.resolve(rootPath, 'android');
  const macosPath = path.resolve(rootPath, 'macos');

  const iosExists = fs.existsSync(iosPath);
  const macosExists = fs.existsSync(macosPath);
  const iosPbxprojPath = xcodeProjPath(iosExists, iosPath);
  const macosPbxprojPath = xcodeProjPath(macosExists, macosPath);

  return {
    ios: {
      exists: iosExists,
      path: iosPath,
      pbxprojPath: iosPbxprojPath,
      sourceDir: iosPath,
    },
    android: {
      exists: fs.existsSync(androidPath),
      path: androidPath,
    },
    macos: {
      exists: macosExists,
      path: macosPath,
      pbxprojPath: macosPbxprojPath,
      sourceDir: macosPath,
    },
  };
};
