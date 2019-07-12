const path = require('path');
const createGroupWithMessage = require('./createGroupWithMessage');

module.exports = function getResourceParams(project, config, asset) {
  const groupPath = config.target ? `Clients/${config.target}/Resources` : 'Resources';
  const { key } = createGroupWithMessage(project, groupPath);

  return [path.relative(config.sourceDir, asset), {
    target: config.target
      ? project.findTargetKey(config.target)
      : project.getFirstTarget().uuid,
  },
  config.target ? key : undefined,
  ];
};
