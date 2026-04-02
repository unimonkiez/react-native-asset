import type { Project } from "./xcode.d.ts";

/**
 * Get an array containing the UUID of each target in the project
 */
export function getTargetUUIDs(project: Project): string[] {
  return project.getFirstProject().firstProject.targets.map((t) => t.value);
}

/**
 * Get a target by UUID
 */
export function getTargetByUUID(project: Project, uuid: string) {
  return project.pbxNativeTargetSection()[uuid];
}
