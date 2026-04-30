import { Web3AuthMPCCoreKit } from "@web3auth/mpc-core-kit";
import { SuiJsonRpcClient, getJsonRpcFullnodeUrl } from "@mysten/sui/jsonRpc";
import { Transaction } from "@mysten/sui/transactions";
import { Ed25519PublicKey } from "@mysten/sui/keypairs/ed25519";
import { messageWithIntent, toSerializedSignature } from "@mysten/sui/cryptography";
import { requestSuiFromFaucetV2, getFaucetHost } from "@mysten/sui/faucet";
import { bcs } from "@mysten/sui/bcs";
import { blake2b } from "@noble/hashes/blake2b";

// 1 SUI = 1_000_000_000 MIST (the smallest unit on Sui).
const MIST_PER_SUI = 1_000_000_000n;

export default class SuiRPC {
  private coreKitInstance: Web3AuthMPCCoreKit;
  private client: SuiJsonRpcClient;
  private publicKey: Ed25519PublicKey;
  private address: string;

  constructor(coreKitInstance: Web3AuthMPCCoreKit) {
    this.coreKitInstance = coreKitInstance;

    // The MPC instance derives a 32-byte Ed25519 public key for this user.
    // Sui addresses (Ed25519) are derived as blake2b256(0x00 || pubkey)[:32].
    const pubKeyBytes = Uint8Array.from(coreKitInstance.getPubKeyEd25519());
    this.publicKey = new Ed25519PublicKey(pubKeyBytes);
    this.address = this.publicKey.toSuiAddress();

    this.client = new SuiJsonRpcClient({
      network: "devnet",
      url: getJsonRpcFullnodeUrl("devnet"),
    });
  }

  getAccount(): string {
    return this.address;
  }

  async getBalance(): Promise<string> {
    try {
      const balance = await this.client.getBalance({ owner: this.address });
      const total = BigInt(balance.totalBalance);
      const whole = total / MIST_PER_SUI;
      const fraction = total % MIST_PER_SUI;
      return `${whole}.${fraction.toString().padStart(9, "0")} SUI`;
    } catch (error) {
      return error as string;
    }
  }

  async requestFaucet(): Promise<string> {
    try {
      const res = await requestSuiFromFaucetV2({
        host: getFaucetHost("devnet"),
        recipient: this.address,
      });
      return JSON.stringify(res);
    } catch (error) {
      return error as string;
    }
  }

  async signMessage(): Promise<string> {
    try {
      const msg = new TextEncoder().encode("Welcome to Web3Auth");

      // Personal-message signing on Sui commits to BCS(vector<u8>) of the message,
      // wrapped with the PersonalMessage intent prefix and hashed with blake2b256.
      const bcsMsg = bcs.vector(bcs.u8()).serialize(msg).toBytes();
      const digest = blake2b(messageWithIntent("PersonalMessage", bcsMsg), { dkLen: 32 });

      const signatureRaw = await this.coreKitInstance.sign(Buffer.from(digest));

      return toSerializedSignature({
        signature: new Uint8Array(signatureRaw),
        signatureScheme: "ED25519",
        publicKey: this.publicKey,
      });
    } catch (error) {
      return error as string;
    }
  }

  async sendTransaction(): Promise<string> {
    try {
      // Self-transfer of 0.001 SUI as a minimal demonstration.
      const tx = new Transaction();
      tx.setSender(this.address);

      const amount = MIST_PER_SUI / 1000n;
      const [coin] = tx.splitCoins(tx.gas, [tx.pure.u64(amount)]);
      tx.transferObjects([coin], tx.pure.address(this.address));

      const txBytes = await tx.build({ client: this.client });

      // Sui requires signing blake2b256( [0,0,0] || bcs(tx_data) ) with Ed25519.
      const digest = blake2b(messageWithIntent("TransactionData", txBytes), { dkLen: 32 });
      const signatureRaw = await this.coreKitInstance.sign(Buffer.from(digest));

      const serializedSignature = toSerializedSignature({
        signature: new Uint8Array(signatureRaw),
        signatureScheme: "ED25519",
        publicKey: this.publicKey,
      });

      const result = await this.client.executeTransactionBlock({
        transactionBlock: txBytes,
        signature: serializedSignature,
        options: { showEffects: true },
      });

      return result.digest;
    } catch (error) {
      return error as string;
    }
  }
}
