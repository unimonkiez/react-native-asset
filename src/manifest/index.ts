import * as path from "@std/path";

const manifestFileName = "link-assets-manifest.json";

type Manifest = {
  migIndex: 1;
  data: Array<{ path: string; sha1: string }>;
};

export default function getManifest(projectPath: string) {
  const manifestPath = path.resolve(projectPath, manifestFileName);

  return {
    read: async () => {
      try {
        const data = await Deno.readFile(manifestPath);
        return (JSON.parse(new TextDecoder().decode(data)) as Manifest).data;
      } catch (e) {
        if (!(e instanceof Deno.errors.NotFound)) {
          throw e;
        }
        return [];
      }
    },
    write: async (files: Array<{ path: string; sha1: string }>) => {
      try {
        const dir = path.dirname(manifestPath);
        try {
          Deno.lstatSync(dir);
        } catch (_) {
          await Deno.mkdir(dir, { recursive: true });
        }
        await Deno.writeTextFile(
          manifestPath,
          JSON.stringify({ migIndex: 1, data: files } as Manifest, null, 2),
        );
      } catch (e) {
        throw e;
      }
    },
  };
}
