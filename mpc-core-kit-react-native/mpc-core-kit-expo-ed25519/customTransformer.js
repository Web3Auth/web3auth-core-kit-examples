const { nodeModulesPolyfillPlugin } = require("esbuild-plugins-node-modules-polyfill");
const reactNativeReactBridgeTransformer = require("react-native-react-bridge/lib/plugin");
const esbuildOptions = {
  plugins: [
    nodeModulesPolyfillPlugin({
      globals: {
        Buffer: true,
        crypto: true,
      },
      // modules: {
      //     Buffer : true,
      // }
    }),
  ],
};
module.exports.transform = function ({ src, filename, options }) {
  const transform = reactNativeReactBridgeTransformer.createTransformer(esbuildOptions);
  return transform({ src, filename, options });
};
