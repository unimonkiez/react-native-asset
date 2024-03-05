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
module.exports = function linkAssetsMacOS(files, projectConfig, { addFont }) {
  const project = xcode.project(projectConfig.pbxprojPath).parseSync();
  const plist = getPlist(project, projectConfig.sourceDir, 'macos');

  const { targets } = project.getFirstProject().firstProject;
  const target = targets.filter((inTarget) => {
    const t = project.pbxNativeTargetSection()[inTarget.value];
    const c = project.pbxXCConfigurationList()[t.buildConfigurationList];
    const b = project.pbxXCBuildConfigurationSection()[c.buildConfigurations[0].value];
    return b.buildSettings.SDKROOT === 'macosx' || b.buildSettings.MACOSX_DEPLOYMENT_TARGET !== undefined;
  }).map(inTarget => inTarget.value)[0];

  createGroupWithMessage(project, 'Resources');

  function addResourceFile(f) {
    return (f || [])
      .map(asset => (
        project.addResourceFile(
          path.relative(projectConfig.sourceDir, asset),
          { target },
        )
      ))
      .filter(file => file) // xcode returns false if file is already there
      .map(file => file.basename);
  }

  addResourceFile(files);

  if (addFont) {
    plist.ATSApplicationFontsPath = '.';
  }

  fs.writeFileSync(
    projectConfig.pbxprojPath,
    project.writeSync(),
  );

  writePlist(project, projectConfig.sourceDir, plist, 'macos');
};
