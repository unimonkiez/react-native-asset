import * as path from "@std/path";

export default async function cleanAssetsAndroid(
  filePaths: string[],
  platformConfig: { path?: string },
  _options: { path: string },
) {
  for (const p of filePaths) {
    try {
      // If absolute path was provided, remove directly, otherwise resolve relative to platform root
      const target = path.isAbsolute(p)
        ? p
        : (platformConfig?.path ? path.resolve(platformConfig.path, p) : p);
      try {
        const st = Deno.lstatSync(target);
        if (st.isFile) {
          await Deno.remove(target);
        }
      } catch (_e) {
        // ignore missing files
      }
    } catch (e) {
      console.error("Failed cleaning android asset", p, e);
    }
  }
}
