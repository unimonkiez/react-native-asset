#!/usr/bin/env node
const fs = require('fs-extra');
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
  rootPath: {
    cliParams: ['-p', '--path'],
    type: 'value',
    default: process.cwd(),
  },
  noUnlink: {
    cliParams: ['-n-u', '--no-unlink'],
    type: 'bool',
  },
  flavor: {
    cliParams: ['-f', '--flavor'],
    type: 'value',
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
  flavor,
} = cliArgs;

const packageJson = fs.readJsonSync(path.resolve(rootPath, 'package.json'));
const packageJsonAssets = (packageJson.rnpm && packageJson.rnpm.assets) || [];
const mutualAssets = packageJsonAssets.concat(assets !== undefined ? assets : []);

linkAssets({
  rootPath,
  shouldUnlink: !noUnlink,
  platforms: {
    ios: {
      enabled: !(androidAssets && !iosAssets), // when given android but not ios, ok if both not
      assets: iosAssets || mutualAssets,
    },
    android: {
      enabled: !(iosAssets && !androidAssets), // when given ios but not android, ok if both not
      assets: androidAssets || mutualAssets,
    },
  },
  flavor,
});
