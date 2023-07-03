import { registerRootComponent } from "expo";

import App from "./App";

// global variables required to be replaced for web3auth packages to work
if (!global.Buffer) {
  global.Buffer = require("buffer").Buffer;
}

global.process.version = "v16.0.0";
if (!global.process.version) {
  global.process = require("process");
  console.log({ process: global.process });
}

// registerRootComponent calls AppRegistry.registerComponent('main', () => App);
// It also ensures that whether you load the app in Expo Go or in a native build,
// the environment is set up appropriately
registerRootComponent(App);
/**
 * @format
 */
