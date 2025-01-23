/**
 * @format
 */

import {AppRegistry} from 'react-native';
import './globals';
import "@ethersproject/shims";
import {name as appName} from './app.json';

import App from './App';

AppRegistry.registerComponent(appName, () => App);
