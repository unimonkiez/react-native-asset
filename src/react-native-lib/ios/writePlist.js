/**
 * Copyright (c) 2015-present, Facebook, Inc.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

import plistParser from "plist";
import getPlistPath from "./getPlistPath.js";

/**
 * Writes to Info.plist located in the iOS project
 *
 * Returns `null` if INFOPLIST_FILE is not specified or file is non-existent.
 */
export default async function writePlist(project, sourceDir, plist) {
  const plistPath = getPlistPath(project, sourceDir);

  if (!plistPath) {
    return null;
  }

  // We start with an offset of -1, because Xcode maintains a custom
  // indentation of the plist.
  // Ref: https://github.com/facebook/react-native/issues/11668
  return await Deno.writeTextFile(
    plistPath,
    `${plistParser.build(plist, { indent: "\t", offset: -1 })}\n`
  );
}
