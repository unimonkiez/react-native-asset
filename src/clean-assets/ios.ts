import * as path from "@std/path";

export default async function cleanAssetsIos(
  filePaths: string[],
  platformConfig: { path?: string },
  _options: { addFont: boolean },
) {
  for (const p of filePaths) {
    try {
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
      console.error("Failed cleaning iOS asset", p, e);
    }
  }
}
