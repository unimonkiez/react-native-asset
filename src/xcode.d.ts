export type PBXFile = {
  basename: string;
  path: string;
  target?: string;
  uuid: string;
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
  addToPbxBuildFileSection(file: PBXFile): void;
  addToPbxResourcesBuildPhase(file: PBXFile): void;
  removeResourceFile(
    filePath: string,
    options: { target: string },
  ): PBXFile;
  generateUuid(): string;
  hash: string;
};

export function project(pbxprojPath: string): PBXProject;

export function parse(content: string): string;
