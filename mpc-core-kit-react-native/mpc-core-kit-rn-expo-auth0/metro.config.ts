/* eslint-disable @typescript-eslint/no-var-requires */

const { getDefaultConfig } = require("metro-config");

module.exports = (async () => {
  const {
    resolver: { sourceExts, assetExts },
  } = await getDefaultConfig();

  const defaultSourceExts = [...sourceExts, "svg", "mjs", "cjs"];

  return {
    resolver: {
      // IMP START - Bundler Issues
      extraNodeModules: {
        assert: require.resolve("empty-module"),
        http: require.resolve("empty-module"),
        https: require.resolve("empty-module"),
        os: require.resolve("empty-module"),
        url: require.resolve("empty-module"),
        zlib: require.resolve("empty-module"),
        path: require.resolve("empty-module"),
        crypto: require.resolve("crypto-browserify"),
        stream: require.resolve("stream-browserify"),
        buffer: require.resolve("buffer"),
      },
      // IMP END - Bundler Issues

      // Ensure PNG and other image files are resolved correctly
      assetExts: assetExts.filter((ext: string) => ext !== "svg").concat(["png"]),

      // Extending source extensions for your use case
      sourceExts: process.env.TEST_REACT_NATIVE ? ["e2e.js"].concat(defaultSourceExts) : defaultSourceExts,
    },
    transformer: {
      getTransformOptions: async () => ({
        transform: {
          experimentalImportSupport: true,
          inlineRequires: true,
        },
      }),
      // Custom Babel Transformer Path for React Bridge
      babelTransformerPath: require.resolve("react-native-react-bridge/lib/plugin"),
    },
  };
})();
