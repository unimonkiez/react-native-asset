/**
 * Copyright (c) 2015-present, Facebook, Inc.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
/* eslint-disable */

const getFirstProject = (project) => project.getFirstProject().firstProject;

const findGroup = (group, name) =>
  group.children.find((group) => group.comment === name);

/**
 * Returns group from .xcodeproj if one exists, null otherwise
 *
 * Unlike node-xcode `pbxGroupByName` - it does not return `first-matching`
 * group if multiple groups with the same name exist
 *
 * If path is not provided, it returns top-level group
 */
export default function getGroup(project, path) {
  const firstProject = getFirstProject(project);

  let group = project.getPBXGroupByKey(firstProject.mainGroup);

  if (!path) {
    return group;
  }

  for (const name of path.split("/")) {
    const foundGroup = findGroup(group, name);

    if (foundGroup) {
      group = project.getPBXGroupByKey(foundGroup.value);
    } else {
      group = null;
      break;
    }
  }

  return group;
}
