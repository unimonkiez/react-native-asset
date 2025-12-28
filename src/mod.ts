export { linkAssets } from "./main.ts";
import { runCli } from "./cli.ts";
import { pathToFileURL } from "node:url";
import process from "node:process";
import * as path from "@std/path";

const isMain = import.meta.main ||
  (path.basename(process.argv[0]).startsWith("node") &&
    pathToFileURL(Deno.realPathSync(process.argv[1])).href ===
      import.meta.url);

if (isMain) {
  runCli().catch((e) => {
    console.error("Error running CLI:", e);
    Deno.exit(1);
  });
}
