import * as path from "@std/path";

const manifestFileName = "react-native-assets-manifest.json";

export default function getManifest(projectPath: string) {
  const manifestPath = path.resolve(projectPath, manifestFileName);

  return {
    read: async () => {
      try {
        const data = await Deno.readTextFile(manifestPath);
        return JSON.parse(data) as Array<{ path: string; sha1?: string }>;
      } catch (_) {
        return [];
      }
    },
    write: async (files: Array<{ path: string; sha1?: string }>) => {
      try {
        const dir = path.dirname(manifestPath);
        try {
          Deno.lstatSync(dir);
        } catch (_) {
          await Deno.mkdir(dir, { recursive: true });
        }
        await Deno.writeTextFile(manifestPath, JSON.stringify(files, null, 2));
      } catch (e) {
        throw e;
      }
    },
  };
}
