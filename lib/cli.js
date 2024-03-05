#!/usr/bin/env node
const path = require('path');
const linkAssets = require('./index');
const getCliArgs = require('./cli-args');

const options = {
  assets: {
    cliParams: ['-a', '--assets'],
    type: 'array',
  },
  iosAssets: {
    cliParams: ['-ios-a', '--ios-assets'],
    type: 'array',
  },
  androidAssets: {
    cliParams: ['-android-a', '--android-assets'],
    type: 'array',
  },
  macosAssets: {
    cliParams: ['-macos-a', '--macos-assets'],
    type: 'array',
  },
  rootPath: {
    cliParams: ['-p', '--path'],
    type: 'value',
    default: process.cwd(),
  },
  noUnlink: {
    cliParams: ['-n-u', '--no-unlink'],
    type: 'bool',
  },
};

const cliArgs = getCliArgs(
  process.argv, // .slice(2),
  options,
);

const {
  rootPath,
  noUnlink,
  assets,
  iosAssets,
  androidAssets,
  macosAssets,
} = cliArgs;

// Using dynamic require for config file, is written in js
// eslint-disable-next-line import/no-dynamic-require
const reactNativeConfig = require(path.resolve(rootPath, 'react-native.config.js'));
const mutualAssets = (reactNativeConfig.assets || []).concat(assets || []);
const mergediOSAssets = mutualAssets.concat(
  reactNativeConfig.iosAssets || [],
  iosAssets || [],
);
const mergedAndroidAssets = mutualAssets.concat(
  reactNativeConfig.androidAssets || [],
  androidAssets || [],
);
const mergedMacOSAssets = mutualAssets.concat(
  reactNativeConfig.macosAssets || [],
  macosAssets || [],
);

linkAssets({
  rootPath,
  shouldUnlink: !noUnlink,
  platforms: {
    ios: {
      enabled: !(androidAssets && !iosAssets), // when given android but not ios, ok if both not
      assets: mergediOSAssets,
    },
    android: {
      enabled: !(iosAssets && !androidAssets), // when given ios but not android, ok if both not
      assets: mergedAndroidAssets,
    },
    macos: {
      enabled: !(macosAssets && !iosAssets), // when given macos but not ios, ok if both not
      assets: mergedMacOSAssets,
    },
  },
});
