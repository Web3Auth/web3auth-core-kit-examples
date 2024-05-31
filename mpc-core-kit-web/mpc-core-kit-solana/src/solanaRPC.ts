import { base58, base64 } from "@scure/base";
import { Connection, LAMPORTS_PER_SOL, PublicKey, SystemProgram, Transaction, clusterApiUrl } from "@solana/web3.js";
import { Web3AuthMPCCoreKit } from "@web3auth/mpc-core-kit";
import nacl from "tweetnacl";

export default class SolanaRPC {
    private coreKitInstance: Web3AuthMPCCoreKit;
    private connection: Connection;
    private publicKey: PublicKey;

    constructor(coreKitInstance: Web3AuthMPCCoreKit) {
        this.coreKitInstance = coreKitInstance;
        // Using the devent 
        this.connection = new Connection(clusterApiUrl("devnet"), "confirmed");
        const address = base58.encode(Uint8Array.from(coreKitInstance.getPubKeyEd25519()));
        this.publicKey = new PublicKey(address);
    }

    getAccount(): string {
        try {
            // Uncomment to verify the address is valid Solana Address
            // const isValidAddress = PublicKey.isOnCurve(publicKey.toBytes())
            // console.log(isValidAddress);
            return this.publicKey.toBase58();

        } catch (error) {
            return error as string;
        }
    }

    async getBalance(): Promise<string> {
        try {
            let balanceResponse = await this.connection.getBalance(this.publicKey)
            return (balanceResponse / LAMPORTS_PER_SOL).toString();
        } catch (error) {
            return error as string;
        }
    }

    async sendTransaction(): Promise<string> {
        try {
            const lamportsToSend = 1_000_000;
            const getRecentBlockhash = await this.connection.getLatestBlockhash("confirmed");
            const transferTransaction = new Transaction().add(
                // Self transfer tokens
                SystemProgram.transfer({
                    fromPubkey: this.publicKey,
                    toPubkey: this.publicKey,
                    lamports: lamportsToSend,
                }),
            );

            transferTransaction.recentBlockhash = getRecentBlockhash.blockhash;
            transferTransaction.feePayer = this.publicKey;

            // Sign the serialize message
            const sig = await this.coreKitInstance.sign(transferTransaction.serializeMessage());

            // Append the signature to the transaction
            transferTransaction.addSignature(this.publicKey, sig);
            let hash = await this.connection.sendRawTransaction(transferTransaction.serialize());
            return hash;
        } catch (error) {
            return error as string;
        }
    }

    async requestFaucet(): Promise<string> {
        try {
            const hash = await this.connection.requestAirdrop(this.publicKey, LAMPORTS_PER_SOL);
            return hash;
        } catch (error) {
            return error as string;
        }
    }

    async signMessage(): Promise<string> {
        try {
            const msg = Buffer.from("Welcome to Web3Auth");
            const sig = await this.coreKitInstance.sign(msg);

            // Verify signature
            const result = nacl.sign.detached.verify(
                msg,
                sig,
                this.publicKey.toBytes(),
            );

            console.log("Signature verification result:", result);
            // Return the base64 signature
            return base64.encode(sig);
        } catch (error) {
            return error as string;
        }
    }
}