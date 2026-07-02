const { getSentryExpoConfig } = require("@sentry/react-native/metro");
const path = require("path");

const config = getSentryExpoConfig(__dirname);

// Add SVG transformer support
const { transformer, resolver } = config;

config.transformer = {
  ...transformer,
  babelTransformerPath: require.resolve("react-native-svg-transformer"),
};

config.resolver = {
  ...resolver,
  assetExts: resolver.assetExts.filter((ext) => ext !== "svg"),
  sourceExts: [...resolver.sourceExts, "svg"],
  // Ensure platform-specific extensions are resolved (e.g. .android.js, .ios.js)
  resolveRequest: (context, moduleName, platform) => {
    // Fix: @invertase/react-native-apple-authentication AppleButton resolution on Android/Web
    if (
      (platform === "android" || platform === "web" || !platform) &&
      moduleName === "./AppleButton" &&
      context.originModulePath.includes("react-native-apple-authentication")
    ) {
      return {
        filePath: path.resolve(
          __dirname,
          "node_modules/@invertase/react-native-apple-authentication/lib/AppleButton.android.js"
        ),
        type: "sourceFile",
      };
    }
    // Fall back to default resolution
    return context.resolveRequest(context, moduleName, platform);
  },
};

module.exports = config;
