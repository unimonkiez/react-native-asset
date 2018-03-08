const fs = require('fs-extra');
const path = require('path');
const xcode = require('xcode');
const createGroupWithMessage = require('../react-native-lib/ios/createGroupWithMessage');
const getPlist = require('../react-native-lib/ios/getPlist');
const writePlist = require('../react-native-lib/ios/writePlist');

/**
 * This function works in a similar manner to its Android version,
 * except it does not copy assets but creates Xcode Group references
 */
module.exports = function linkAssetsIOS(files, projectConfig, { addFont }) {
  const project = xcode.project(projectConfig.pbxprojPath).parseSync();
  const plist = getPlist(project, projectConfig.sourceDir);

  createGroupWithMessage(project, 'Resources');

  function addResourceFile(f) {
    return (f || [])
      .map(asset => (
        project.addResourceFile(
          path.relative(projectConfig.sourceDir, asset),
          { target: project.getFirstTarget().uuid },
        )
      ))
      .filter(file => file) // xcode returns false if file is already there
      .map(file => file.basename);
  }

  const addedFiles = addResourceFile(files);

  if (addFont) {
    const existingFonts = (plist.UIAppFonts || []);
    const allFonts = [...existingFonts, ...addedFiles];
    plist.UIAppFonts = Array.from(new Set(allFonts)); // use Set to dedupe w/existing
  }

  fs.writeFileSync(
    projectConfig.pbxprojPath,
    project.writeSync(),
  );

  writePlist(project, projectConfig.sourceDir, plist);
};
