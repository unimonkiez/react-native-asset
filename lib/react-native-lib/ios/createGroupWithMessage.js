/**
 * Copyright (c) 2015-present, Facebook, Inc.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

const log = require('npmlog');

const createGroup = require('./createGroup');
const getGroup = require('./getGroup');

/**
 * Given project and path of the group, it checks if a group exists at that path,
 * and deeply creates a group for that path if its does not already exist.
 *
 * Returns the existing or newly created group
 */
module.exports = function createGroupWithMessage(project, path) {
  let keyAndGroup = getGroup(project, path);

  if (!keyAndGroup.group) {
    keyAndGroup = createGroup(project, path);

    log.warn(
      'ERRGROUP',
      `Group '${path}' does not exist in your Xcode project. We have created it automatically for you.`,
    );
  }

  return keyAndGroup;
};
