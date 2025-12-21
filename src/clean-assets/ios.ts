import * as path from "@std/path";
/// <reference types="../xcode.d.ts" />
import * as xcode from "xcode";
import createGroupWithMessage from "../react-native-lib/ios/createGroupWithMessage.js";
import getPlist from "../react-native-lib/ios/getPlist.js";
import writePlist from "../react-native-lib/ios/writePlist.js";

export default async function cleanAssetsIos(
  filePaths: string[],
  platformConfig: { path: string; pbxprojPath: string },
  options: { addFont: boolean },
) {
  const project = xcode.project(platformConfig.pbxprojPath).parseSync();
  const plist = await getPlist(
    project,
    platformConfig
      .path,
  );

  createGroupWithMessage(project, "Resources");

  const removedFiles = filePaths.map((p) => {
    return project.removeResourceFile(
      path.relative(platformConfig.path, p),
      { target: project.getFirstTarget().uuid },
    );
  }).filter((x) => x).map((file) => file.basename);

  if (options.addFont) {
    const existingFonts = plist.UIAppFonts || [];
    const allFonts = existingFonts.filter((file: string) =>
      removedFiles.indexOf(file) === -1
    );
    plist.UIAppFonts = Array.from(new Set(allFonts)); // use Set to dedupe w/existing
  }

  await Deno.writeTextFile(
    platformConfig.pbxprojPath,
    project.writeSync(),
  );

  writePlist(project, platformConfig.path, plist);
}
