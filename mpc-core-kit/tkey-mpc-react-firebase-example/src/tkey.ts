import ThresholdKey from "@tkey-mpc/core";
import { TorusServiceProvider } from "@tkey-mpc/service-provider-torus";
import { TorusStorageLayer } from "@tkey-mpc/storage-layer-torus";
import { ShareSerializationModule } from "@tkey-mpc/share-serialization";
import { CustomChainConfig } from "@web3auth/base";
// Configuration of Service Provider

const web3AuthClientId =
  "BEglQSgt4cUWcj6SKRdu5QkOXTsePmMcusG5EAoyjyOYKlVRjIF1iCNnMOTfpzCiunHRrMui8TIwQPXdkQ8Yxuk"; // get from https://dashboard.web3auth.io

export const chainConfig: Omit<CustomChainConfig, "chainNamespace"> = {
  chainId: "0x5",
  rpcTarget: "https://rpc.ankr.com/eth_goerli",
  displayName: "Goerli Testnet",
  blockExplorer: "https://goerli.etherscan.io",
  ticker: "ETH",
  tickerName: "Ethereum",
}

const serviceProvider = new TorusServiceProvider({
  useTSS: true,
  customAuthArgs: {
    network: "sapphire_devnet",
    web3AuthClientId, // anything will work on localhost, but get one valid clientID before hosting, from https://dashboard.web3auth.io
    baseUrl: `${window.location.origin}`,
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
  serviceProvider,
  storageLayer: storageLayer as any,
  manualSync: true,
  modules: {
    shareSerialization: shareSerializationModule,
  }
});
