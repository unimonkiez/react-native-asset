import * as path from "@std/path";

export default async function copyAssetsAndroid(
  assetPaths: string[],
  platformConfig: { path?: string },
  options: { path: string },
) {
  const destBase = options?.path ??
    (platformConfig?.path
      ? path.resolve(platformConfig.path, "assets")
      : undefined);
  if (!destBase) {
    console.info(
      "No destination configured for android assets — skipping copy",
    );
    return;
  }

  try {
    try {
      await Deno.lstat(destBase);
    } catch (_e) {
      await Deno.mkdir(destBase, { recursive: true });
    }

    for (const asset of assetPaths) {
      const base = path.basename(asset);
      const dest = path.resolve(destBase, base);
      await Deno.copyFile(asset, dest);
    }
  } catch (e) {
    console.error("Failed copying android assets:", e);
    throw e;
  }
}
