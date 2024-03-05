/**
 * Copyright (c) 2015-present, Facebook, Inc.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

/**
 * Gets build property from the main target build section
 *
 * It differs from the project.getBuildProperty exposed by xcode in the way that:
 * - it only checks for build property in the main target `Debug` section
 * - `xcode` library iterates over all build sections and because it misses
 * an early return when property is found, it will return undefined/wrong value
 * when there's another build section typically after the one you want to access
 * without the property defined (e.g. CocoaPods sections appended to project
 * miss INFOPLIST_FILE), see: https://github.com/alunny/node-xcode/blob/master/lib/pbxProject.js#L1765
 */
module.exports = function getBuildProperty(project, prop, platform = 'ios') {
  const { targets } = project.getFirstProject().firstProject;
  const target = targets.filter((inTarget) => {
    const t = project.pbxNativeTargetSection()[inTarget.value];
    const c = project.pbxXCConfigurationList()[t.buildConfigurationList];
    const b = project.pbxXCBuildConfigurationSection()[c.buildConfigurations[0].value];

    if (platform === 'macos') {
      return b.buildSettings.SDKROOT === 'macosx' || b.buildSettings.MACOSX_DEPLOYMENT_TARGET !== undefined;
    }

    return true;
  }).map(inTarget => project.pbxNativeTargetSection()[inTarget.value])[0];
  if (!target) { return null; }

  const config = project.pbxXCConfigurationList()[target.buildConfigurationList];
  const buildSection = project
    .pbxXCBuildConfigurationSection()[config.buildConfigurations[0].value];

  return buildSection.buildSettings[prop];
};
