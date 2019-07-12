module.exports = function getTargetByName(project, targetName) {
  return project.pbxTargetByName(targetName) || project.getFirstTarget().firstTarget;
};
