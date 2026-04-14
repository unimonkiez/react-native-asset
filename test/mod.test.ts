import { assertEquals, assertStringIncludes } from "@std/assert";
import { linkAssets } from "@unimonkiez/react-native-asset";
import { setupLinkAssetsMocks } from "./test-tools.ts";
import testProjectPbxproj from "./test_project.pbxproj" with { type: "text" };
import testProjectMultiTargetPbxproj from "./test_project_multi_target.pbxproj" with {
  type: "text",
};
import testProjectUnlinkedTargetPbxproj from "./test_project_unlinked_target.pbxproj" with {
  type: "text",
};
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
            path: "assets/font.ttf",
            sha1: "84a516841ba77a5b4648de2cd0dfcb30ea46dbb4",
          },
          {
            path: "assets/image.png",
            sha1: "e9d71f5ee7c92d6dc9e92ffdad17b8bd49418f98",
          },
          {
            path: "assets/sound.mp3",
            sha1: "86f7e437faa5a7fce15d1ddcb9eaeaea377667b8",
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

    await stubs.removeFile("/assets/sound.mp3");
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
            path: "assets/font.ttf",
            sha1: "84a516841ba77a5b4648de2cd0dfcb30ea46dbb4",
          },
          {
            path: "assets/image.png",
            sha1: "e9d71f5ee7c92d6dc9e92ffdad17b8bd49418f98",
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
            path: "assets/image.png",
            sha1: "e9d71f5ee7c92d6dc9e92ffdad17b8bd49418f98",
          },
          {
            path: "assets/sound.mp3",
            sha1: "86f7e437faa5a7fce15d1ddcb9eaeaea377667b8",
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

Deno.test("linkAssets links fonts to all iOS targets in the project", async () => {
  const stubs = setupLinkAssetsMocks({
    "ios": {
      "HelloWorld.xcodeproj": {
        "project.pbxproj": testProjectMultiTargetPbxproj,
      },
      "HelloWorld": {
        "Info.plist": testInfoPlist,
      },
      "HelloWorldWidget": {
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
    const newTestInfoPlistMainTarget = stubs.getFile(
      "/ios/HelloWorld/Info.plist",
    );
    const newTestInfoPlistWidgetTarget = stubs.getFile(
      "/ios/HelloWorldWidget/Info.plist",
    );

    // Font should be linked in the pbxproj
    assertStringIncludes(
      newTestProjectPbxproj,
      "../assets/font.ttf",
    );

    const resourcesBuildPhase = newTestProjectPbxproj.slice(
      newTestProjectPbxproj.indexOf(
        "/* Begin PBXResourcesBuildPhase section */",
      ),
      newTestProjectPbxproj.indexOf(
        "/* End PBXResourcesBuildPhase section */",
      ),
    );

    // Font should be in the resources build phase twice (once for each target)
    assertEquals(resourcesBuildPhase.split("font.ttf").length - 1, 2);

    // Font should be added to UIAppFonts in BOTH Info.plist files
    assertStringIncludes(
      newTestInfoPlistMainTarget,
      "font.ttf",
    );
    assertStringIncludes(
      newTestInfoPlistWidgetTarget,
      "font.ttf",
    );

    // Remove font asset
    await stubs.removeFile("/assets/font.ttf");
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

    const manifestAfterRemove = JSON.parse(stubs.getFile(
      "/ios/link-assets-manifest.json",
    ));

    assertEquals(
      manifestAfterRemove,
      {
        migIndex: 1,
        data: [],
      },
    );

    const newTestProjectPbxprojAfterRemove = stubs.getFile(
      "/ios/HelloWorld.xcodeproj/project.pbxproj",
    );

    // Font should NOT be linked in the pbxproj
    assertEquals(
      newTestProjectPbxprojAfterRemove.indexOf("../assets/font.ttf"),
      -1,
    );

    const resourcesBuildPhaseAfterRemove = newTestProjectPbxprojAfterRemove
      .slice(
        newTestProjectPbxprojAfterRemove.indexOf(
          "/* Begin PBXResourcesBuildPhase section */",
        ),
        newTestProjectPbxprojAfterRemove.indexOf(
          "/* End PBXResourcesBuildPhase section */",
        ),
      );

    // Font should NOT be in the resources build phase
    assertEquals(resourcesBuildPhaseAfterRemove.indexOf("font.ttf"), -1);

    const newTestInfoPlistMainTargetAfterRemove = stubs.getFile(
      "/ios/HelloWorld/Info.plist",
    );
    const newTestInfoPlistWidgetTargetAfterRemove = stubs.getFile(
      "/ios/HelloWorldWidget/Info.plist",
    );

    // Font should NOT be in UIAppFonts in EITHER Info.plist file
    assertEquals(newTestInfoPlistMainTargetAfterRemove.indexOf("font.ttf"), -1);
    assertEquals(
      newTestInfoPlistWidgetTargetAfterRemove.indexOf("font.ttf"),
      -1,
    );
  } finally {
    stubs.restore();
  }
});

Deno.test("linkAssets recovers from partially linked iOS targets in the project", async () => {
  const stubs = setupLinkAssetsMocks({
    "ios": {
      "HelloWorld.xcodeproj": {
        "project.pbxproj": testProjectUnlinkedTargetPbxproj,
      },
      "HelloWorld": {
        "Info.plist": testInfoPlist,
      },
      "HelloWorldWidget": {
        "Info.plist": testInfoPlist,
      },
    },
    "assets": {
      "sound.mp3": "a",
      "image.png": "b",
      "font.ttf": "c",
    },
  });

  try {
    const testProjectPbxproj = stubs.getFile(
      "/ios/HelloWorld.xcodeproj/project.pbxproj",
    );
    const initialResourcesBuildPhase = testProjectPbxproj.slice(
      testProjectPbxproj.indexOf(
        "/* Begin PBXResourcesBuildPhase section */",
      ),
      testProjectPbxproj.indexOf(
        "/* End PBXResourcesBuildPhase section */",
      ),
    );
    const numberOfTargets =
      initialResourcesBuildPhase.split("/* Resources */").length - 1;

    // Verify the test is set up correctly (2 targets, only one of which is linked)
    assertEquals(numberOfTargets, 2);
    assertEquals(initialResourcesBuildPhase.split("sound.mp3").length - 1, 1);
    assertEquals(initialResourcesBuildPhase.split("image.png").length - 1, 1);
    assertEquals(initialResourcesBuildPhase.split("font.ttf").length - 1, 1);

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

    const newTestProjectPbxproj = stubs.getFile(
      "/ios/HelloWorld.xcodeproj/project.pbxproj",
    );

    // Assets should still be linked in the pbxproj
    assertStringIncludes(newTestProjectPbxproj, "../assets/sound.mp3");
    assertStringIncludes(newTestProjectPbxproj, "../assets/image.png");
    assertStringIncludes(newTestProjectPbxproj, "../assets/font.ttf");

    const resourcesBuildPhase = newTestProjectPbxproj.slice(
      newTestProjectPbxproj.indexOf(
        "/* Begin PBXResourcesBuildPhase section */",
      ),
      newTestProjectPbxproj.indexOf(
        "/* End PBXResourcesBuildPhase section */",
      ),
    );

    // Assets should be in the resources build phase twice (once for each target)
    assertEquals(resourcesBuildPhase.split("sound.mp3").length - 1, 2);
    assertEquals(resourcesBuildPhase.split("image.png").length - 1, 2);
    assertEquals(resourcesBuildPhase.split("font.ttf").length - 1, 2);
  } finally {
    stubs.restore();
  }
});
