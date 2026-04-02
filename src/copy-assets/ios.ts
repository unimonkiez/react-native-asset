import * as path from "@std/path";
/// <reference types="../xcode.d.ts" />
import * as xcode from "xcode";
/// <reference types="../xcode.d.ts" />
import * as xcodeParser from "xcode/lib/parser/pbxproj.js";
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

  const plists = await Promise.all(
    getTargetUUIDs(project).map((targetUUID) =>
      getPlist(project, platformConfig.path, targetUUID)
    ),
  );

  await Promise.all(
    plists.map((plist: unknown, i: number) => {
      const addedFiles = filePaths.map((p) =>
        project.addResourceFile(
          path.relative(platformConfig.path, p),
          { target: getTargetUUIDs(project)[i] },
        )
      ).filter((x) => x).map((file: Record<string, unknown>) => file.basename);

      if (options.addFont) {
        const existingFonts =
          ((plist as Record<string, unknown>).UIAppFonts as string[]) || [];
        const allFonts = [...existingFonts, ...addedFiles];
        (plist as Record<string, unknown>).UIAppFonts = Array.from(
          new Set(allFonts),
        ); // use Set to dedupe w/existing
      }

      return writePlist(
        project,
        platformConfig.path,
        plist,
        getTargetUUIDs(project)[i],
      );
    }),
  );

  await Deno.writeTextFile(
    platformConfig.pbxprojPath,
    project.writeSync(),
  );
}
