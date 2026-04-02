export type Project = {
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

export function parse(content: string): string;
