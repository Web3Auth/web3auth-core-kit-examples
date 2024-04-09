import ThresholdKey from '@tkey/core';
import SFAServiceProvider from '@tkey/service-provider-sfa';
import TorusStorageLayer from '@tkey/storage-layer-torus';
import {ShareSerializationModule} from '@tkey/share-serialization';
import {ReactNativeStorageModule} from '@tkey/react-native-storage';
import EncryptedStorage from 'react-native-encrypted-storage';
import {CHAIN_NAMESPACES} from '@web3auth/ethereum-provider';

const clientId =
  'BPi5PB_UiIZ-cPz1GtV5i1I2iOSOHuimiXBI0e-Oe_u6X3oVAbCiAZOTEBtTXw4tsluTITPqA8zMsfxIKMjiqNQ'; // get from https://dashboard.web3auth.io

export const chainConfig = {
  chainId: '0x1',
  rpcTarget: 'https://rpc.ankr.com/eth',
  displayName: 'mainnet',
  blockExplorer: 'https://etherscan.io/',
  ticker: 'ETH',
  tickerName: 'Ethereum',
  blockExplorerUrl: 'https://etherscan.io/tx/',
  chainNameSpace: 'eip155',
};

const web3AuthOptions: any = {
  clientId, // Get your Client ID from Web3Auth Dashboard
  chainConfig,
  web3AuthNetwork: 'sapphire_mainnet',
};

// Configuration of Service Provider
const serviceProvider = new SFAServiceProvider({web3AuthOptions});

// Instantiation of Storage Layer
const storageLayer = new TorusStorageLayer({
  hostUrl: 'https://metadata.tor.us',
});

// Configuration of Modules
const reactNativeStorage = new ReactNativeStorageModule(EncryptedStorage);
const shareSerialization = new ShareSerializationModule();

// Instantiation of tKey
export const tKey = new ThresholdKey({
  serviceProvider,
  storageLayer,
  modules: {
    shareSerialization,
    reactNativeStorage,
  },
});
