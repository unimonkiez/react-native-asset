export type PBXFile = {
  basename: string;
  path: string;
  target?: string;
};

export type PBXProject = {
  parseSync(): PBXProject;
  writeSync(): string;
  pbxNativeTargetSection(): { [index: string]: unknown };
  getFirstProject(): { firstProject: { targets: { value: string }[] } };
  addResourceFile(
    filePath: string,
    options: { target: string },
  ): PBXFile | false;
  addToPbxResourcesBuildPhase(file: PBXFile): void;
  removeResourceFile(
    filePath: string,
    options: { target: string },
  ): PBXFile;
  hash: string;
};

export function project(pbxprojPath: string): PBXProject;

export function parse(content: string): string;
