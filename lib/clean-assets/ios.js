const fs = require('fs-extra');
const xcode = require('xcode');
const getPlist = require('../react-native-lib/ios/getPlist');
const writePlist = require('../react-native-lib/ios/writePlist');
const getResourceParams = require('../react-native-lib/ios/getResourceParams');

/**
 * This function works in a similar manner to its Android version,
 * except it does not delete assets but removes Xcode Group references
 */
module.exports = function cleanAssetsIOS(files, projectConfig, { addFont }) {
  const project = xcode.project(projectConfig.pbxprojPath).parseSync();
  const plist = getPlist(
    project,
    projectConfig.sourceDir,
    projectConfig.target,
  );

  function removeResourceFile(f) {
    return (f || [])
      .map(asset =>
        project.removeResourceFile(...getResourceParams(project, projectConfig, asset)))
      .filter(file => file) // xcode returns false if file is already there
      .map(file => file.basename);
  }

  const removedFiles = removeResourceFile(files);

  if (addFont) {
    const existingFonts = plist.UIAppFonts || [];
    const allFonts = existingFonts.filter(file => removedFiles.indexOf(file) === -1);
    plist.UIAppFonts = Array.from(new Set(allFonts)); // use Set to dedupe w/existing
  }

  fs.writeFileSync(projectConfig.pbxprojPath, project.writeSync());

  writePlist(project, projectConfig.sourceDir, plist, projectConfig.target);
};
