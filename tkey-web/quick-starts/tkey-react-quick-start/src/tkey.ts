import ThresholdKey from '@tkey/core';
import SFAServiceProvider from '@tkey/service-provider-sfa';
import TorusStorageLayer from '@tkey/storage-layer-torus';
import { ShareSerializationModule } from '@tkey/share-serialization';
import { WebStorageModule } from '@tkey/web-storage';

const clientId =
  "BPi5PB_UiIZ-cPz1GtV5i1I2iOSOHuimiXBI0e-Oe_u6X3oVAbCiAZOTEBtTXw4tsluTITPqA8zMsfxIKMjiqNQ"; // get from https://dashboard.web3auth.io

const web3AuthOptions: any = {
  clientId, // Get your Client ID from Web3Auth Dashboard
  network: 'sapphire_mainnet',
};

// Configuration of Service Provider
const serviceProvider = new SFAServiceProvider({web3AuthOptions});

// Instantiation of Storage Layer
const storageLayer = new TorusStorageLayer({
  hostUrl: 'https://metadata.tor.us',
});

// Configuration of Modules
const webStorage = new WebStorageModule();
const shareSerialization = new ShareSerializationModule();

// Instantiation of tKey
export const tKey = new ThresholdKey({
  serviceProvider,
  storageLayer,
  modules: {
    shareSerialization,
    webStorage,
  },
});
