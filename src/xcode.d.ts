declare module "xcode" {
  type Project = {
    parseSync(): Project;
    writeSync(): string;
    pbxNativeTargetSection(): { [index: string]: unknown };
    getFirstProject(): { firstProject: { targets: { value: string }[] } };
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
  export function project(pbxprojPath: string): Project;
}
declare module "xcode/lib/parser/pbxproj.js" {
  export function parse(content: string): string;
}
