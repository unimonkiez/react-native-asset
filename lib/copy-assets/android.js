const fs = require('fs-extra');
const path = require('path');
const OpenType = require('opentype.js');
const { fontTypes } = require('../helper');
const {
  REACT_FONT_MANAGER_JAVA_IMPORT,
  toArrayBuffer,
  normalizeString,
  getProjectFilePath,
  getFontFamily,
  getFontFallbackWeight,
  getFontResFolderPath,
  getXMLFontId,
  buildXMLFontObjectEntry,
  buildXMLFontObject,
  getAddCustomFontMethodCall,
  addImportToJavaFile,
  insertLineInJavaClassMethod,
  xmlParser,
  xmlBuilder,
} = require('../font-assets-helper');

module.exports = function copyAssetsAndroid(assetFiles = [], config, options, fileExt) {
  // If the assets are not fonts, just copy them.
  if (!fontTypes.includes(fileExt)) {
    assetFiles.forEach(file => (
      fs.copySync(file, path.join(options.path, path.basename(file)))
    ));
    return;
  }

  const mainApplicationFilePath = getProjectFilePath(config.rootPath, 'MainApplication');

  const fontFamilyMap = {};

  assetFiles.forEach((file) => {
    const buffer = fs.readFileSync(file);
    const font = OpenType.parse(toArrayBuffer(buffer));

    const {
      /**
       * An number whose bits represent the font style.
       * Must be used in conjunction with "fsSelection".
       *
       * Bit 1: Italic (if set to 1).
       */
      macStyle,
    } = font.tables.head;

    const {
      /**
       * An number representing the weight of the font style.
       */
      usWeightClass,

      /**
       * An number whose bits represent the font style.
       * Must be used in conjunction with "macStyle".
       *
       * Bit 0: Italic (if set to 1).
       */
      fsSelection,
    } = font.tables.os2;

    /**
     * Bitmask to check if font style is italic.
     *
     * Reference: https://learn.microsoft.com/en-us/typography/opentype/spec/os2#fsselection
     */
    const fsSelectionItalicMask = 1;

    /**
     * Bitmask to check if font style is italic.
     *
     * Reference: https://learn.microsoft.com/en-us/typography/opentype/spec/head
     */
    const macStyleItalicMask = 2;

    const weight = getFontFallbackWeight(usWeightClass);

    /**
     * The font is italic if both "macStyle" and "fsSelection" italic bits are set.
     */
    const isItalic = Boolean((fsSelection & fsSelectionItalicMask) &&
      (macStyle & macStyleItalicMask));

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
      path: file,
      weight,
      isItalic,
    });
  });

  Object.entries(fontFamilyMap).forEach(([fontFamilyName, fontFamilyData]) => {
    const xmlFileName = `${fontFamilyData.id}.xml`;
    const xmlFilePath = path.join(getFontResFolderPath(config.rootPath), xmlFileName);
    let xmlObject;

    if (fs.existsSync(xmlFilePath)) {
      // XML font file already exists, so we add new entries or replace existing ones.
      xmlObject = xmlParser.parse(fs.readFileSync(xmlFilePath));

      fontFamilyData.files.forEach((file) => {
        const xmlEntry = buildXMLFontObjectEntry(file);

        // We can't have style / weight duplicates.
        const foundEntryIndex = xmlObject['font-family'].font.findIndex(entry =>
          entry['@_app:font'] === getXMLFontId(file.name) ||
          (entry['@_app:fontStyle'] === xmlEntry['@_app:fontStyle'] &&
          entry['@_app:fontWeight'] === xmlEntry['@_app:fontWeight']));

        if (foundEntryIndex !== -1) {
          xmlObject['font-family'].font[foundEntryIndex] = xmlEntry;
        } else {
          xmlObject['font-family'].font.push(xmlEntry);
        }
      });
    } else {
      // XML font file doesn't exist, so we create a new one.
      xmlObject = buildXMLFontObject(fontFamilyData.files);
    }

    // Sort the fonts by weight and style.
    xmlObject['font-family'].font.sort((a, b) => {
      const compareWeight = a['@_app:fontWeight'] - b['@_app:fontWeight'];
      const compareStyle = a['@_app:fontStyle'] - b['@_app:fontStyle'];
      return compareWeight || compareStyle;
    });

    const xmlData = xmlBuilder.build(xmlObject);

    // Copy the font files to font folder.
    fontFamilyData.files.forEach(file => (
      fs.copySync(
        file.path,
        path.join(getFontResFolderPath(config.rootPath), path.basename(file.name)),
      )
    ));

    // Write the XML font file.
    fs.outputFileSync(xmlFilePath, xmlData);

    // Read MainApplication.java file.
    let mainApplicationFileData = fs.readFileSync(mainApplicationFilePath).toString();

    // Add ReactFontManager's import.
    mainApplicationFileData = addImportToJavaFile(
      mainApplicationFileData,
      REACT_FONT_MANAGER_JAVA_IMPORT,
    );

    // Insert add custom font's method call.
    mainApplicationFileData = insertLineInJavaClassMethod(
      mainApplicationFileData,
      'MainApplication',
      'onCreate',
      getAddCustomFontMethodCall(fontFamilyName, fontFamilyData.id),
      'super.onCreate();',
    );

    // Write the modified contents to MainApplication.java file.
    fs.writeFileSync(mainApplicationFilePath, mainApplicationFileData);
  });
};
