import ThresholdKey from "@tkey/default";
import SecurityQuestionsModule from "@tkey/security-questions";
import { TorusServiceProvider } from "@tkey/service-provider-torus";
import { TorusStorageLayer } from "@tkey/storage-layer-torus";
import WebStorageModule from "@tkey/web-storage";

// Configuration of Service Provider

const torusSp = new TorusServiceProvider({
  useTSS: true,
  customAuthArgs: {
    baseUrl: `${window.location.origin}/serviceworker`,
    enableLogging: true,
  },
});

const storageLayer = new TorusStorageLayer({
  hostUrl: "https://sapphire-dev-2-1.authnetwork.dev/metadata",
  enableLogging: true,
});

// Configuration of Modules
const webStorageModule = new WebStorageModule();
const securityQuestionsModule = new SecurityQuestionsModule();

// Instantiation of tKey
export const tKey = new ThresholdKey({
  enableLogging: true,
  modules: {
    webStorage: webStorageModule,
    securityQuestions: securityQuestionsModule,
  },
  serviceProvider: torusSp as any,
  storageLayer: storageLayer as any,
  manualSync: true,
});
