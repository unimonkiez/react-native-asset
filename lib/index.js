const fs = require('fs');
const path = require('path');
const copyAssetsIos = require('./copy-assets/ios');
const cleanAssetsIos = require('./clean-assets/ios');
const copyAssetsAndroid = require('./copy-assets/android');
const cleanAssetsAndroid = require('./clean-assets/android');
const getManifest = require('./get-manifest');
const log = require('npmlog');
const getConfig = require('./get-config');

const cwd = process.cwd();

const unl = (val, otherwise) => ((val !== undefined) ? val : otherwise);

const filesToIgnore = [
  '.DS_Store',
  'Thumbs.db',
];

const linkPlatform = ({
  rootPath,
  shouldUnlink,
}) => ({
  name,
  manifest,
  config,
  linkOptionsPerExt,
  otherLinkOptions,
  cleanAssets,
  copyAssets,
  assets: assetsPaths,
}) => {
  let prevAssets = [];
  try {
    prevAssets = manifest.read();
  } catch (e) {
    // ok, manifest not found meaning no need to clean
  }

  let assets = [];

  const loadAsset = (assetMightNotAbsolute) => {
    let asset;
    if (path.isAbsolute(assetMightNotAbsolute)) {
      asset = assetMightNotAbsolute;
    } else {
      asset = path.resolve(rootPath, assetMightNotAbsolute);
    }

    const stats = fs.lstatSync(asset);
    if (stats.isDirectory()) {
      fs.readdirSync(asset)
        .map(file => path.resolve(asset, file))
        .forEach(loadAsset);
    } else {
      assets = assets.concat(asset);
    }
  };
  assetsPaths.forEach(loadAsset);

  Object.keys(linkOptionsPerExt).forEach((fileExt) => {
    const [
      prevAssetsWithExt,
      assetsWithExt,
    ] = [
      prevAssets,
      assets,
    ].map(files => files
      .filter(asset => path.extname(asset) === `.${fileExt}`)
      .filter(asset => filesToIgnore.indexOf(path.basename(asset)) !== -1));

    if (shouldUnlink && prevAssetsWithExt.length > 0) {
      log.info(`Cleaning previously linked ${fileExt} assets from ${name} project`);
      cleanAssets(prevAssetsWithExt, config, linkOptionsPerExt[fileExt]);
    }

    if (assetsWithExt.length > 0) {
      log.info(`Linking ${fileExt} assets to ${name} project`);
      copyAssets(assetsWithExt, config, linkOptionsPerExt[fileExt]);
    }
  });

  const [
    prevAssetsWithOtherExt,
    assetsWithOtherExt,
  ] = [
    prevAssets,
    assets,
  ].map(files => (
    files
      .filter(asset => Object.keys(linkOptionsPerExt).indexOf(path.extname(asset).substr(1)) === -1)
      .filter(asset => filesToIgnore.indexOf(path.basename(asset)) !== -1)
  ));

  if (shouldUnlink && prevAssetsWithOtherExt.length > 0) {
    log.info(`Cleaning previously linked custom assets from ${name} project`);
    cleanAssets(prevAssetsWithOtherExt, config, otherLinkOptions);
  }

  if (assetsWithOtherExt.length > 0) {
    log.info(`Linking custom assets to ${name} project`);
    copyAssets(assetsWithOtherExt, config, otherLinkOptions);
  }

  manifest.write(assets.map(asset => path.basename(asset)));
};

module.exports = ({
  rootPath: rootPathMightNotAbsolute = cwd,
  shouldUnlink = true,
  platforms: mergePlatforms,
}) => {
  if (!fs.lstatSync(rootPathMightNotAbsolute).isDirectory()) {
    throw new Error(`'rootPath' must be a valid path, got ${rootPathMightNotAbsolute}`);
  }
  if (typeof shouldUnlink !== 'boolean') {
    throw new Error(`'shouldUnlink' must be a boolean, got ${typeof shouldUnlink}`);
  }
  if ([mergePlatforms.ios, mergePlatforms.android].find(({ assets }) => !Array.isArray(assets))) {
    throw new Error('\'platforms["platform"].assets\' must be an array');
  }

  const rootPath = path.isAbsolute(rootPathMightNotAbsolute) ?
    rootPathMightNotAbsolute : path.resolve(cwd, rootPathMightNotAbsolute);

  const platforms = {
    ios: {
      enabled: unl(mergePlatforms.ios.enabled, true),
      assets: mergePlatforms.ios.assets,
    },
    android: {
      enabled: unl(mergePlatforms.android.enabled, true),
      assets: mergePlatforms.android.assets,
    },
  };

  const config = getConfig({ rootPath });
  const {
    android: {
      path: androidPath,
    },
    ios: {
      path: iosPath,
    },
  } = config;

  const linkOptionsPerExt = {
    ttf: {
      android: {
        path: path.resolve(androidPath, 'app', 'src', 'main', 'assets', 'fonts'),
      },
      ios: {
        addFont: true,
      },
    },
    mp3: {
      android: {
        path: path.resolve(androidPath, 'app', 'src', 'main', 'res', 'raw'),
      },
      ios: {
        addFont: false,
      },
    },
  };

  const otherLinkOptions = {
    android: {
      path: path.resolve(androidPath, 'app', 'src', 'main', 'assets', 'custom'),
    },
    ios: {
      addFont: false,
    },
  };

  [
    {
      name: 'iOS',
      enabled: platforms.ios.enabled,
      assets: platforms.ios.assets,
      manifest: getManifest(iosPath),
      config: config.ios,
      cleanAssets: cleanAssetsIos,
      copyAssets: copyAssetsIos,
      linkOptionsPerExt: {
        ttf: linkOptionsPerExt.ttf.ios,
        mp3: linkOptionsPerExt.mp3.ios,
      },
      otherLinkOptions: otherLinkOptions.ios,
    },
    {
      name: 'Android',
      enabled: platforms.android.enabled,
      assets: platforms.android.assets,
      manifest: getManifest(androidPath),
      config: config.android,
      cleanAssets: cleanAssetsAndroid,
      copyAssets: copyAssetsAndroid,
      linkOptionsPerExt: {
        ttf: linkOptionsPerExt.ttf.android,
        mp3: linkOptionsPerExt.mp3.android,
      },
      otherLinkOptions: otherLinkOptions.android,
    },
  ]
    .filter(({ enabled, config: platformConfig }) => enabled && platformConfig.exists)
    .forEach(linkPlatform({ rootPath, shouldUnlink }));
};
