import "../global";

import { CustomChainConfig, EthereumSigningProvider } from "@web3auth/ethereum-mpc-provider";
import { COREKIT_STATUS, IAsyncStorage, log, makeEthereumSigner, parseToken, WEB3AUTH_NETWORK, Web3AuthOptions } from "@web3auth/mpc-core-kit";
import mpclib, { TssDklsLib, TssFrostLib } from "@web3auth/react-native-mpc-core-kit";
import * as SecureStore from "expo-secure-store";
import { create } from "zustand";
export const Verifier = "torus-test-health";

// // setup async storage for react native
const asyncStorageKey: IAsyncStorage = {
  getItem: async (key: string) => {
    return SecureStore.getItemAsync(key);
  },
  setItem: async (key: string, value: string) => {
    return SecureStore.setItemAsync(key, value);
  },
};

const web3AuthClientId = "BPi5PB_UiIZ-cPz1GtV5i1I2iOSOHuimiXBI0e-Oe_u6X3oVAbCiAZOTEBtTXw4tsluTITPqA8zMsfxIKMjiqNQ"; // get from https://dashboard.web3auth.io

const coreKitInstance = new mpclib.Web3AuthMPCCoreKitRN({
  web3AuthClientId,
  web3AuthNetwork: WEB3AUTH_NETWORK.MAINNET,
  uxMode: "react-native",
  // tssLib: TssFrostLib, // tss lib bridge for react native
  tssLib: TssDklsLib,
  manualSync: false, // This is the recommended approach
  storage: asyncStorageKey, // Add the storage property
} as Web3AuthOptions);

const chainConfig: CustomChainConfig = {
  chainNamespace: "eip155",
  chainId: "0xaa36a7",
  rpcTarget: "https://rpc.ankr.com/eth_sepolia",
  // Avoid using public rpcTarget in production.
  // Use services like Infura, Quicknode etc
  displayName: "Ethereum Sepolia Testnet",
  blockExplorerUrl: "https://sepolia.etherscan.io",
  ticker: "ETH",
  tickerName: "Ethereum",
  logo: "https://cryptologos.cc/logos/ethereum-eth-logo.png",
};
const evmProvider = new EthereumSigningProvider({ config: { chainConfig } });

const asyncEd25519StorageKey: IAsyncStorage = {
  getItem: async (key: string) => {
    return SecureStore.getItemAsync(`ed25519-${key}`);
  },
  setItem: async (key: string, value: string) => {
    return SecureStore.setItemAsync(`ed25519-${key}`, value);
  },
};

const coreKitEd25519Instance = new mpclib.Web3AuthMPCCoreKitRN({
  web3AuthClientId,
  web3AuthNetwork: WEB3AUTH_NETWORK.MAINNET,
  uxMode: "react-native",
  // tssLib: TssFrostLib, // tss lib bridge for react native
  tssLib: TssFrostLib,
  manualSync: false, // This is the recommended approach
  storage: asyncEd25519StorageKey, // Add the storage property
} as Web3AuthOptions);

interface IMPCCoreKitStore {
  coreKitInstance: mpclib.Web3AuthMPCCoreKitRN;
  coreKitStatus: COREKIT_STATUS;
  evmProvider: EthereumSigningProvider;
  setCoreKitStatus: (status: COREKIT_STATUS) => void;
  coreKitInit: () => Promise<void>;

  coreKitEd25519Instance: mpclib.Web3AuthMPCCoreKitRN;
  coreKitEd25519Status: COREKIT_STATUS;
  setCoreKitEd25519Status: (status: COREKIT_STATUS) => void;
  coreKitEd25519Init: () => Promise<void>;

  bridgeReady: boolean;
  setBridgeReady: (ready: boolean) => void;
}

export const useMPCCoreKitStore = create<IMPCCoreKitStore>((set, get) => ({
  coreKitInstance,
  coreKitEd25519Instance,
  coreKitStatus: COREKIT_STATUS.NOT_INITIALIZED,
  coreKitEd25519Status: COREKIT_STATUS.NOT_INITIALIZED,
  evmProvider,

  setCoreKitStatus: (status: COREKIT_STATUS) => {
    set({ coreKitStatus: status });
  },

  setCoreKitEd25519Status(status) {
    set({ coreKitEd25519Status: status });
  },

  coreKitInit: async () => {
    await coreKitInstance.init();
    if (coreKitInstance.status === COREKIT_STATUS.LOGGED_IN) {
      await evmProvider.setupProvider(makeEthereumSigner(coreKitInstance));
    }
    set({ coreKitStatus: coreKitInstance.status });
  },

  coreKitEd25519Init: async () => {
    await coreKitEd25519Instance.init();
    set({ coreKitEd25519Status: coreKitEd25519Instance.status });
  },

  bridgeReady: false,
  setBridgeReady: (ready: boolean) => {
    if (!ready) {
      if (get().bridgeReady) {
        log.warn("MPC Bridge is unmounted");
      }
    }
    set({ bridgeReady: ready });
  },
}));

export const mockLogin2 = async (emailID: string) => {
  const req = new Request("https://li6lnimoyrwgn2iuqtgdwlrwvq0upwtr.lambda-url.eu-west-1.on.aws/", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ verifier: "torus-key-test", scope: "email", extraPayload: { email: emailID }, alg: "ES256" }),
  });

  const resp = await fetch(req);
  const bodyJson = (await resp.json()) as { token: string };
  const idToken = bodyJson.token;
  const parsedToken = parseToken(idToken);
  return { idToken, parsedToken };
};
