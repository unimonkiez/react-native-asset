import { build, emptyDir } from "@deno/dnt";

const { default: config } = await import("../deno.json", {
  with: { type: "json" },
});

await emptyDir("./npm");
await emptyDir("./test");

await build({
  entryPoints: [{
    kind: "bin",
    name: "react-native-asset",
    path: "./src/mod.ts",
  }, {
    kind: "export",
    name: "react-native-asset",
    path: "./src/mod.ts",
  }],
  outDir: "./npm",
  typeCheck: false, // Couldn't because of xcode.d.ts "both",
  shims: {
    deno: true,
  },
  package: {
    name: config.name.substring(config.name.lastIndexOf("/") + 1),
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
