module.exports = (args, options) => {
  const knownCliParams = Object.keys(options)
    .reduce((arr, k) => arr.concat(options[k].cliParams), []);
  const params = {};

  Object.keys(options).forEach((paramName) => {
    const { type, cliParams, default: defaultValue } = options[paramName];

    let value = defaultValue;
    switch (type) {
      case 'array': {
        const paramIndex = args.findIndex(arg => cliParams.indexOf(arg) !== -1);
        if (paramIndex !== -1) {
          value = [];
          let index = 0;
          let nextArg = args[paramIndex + 1 + index];
          while (nextArg !== undefined && knownCliParams.indexOf(nextArg) === -1) {
            value = value.concat(nextArg);
            index += 1;
            nextArg = args[paramIndex + 1 + index];
          }
        }
        break;
      }
      case 'value': {
        const paramIndex = args.findIndex(arg => cliParams.indexOf(arg) !== -1);
        if (paramIndex !== -1) {
          value = args[paramIndex + 1];
        }
        break;
      }
      case 'bool': {
        value = args.find(arg => cliParams.indexOf(arg) !== -1) !== undefined;
        break;
      }
      default:
    }

    if (value !== undefined) {
      params[paramName] = value;
    }
  });

  return params;
};
