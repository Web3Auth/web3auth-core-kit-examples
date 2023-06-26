import ThresholdKey from "@tkey/core";
import { TorusServiceProvider } from "@tkey/service-provider-torus";
import { TorusStorageLayer } from "@tkey/storage-layer-torus";
import { ShareSerializationModule } from "@tkey/share-serialization";
// Configuration of Service Provider

const torusSp = new TorusServiceProvider({
  useTSS: true,
  customAuthArgs: {
    network: "sapphire_devnet",
    web3AuthClientId: "YOUR_CLIENT_ID", // anything will work on localhost, but get one valid clientID before hosting, from https://dashboard.web3auth.io
    baseUrl: `${window.location.origin}/serviceworker`,
    enableLogging: true,
  },
});

const storageLayer = new TorusStorageLayer({
  hostUrl: "https://sapphire-dev-2-1.authnetwork.dev/metadata",
  enableLogging: true,
});

const shareSerializationModule = new ShareSerializationModule();

// Instantiation of tKey
export const tKey = new ThresholdKey({
  enableLogging: true,
  serviceProvider: torusSp as any,
  storageLayer: storageLayer as any,
  manualSync: true,
  modules: {
    shareSerialization: shareSerializationModule,
  }
});
