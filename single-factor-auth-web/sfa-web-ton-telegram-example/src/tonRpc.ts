import type { IProvider } from "@web3auth/base";
import { getHttpEndpoint } from "@orbs-network/ton-access";
import TonWeb from "tonweb";

export default class TonRPC {
    private provider: IProvider;
    private tonweb: TonWeb;
    private rpc: string;

    constructor(provider: IProvider) {
        this.provider = provider;
        this.rpc = ""; // Initialize with an empty string
        this.initializeTonWeb();
    }

    private async initializeTonWeb(): Promise<void> {
        this.rpc = await getHttpEndpoint(); 
        this.tonweb = new TonWeb(new TonWeb.HttpProvider(this.rpc));
    }

    async getAccounts(): Promise<string> {
        try {
            const privateKey = await this.getPrivateKey();
            const keyPair = this.getKeyPairFromPrivateKey(privateKey);
            const WalletClass = this.tonweb.wallet.all['v3R2'];
            const wallet = new WalletClass(this.tonweb.provider, {
                publicKey: keyPair.publicKey
            });
            const address = await wallet.getAddress();
            return address.toString(true, true, true);
        } catch (error) {
            console.error("Error getting accounts:", error);
            return "";
        }
    }

    async getBalance(): Promise<string> {
        try {
            const address = await this.getAccounts();
            const balance = await this.tonweb.getBalance(address);
            return TonWeb.utils.fromNano(balance);
        } catch (error) {
            console.error("Error getting balance:", error);
            return "0";
        }
    }

    async sendTransaction(): Promise<any> {
        try {
            const privateKey = await this.getPrivateKey();
            const keyPair = this.getKeyPairFromPrivateKey(privateKey);
            const WalletClass = this.tonweb.wallet.all['v3R2'];
            const wallet = new WalletClass(this.tonweb.provider, {
                publicKey: keyPair.publicKey
            });

            const address = await wallet.getAddress();
            console.log("Wallet address:", address.toString(true, true, true));

            const balance = await this.tonweb.getBalance(address);
            console.log("Wallet balance:", TonWeb.utils.fromNano(balance));

            const isDeployed = balance !== '0';
            console.log("Is wallet deployed:", isDeployed);

            if (!isDeployed) {
                console.log("Wallet not deployed or has zero balance. Please deploy the wallet and fund it before sending transactions.");
                return { error: "Wallet not deployed or has zero balance" };
            }

            let seqno;
            for (let i = 0; i < 3; i++) {
                try {
                    seqno = await wallet.methods.seqno().call();
                    console.log("Current seqno:", seqno);
                    if (seqno !== null) break;
                } catch (seqnoError) {
                    console.error(`Error getting seqno (attempt ${i + 1}):`, seqnoError);
                }
                await new Promise(resolve => setTimeout(resolve, 2000));
            }

            if (seqno === null) {
                throw new Error("Failed to retrieve seqno after multiple attempts");
            }

            const transfer = wallet.methods.transfer({
                secretKey: keyPair.secretKey,
                toAddress: 'EQD4FPq-PRDieyQKkizFTRtSDyucUIqrj0v_zXJmqaDp6_0t',
                amount: TonWeb.utils.toNano('0.01'),
                seqno: seqno,
                payload: 'Hello, TON!',
                sendMode: 3,
            });

            console.log("Prepared transfer:", transfer);

            const result = await transfer.send();
            console.log("Transaction result:", result);

            return {
                transactionHash: result.hash,
            };
        } catch (error) {
            console.error("Error sending transaction:", error);
            return { error: error.message };
        }
    }

    public getKeyPairFromPrivateKey(privateKey: string): { publicKey: Uint8Array; secretKey: Uint8Array } {
        const privateKeyBytes = new Uint8Array(privateKey.match(/.{1,2}/g)!.map(byte => parseInt(byte, 16)));

        if (privateKeyBytes.length !== 32) {
            const adjustedPrivateKey = new Uint8Array(32);
            adjustedPrivateKey.set(privateKeyBytes.slice(0, 32));
            return TonWeb.utils.nacl.sign.keyPair.fromSeed(adjustedPrivateKey);
        }

        return TonWeb.utils.nacl.sign.keyPair.fromSeed(privateKeyBytes);
    }

    async signMessage(message: string): Promise<string> {
        try {
            const privateKey = await this.getPrivateKey();
            const keyPair = this.getKeyPairFromPrivateKey(privateKey);
            
            const messageBytes = new TextEncoder().encode(message);
            
            const signature = TonWeb.utils.nacl.sign.detached(messageBytes, keyPair.secretKey);
            
            return Buffer.from(signature).toString('hex');
        } catch (error) {
            console.error("Error signing message:", error);
            throw error;
        }
    }

    async getPrivateKey(): Promise<string> {
        try {
            return await this.provider.request({
                method: "private_key",
            });
        } catch (error) {
            console.error("Error getting private key:", error);
            throw error;
        }
    }

}
