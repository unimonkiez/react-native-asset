/**
 * Copyright (c) 2015-present, Facebook, Inc.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

import plistParser from "plist";
import getPlistPath from "./getPlistPath.js";

/**
 * Returns Info.plist located in the iOS project
 *
 * Returns `null` if INFOPLIST_FILE is not specified.
 */
export default async function getPlist(project, sourceDir) {
  const plistPath = getPlistPath(project, sourceDir);

  if (
    !plistPath ||
    !(await Deno.lstat(plistPath)
      .then(() => true)
      .catch(() => false))
  ) {
    return null;
  }

  const plistContent = await Deno.readFile(plistPath).then((buf) => {
    const decoder = new TextDecoder("utf-8");
    return decoder.decode(buf);
  });

  return plistParser.parse(plistContent);
}
