const upstreamTransformer = require("@expo/metro-config/babel-transformer");

const bridgeTransformer = require("react-native-react-bridge/lib/plugin");

console.log(bridgeTransformer);

module.exports.transform = async ({ src, filename, options }) => {
  // Do something custom for SVG files...
  //   if (filename.endsWith(".svg")) {
  //     src = "...";
  //   }
  // if (bridgeTransformer.isEntryFile(filename)) {
  //   // Add `require.context` support in the transformer.
  //   return bridgeTransformer.transform({ src, filename, options });
  // }

  // Pass the source through the upstream Expo transformer.
  return upstreamTransformer.transform({ src, filename, options });
};
