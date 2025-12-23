import * as path from "@std/path";
import { parseArgs } from "@std/cli/parse-args";
import { linkAssets } from "./main.ts";
import { pathToFileURL } from "node:url";

export const runCli = async () => {
  const args = await parseArgs(Deno.args, {
    alias: {
      a: "assets",
      "ios-a": "ios-assets",
      "android-a": "android-assets",
      p: "path",
      "n-u": "no-unlink",
    },
    collect: ["assets", "ios-assets", "android-assets"],
    string: ["assets", "ios-assets", "android-assets", "path"],
    boolean: ["no-unlink"],
    default: {
      path: Deno.cwd(),
      noUnlink: false,
    },
  });

  const reactNativeConfigPath = path.join(args.path, `react-native.config.js`);
  let reactNativeConfigExists = false;
  try {
    const _ = await Deno.lstat(reactNativeConfigPath);
    reactNativeConfigExists = true;
  } catch (err) {
    if (!(err instanceof Deno.errors.NotFound)) {
      throw err;
    }
  }

  const reactNativeConfig = reactNativeConfigExists
    ? (await import(pathToFileURL(reactNativeConfigPath).href)).default as {
      assets?: string[];
      iosAssets?: string[];
      androidAssets?: string[];
    }
    : {};

  const merged = {
    assets: args.assets.length !== 0
      ? args.assets
      : (reactNativeConfig.assets ?? undefined),
    iosAssets: args["ios-assets"].length !== 0
      ? args["ios-assets"]
      : (reactNativeConfig.iosAssets ?? undefined),
    androidAssets: args["android-assets"].length !== 0
      ? args["android-assets"]
      : (reactNativeConfig.androidAssets ?? undefined),
  };

  await linkAssets({
    rootPath: args.path,
    shouldUnlink: !args.noUnlink,
    platforms: {
      ios: {
        enabled: merged.assets !== undefined || merged.iosAssets !== undefined,
        assets: [
          ...(merged.iosAssets ?? []),
          ...(merged.assets ?? []),
        ],
      },
      android: {
        enabled: merged.assets !== undefined ||
          merged.androidAssets !== undefined,
        assets: [
          ...(merged.androidAssets ?? []),
          ...(merged.assets ?? []),
        ],
      },
    },
  });
};
