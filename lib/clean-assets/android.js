const fs = require('fs-extra');
const path = require('path');
const OpenType = require('opentype.js');
const slugify = require('slugify');
const { fontTypes } = require('../helper');
const { XMLParser, XMLBuilder } = require('fast-xml-parser');
const { sync: globSync } = require('glob');

const REACT_FONT_MANAGER_JAVA_IMPORT = 'com.facebook.react.views.text.ReactFontManager';

function toArrayBuffer(buffer) {
  const arrayBuffer = new ArrayBuffer(buffer.length);
  const view = new Uint8Array(arrayBuffer);

  for (let i = 0; i < buffer.length; i += 1) {
    view[i] = buffer[i];
  }

  return arrayBuffer;
}

function normalizeString(str) {
  return slugify(str, { lower: true }).replaceAll('-', '_');
}

function getProjectFilePath(rootPath, name) {
  const filePath = globSync(path.join(rootPath, `android/app/src/main/java/**/${name}.java`))[0];
  return filePath;
}

function getFontFamily(fontFamily, preferredFontFamily) {
  const availableFontFamily = preferredFontFamily || fontFamily;
  return availableFontFamily.en || Object.values(availableFontFamily)[0];
}

function getFontResFolderPath(rootPath) {
  return path.join(rootPath, 'android/app/src/main/res/font');
}

function getXMLFontId(fontFileName) {
  return `@font/${path.basename(fontFileName, path.extname(fontFileName))}`;
}

function getAddCustomFontMethodCall(fontName, fontId) {
  return `ReactFontManager.getInstance().addCustomFont(this, "${fontName}", R.font.${fontId});`;
}

function removeLineFromJavaFile(javaFileData, stringToRemove) {
  const lines = javaFileData.split('\n');
  const updatedLines = lines.filter(line => !line.includes(stringToRemove));
  return updatedLines.join('\n');
}

module.exports = function cleanAssetsAndroid(assetFiles = [], config, options, fileExt) {
  // If the assets are not fonts, just remove them.
  if (!fontTypes.includes(fileExt)) {
    assetFiles.forEach(file => (
      fs.removeSync(path.join(options.path, path.basename(file)))
    ));
    return;
  }

  const mainApplicationFilePath = getProjectFilePath(config.rootPath, 'MainApplication');

  const fontFamilyMap = {};

  assetFiles.forEach((file) => {
    const buffer = fs.readFileSync(file);
    const font = OpenType.parse(toArrayBuffer(buffer));

    const fontFamily = getFontFamily(font.names.fontFamily, font.names.preferredFamily);
    if (!fontFamilyMap[fontFamily]) {
      fontFamilyMap[fontFamily] = {
        id: normalizeString(fontFamily),
        files: [],
      };
    }

    fontFamilyMap[fontFamily].files.push({
      name: normalizeString(path.basename(file)),
      path: file,
    });
  });

  const xmlParser = new XMLParser({
    ignoreAttributes: false,
    isArray: tagName => tagName === 'font',
  });

  const xmlBuilder = new XMLBuilder({
    format: true,
    ignoreAttributes: false,
    suppressEmptyNode: true,
  });

  // Read MainApplication.java file.
  let mainApplicationFileData = fs.readFileSync(mainApplicationFilePath).toString();

  Object.entries(fontFamilyMap).forEach(([name, data]) => {
    const xmlFileName = `${data.id}.xml`;
    const xmlFilePath = path.join(getFontResFolderPath(config.rootPath), xmlFileName);
    let xmlObject;

    if (fs.existsSync(xmlFilePath)) {
      xmlObject = xmlParser.parse(fs.readFileSync(xmlFilePath));

      data.files.forEach((file) => {
        const foundEntryIndex = xmlObject['font-family'].font.findIndex(entry => entry['@_app:font'] === getXMLFontId(file.name));
        if (foundEntryIndex !== -1) {
          xmlObject['font-family'].font.splice(foundEntryIndex, 1);
        }
      });

      if (xmlObject['font-family'].font.length > 0) {
        // We still have some fonts declared in the XML font file.
        // Write the XML font file.
        const xmlData = xmlBuilder.build(xmlObject);
        fs.outputFileSync(xmlFilePath, xmlData);
      } else {
        // We remove the XML font file and method call
        // because there aren't fonts declared inside it.
        fs.removeSync(xmlFilePath);

        mainApplicationFileData = removeLineFromJavaFile(
          mainApplicationFileData,
          getAddCustomFontMethodCall(name, data.id),
        );
      }
    }

    // If there are not usages of ReactFontManager, we try to remove the import as well.
    if (!mainApplicationFileData.includes('ReactFontManager.')) {
      mainApplicationFileData = removeLineFromJavaFile(
        mainApplicationFileData,
        REACT_FONT_MANAGER_JAVA_IMPORT,
      );
    }

    // Write the modified contents to MainApplication.java file.
    fs.writeFileSync(mainApplicationFilePath, mainApplicationFileData);

    // Remove the font files from assets folder.
    data.files.forEach(file => (
      fs.removeSync(path.join(options.path, path.basename(file)))
    ));
  });
};
