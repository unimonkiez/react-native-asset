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

function getFontFamily(fontFamily, preferredFontFamily) {
  const availableFontFamily = preferredFontFamily || fontFamily;
  return availableFontFamily.en || Object.values(availableFontFamily)[0];
}

// eslint-disable-next-line consistent-return
function getFontFallbackWeight(weight) {
  if (weight <= 500) {
    return Math.max(Math.floor(weight / 100) * 100, 100);
  } else if (weight > 500) {
    return Math.min(Math.ceil(weight / 100) * 100, 900);
  }
}

function getProjectFilePath(rootPath, name) {
  const filePath = globSync(path.join(rootPath, `android/app/src/main/java/**/${name}.java`))[0];
  return filePath;
}

function getFontResFolderPath(rootPath) {
  return path.join(rootPath, 'android/app/src/main/res/font');
}

function normalizeFontName(fontName) {
  return slugify(fontName, { lower: true }).replaceAll('-', '_');
}

function getXMLFontId(fontFileName) {
  return `@font/${path.basename(fontFileName, path.extname(fontFileName))}`;
}

function buildXMLFontObjectEntry(fontFile) {
  return {
    '@_app:fontStyle': fontFile.isItalic ? 'italic' : 'normal',
    '@_app:fontWeight': fontFile.weight,
    '@_app:font': getXMLFontId(fontFile.name),
  };
}

function buildXMLFontObject(fontFiles) {
  return {
    '?xml': {
      '@_version': '1.0',
      '@_encoding': 'utf-8',
    },
    'font-family': {
      '@_xmlns:app': 'http://schemas.android.com/apk/res-auto',
      font: fontFiles.map(buildXMLFontObjectEntry),
    },
  };
}

function getAddCustomFontMethodCall(fontName, fontId) {
  return `ReactFontManager.getInstance().addCustomFont(this, "${fontName}", R.font.${fontId});`;
}

function addImportToJavaFile(javaFileData, importToAdd) {
  const importRegex = new RegExp(`import\\s+${importToAdd};`, 'gm');
  const existingImport = importRegex.exec(javaFileData);

  if (existingImport) {
    return javaFileData;
  }

  const packageRegex = /package\s+[\w.]+;/;
  const packageMatch = packageRegex.exec(javaFileData);

  let insertPosition = 0;

  if (packageMatch) {
    insertPosition = packageMatch.index + packageMatch[0].length;
  }

  return `${javaFileData.slice(0, insertPosition)}\n\nimport ${importToAdd};${javaFileData.slice(insertPosition)}`;
}

function insertLineInJavaClassMethod(
  javaFileData,
  targetClass,
  targetMethod,
  codeToInsert,
  lineToInsertAfter,
) {
  const classRegex = new RegExp(`class\\s+${targetClass}(\\s+extends\\s+\\S+)?(\\s+implements\\s+\\S+)?\\s*\\{`, 'gm');
  const classMatch = classRegex.exec(javaFileData);

  if (!classMatch) {
    console.error(`Class ${targetClass} not found.`);
    return javaFileData;
  }

  const methodRegex = new RegExp(`(public|protected|private)\\s+(static\\s+)?\\S+\\s+${targetMethod}\\s*\\(`, 'gm');
  let methodMatch = methodRegex.exec(javaFileData);

  while (methodMatch) {
    if (methodMatch.index > classMatch.index) {
      break;
    }
    methodMatch = methodRegex.exec(javaFileData);
  }

  if (!methodMatch) {
    console.error(`Method ${targetMethod} not found in class ${targetClass}.`);
    return javaFileData;
  }

  const openingBraceIndex = javaFileData.indexOf('{', methodMatch.index);
  let closingBraceIndex = -1;
  let braceCount = 1;

  for (let i = openingBraceIndex + 1; i < javaFileData.length; i += 1) {
    if (javaFileData[i] === '{') {
      braceCount += 1;
    } else if (javaFileData[i] === '}') {
      braceCount -= 1;
    }

    if (braceCount === 0) {
      closingBraceIndex = i;
      break;
    }
  }

  if (closingBraceIndex === -1) {
    console.error(`Could not find closing brace for method ${targetMethod} in class ${targetClass}.`);
    return javaFileData;
  }

  const methodBody = javaFileData.slice(openingBraceIndex + 1, closingBraceIndex);

  if (methodBody.includes(codeToInsert.trim())) {
    return javaFileData;
  }

  let insertPosition = closingBraceIndex;

  if (lineToInsertAfter) {
    const lineIndex = methodBody.indexOf(lineToInsertAfter.trim());
    if (lineIndex !== -1) {
      insertPosition = openingBraceIndex + 1 + lineIndex + lineToInsertAfter.trim().length;
    } else {
      console.error(`Line "${lineToInsertAfter}" not found in method ${targetMethod} of class ${targetClass}.`);
      return javaFileData;
    }
  }

  return `${javaFileData.slice(0, insertPosition)}\n    ${codeToInsert}${javaFileData.slice(insertPosition)}`;
}

module.exports = function copyAssetsAndroid(files = [], config, options, fileExt) {
  // console.log('copyAssetsAndroid files', files);
  // console.log('config', config);
  // console.log('options', options);

  if (!fontTypes.includes(fileExt)) {
    files.forEach(asset => (
      fs.copySync(asset, path.join(options.path, path.basename(asset)))
    ));
    return;
  }

  const mainApplicationFilePath = getProjectFilePath(config.rootPath, 'MainApplication');

  const fontFamilyMap = {};

  files.forEach((file) => {
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

    const fontFamily = getFontFamily(font.names.fontFamily, font.names.preferredFamily);
    if (!fontFamilyMap[fontFamily]) {
      fontFamilyMap[fontFamily] = {
        id: normalizeFontName(fontFamily),
        files: [],
      };
    }

    fontFamilyMap[fontFamily].files.push({
      path: file,
      name: normalizeFontName(path.basename(file)),
      weight,
      isItalic,
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

  Object.entries(fontFamilyMap).forEach(([name, data]) => {
    const xmlFileName = `${data.id}.xml`;
    const xmlFilePath = path.join(getFontResFolderPath(config.rootPath), xmlFileName);
    let xmlObject;

    if (fs.existsSync(xmlFilePath)) {
      // XML font file already exists, so we add new entries or replace existing ones.
      xmlObject = xmlParser.parse(fs.readFileSync(xmlFilePath));

      data.files.forEach((file) => {
        const foundEntryIndex = xmlObject['font-family'].font.findIndex(entry => entry['@_app:font'] === getXMLFontId(file.name));
        if (foundEntryIndex !== -1) {
          xmlObject['font-family'].font[foundEntryIndex] = buildXMLFontObjectEntry(file);
        } else {
          xmlObject['font-family'].font.push(buildXMLFontObjectEntry(file));
        }
      });
    } else {
      // XML font file doesn't exist, so we create a new one.
      xmlObject = buildXMLFontObject(data.files);
    }

    const xmlData = xmlBuilder.build(xmlObject);

    // Copy the font files to assets folder.
    data.files.forEach(file => (
      fs.copySync(file.path, path.join(options.path, path.basename(file.name)))
    ));

    // Write the XML font file.
    fs.outputFileSync(path.join(getFontResFolderPath(config.rootPath), xmlFileName), xmlData);

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
      getAddCustomFontMethodCall(name, data.id),
      'super.onCreate();',
    );

    // Write the modified contents to MainApplication.java file.
    fs.writeFileSync(mainApplicationFilePath, mainApplicationFileData);
  });
};
