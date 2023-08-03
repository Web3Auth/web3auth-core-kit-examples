import ThresholdKey from "@tkey-mpc/core";
import { ServiceProviderBase } from "@tkey-mpc/service-provider-base";
import { TorusStorageLayer } from "@tkey-mpc/storage-layer-torus";
import { ShareSerializationModule } from "@tkey-mpc/share-serialization";
// Configuration of Service Provider

const torusSp = new ServiceProviderBase({
  useTSS: true,
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
