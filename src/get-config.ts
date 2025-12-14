import * as path from "@std/path";

export default function getConfig({ rootPath }: { rootPath: string }) {
  const androidPath = path.resolve(rootPath, "android");
  const iosPath = path.resolve(rootPath, "ios");

  let androidExists = false;
  let iosExists = false;

  try {
    const st = Deno.lstatSync(androidPath);
    androidExists = st.isDirectory;
  } catch (_e) {
    // Ok
  }

  try {
    const st = Deno.lstatSync(iosPath);
    iosExists = st.isDirectory;
  } catch (_e) {
    // Ok
  }

  return {
    android: {
      path: androidPath,
      exists: androidExists,
    },
    ios: {
      path: iosPath,
      exists: iosExists,
    },
  };
}
