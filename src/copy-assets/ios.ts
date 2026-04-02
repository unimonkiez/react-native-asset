import * as path from "@std/path";
/// <reference types="../xcode.d.ts" />
import * as xcode from "xcode";
/// <reference types="../xcode.d.ts" />
import * as xcodeParser from "xcode/lib/parser/pbxproj.js";
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
    (buf) => {
      const decoder = new TextDecoder("utf-8");
      return decoder.decode(buf);
    },
  );
  project.hash = xcodeParser.parse(
    pbxprojContent,
  );

  createGroupWithMessage(project, "Resources");

  const targetUUIDs = getTargetUUIDs(project);
  const plists = await Promise.all(
    targetUUIDs.map((targetUUID) => getPlist(project, platformConfig.path, targetUUID))
  );

  for (let i = 0; i < targetUUIDs.length; i++) {
    const targetUUID = targetUUIDs[i];
    const plist = plists[i];

    const addedFiles = filePaths.map((p) =>
      project.addResourceFile(
        path.relative(platformConfig.path, p),
        { target: targetUUID },
      )
    ).filter((x) => x).map((file) => file.basename);

    if (options.addFont) {
      const existingFonts = plist.UIAppFonts || [];
      const allFonts = [...existingFonts, ...addedFiles];
      plist.UIAppFonts = Array.from(new Set(allFonts)); // use Set to dedupe w/existing
    }
  }

  await Promise.all(
    targetUUIDs.map((targetUUID, i) =>
      writePlist(project, platformConfig.path, plists[i], targetUUID)
    )
  );

  await Deno.writeTextFile(
    platformConfig.pbxprojPath,
    project.writeSync(),
  );
}
