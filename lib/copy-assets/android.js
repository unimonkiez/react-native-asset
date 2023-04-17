const fs = require('fs-extra');
const path = require('path');
const OpenType = require('opentype.js');

function toArrayBuffer(buffer) {
  const arrayBuffer = new ArrayBuffer(buffer.length);
  const view = new Uint8Array(arrayBuffer);

  for (let i = 0; i < buffer.length; i += 1) {
    view[i] = buffer[i];
  }

  return arrayBuffer;
}

module.exports = function copyAssetsAndroid(files = [], config, options) {
  console.log('copyAssetsAndroid files', files);

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
    const isItalic = (fsSelection & fsSelectionItalicMask) && (macStyle & macStyleItalicMask);
  });
};
