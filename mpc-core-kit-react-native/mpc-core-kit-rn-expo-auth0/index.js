/**
 * @format
 */

import "@ethersproject/shims";
import "@expo/metro-runtime";
import "./globals";
import "react-native-get-random-values";
import "react-native-url-polyfill/auto";

import { registerRootComponent } from "expo";

import App from "./App";

registerRootComponent(App);
