import type { SafeEventEmitterProvider } from "@web3auth/base";
import Web3 from "web3";

// import type { provider } from "web3-core";
import { IWalletProvider } from "./walletProvider";

const evmProvider = (provider: SafeEventEmitterProvider | null, uiConsole: (...args: unknown[]) => void): IWalletProvider => {
  const getAddress = async () => {
    console.log("provider info:", provider);
    const web3 = new Web3(provider);

    const address = (await web3.eth.getAccounts())[0];
    return address;
  };

  const getBalance = async () => {
    const web3 = new Web3(provider);
    // const web3 = new Web3(provider as provider);

    const address = (await web3.eth.getAccounts())[0];
    const balance = web3.utils.fromWei(
      await web3.eth.getBalance(address),
      "ether" // Balance is in wei
    );
    return balance;
  };

  const sendTransaction = async (amount: string, destination: string) => {
    const web3 = new Web3(provider);

    const fromAddress = (await web3.eth.getAccounts())[0];

    // Submit transaction to the blockchain and wait for it to be mined
    console.log("Sending transaction...");
    try {
      const receipt = await web3.eth.sendTransaction({
        from: fromAddress,
        to: destination,
        value: amount,
      });
      uiConsole(receipt);
    } catch (e) {
      uiConsole(e);
    }
  };

  const getPrivateKey = async (): Promise<string> => {
    try {
      const privateKey = await provider.request({
        method: "eth_private_key",
      });

      return privateKey as string;
    } catch (error) {
      return error as string;
    }
  };

  return {
    getAddress,
    getBalance,
    sendTransaction,
    getPrivateKey,
  };
};

export default evmProvider;
