/**
 * Copyright (c) 2015-present, Facebook, Inc.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
const getFirstProject = project => project.getFirstProject().firstProject;

const findGroup = (group, name) => group.children.find(grp => grp.comment === name);

/**
 * Returns group from .xcodeproj if one exists, null otherwise
 *
 * Unlike node-xcode `pbxGroupByName` - it does not return `first-matching`
 * group if multiple groups with the same name exist
 *
 * If path is not provided, it returns top-level group
 */
module.exports = function getGroup(project, path) {
  const firstProject = getFirstProject(project);

  let key = firstProject.mainGroup;
  let group = project.getPBXGroupByKey(key);

  if (!path) {
    return { key, group };
  }

  /* eslint-disable-next-line no-restricted-syntax */
  for (const name of path.split('/')) {
    const foundGroup = findGroup(group, name);

    if (foundGroup) {
      key = foundGroup.value;
      group = project.getPBXGroupByKey(key);
    } else {
      key = null;
      group = null;
      break;
    }
  }

  return { key, group };
};
