/**
 * Copyright (c) 2015-present, Facebook, Inc.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

import createGroup from "./createGroup.js";
import getGroup from "./getGroup.js";

/**
 * Given project and path of the group, it checks if a group exists at that path,
 * and deeply creates a group for that path if its does not already exist.
 *
 * Returns the existing or newly created group
 */
export default function createGroupWithMessage(project, path) {
  let group = getGroup(project, path);

  if (!group) {
    group = createGroup(project, path);

    console.warn(
      "ERRGROUP",
      `Group '${path}' does not exist in your Xcode project. We have created it automatically for you.`
    );
  }

  return group;
}
