import { assertEquals } from "@std/assert/equals";
import * as path from "@std/path";
import { stub } from "@std/testing/mock";

// --- INFRASTRUCTURE: Mocking Deno I/O Functions ---
/**
 * Maps full file paths to their content for mocking Deno.readFile.
 * Content can be a string (which will be converted to Uint8Array) or an existing Uint8Array.
 */
type MockFileContentMap = {
  [filePath: string]: MockFileContentMap | string | Uint8Array<ArrayBuffer>;
};

enum InnerMockFileType {
  WrittenFile,
  CopiedFile,
  Directory,
}

type InnerMockFileSystemRecord =
  & { path: string }
  & ({
    type: InnerMockFileType.CopiedFile;
    copiedFrom: string;
  } | {
    type: InnerMockFileType.WrittenFile;
    content: string | Uint8Array<ArrayBuffer>;
  } | {
    type: InnerMockFileType.Directory;
    children: InnerMockFileSystemRecord[];
  });

type InnerMockFileContentMap = {
  type: InnerMockFileType.Directory;
  children: InnerMockFileSystemRecord[];
};

const mockFileSystemToInner = (
  x: MockFileContentMap,
): InnerMockFileContentMap => {
  return Object.keys(x).reduce(
    (obj, key) => {
      const value = x[key];
      if (typeof value === "string" || value instanceof Uint8Array) {
        return {
          ...obj,
          children: [...obj.children, {
            path: key,
            type: InnerMockFileType.WrittenFile,
            content: value,
          }],
        };
      }
      return {
        ...obj,
        children: [...obj.children, {
          ...mockFileSystemToInner(value),
          path: key,
        }],
      };
    },
    {
      type: InnerMockFileType.Directory,
      children: [],
    } as InnerMockFileContentMap,
  );
};

const getMockRecord = (
  x: InnerMockFileContentMap,
  p: string,
):
  | InnerMockFileSystemRecord
  | undefined => {
  if (p === path.SEPARATOR) {
    return { ...x, path: "" };
  }
  const pathParts = (p[0] === path.SEPARATOR ? p.substring(1) : p).split(
    path.SEPARATOR,
  );
  if (pathParts.length === 0) {
    return undefined;
  }
  let current = x as
    | InnerMockFileSystemRecord
    | undefined;
  for (const part of pathParts) {
    if (!current || current.type !== InnerMockFileType.Directory) {
      return current;
    }
    current = current.children.find((x) => x.path === part);
  }
  return current;
};

/**
 * Helper function to set up stubs for Deno I/O operations for `linkAssets` testing.
 */
