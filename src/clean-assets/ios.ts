import * as path from "@std/path";
// @deno-types="../xcode.d.ts"
import * as xcode from "xcode";
import type { parse } from "../xcode.d.ts";
import * as xcodeParserUntyped from "xcode/lib/parser/pbxproj.js";

const xcodeParser = xcodeParserUntyped as { parse: typeof parse };
import createGroupWithMessage from "../react-native-lib/ios/createGroupWithMessage.js";
import getPlist from "../react-native-lib/ios/getPlist.js";
import writePlist from "../react-native-lib/ios/writePlist.js";
import { getTargetUUIDs } from "../utils.ts";

export default async function cleanAssetsIos(
  filePaths: string[],
  platformConfig: { path: string; pbxprojPath: string },
  options: { addFont: boolean },
) {
  const project = xcode.project(platformConfig.pbxprojPath);
  const pbxprojContent = await Deno.readFile(platformConfig.pbxprojPath).then(
    (buf) => new TextDecoder("utf-8").decode(buf),
  );
  project.hash = xcodeParser.parse(pbxprojContent);

  createGroupWithMessage(project, "Resources");

  for (const targetUUID of getTargetUUIDs(project)) {
    // deno-lint-ignore no-await-in-loop -- sequential read/write to same plist file
    const plist = await getPlist(project, platformConfig.path, targetUUID);

    const removedFiles = filePaths.map((p) => {
      return project.removeResourceFile(
        path.relative(platformConfig.path, p),
        { target: targetUUID },
      );
    }).filter((x) => x).map((file) => file.basename);

    if (options.addFont) {
      const existingFonts = plist.UIAppFonts || [];
      const allFonts = existingFonts.filter((file: string) =>
        removedFiles.indexOf(file) === -1
      );
      plist.UIAppFonts = Array.from(new Set(allFonts)); // use Set to dedupe w/existing
    }

    // deno-lint-ignore no-await-in-loop
    await writePlist(project, platformConfig.path, plist, targetUUID);
  }

  await Deno.writeTextFile(
    platformConfig.pbxprojPath,
    project.writeSync(),
  );
}
