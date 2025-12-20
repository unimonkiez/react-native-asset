import * as path from "@std/path";
import * as xcode from "xcode";
import * as xcodeParser from "xcode/lib/parser/pbxproj.js";
import createGroupWithMessage from "../react-native-lib/ios/createGroupWithMessage.js";
import getPlist from "../react-native-lib/ios/getPlist.js";
import writePlist from "../react-native-lib/ios/writePlist.js";

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
  const plist = await getPlist(
    project,
    platformConfig
      .path,
  );

  createGroupWithMessage(project, "Resources");

  const addedFiles = filePaths.map((p) =>
    project.addResourceFile(
      path.relative(platformConfig.path, p),
      { target: project.getFirstTarget().uuid },
    )
  ).filter((x) => x)
    .map((file) => file.basename);

  if (options.addFont) {
    const existingFonts = plist.UIAppFonts || [];
    const allFonts = [...existingFonts, ...addedFiles];
    plist.UIAppFonts = Array.from(new Set(allFonts)); // use Set to dedupe w/existing
  }

  await Deno.writeTextFile(
    platformConfig.pbxprojPath,
    project.writeSync(),
  );

  await writePlist(project, platformConfig.path, plist);
}
