import { assertEquals, assertStringIncludes } from "@std/assert";
import { linkAssets } from "@unimonkiez/react-native-asset";
import { setupLinkAssetsMocks } from "./test-tools.ts";
import testProjectPbxproj from "./test_project.pbxproj" with { type: "text" };
import testInfoPlist from "./test_Info.plist" with { type: "text" };

Deno.test("linkAssets test manifest creation and files handling for Android", async () => {
  const stubs = setupLinkAssetsMocks({
    "android": {},
    "assets": {
      "sound.mp3": "a",
      "image.png": "b",
      "font.ttf": "c",
    },
  });

  try {
    await linkAssets({
      rootPath: ".",
      platforms: {
        android: {
          enabled: true,
          assets: ["assets"],
        },
        ios: {
          enabled: false,
          assets: [],
        },
      },
    });

    const manifest = JSON.parse(stubs.getFile(
      "/android/link-assets-manifest.json",
    ));

    assertEquals(
      manifest,
      {
        migIndex: 1,
        data: [
          {
            path: "assets/sound.mp3",
            sha1: "86f7e437faa5a7fce15d1ddcb9eaeaea377667b8",
          },
          {
            path: "assets/image.png",
            sha1: "e9d71f5ee7c92d6dc9e92ffdad17b8bd49418f98",
          },
          {
            path: "assets/font.ttf",
            sha1: "84a516841ba77a5b4648de2cd0dfcb30ea46dbb4",
          },
        ],
      },
    );
    stubs.assertFileCopied(
      "/assets/sound.mp3",
      "/android/app/src/main/res/raw/sound.mp3",
    );
    stubs.assertFileCopied(
      "/assets/image.png",
      "/android/app/src/main/res/drawable/image.png",
    );
    stubs.assertFileCopied(
      "/assets/font.ttf",
      "/android/app/src/main/assets/fonts/font.ttf",
    );

    stubs.removeFile("/assets/sound.mp3");
    await linkAssets({
      rootPath: ".",
      platforms: {
        android: {
          enabled: true,
          assets: ["assets"],
        },
        ios: {
          enabled: false,
          assets: [],
        },
      },
    });
    const manifestAfterRemove = JSON.parse(stubs.getFile(
      "/android/link-assets-manifest.json",
    ));

    assertEquals(
      manifestAfterRemove,
      {
        migIndex: 1,
        data: [
          {
            path: "assets/image.png",
            sha1: "e9d71f5ee7c92d6dc9e92ffdad17b8bd49418f98",
          },
          {
            path: "assets/font.ttf",
            sha1: "84a516841ba77a5b4648de2cd0dfcb30ea46dbb4",
          },
        ],
      },
    );
    stubs.assertFileNotExists(
      "/android/app/src/main/res/raw/sound.mp3",
    );
  } finally {
    stubs.restore();
  }
});

Deno.test("linkAssets test manifest creation and files handling for iOS", async () => {
  const stubs = setupLinkAssetsMocks({
    "ios": {
      "HelloWorld.xcodeproj": {
        "project.pbxproj": testProjectPbxproj,
      },
      "HelloWorld": {
        "Info.plist": testInfoPlist,
      },
    },
    "assets": {
      "sound.mp3": "a",
      "image.png": "b",
      // "font.ttf": "c",
    },
  });

  try {
    await linkAssets({
      rootPath: ".",
      platforms: {
        android: {
          enabled: false,
          assets: [],
        },
        ios: {
          enabled: true,
          assets: ["assets"],
        },
      },
    });

    const manifest = JSON.parse(stubs.getFile(
      "/ios/link-assets-manifest.json",
    ));

    assertEquals(
      manifest,
      {
        migIndex: 1,
        data: [
          {
            path: "assets/sound.mp3",
            sha1: "86f7e437faa5a7fce15d1ddcb9eaeaea377667b8",
          },
          {
            path: "assets/image.png",
            sha1: "e9d71f5ee7c92d6dc9e92ffdad17b8bd49418f98",
          },
        ],
      },
    );
    const newTestProjectPbxproj = stubs.getFile(
      "/ios/HelloWorld.xcodeproj/project.pbxproj",
    );
    const newTestInfoPlist = stubs.getFile(
      "/ios/HelloWorld/Info.plist",
    );

    assertStringIncludes(
      newTestProjectPbxproj,
      "../assets/sound.mp3",
    );
    assertStringIncludes(
      newTestProjectPbxproj,
      "../assets/image.png",
    );
    assertEquals(
      testInfoPlist,
      newTestInfoPlist,
    );
  } finally {
    stubs.restore();
  }
});

Deno.test("linkAssets test manifest creation and files handling for iOS with a font", async () => {
  const stubs = setupLinkAssetsMocks({
    "ios": {
      "HelloWorld.xcodeproj": {
        "project.pbxproj": testProjectPbxproj,
      },
      "HelloWorld": {
        "Info.plist": testInfoPlist,
      },
    },
    "assets": {
      "font.ttf": "c",
    },
  });

  try {
    await linkAssets({
      rootPath: ".",
      platforms: {
        android: {
          enabled: false,
          assets: [],
        },
        ios: {
          enabled: true,
          assets: ["assets"],
        },
      },
    });

    const manifest = JSON.parse(stubs.getFile(
      "/ios/link-assets-manifest.json",
    ));

    assertEquals(
      manifest,
      {
        migIndex: 1,
        data: [
          {
            path: "assets/font.ttf",
            sha1: "84a516841ba77a5b4648de2cd0dfcb30ea46dbb4",
          },
        ],
      },
    );
    const newTestProjectPbxproj = stubs.getFile(
      "/ios/HelloWorld.xcodeproj/project.pbxproj",
    );
    const newTestInfoPlist = stubs.getFile(
      "/ios/HelloWorld/Info.plist",
    );

    assertStringIncludes(
      newTestProjectPbxproj,
      "../assets/font.ttf",
    );
    assertStringIncludes(
      newTestInfoPlist,
      "font.ttf",
    );
  } finally {
    stubs.restore();
  }
});
