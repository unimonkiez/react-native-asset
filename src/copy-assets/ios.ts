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

export default async function copyAssetsIos(
  filePaths: string[],
  platformConfig: { path: string; pbxprojPath: string },
  options: { addFont: boolean },
) {
  const project = xcode.project(platformConfig.pbxprojPath);
  const pbxprojContent = await Deno.readFile(platformConfig.pbxprojPath).then(
    (buf) => {
      const decoder = new TextDecoder("utf-8");
      return decoder.decode(buf);
    },
  );
  project.hash = xcodeParser.parse(
    pbxprojContent,
  );

  createGroupWithMessage(project, "Resources");
  const fileBasenames = filePaths.map((p) => path.basename(p));

  for (const targetUUID of getTargetUUIDs(project)) {
    // deno-lint-ignore no-await-in-loop -- sequential read/write to same plist file
    const plist = await getPlist(project, platformConfig.path, targetUUID);

    for (const filePath of filePaths) {
      project.addResourceFile(
        path.relative(platformConfig.path, filePath),
        { target: targetUUID },
      );
    }

    if (options.addFont && plist) {
      const existingFonts = plist.UIAppFonts || [];
      const allFonts = [...existingFonts, ...fileBasenames];
      plist.UIAppFonts = Array.from(new Set(allFonts)); // use Set to dedupe w/existing
    }

    // deno-lint-ignore no-await-in-loop -- sequential read/write to same plist file
    await writePlist(project, platformConfig.path, plist, targetUUID);
  }

  await Deno.writeTextFile(
    platformConfig.pbxprojPath,
    project.writeSync(),
  );
}
