import Web3 from "web3";
import { RPCResponse, BaseRPC } from "./IRPC";
import { IProvider } from "@web3auth/base";

export default class EthereumRPC extends BaseRPC {
  private web3: Web3;
  private static instance: EthereumRPC | null = null;

  private constructor(provider: IProvider) {
    super(provider);
    this.web3 = new Web3(provider as any);
  }

  static getInstance(provider: IProvider): EthereumRPC {
    if (!EthereumRPC.instance) {
      EthereumRPC.instance = new EthereumRPC(provider);
    }
    return EthereumRPC.instance;
  }

  async getAccounts(): Promise<RPCResponse<string>> {
    return this.handleRPCCall(async () => {
      const accounts = await this.web3.eth.getAccounts();
      if (!accounts[0]) throw new Error('No account found');
      return accounts[0];
    });
  }

  async signMessage(message: string): Promise<RPCResponse<string>> {
    return this.handleRPCCall(async () => {
      const accounts = await this.web3.eth.getAccounts();
      if (!accounts[0]) throw new Error('No account found');
      return this.web3.eth.personal.sign(message, accounts[0], 'test password!');
    });
  }

  async getBalance(): Promise<RPCResponse<string>> {
    return this.handleRPCCall(async () => {
      const balance = await this.web3.eth.getBalance((await this.getAccounts())[0]);
      return balance.toString();
    });
  }
}
