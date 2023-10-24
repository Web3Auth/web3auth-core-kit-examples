import ThresholdKey from '@tkey/core';
import SFAServiceProvider from '@tkey/service-provider-sfa';
import TorusStorageLayer from '@tkey/storage-layer-torus';
import {ShareSerializationModule} from '@tkey/share-serialization';
import {ReactNativeStorageModule} from '@tkey/react-native-storage';
import {EthereumPrivateKeyProvider} from '@web3auth/ethereum-provider';
import EncryptedStorage from 'react-native-encrypted-storage';

const clientId =
  'BPi5PB_UiIZ-cPz1GtV5i1I2iOSOHuimiXBI0e-Oe_u6X3oVAbCiAZOTEBtTXw4tsluTITPqA8zMsfxIKMjiqNQ'; // get from https://dashboard.web3auth.io

const chainConfig = {
  chainId: '0x1',
  rpcTarget: 'https://rpc.ankr.com/eth',
  displayName: 'mainnet',
  blockExplorer: 'https://etherscan.io/',
  ticker: 'ETH',
  tickerName: 'Ethereum',
};

const web3AuthOptions: any = {
  clientId, // Get your Client ID from Web3Auth Dashboard
  chainConfig,
  web3AuthNetwork: 'sapphire_mainnet',
};

// Configuration of Service Provider
const serviceProvider = new SFAServiceProvider({web3AuthOptions});

export const ethereumPrivateKeyProvider = new EthereumPrivateKeyProvider({
  config: {
    chainConfig,
  },
});

// Instantiation of Storage Layer
const storageLayer = new TorusStorageLayer({
  hostUrl: 'https://metadata.tor.us',
});

// Configuration of Modules
const reactNativeStorageModule = new ReactNativeStorageModule(EncryptedStorage);
const shareSerializationModule = new ShareSerializationModule();

// Instantiation of tKey
export const tKey = new ThresholdKey({
  serviceProvider,
  storageLayer,
  modules: {
    shareSerialization: shareSerializationModule,
    reactNativeStorage: reactNativeStorageModule,
  },
});