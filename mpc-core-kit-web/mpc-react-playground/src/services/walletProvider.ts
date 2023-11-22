import { SafeEventEmitterProvider } from "@web3auth/base";

import evmProvider from "./evmProvider";

export interface IWalletProvider {
  getAddress: () => Promise<string>;
  getBalance: () => Promise<string>;
  sendTransaction: (amount: string, destination: string) => Promise<void>;
  getPrivateKey: () => Promise<string>;
}

export const getWalletProvider = (provider: SafeEventEmitterProvider | null, uiConsole: any): IWalletProvider => {
  return evmProvider(provider, uiConsole);
};