export const setupLinkAssetsMocks = (
  mockFileSystem: MockFileContentMap,
) => {
  const innerMockFileSystem = mockFileSystemToInner(mockFileSystem);
  const removeStub = stub(Deno, "remove", (p: string | URL) => {
    const filePath = p.toString();
    const parentPath = path.dirname(filePath);
    const parent = getMockRecord(innerMockFileSystem, parentPath);
    if (!parent || parent.type !== InnerMockFileType.Directory) {
      return Promise.reject(
        new Deno.errors.NotFound(`Mock: Directory ${parentPath} not found.`),
      );
    }
    const fileIndex = parent.children.findIndex((x) =>
      x.path === path.basename(filePath)
    );
    if (fileIndex === -1) {
      return Promise.reject(
        new Deno.errors.NotFound(`Mock: File ${filePath} not found.`),
      );
    }
    parent.children.splice(fileIndex, 1);
    return Promise.resolve();
  });
  const cwdStub = stub(Deno, "cwd", () => path.SEPARATOR);
  const mkdirStub = stub(
    Deno,
    "mkdir",
    (p: string | URL, options?: Deno.MkdirOptions) => {
      const dirPath = p.toString();

      if (!options?.recursive) {
        const parentPath = path.dirname(dirPath);
        const parent = getMockRecord(innerMockFileSystem, parentPath);
        if (!parent || parent.type !== InnerMockFileType.Directory) {
          return Promise.reject(
            new Deno.errors.NotFound(
              `Mock: Parent directory ${parentPath} not found.`,
            ),
          );
        }
        parent.children.push({
          path: path.basename(dirPath),
          type: InnerMockFileType.Directory,
          children: [],
        });
        return Promise.resolve();
      }

      const pathParts =
        (dirPath[0] === path.SEPARATOR ? dirPath.substring(1) : dirPath).split(
          path.SEPARATOR,
        );

      let lastExistingParent = innerMockFileSystem as {
        type: InnerMockFileType.Directory;
        children: InnerMockFileSystemRecord[];
      };
      for (let i = 0; i < pathParts.length; i++) {
        const subPath = `${path.SEPARATOR}${
          pathParts.slice(0, i + 1).join(
            path.SEPARATOR,
          )
        }`;
        const dirRecord = getMockRecord(innerMockFileSystem, subPath);
        if (!dirRecord) {
          const newDirRecord = {
            path: path.basename(subPath),
            type: InnerMockFileType.Directory as const,
            children: [],
          };
          lastExistingParent.children.push(newDirRecord);
          lastExistingParent = newDirRecord;
          continue;
        }
        if (dirRecord.type !== InnerMockFileType.Directory) {
          return Promise.reject(
            new Deno.errors.InvalidData(
              `Mock: Path ${subPath} already exists and is not a directory.`,
            ),
          );
        }
        lastExistingParent = dirRecord;
      }

      return Promise.resolve();
    },
  );
  const copyFileStub = stub(
    Deno,
    "copyFile",
    (from: string | URL, to: string | URL) => {
      const fromPath = from.toString();
      const toPath = to.toString();
      const fromRecord = getMockRecord(innerMockFileSystem, fromPath);
      if (
        !fromRecord ||
        fromRecord.type === InnerMockFileType.Directory
      ) {
        return Promise.reject(
          new Deno.errors.NotFound(`Mock: File ${fromPath} not found.`),
        );
      }
      const toDir = path.dirname(toPath);
      const toDirRecord = getMockRecord(innerMockFileSystem, toDir);
      if (!toDirRecord || toDirRecord.type !== InnerMockFileType.Directory) {
        return Promise.reject(
          new Deno.errors.NotFound(`Mock: Directory ${toDir} not found.`),
        );
      }
      const newFile: InnerMockFileSystemRecord = {
        path: path.basename(toPath),
        type: InnerMockFileType.CopiedFile,
        copiedFrom: fromPath,
      };
      toDirRecord.children.push(newFile);
      return Promise.resolve();
    },
  );

  const lstatStub = stub(Deno, "lstat", (p) => {
    const f = p.toString();
    const defaultFile = {
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
    };
    const fAbsolute = path.isAbsolute(f) ? f : path.resolve(Deno.cwd(), f);
    const mockRecord = getMockRecord(innerMockFileSystem, fAbsolute);
    if (!mockRecord) {
      return Promise.reject(
        new Deno.errors.NotFound(
          `Mock: File or directory ${fAbsolute} not found.`,
        ),
      );
    }
    const isDirectory = mockRecord.type === InnerMockFileType.Directory;
    return Promise.resolve({
      ...defaultFile,
      isFile: !isDirectory,
      isDirectory,
    });
  });

  const readDirStub = stub(
    Deno,
    "readDir",
    (dirPath: string | URL) => {
      const f = dirPath.toString();
      const mockDir = getMockRecord(innerMockFileSystem, f);
      if (!mockDir || mockDir.type !== InnerMockFileType.Directory) {
        throw new Deno.errors.NotFound(`Mock: Directory ${f} not found.`);
      }

      const entries = mockDir.children.map((child) => {
        const isDirectory = child.type === InnerMockFileType.Directory;
        return {
          name: child.path,
          isFile: !isDirectory,
          isDirectory,
          isSymlink: false,
        };
      });

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

  const readFileStub = stub(
    Deno,
    "readFile",
    (filePath: string | URL) => {
      const p = filePath.toString();
      const mockFile = getMockRecord(innerMockFileSystem, p);
      if (
        !mockFile ||
        mockFile.type === InnerMockFileType.Directory
      ) {
        return Promise.reject(
          new Deno.errors.NotFound(`Mock: File ${p} not found.`),
        );
      }
      let content: string | Uint8Array<ArrayBuffer>;
      if (mockFile.type === InnerMockFileType.CopiedFile) {
        const copiedFromRecord = getMockRecord(
          innerMockFileSystem,
          mockFile.copiedFrom,
        );
        if (
          !copiedFromRecord ||
          copiedFromRecord.type !== InnerMockFileType.WrittenFile
        ) {
          return Promise.reject(
            new Deno.errors.NotFound(
              `Mock: File ${mockFile.copiedFrom} not found.`,
            ),
          );
        }
        content = copiedFromRecord.content;
      } else {
        content = mockFile.content;
      }
      if (typeof content === "string") {
        return Promise.resolve(new TextEncoder().encode(content));
      }
      return Promise.resolve(content);
    },
  );

  const writeTextFileStub = stub(
    Deno,
    "writeTextFile",
    (filePath: string | URL, content: string | ReadableStream<string>) => {
      const p = filePath.toString();
      if (content instanceof ReadableStream) {
        return Promise.reject(
          new Deno.errors.InvalidData(
            `Mock: Streaming write not supported for ${p}.`,
          ),
        );
      }
      const existingRecord = getMockRecord(
        innerMockFileSystem,
        p,
      );
      if (existingRecord) {
        if (existingRecord.type === InnerMockFileType.Directory) {
          return Promise.reject(
            new Deno.errors.InvalidData(
              `Mock: Cannot write to ${p} because it is a directory.`,
            ),
          );
        }
        existingRecord.type = InnerMockFileType.WrittenFile;
        (existingRecord as InnerMockFileSystemRecord & {
          type: InnerMockFileType.WrittenFile;
        }).content = content;
      } else {
        // Create new file
        const pathParts = (p[0] === path.SEPARATOR ? p.substring(1) : p).split(
          path.SEPARATOR,
        );
        const fileName = pathParts.pop()!;
        const dirPath = `${path.SEPARATOR}${pathParts.join(path.SEPARATOR)}`;
        const dir = getMockRecord(innerMockFileSystem, dirPath);
        if (!dir || dir.type !== InnerMockFileType.Directory) {
          return Promise.reject(
            new Deno.errors.NotFound(`Mock: Directory ${dirPath} not found.`),
          );
        }
        const newFile: InnerMockFileSystemRecord = {
          path: fileName,
          type: InnerMockFileType.WrittenFile,
          content,
        };
        dir.children.push(newFile);
      }
      return Promise.resolve();
    },
  );

  const restore = () => {
    readDirStub.restore();
    readFileStub.restore();
    writeTextFileStub.restore();
    cwdStub.restore();
    lstatStub.restore();
    mkdirStub.restore();
    copyFileStub.restore();
    removeStub.restore();
  };

  return {
    restore,
    removeFile: (p: string) => Deno.remove(p),
    getFile: (p: string) => {
      const mockRecord = getMockRecord(innerMockFileSystem, p);
      if (
        !mockRecord ||
        mockRecord.type !== InnerMockFileType.WrittenFile
      ) {
        throw new Error(`File not found: ${p}`);
      }
      return typeof mockRecord.content === "string"
        ? mockRecord.content
        : new TextDecoder().decode(mockRecord.content);
    },
    assertFileCopied: (from: string, to: string) => {
      const mockRecord = getMockRecord(innerMockFileSystem, to);
      if (
        !mockRecord ||
        mockRecord.type !== InnerMockFileType.CopiedFile
      ) {
        throw new Error(`File not found: ${to}`);
      }
      assertEquals(from, mockRecord.copiedFrom);
    },
    assertFileNotExists: (from: string) => {
      const mockRecord = getMockRecord(innerMockFileSystem, from);
      if (
        mockRecord
      ) {
        throw new Error(`File found: ${from}`);
      }
    },
  };
};
