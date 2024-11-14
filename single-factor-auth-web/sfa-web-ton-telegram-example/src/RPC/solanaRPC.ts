import { SolanaPrivateKeyProvider, SolanaWallet } from "@web3auth/solana-provider";
import { CHAIN_NAMESPACES, IProvider } from "@web3auth/base";
import { getED25519Key } from "@web3auth/auth-adapter";
import { RPCResponse } from "./IRPC";
import { BaseRPC } from "./IRPC";

export default class SolanaRPC extends BaseRPC {
  private solanaWallet: SolanaWallet | null = null;
  private static instance: SolanaRPC | null = null;

  private constructor(provider: IProvider) {
    super(provider);
  }

  static async getInstance(provider: IProvider): Promise<SolanaRPC> {
    if (!SolanaRPC.instance) {
      SolanaRPC.instance = new SolanaRPC(provider);
      await SolanaRPC.instance.initialize();
    }
    return SolanaRPC.instance;
  }

  private async initialize(): Promise<void> {
    try {
      const privateKey = await this.provider.request({ method: "private_key" }) as string;
      if (!privateKey) throw new Error('Private key not found');

      const solanaProvider = new SolanaPrivateKeyProvider({
        config: {
          chainConfig: {
            chainNamespace: CHAIN_NAMESPACES.SOLANA,
            chainId: "0x3",
            rpcTarget: "https://api.devnet.solana.com",
            displayName: "Solana Devnet",
            blockExplorerUrl: "https://explorer.solana.com/",
            ticker: "SOL",
            tickerName: "Solana",
          },
        },
      });

      const ed25519key = getED25519Key(privateKey).sk.toString("hex");
      await solanaProvider.setupProvider(ed25519key);
      this.solanaWallet = new SolanaWallet(solanaProvider);
    } catch (error) {
      console.error("Error initializing Solana wallet:", error);
      throw error;
    }
  }

  async getAccounts(): Promise<RPCResponse<string>> {
    return this.handleRPCCall(async () => {
      if (!this.solanaWallet) throw new Error('Solana wallet not initialized');
      const accounts = await this.solanaWallet.requestAccounts();
      if (!accounts[0]) throw new Error('No account found');
      return accounts[0];
    });
  }

  async signMessage(message: string): Promise<RPCResponse<string>> {
    return this.handleRPCCall(async () => {
      if (!this.solanaWallet) throw new Error('Solana wallet not initialized');
      const messageBuffer = Buffer.from(message, "utf8");
      const signature = await this.solanaWallet.signMessage(messageBuffer);
      return signature.toString();
    });
  }
}