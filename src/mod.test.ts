import { assertEquals } from "@std/assert";
import * as path from "@std/path";
import { stub } from "@std/testing/mock";
import { linkAssets } from "@unimonkiez/react-native-asset";

// --- INFRASTRUCTURE: Mocking Deno I/O Functions ---

/**
 * Maps full file paths to their content for mocking Deno.readFile.
 * Content can be a string (which will be converted to Uint8Array) or an existing Uint8Array.
 */
type MockFileContentMap = {
  [filePath: string]: string | Uint8Array<ArrayBuffer>;
};

/**
 * Helper function to set up stubs for Deno I/O operations for `linkAssets` testing.
 */
const setupLinkAssetsMocks = (
  mockFileSystem: MockFileContentMap,
) => {
  const cwdStub = stub(Deno, "cwd", () => path.SEPARATOR);

  const lstatStub = stub(Deno, "lstat", (p) => {
    const isFile = p.toString().indexOf(".") !== -1;
    return Promise.resolve({
      isFile,
      isDirectory: !isFile,
      isSymlink: false,
      size: 0,
      mtime: null,
      atime: null,
      birthtime: null,
      ctime: null,
      dev: 0,
      ino: null,
      mode: null,
      nlink: null,
      uid: null,
      gid: null,
      rdev: null,
      blksize: null,
      blocks: null,
      isBlockDevice: null,
      isCharDevice: null,
      isFifo: null,
      isSocket: null,
    });
  });

  const readDirStub = stub(
    Deno,
    "readDir",
    (dirPath: string | URL) => {
      const targetDir = dirPath.toString();
      const entries: Deno.DirEntry[] = [];
      const immediateChildrenNames = new Set<string>();

      // 1. Find all immediate children (files and subdirectories)
      for (const filePath of Object.keys(mockFileSystem)) {
        // Normalize the path for consistent comparison
        const normalizedFilePath = path.normalize(filePath);
        const relativePath = path.relative(targetDir, normalizedFilePath);

        // Skip paths that are the same as or outside the targetDir
        if (relativePath.startsWith("..") || relativePath === "") {
          continue;
        }

        // Get the first part of the relative path, which is the child's name
        const parts = relativePath.split(path.SEPARATOR);
        const childName = parts[0];

        if (immediateChildrenNames.has(childName)) {
          continue; // Already processed this child
        }

        // Check if this child is a file or a directory
        if (parts.length === 1) {
          // It's a file directly inside the targetDir
          entries.push({
            name: childName,
            isFile: true,
            isDirectory: false,
            isSymlink: false,
          });
        } else {
          // It's a directory (because the file is deeper)
          entries.push({
            name: childName,
            isFile: false,
            isDirectory: true,
            isSymlink: false,
          });
        }

        immediateChildrenNames.add(childName);
      }

      // Simulate an AsyncIterable<Deno.DirEntry>
      return {
        [Symbol.asyncIterator]: () => {
          let index = 0;
          return {
            next: () => {
              if (index < entries.length) {
                return Promise.resolve({
                  value: entries[index++],
                  done: false,
                });
              }
              return Promise.resolve({ value: undefined, done: true });
            },
          };
        },
      };
    },
  );

  // 2. Mock Deno.readFile to simulate reading the content of assets (as Uint8Array)
  const readFileStub = stub(
    Deno,
    "readFile",
    (filePath: string | URL) => {
      const pathStr = filePath.toString();
      const content = mockFileSystem[pathStr];

      if (content !== undefined) {
        if (typeof content === "string") {
          return Promise.resolve(new TextEncoder().encode(content));
        }
        return Promise.resolve(content); // Already Uint8Array
      }
      return Promise.reject(
        new Deno.errors.NotFound(`Mock: File ${pathStr} not found.`),
      );
    },
  );

  // 3. Mock Deno.writeTextFile to capture the manifest output
  const writeTextFileStub = stub(
    Deno,
    "writeTextFile",
    (..._args: unknown[]) => Promise.resolve(),
  );

  return { readDirStub, readFileStub, writeTextFileStub, cwdStub, lstatStub };
};

/**
 * Helper function to restore all Deno I/O stubs.
 */
const restoreMocks = (stubs: ReturnType<typeof setupLinkAssetsMocks>): void => {
  stubs.readDirStub.restore();
  stubs.readFileStub.restore();
  stubs.writeTextFileStub.restore();
  stubs.cwdStub.restore();
  stubs.lstatStub.restore();
};

/**
 * Helper function to extract and parse the manifest content from the write stub.
 */
const getFile = (
  writeTextFileStub: ReturnType<
    typeof setupLinkAssetsMocks
  >["writeTextFileStub"],
  p: string,
): string => {
  const theCall = writeTextFileStub.calls.find((call) =>
    call.args[0].toString().includes(p)
  );

  if (!theCall) {
    throw new Error(
      `File not found: ${p}`,
    );
  }

  const content = theCall.args[1] as string;
  return content;
};

// --- TEST CASES ---

Deno.test("linkAssets test manifest creation with sound.mp3 and image.png", async () => {
  const stubs = setupLinkAssetsMocks({
    "/assets/sound.mp3": "a",
    "/assets/image.png": "b",
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

    const iosManifest = JSON.parse(getFile(
      stubs.writeTextFileStub,
      "/ios/manifest.json",
    ));

    assertEquals(
      iosManifest.count,
      2,
      "iOS manifest should have 'count' property equal to 2.",
    );
  } finally {
    restoreMocks(stubs);
  }
});
