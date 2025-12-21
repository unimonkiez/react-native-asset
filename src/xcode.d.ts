declare module "xcode" {
  export function project(pbxprojPath: string): {
    parseSync(): any;
    writeSync(): string;
    getFirstTarget(): { uuid: string };
    addResourceFile(
      filePath: string,
      options: { target: string },
    ): { basename: string };
    removeResourceFile(
      filePath: string,
      options: { target: string },
    ): { basename: string };
    hash: string;
  };
}
declare module "xcode/lib/parser/pbxproj.js" {
  export function parse(content: string): any;
}
