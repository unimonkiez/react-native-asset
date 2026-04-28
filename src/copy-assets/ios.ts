import * as path from "@std/path";
// @deno-types="../xcode.d.ts"
import * as xcode from "xcode";
import type { parse, PBXFile } from "../xcode.d.ts";
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
    (buf) => new TextDecoder("utf-8").decode(buf),
  );
  project.hash = xcodeParser.parse(pbxprojContent);

  createGroupWithMessage(project, "Resources");

  const targetUUIDs = getTargetUUIDs(project);

  for (const filePath of filePaths) {
    const relativeFilePath = path.relative(platformConfig.path, filePath);

    let file: PBXFile | false = false;
    for (const target of targetUUIDs) {
      if (!file) {
        file = project.addResourceFile(relativeFilePath, { target });
        if (!file) {
          // We know the resource is already in the project but there's no obvious way to get the PBXFile reference
          // It's kinda sloppy but we can remove and re-add the resource to get the reference
          // This has the side effect of unlinking all other targets... not a problem because we're about to link them anyway
          project.removeResourceFile(relativeFilePath, { target });
          file = project.addResourceFile(relativeFilePath, { target });
          if (!file) {
            throw new Error(`Failed to add file to pbxproj "${filePath}"`);
          }
        }
      } else {
        // Each target & asset combination needs a different build phase UUID
        file.target = target;
        file.uuid = project.generateUuid();
        project.addToPbxBuildFileSection(file);
        project.addToPbxResourcesBuildPhase(file);
      }
    }
  }

  await Deno.writeTextFile(
    platformConfig.pbxprojPath,
    project.writeSync(),
  );

  const fileBasenames = filePaths.map((p) => path.basename(p));

  for (const targetUUID of targetUUIDs) {
    // deno-lint-ignore no-await-in-loop -- sequential read/write to same plist file
    const plist = await getPlist(project, platformConfig.path, targetUUID);

    if (options.addFont && plist) {
      const existingFonts = plist.UIAppFonts || [];
      const allFonts = [...existingFonts, ...fileBasenames];
      plist.UIAppFonts = Array.from(new Set(allFonts)); // use Set to dedupe w/existing
    }

    // deno-lint-ignore no-await-in-loop -- sequential read/write to same plist file
    await writePlist(project, platformConfig.path, plist, targetUUID);
  }
}
