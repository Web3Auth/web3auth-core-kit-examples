import { Web3AuthMPCCoreKit } from "@web3auth/mpc-core-kit";
import { PublicKey } from "near-api-js/lib/utils";
import { KeyType } from "near-api-js/lib/utils/key_pair";
import { JsonRpcProvider } from "near-api-js/lib/providers";
import { AccountView } from "@near-js/types/lib/provider/response";
import { Signature, SignedTransaction, createTransaction, encodeTransaction, transfer } from "near-api-js/lib/transaction";
import { AccessKeyViewRaw } from "@near-js/types";
import { base_decode } from "near-api-js/lib/utils/serialize";
import { sha256 } from '@noble/hashes/sha256';
import { base64 } from "@scure/base";
import { parseNearAmount } from "near-api-js/lib/utils/format";

export default class NearRPC {
    private coreKitInstance: Web3AuthMPCCoreKit;
    private publicKey: PublicKey;
    private jsonRPCProvider: JsonRpcProvider

    constructor(coreKitInstance: Web3AuthMPCCoreKit) {
        this.coreKitInstance = coreKitInstance;

        const publicKey = coreKitInstance.getPubKeyEd25519();
        this.publicKey = new PublicKey({ keyType: KeyType.ED25519, data: publicKey });

        this.jsonRPCProvider = new JsonRpcProvider({
            url: "https://near-testnet.gateway.tatum.io",
        });
    }

    getAccount(): string {
        try {
            return Buffer.from(this.publicKey.data).toString('hex');
        } catch (error) {
            return error as string;
        }
    }

    async getBalance(): Promise<string> {
        try {
            let state = await this.jsonRPCProvider.query<AccountView>({
                request_type: 'view_account',
                account_id: this.getAccount(),
                finality: 'optimistic'
            });

            return state.amount;
        } catch (error) {
            return error as string;
        }
    }

    async getAccessKey(): Promise<AccessKeyViewRaw> {
        try {
            let acessKey = await this.jsonRPCProvider.query<AccessKeyViewRaw>({
                request_type: "view_access_key",
                account_id: this.getAccount(),
                finality: 'optimistic',
                public_key: this.publicKey.toString(),
            });

            return acessKey;

        } catch (e) {
            throw e;
        }
    }


    async sendTransaction(): Promise<string> {
        try {
            const accessKey = await this.getAccessKey();
            const nonce = accessKey.nonce + 1;

            const block = await this.jsonRPCProvider.block({ finality: 'final' });
            const blockHash = block.header.hash;

            const transaction = createTransaction(
                this.getAccount(),
                this.publicKey,
                "blackjaguar7625.testnet",
                nonce,
                [transfer(BigInt(parseNearAmount('0.02')!))],
                base_decode(blockHash)
            );

            const serializeTransaction = encodeTransaction(transaction);
            const tssSignature = await this.coreKitInstance.sign(Buffer.from(sha256(serializeTransaction)));

            const signature = new Signature({
                keyType: KeyType.ED25519,
                data: Uint8Array.from(tssSignature)
            });

            const executionDetails = await this.jsonRPCProvider.sendTransaction(new SignedTransaction({
                transaction,
                signature,
            }));

            return executionDetails.transaction.hash;
        } catch (error) {
            return error as string;
        }

    }

    async signMessage(): Promise<string> {
        try {
            const msg = Buffer.from("Welcome to Web3Auth");
            const sig = await this.coreKitInstance.sign(Buffer.from(sha256(Uint8Array.from(msg))));

            // Return the base64 signature
            return base64.encode(sig);
        } catch (error) {
            return error as string;
        }
    }
}