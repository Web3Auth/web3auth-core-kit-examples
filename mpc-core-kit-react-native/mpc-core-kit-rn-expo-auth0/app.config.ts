import "ts-node/register"; // Add this to import TypeScript files

import { ExpoConfig } from "expo/config";

const config: ExpoConfig = {
  name: "my-app",
  slug: "my-app",
  plugins: ["expo-secure-store"],
  newArchEnabled: true,
  ios: {
    newArchEnabled: true,
  },
  android: {
    newArchEnabled: true,
  },
};

export default config;
