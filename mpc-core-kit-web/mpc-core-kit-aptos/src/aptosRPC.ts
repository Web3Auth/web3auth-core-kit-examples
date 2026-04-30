import { Web3AuthMPCCoreKit } from "@web3auth/mpc-core-kit";
import {
  Aptos,
  AptosConfig,
  Network,
  AccountAddress,
  Ed25519PublicKey,
  Ed25519Signature,
  AccountAuthenticatorEd25519,
  generateSigningMessageForTransaction,
  Hex,
} from "@aptos-labs/ts-sdk";

// 1 APT = 100_000_000 octa.
const OCTA_PER_APT = 100_000_000n;

export default class AptosRPC {
  private coreKitInstance: Web3AuthMPCCoreKit;
  private aptos: Aptos;
  private publicKey: Ed25519PublicKey;
  private accountAddress: AccountAddress;

  constructor(coreKitInstance: Web3AuthMPCCoreKit) {
    this.coreKitInstance = coreKitInstance;

    // FROST gives us a 32-byte Ed25519 public key for the user.
    // Aptos derives the legacy auth key (and address, since they coincide for
    // unrotated accounts) as sha3_256(pk || 0x00).
    const pubKeyBytes = Uint8Array.from(coreKitInstance.getPubKeyEd25519());
    this.publicKey = new Ed25519PublicKey(pubKeyBytes);
    this.accountAddress = this.publicKey.authKey().derivedAddress();

    this.aptos = new Aptos(new AptosConfig({ network: Network.DEVNET }));
  }

  getAccount(): string {
    return this.accountAddress.toString();
  }

  async getBalance(): Promise<string> {
    try {
      const octa = await this.aptos.getAccountAPTAmount({ accountAddress: this.accountAddress });
      const total = BigInt(octa);
      const whole = total / OCTA_PER_APT;
      const fraction = total % OCTA_PER_APT;
      return `${whole}.${fraction.toString().padStart(8, "0")} APT`;
    } catch (error) {
      const msg = (error as Error)?.message ?? String(error);
      if (msg.includes("Account not found") || msg.includes("Resource not found")) {
        return "Account not found on chain. Use the faucet to fund it first.";
      }
      return msg;
    }
  }

  async requestFaucet(): Promise<string> {
    try {
      // Devnet faucet funds the account with 1 APT.
      const tx = await this.aptos.fundAccount({
        accountAddress: this.accountAddress,
        amount: 100_000_000, // 1 APT in octa
      });
      return `Funded. Tx hash: ${tx.hash}`;
    } catch (error) {
      return (error as Error)?.message ?? String(error);
    }
  }

  async signMessage(): Promise<string> {
    try {
      const msg = new TextEncoder().encode("Welcome to Web3Auth");
      const signatureRaw = await this.coreKitInstance.sign(Buffer.from(msg));
      return Hex.fromHexInput(signatureRaw).toString();
    } catch (error) {
      return (error as Error)?.message ?? String(error);
    }
  }

  async sendTransaction(): Promise<string> {
    try {
      // Self-transfer of 1000 octa as a minimal demonstration.
      const transaction = await this.aptos.transaction.build.simple({
        sender: this.accountAddress,
        data: {
          function: "0x1::aptos_account::transfer",
          functionArguments: [this.accountAddress, 1000n],
        },
      });

      // The signing message is the BCS-serialized RawTransaction with the Aptos
      // domain separator (sha3_256("APTOS::RawTransaction")) prepended.
      const signingMessage = generateSigningMessageForTransaction(transaction);
      const signatureBytes = await this.coreKitInstance.sign(Buffer.from(signingMessage));

      const senderAuthenticator = new AccountAuthenticatorEd25519(
        this.publicKey,
        new Ed25519Signature(new Uint8Array(signatureBytes)),
      );

      const pendingTx = await this.aptos.transaction.submit.simple({
        transaction,
        senderAuthenticator,
      });

      const committed = await this.aptos.waitForTransaction({ transactionHash: pendingTx.hash });
      if (!committed.success) {
        throw new Error(`Tx failed: ${committed.vm_status}`);
      }

      return pendingTx.hash;
    } catch (error) {
      return (error as Error)?.message ?? String(error);
    }
  }
}
