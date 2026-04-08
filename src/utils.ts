import type { PBXProject } from "./xcode.d.ts";

/**
 * Get an array containing the UUID of each target in the project
 */
export function getTargetUUIDs(project: PBXProject): string[] {
  return project.getFirstProject().firstProject.targets.map((t) => t.value);
}

/**
 * Get a target by UUID
 */
export function getTargetByUUID(project: PBXProject, uuid: string) {
  return project.pbxNativeTargetSection()[uuid];
}
