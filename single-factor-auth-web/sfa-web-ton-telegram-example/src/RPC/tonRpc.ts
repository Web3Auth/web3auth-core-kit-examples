import { getHttpEndpoint } from "@orbs-network/ton-access";
import TonWeb from "tonweb";
import { RPCResponse, BaseRPC } from "./IRPC";
import { IProvider } from "@web3auth/base";

export default class TonRPC extends BaseRPC {
  private tonweb: TonWeb | null = null;
  private static instance: TonRPC | null = null;
  private static rpcEndpoint: string | null = null;

  private constructor(provider: IProvider) {
    super(provider);
  }

  static async getInstance(provider: IProvider): Promise<TonRPC> {
    if (!TonRPC.rpcEndpoint) {
      TonRPC.rpcEndpoint = await getHttpEndpoint({
        network: "testnet",
        protocol: "json-rpc",
      });
    }

    if (!TonRPC.instance) {
      TonRPC.instance = new TonRPC(provider);
      await TonRPC.instance.initialize();
    }
    return TonRPC.instance;
  }

  private async initialize(): Promise<void> {
    if (!TonRPC.rpcEndpoint) throw new Error('RPC endpoint not initialized');
    this.tonweb = new TonWeb(new TonWeb.HttpProvider(TonRPC.rpcEndpoint));
  }

  private async getKeyPair(): Promise<{ publicKey: Uint8Array; secretKey: Uint8Array }> {
    const privateKey = await this.provider.request({ method: "private_key" }) as string;
    if (!privateKey) throw new Error('Private key not found');

    const privateKeyBytes = new Uint8Array(
      privateKey.match(/.{1,2}/g)!.map(byte => parseInt(byte, 16))
    );

    if (privateKeyBytes.length !== 32) {
      const adjustedPrivateKey = new Uint8Array(32);
      adjustedPrivateKey.set(privateKeyBytes.slice(0, 32));
      return TonWeb.utils.nacl.sign.keyPair.fromSeed(adjustedPrivateKey);
    }

    return TonWeb.utils.nacl.sign.keyPair.fromSeed(privateKeyBytes);
  }

  async getAccounts(): Promise<RPCResponse<string>> {
    return this.handleRPCCall(async () => {
      if (!this.tonweb) throw new Error('TON web not initialized');
      
      const keyPair = await this.getKeyPair();
      const WalletClass = this.tonweb.wallet.all['v3R2'];
      const wallet = new WalletClass(this.tonweb.provider, {
        publicKey: keyPair.publicKey
      });
      const address = await wallet.getAddress();
      return address.toString(true, true, true);
    });
  }

  async signMessage(message: string): Promise<RPCResponse<string>> {
    return this.handleRPCCall(async () => {
      const keyPair = await this.getKeyPair();
      const messageBytes = new TextEncoder().encode(message);
      const signature = TonWeb.utils.nacl.sign.detached(messageBytes, keyPair.secretKey);
      return Buffer.from(signature).toString('hex');
    });
  }
}