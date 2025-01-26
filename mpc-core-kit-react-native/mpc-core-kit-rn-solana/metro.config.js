require("ts-node/register");
const { getDefaultConfig, mergeConfig } = require('@react-native/metro-config');

const config = {
  resolver: {
    // IMP START - Bundler Issues
    extraNodeModules: {
      assert: require.resolve("empty-module"), // assert can be polyfilled here if needed
      http: require.resolve("empty-module"), // stream-http can be polyfilled here if needed
      https: require.resolve("empty-module"), // https-browserify can be polyfilled here if needed
      os: require.resolve("empty-module"), // os-browserify can be polyfilled here if needed
      url: require.resolve("empty-module"), // url can be polyfilled here if needed
      zlib: require.resolve("empty-module"), // browserify-zlib can be polyfilled here if needed
      path: require.resolve("empty-module"),
      crypto: require.resolve("empty-module"),
      buffer: require.resolve("@craftzdog/react-native-buffer"),
    },
    // IMP END - Bundler Issues

    // assetExts: assetExts.filter(ext => ext !== 'svg'),

    assetExts: ['svg', 'png', 'json'],
    sourceExts: ['js', 'mjs', 'cjs', 'jsx', 'ts', 'tsx']
    // sourceExts: process.env.TEST_REACT_NATIVE
    //   ? ['e2e.js'].concat(defaultSourceExts)
    //   : defaultSourceExts,
  },
  transformer: {
    getTransformOptions: async () => ({
      transform: {
        experimentalImportSupport: true,
        inlineRequires: true,
      },
    }),
    // This detects entry points of React app and transforms them
    // For the other files this will switch to use default `metro-react-native-babel-transformer` for transforming
    babelTransformerPath: require.resolve('./customTransformer.js'),
  },
};


module.exports = mergeConfig(getDefaultConfig(__dirname), config);
// })();