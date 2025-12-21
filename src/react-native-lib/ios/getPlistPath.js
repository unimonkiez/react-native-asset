/**
 * Copyright (c) 2015-present, Facebook, Inc.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

import * as path from "@std/path";
import getBuildProperty from "./getBuildProperty.js";

export default function getPlistPath(project, sourceDir) {
  const plistFile = getBuildProperty(project, "INFOPLIST_FILE");

  if (!plistFile) {
    return null;
  }

  return path.join(
    sourceDir,
    plistFile.replace(/"/g, "").replace("$(SRCROOT)", ""),
  );
}
