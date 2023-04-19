const fs = require('fs-extra');
const path = require('path');
const OpenType = require('opentype.js');
const slugify = require('slugify');
const { fontTypes } = require('../helper');
const { XMLBuilder } = require('fast-xml-parser');

function toArrayBuffer(buffer) {
  const arrayBuffer = new ArrayBuffer(buffer.length);
  const view = new Uint8Array(arrayBuffer);

  for (let i = 0; i < buffer.length; i += 1) {
    view[i] = buffer[i];
  }

  return arrayBuffer;
}

function getFontFamily(fontFamily, preferredFontFamily) {
  const availableFontFamily = preferredFontFamily || fontFamily;
  return availableFontFamily.en || Object.values(availableFontFamily)[0];
}

module.exports = function copyAssetsAndroid(files = [], config, options, fileExt) {
  console.log('copyAssetsAndroid files', files);

  if (!fontTypes.includes(fileExt)) {
    files.forEach(asset => (
      fs.copySync(asset, path.join(options.path, path.basename(asset)))
    ));
    return;
  }

  const fontFamilyMap = {};

  files.forEach((file) => {
    console.log(file);
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
     */
    const fsSelectionItalicMask = 1;

    /**
     * Bitmask to check if font style is italic.
     */
    const macStyleItalicMask = 2;

    const weight = usWeightClass;
    const isItalic = Boolean((fsSelection & fsSelectionItalicMask) &&
      (macStyle & macStyleItalicMask));

    const assetFileName = slugify(path.basename(file), { lower: true }).replaceAll('-', '_');

    const fontFamily = getFontFamily(font.names.fontFamily, font.names.preferredFamily);
    if (!fontFamilyMap[fontFamily]) {
      fontFamilyMap[fontFamily] = {
        files: [],
      };
    }

    fontFamilyMap[fontFamily].files.push({
      path: file,
      assetFileName,
      weight,
      isItalic,
    });

    console.log('----');
  });

  Object.entries(fontFamilyMap).forEach(([name, data]) => {
    const xmlObject = {
      '?xml': {
        '@_version': '1.0',
        '@_encoding': 'utf-8',
      },
      'font-family': {
        '@_xmlns:app': 'http://schemas.android.com/apk/res-auto',
        font: data.files.map(file => ({
          '@_app:fontStyle': file.isItalic ? 'italic' : 'normal',
          '@_app:fontWeight': file.weight,
          '@_app:font': `@font/${path.basename(file.assetFileName, path.extname(file.assetFileName))}`,
        })),
      },
    };

    const xmlBuilder = new XMLBuilder({
      format: true,
      ignoreAttributes: false,
      suppressEmptyNode: true,
    });

    const xmlData = xmlBuilder.build(xmlObject);
    console.log(xmlData);
  });
};
