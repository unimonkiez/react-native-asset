import { build, emptyDir } from "@deno/dnt";

const { default: config } = await import("../deno.json", {
  with: { type: "json" },
});

await emptyDir("./npm");

await build({
  entryPoints: ["./src/mod.ts"],
  outDir: "./npm",
  typeCheck: "both",
  shims: {
    deno: true,
  },
  package: {
    name: config.name,
    version: config.version,
    description: config.description,
    license: config.license,
    author: config.author,
    homepage: config.homepage,
    repository: config.repository,
    bugs: config.bugs,
    keywords: config.keywords,
  },
  compilerOptions: {
    lib: ["ESNext"],
  },
  postBuild() {
    Deno.copyFileSync("LICENSE", "npm/LICENSE");
    Deno.copyFileSync("README.md", "npm/README.md");
  },
});
