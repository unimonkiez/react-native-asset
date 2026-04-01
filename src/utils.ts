/// <reference types="./xcode.d.ts" />
import type xcode from "xcode";

/**
 * Get an array containing the UUID of each target in the project
 */
export function getTargetUUIDs(project: xcode.Project): string[] {
  return project.getFirstProject().firstProject.targets.map((t) => t.value);
}

/**
 * Get a target by UUID
 */
export function getTargetByUUID(project: xcode.Project, uuid: string) {
  return project.pbxNativeTargetSection()[uuid];
}
