export { linkAssets } from "./main.ts";
import { runCli } from "./cli.ts";
import "./xcode.d.ts";

if (import.meta.main) {
  runCli().catch((e) => {
    console.error("Error running CLI:", e);
    Deno.exit(1);
  });
}
