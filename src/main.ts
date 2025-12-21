import * as path from "@std/path";
import { getConfig } from "./get-config.ts";
import copyAssetsIos from "./copy-assets/ios.ts";
import cleanAssetsIos from "./clean-assets/ios.ts";
import copyAssetsAndroid from "./copy-assets/android.ts";
import cleanAssetsAndroid from "./clean-assets/android.ts";
import getManifest from "./manifest/index.ts";

type PlatformType = "ios" | "android";

export const linkAssets = async (
  {
    rootPath,
    platforms,
    shouldUnlink = true,
  }: {
    rootPath: string;
    shouldUnlink?: boolean;
    platforms: {
      [k in PlatformType]: {
        enabled: boolean;
        assets: string[];
      };
    };
  },
): Promise<void> => {
  const cwd = Deno.cwd();

  const clearDuplicated = (files: Array<{ path: string; sha1: string }>) =>
    Array.from(
      new Map(files.map((f) => [path.parse(f.path).base + "|" + f.sha1, f]))
        .values(),
    );

  const filesToIgnore = [
    ".DS_Store",
    "Thumbs.db",
  ];
  const filterFilesToIgnore = ({ path: asset }: { path: string }) =>
    filesToIgnore.indexOf(path.basename(asset)) === -1;

  const getAbsolute = (
    { filePath, dirPath }: { filePath: string; dirPath: string },
  ) => (
    path.isAbsolute(filePath) ? filePath : path.resolve(dirPath, filePath)
  );
  const getRelative = (
    { filePath, dirPath }: { filePath: string; dirPath: string },
  ) => (
    path.isAbsolute(filePath) ? path.relative(dirPath, filePath) : filePath
  );

  const filterFileByFilesWhichNotExists = (
    files: Array<{ path: string; sha1?: string }>,
    { normalizeAbsolutePathsTo }: { normalizeAbsolutePathsTo: string },
  ) =>
  (file: { path: string; sha1?: string }) => {
    const { path: filePath, sha1: fileSha1 } = file;
    const relativeFilePath = getRelative({
      filePath,
      dirPath: normalizeAbsolutePathsTo,
    });

    return files
      .map((otherFile) => ({
        ...otherFile,
        path: getRelative({
          filePath: otherFile.path,
          dirPath: normalizeAbsolutePathsTo,
        }),
      }))
      .findIndex((otherFile) => {
        const { path: otherFileRelativePath, sha1: otherFileSha1 } = otherFile;

        return (relativeFilePath === otherFileRelativePath &&
          fileSha1 === otherFileSha1);
      }) === -1;
  };

  const computeSha1 = async (filePath: string) => {
    const data = await Deno.readFile(filePath);
    const hashBuffer = await crypto.subtle.digest("SHA-1", data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
  };

  const absoluteRootPath = path.resolve(cwd, rootPath);
  console.log(`Linking assets in ${absoluteRootPath}`);

  // basic validation
  const st = await Deno.lstat(rootPath);
  if (!st.isDirectory) {
    throw new Error(`'rootPath' must be a valid path, got ${rootPath}`);
  }
  const st2 = await Deno.lstat(absoluteRootPath);
  if (!st2.isDirectory) {
    throw new Error(
      `'rootPath' must be a valid path, got ${absoluteRootPath}`,
    );
  }

  if (typeof shouldUnlink !== "boolean") {
    throw new Error(
      `'shouldUnlink' must be a boolean, got ${typeof shouldUnlink}`,
    );
  }

  if (
    [platforms.ios, platforms.android].find(({ assets }) =>
      !Array.isArray(assets)
    )
  ) {
    throw new Error("'platforms[\"platform\"].assets' must be an array");
  }

  const finalRootPath = path.isAbsolute(rootPath)
    ? rootPath
    : path.resolve(cwd, rootPath);

  // build platforms defaults
  const mergedPlatforms = {
    ios: {
      enabled: platforms.ios.enabled,
      assets: platforms.ios.assets,
    },
    android: {
      enabled: platforms.android.enabled,
      assets: platforms.android.assets,
    },
  };

  // helper modules are statically imported at the top of this file

  const config = await getConfig({ rootPath: finalRootPath });
  const {
    android: { path: androidPath },
    ios: { path: iosPath },
  } = config;

  const linkOptionsPerExt = {
    ...["otf", "ttf"].reduce(
      (result, fontType) => ({
        ...result,
        [fontType]: {
          android: {
            path: path.resolve(
              androidPath,
              "app",
              "src",
              "main",
              "assets",
              "fonts",
            ),
          },
          ios: {
            addFont: true,
          },
        },
      }),
      {},
    ),
    ...["png", "jpg", "gif"].reduce(
      (result, imageType) => ({
        ...result,
        [imageType]: {
          android: {
            path: path.resolve(
              androidPath,
              "app",
              "src",
              "main",
              "res",
              "drawable",
            ),
          },
          ios: {
            addFont: false,
          },
        },
      }),
      {},
    ),
    mp3: {
      android: {
        path: path.resolve(androidPath, "app", "src", "main", "res", "raw"),
      },
      ios: {
        addFont: false,
      },
    },
  } as {
    [k: string]: {
      android: { path: string };
      ios: { addFont: boolean };
    };
  };

  const otherLinkOptions = {
    android: {
      path: path.resolve(androidPath, "app", "src", "main", "assets", "custom"),
    },
    ios: {
      addFont: false,
    },
  };

  const linkPlatform = (
    { rootPath: rp, shouldUnlink: su }: {
      rootPath: string;
      shouldUnlink: boolean;
    },
  ) =>
  async ({
    name,
    manifest,
    config: platformConfig,
    linkOptionsPerExt: lopExt,
    otherLinkOptions: otherOptions,
    cleanAssets,
    copyAssets,
    assets: assetsPaths,
  }: {
    name: string;
    manifest: ReturnType<typeof getManifest>;
    config: { path: string } | {
      path: string;
      pbxprojPath: string;
    };
    linkOptionsPerExt: {
      [k: string]: { path: string } | { addFont: boolean };
    };
    otherLinkOptions: { path: string } | { addFont: boolean };
    cleanAssets: typeof cleanAssetsIos | typeof cleanAssetsAndroid;
    copyAssets: typeof copyAssetsIos | typeof copyAssetsAndroid;
    assets: string[];
  }) => {
    let prevRelativeAssets: Array<{ path: string; sha1?: string }> = [];
    try {
      prevRelativeAssets = (await manifest.read()).map((asset) => ({
        ...asset,
        path: asset.path.split("/").join(path.SEPARATOR),
      }));
    } catch (_) {
      // manifest not found -> ok
    }

    let assets: Array<{ path: string; sha1: string }> = [];

    const loadAsset = async (assetMightNotAbsolute: string) => {
      const asset = getAbsolute({
        filePath: assetMightNotAbsolute,
        dirPath: rp,
      });

      const stats = await Deno.lstat(asset);
      if (stats.isDirectory) {
        for await (const dirent of Deno.readDir(asset)) {
          await loadAsset(path.resolve(asset, dirent.name));
        }
      } else {
        const sha1 = await computeSha1(asset);
        assets = assets.concat({ path: asset, sha1 });
      }
    };

    const loadAll = async () => {
      for (const p of assetsPaths) {
        await loadAsset(p);
      }
      assets = clearDuplicated(assets);
    };

    // run loading synchronously for simplicity
    // (keeps behavior similar to original)
    await loadAll();

    const fileFilters = ([] as {
      name: string;
      filter: (arg: { path: string }) => boolean;
      options: { path: string } | { addFont: boolean };
    }[])
      .concat(
        Object.keys(lopExt).map((fileExt) => ({
          name: fileExt,
          filter: ({ path: filePath }: { path: string }) =>
            path.extname(filePath) === `.${fileExt}`,
          options: lopExt[fileExt],
        })),
      )
      .concat({
        name: "custom",
        filter: ({ path: filePath }: { path: string }) =>
          Object.keys(lopExt).indexOf(path.extname(filePath).substr(1)) ===
            -1,
        options: otherOptions,
      });

    for (
      const { name: fileConfigName, filter: fileConfigFilter, options }
        of fileFilters
    ) {
      const prevRelativeAssetsWithExt = prevRelativeAssets
        .filter(fileConfigFilter)
        .filter(
          filterFileByFilesWhichNotExists(assets, {
            normalizeAbsolutePathsTo: rp,
          }),
        );

      const assetsWithExt = assets
        .filter(fileConfigFilter)
        .filter(
          filterFileByFilesWhichNotExists(prevRelativeAssets, {
            normalizeAbsolutePathsTo: rp,
          }),
        )
        .filter(filterFilesToIgnore);

      if (su && prevRelativeAssetsWithExt.length > 0) {
        console.info(
          `Cleaning previously linked ${fileConfigName} assets from ${name} project`,
        );
        await cleanAssets(
          prevRelativeAssetsWithExt.map(({ path: filePath }) =>
            getAbsolute({ filePath, dirPath: rp })
          ),
          platformConfig as { path: string; pbxprojPath: string },
          options as { path: string } & { addFont: boolean },
        );
      }

      if (assetsWithExt.length > 0) {
        console.info(`Linking ${fileConfigName} assets to ${name} project`);
        await copyAssets(
          assetsWithExt.map(({ path: assetPath }) => assetPath),
          platformConfig as { path: string; pbxprojPath: string },
          options as { path: string } & { addFont: boolean },
        );
      }
    }

    await manifest.write(
      assets
        .filter(filterFilesToIgnore)
        .map((asset) => ({
          ...asset,
          path: path.relative(rp, asset.path).split(path.SEPARATOR).join("/"),
        })),
    );
  };

  const platformsArray = [
    {
      name: "iOS",
      enabled: mergedPlatforms.ios.enabled,
      assets: mergedPlatforms.ios.assets,
      manifest: getManifest(iosPath),
      config: config.ios,
      cleanAssets: cleanAssetsIos,
      copyAssets: copyAssetsIos,
      linkOptionsPerExt: {
        otf: linkOptionsPerExt.otf.ios,
        ttf: linkOptionsPerExt.ttf.ios,
        mp3: linkOptionsPerExt.mp3.ios,
      } as { [k: string]: { addFont: boolean } },
      otherLinkOptions: otherLinkOptions.ios,
    },
    {
      name: "Android",
      enabled: mergedPlatforms.android.enabled,
      assets: mergedPlatforms.android.assets,
      manifest: getManifest(androidPath),
      config: config.android,
      cleanAssets: cleanAssetsAndroid,
      copyAssets: copyAssetsAndroid,
      linkOptionsPerExt: {
        otf: linkOptionsPerExt.otf.android,
        ttf: linkOptionsPerExt.ttf.android,
        png: linkOptionsPerExt.png.android,
        jpg: linkOptionsPerExt.jpg.android,
        gif: linkOptionsPerExt.gif.android,
        mp3: linkOptionsPerExt.mp3.android,
      } as { [k: string]: { path: string } },
      otherLinkOptions: otherLinkOptions.android,
    },
  ];

  await Promise.all(
    platformsArray
      .filter(({ enabled, config: platformConfig }) =>
        enabled && platformConfig.exists
      )
      .map((p) => linkPlatform({ rootPath: finalRootPath, shouldUnlink })(p)),
  );
};
