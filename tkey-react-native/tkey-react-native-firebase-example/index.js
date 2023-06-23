/**
 * @format
 */

import {AppRegistry} from 'react-native';
import {name as appName} from './app.json';

// global variables required to be replaced for web3auth packages to work
if (!global.Buffer) {
  global.Buffer = require('buffer').Buffer;
}

global.process.version = 'v16.0.0';
if (!global.process.version) {
  global.process = require('process');
  console.log({process: global.process});
}

import App from './App';

AppRegistry.registerComponent(appName, () => App);
