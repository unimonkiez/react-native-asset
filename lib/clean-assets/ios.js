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
module.exports = function cleanAssetsIOS(files, projectConfig, { addFont, targets: targetNames }) {
  const project = xcode.project(projectConfig.pbxprojPath).parseSync();
  const plist = getPlist(project, projectConfig.sourceDir);

  createGroupWithMessage(project, 'Resources');

  let targetUUIDs
  if (targetNames) {
    const targets = project.getFirstProject().firstProject.targets
    const nativeTargets = project.pbxNativeTargetSection()
    targetUUIDs = targets
      .filter(target => targetNames.includes(nativeTargets[target.value].name))
      .map(target => target.value)
  } else {
    targetUUIDs = [project.getFirstTarget().uuid]
  }
  const uuid = targetUUIDs.shift()

  function removeResourceFile(f) {
    return (f || [])
      .map(asset => (
        project.removeResourceFile(
          path.relative(projectConfig.sourceDir, asset),
          { target: uuid },
        )
      ))
      .filter(file => file) // xcode returns false if file is already there
      .map(file => {
        targetUUIDs.forEach(uuid => {
          file.target = uuid
          project.removeFromPbxBuildFileSection(file);        // PBXBuildFile
          project.removeFromPbxFileReferenceSection(file);    // PBXFileReference
          project.removeFromResourcesPbxGroup(file);          // PBXGroup
          project.removeFromPbxResourcesBuildPhase(file);     // PBXResourcesBuildPhase
        })

        return file
      })
      .map(file => file.basename);
  }

  const removedFiles = removeResourceFile(files);

  if (addFont) {
    const existingFonts = (plist.UIAppFonts || []);
    const allFonts = existingFonts.filter(file => removedFiles.indexOf(file) === -1);
    plist.UIAppFonts = Array.from(new Set(allFonts)); // use Set to dedupe w/existing
  }

  fs.writeFileSync(
    projectConfig.pbxprojPath,
    project.writeSync(),
  );

  writePlist(project, projectConfig.sourceDir, plist);
};
