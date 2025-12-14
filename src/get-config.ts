import * as path from "@std/path";

export const getConfig = async ({ rootPath }: { rootPath: string }) => {
  const androidPath = path.resolve(rootPath, "android");
  const iosPath = path.resolve(rootPath, "ios");

  let androidExists = false;
  let iosExists = false;

  try {
    const st = await Deno.lstat(androidPath);
    androidExists = st.isDirectory;
  } catch (_e) {
    // Ok
  }

  try {
    const st = await Deno.lstat(iosPath);
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
};
