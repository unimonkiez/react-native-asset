const fs = require('fs-extra');
const path = require('path');
const OpenType = require('opentype.js');
const {
  REACT_FONT_MANAGER_JAVA_IMPORT,
  toArrayBuffer,
  normalizeString,
  getProjectFilePath,
  getFontFamily,
  getFontResFolderPath,
  getXMLFontId,
  getAddCustomFontMethodCall,
  removeLineFromJavaFile,
  xmlParser,
  xmlBuilder,
} = require('../android-font-assets-helper');

module.exports = function cleanAssetsAndroid(assetFiles = [], config, options) {
  // If the assets are not fonts and are not linked with XML files, just remove them.
  if (!options.linkWithFontXMLFiles) {
    assetFiles.forEach(file => (
      fs.removeSync(path.join(options.path, path.basename(file)))
    ));
    return;
  }

  const fontFamilyMap = {};

  assetFiles.forEach((file) => {
    const fontFilePath = path.join(
      getFontResFolderPath(config.path),
      normalizeString(path.basename(file)),
    );

    const buffer = fs.readFileSync(fontFilePath);
    const font = OpenType.parse(toArrayBuffer(buffer));

    // Build the font family's map, where each key is the font family name,
    // and each value is a object containing all the font files related to that
    // font family.
    const fontFamily = getFontFamily(font.names.fontFamily, font.names.preferredFamily);
    if (!fontFamilyMap[fontFamily]) {
      fontFamilyMap[fontFamily] = {
        id: normalizeString(fontFamily),
        files: [],
      };
    }

    fontFamilyMap[fontFamily].files.push({
      name: normalizeString(path.basename(file)),
      path: fontFilePath,
    });
  });

  // Read MainApplication.java file.
  const mainApplicationFilePath = getProjectFilePath(config.path, 'MainApplication');
  let mainApplicationFileData = fs.readFileSync(mainApplicationFilePath).toString();

  Object.entries(fontFamilyMap).forEach(([fontFamilyName, fontFamilyData]) => {
    const xmlFileName = `${fontFamilyData.id}.xml`;
    const xmlFilePath = path.join(getFontResFolderPath(config.path), xmlFileName);
    let xmlObject;

    if (fs.existsSync(xmlFilePath)) {
      // XML font file already exists, so we remove the entries.
      xmlObject = xmlParser.parse(fs.readFileSync(xmlFilePath));

      fontFamilyData.files.forEach((file) => {
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
          getAddCustomFontMethodCall(fontFamilyName, fontFamilyData.id),
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
    fontFamilyData.files.forEach(file => (
      fs.removeSync(file.path)
    ));
  });
};
