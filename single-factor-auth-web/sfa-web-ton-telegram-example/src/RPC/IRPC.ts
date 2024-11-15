import { IProvider } from "@web3auth/base";

export interface RPCResponse<T> {
  data?: T;
  error?: string;
}

export interface IRPC {
  getAccounts(): Promise<RPCResponse<string>>;
  signMessage(message: string): Promise<RPCResponse<string>>;
  getBalance(): Promise<RPCResponse<string>>;
}

export abstract class BaseRPC implements IRPC {
  protected provider: IProvider;
  
  protected constructor(provider: IProvider) {
    this.provider = provider;
  }

  protected async handleRPCCall<T>(operation: () => Promise<T>): Promise<RPCResponse<T>> {
    try {
      const result = await operation();
      return { data: result };
    } catch (error) {
      console.error(`RPC Error:`, error);
      return {
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      };
    }
  }

  abstract getAccounts(): Promise<RPCResponse<string>>;
  abstract signMessage(message: string): Promise<RPCResponse<string>>;
  abstract getBalance(): Promise<RPCResponse<string>>;
}