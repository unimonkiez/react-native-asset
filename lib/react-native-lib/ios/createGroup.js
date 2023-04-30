/**
 * Copyright (c) 2015-present, Facebook, Inc.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

const getGroup = require('./getGroup');

const hasGroup = (pbxGroup, name) => pbxGroup.children.find(group => group.comment === name);

/**
 * Given project and path of the group, it deeply creates a given group
 * making all outer groups if necessary
 *
 * Returns newly created group
 */
module.exports = function createGroup(project, path) {
  let key; // This works, but this is ugly
  return path.split('/').reduce(
    (keyAndGroup, name) => {
      const { group } = keyAndGroup;
      if (!hasGroup(group, name)) {
        const uuid = project.pbxCreateGroup(name, '""');
        key = uuid;
        group.children.push({
          value: uuid,
          comment: name,
        });
      }

      // This works, but this is ugly
      return { key, group: project.pbxGroupByName(name) };
    },
    getGroup(project),
  );
};
