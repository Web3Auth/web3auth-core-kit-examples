/**
 * @format
 */

import {AppRegistry} from 'react-native';
import './globals';
import 'react-native-get-random-values';
import {name as appName} from './app.json';
import 'react-native-url-polyfill/auto';

import App from './App';

AppRegistry.registerComponent(appName, () => App);
