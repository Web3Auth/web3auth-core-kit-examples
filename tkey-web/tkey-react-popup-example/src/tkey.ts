import ThresholdKey from "@tkey/core";
import WebStorageModule from "@tkey/web-storage";
import SecurityQuestionsModule from "@tkey/security-questions";
import { EthereumPrivateKeyProvider } from "@web3auth/ethereum-provider";
import TorusStorageLayer from "@tkey/storage-layer-torus";
import SFAServiceProvider from "@tkey/service-provider-sfa";

const clientId =
  "BEglQSgt4cUWcj6SKRdu5QkOXTsePmMcusG5EAoyjyOYKlVRjIF1iCNnMOTfpzCiunHRrMui8TIwQPXdkQ8Yxuk"; // get from https://dashboard.web3auth.io

const chainConfig= {
  chainId: "0x13881",
  rpcTarget: "https://rpc.ankr.com/polygon_mumbai",
  displayName: "Polygon Testnet",
  blockExplorer: "https://mumbai.polygonscan.com",
  ticker: "MATIC",
  tickerName: "Matic",
};

const web3AuthOptions = {
  clientId, // Get your Client ID from Web3Auth Dashboard
  chainConfig,
  web3AuthNetwork: "testnet", // ["cyan", "testnet"]
  usePnPKey: false, // Setting this to true returns the same key as PnP Web SDK, By default, this SDK returns CoreKitKey.
}

// Configuration of Service Provider

const serviceProvider = new SFAServiceProvider({web3AuthOptions});

// Configuration of Storage Layer
const storageLayer = new TorusStorageLayer({
  hostUrl: "https://metadata.tor.us",
});

// Configuration of Modules
const webStorageModule = new WebStorageModule();
const securityQuestionsModule = new SecurityQuestionsModule();

export const ethereumPrivateKeyProvider = new EthereumPrivateKeyProvider({
  config: {
    chainConfig,
  },
});

// Instantiation of tKey
export const tKey = new ThresholdKey({
  serviceProvider,
  storageLayer,
  modules: {
    webStorage: webStorageModule,
    securityQuestions: securityQuestionsModule,
  },
});