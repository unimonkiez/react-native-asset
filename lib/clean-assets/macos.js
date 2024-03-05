const fs = require('fs-extra');
const path = require('path');
const xcode = require('xcode');
const createGroupWithMessage = require('../react-native-lib/ios/createGroupWithMessage');
const getPlist = require('../react-native-lib/ios/getPlist');
const writePlist = require('../react-native-lib/ios/writePlist');

/**
 * This function works in a similar manner to its Android version,
 * except it does not delete assets but removes Xcode Group references
 */
module.exports = function cleanAssetsMacos(files, projectConfig, { addFont }) {
  const project = xcode.project(projectConfig.pbxprojPath).parseSync();
  const plist = getPlist(project, projectConfig.sourceDir);

  createGroupWithMessage(project, 'Resources');

  function removeResourceFile(f) {
    return (f || [])
      .map(asset => (
        project.removeResourceFile(
          path.relative(projectConfig.sourceDir, asset),
          { target: project.getFirstTarget().uuid },
        )
      ))
      .filter(file => file) // xcode returns false if file is already there
      .map(file => file.basename);
  }

  removeResourceFile(files);

  // TODO: We modify ATSApplicationFontsPath om the plist file, likely needs review

  fs.writeFileSync(
    projectConfig.pbxprojPath,
    project.writeSync(),
  );

  writePlist(project, projectConfig.sourceDir, plist);
};
