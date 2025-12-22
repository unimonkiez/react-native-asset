import * as path from "@std/path";

export default async function cleanAssetsAndroid(
  filePaths: string[],
  _platformConfig: { path?: string },
  options: { path: string },
) {
  console.log(`options path in cleanAssetsAndroid: ${options.path}`);

  for (const p of filePaths) {
    const target = path.join(options.path, path.basename(p));
    const st = await Deno.lstat(target);
    if (st.isFile) {
      await Deno.remove(target);
    }
  }
}
