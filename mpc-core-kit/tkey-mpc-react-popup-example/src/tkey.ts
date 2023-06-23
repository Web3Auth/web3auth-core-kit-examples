import ThresholdKey from "@tkey/core";
import { TorusServiceProvider } from "@tkey/service-provider-torus";
import { TorusStorageLayer } from "@tkey/storage-layer-torus";
import { ShareSerializationModule } from "@tkey/share-serialization";
// Configuration of Service Provider

const torusSp = new TorusServiceProvider({
  useTSS: true,
  customAuthArgs: {
    baseUrl: `${window.location.origin}/serviceworker`,
    enableLogging: true,
    web3AuthClientId: "random-on-purpose",
    network: "sapphire_devnet",
  },
});

const storageLayer = new TorusStorageLayer({
  hostUrl: "https://sapphire-1.auth.network/metadata",
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
  },
});
