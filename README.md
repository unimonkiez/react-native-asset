# react-native-asset
[![npm version](https://badge.fury.io/js/react-native-asset.svg)](https://badge.fury.io/js/react-native-asset)[![Build Status](https://travis-ci.org/unimonkiez/react-native-asset.svg?branch=master)](https://travis-ci.org/unimonkiez/react-native-asset)

## Link and unlink assets to your react-native project with ease!

## Advantages
* `react-native link` only supports font files, this tool supports all assets.
* Unlinking is automatic when you delete an asset, with `react-native link`, you need to unlink the files manually.
* Proper link (and unlink) for `mp3` (to use with [`react-native-sound`](https://github.com/zmxv/react-native-sound#basic-usage)) and `ttf` files.

### [Check out this starter-kit to use your assets with even more simplicity.](https://github.com/unimonkiez/react-platformula-boilerplate)

## Usage
* Install
  ```bash
  npm install -g react-native-asset
  # or yarn
  yarn global add react-native-asset
  ```
* Add assets to your `react-native.config.js` as you would with `react-native link`
  ```js
  ...
   assets: [
      "./src/font",
      "./src/mp3",
    ];
  ```
* Add platform-specific assets to your `react-native.config.js` like so:
  ```js
  ...
  assets: [
    "./src/mp3",
  ],
  iosAssets: [
    "./src/font/ios",
  ],
  androidAssets: [
    "./src/font/android",
  ],
  ```

* Run the command and linking + unlinking is automatic!
  ```bash
  react-native-asset
  ```
## Explanation
With `react-native link` you have to unlink the files manually, which is hard work.  
Instead this library writes `link-assets-manifest.json` to the root of `android` and `ios` folders to keep track of the files which it added, for later removing it for you if missing from your `assets`!

## Parameters
* `-p, --path` - path to project, defaults to cwd.
* `-a, --assets` - assets paths, for example `react-native-asset -a ./src/font ./src/mp3`.
* `-ios-a, --ios-assets` - ios assets paths, will disable android linking.
* `-android-a, --android-assets` - android assets paths, will disable ios linking.
* `-n-u, --no-unlink` - won't unlink assets which no longer exists, not recommended.

## Font assets linking and usage

### Android

Font assets are linked in Android by using [XML resources](https://developer.android.com/develop/ui/views/text-and-emoji/fonts-in-xml). For instance, if you add the **Lato** font to your project, it will generate a `lato.xml` file in `android/app/src/main/res/font/` folder with all the font variants that you added. It will also add a method call in `MainApplication.java` file in order to register the custom font during the app initialization. It will look something like this:

```java
public class MainApplication extends Application implements ReactApplication {

  // other methods...

  @Override
  public void onCreate() {
    super.onCreate();
    ReactFontManager.getInstance().addCustomFont(this, "Lato", R.font.lato); // <- registers the custom font.
    // ...
  }
}
```

In this case, `Lato` is what you have to set in the `fontFamily` style of your `Text` component. To select the font variant e.g. weight and style, use `fontWeight` and `fontStyle` styles respectively.

```jsx
<Text style={{ fontFamily: 'Lato', fontWeight: '700', fontStyle: 'italic' }}>Lato Bold Italic</Text>
```

### iOS

Font assets are linked in iOS by editing `project.pbxproj` and `Info.plist` files. To use the font in your app, you can a combination of `fontFamily`, `fontWeight` and `fontStyle` styles in the same way you would use for Android. In case you didn't link your font assets in Android and you are not sure which value you have to set in `fontFamily` style, you can use `Font Book` app in your Mac to find out the correct value by looking the `Family Name` property.

## Migrating from 2.x

If you have already linked font assets in your Android project, when running this tool it will relink your fonts to use XML resources for them. **This migration will allow you to use your fonts in the code the same way you would use it for iOS**. Please update your code to use `fontFamily`, `fontWeight` and `fontStyle` styles correctly.

## Backward compatability
* to use react-native 0.59 and below, use version 1.1.4
