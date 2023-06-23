import ThresholdKey from '@tkey/core';
import SecurityQuestionsModule from '@tkey/security-questions';
import TorusServiceProvider from '@tkey/service-provider-base';
import TorusStorageLayer from '@tkey/storage-layer-torus';
import {ShareTransferModule} from '@tkey/share-transfer';
import {ShareSerializationModule} from '@tkey/share-serialization';

// Configuration of Service Provider
const customAuthArgs = {
  baseUrl: 'http://localhost:3000/serviceworker/',
  enableLogging: true,
  network: 'cyan', // based on the verifier network.
};

// Instantiation of Service Provider
const serviceProvider = new TorusServiceProvider({
  customAuthArgs,
} as any);

// Instantiation of Storage Layer
const storageLayer = new TorusStorageLayer({
  hostUrl: 'https://metadata.tor.us',
});

// Configuration of Modules
const shareTransferModule = new ShareTransferModule();
const shareSerializationModule = new ShareSerializationModule();
const securityQuestionsModule = new SecurityQuestionsModule();

// Instantiation of tKey
export const tKeyInstance = new ThresholdKey({
  serviceProvider: serviceProvider,
  storageLayer,
  modules: {
    shareTransfer: shareTransferModule,
    securityQuestions: securityQuestionsModule,
    shareSerializationModule: shareSerializationModule,
  },
});

export function getNewTKeyInstance() {
  return new ThresholdKey({
    serviceProvider: serviceProvider,
    storageLayer,
    modules: {
      shareTransfer: shareTransferModule,
      securityQuestions: securityQuestionsModule,
      shareSerializationModule: shareSerializationModule,
    },
  });
}
