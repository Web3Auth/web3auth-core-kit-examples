import { Point, Web3AuthMPCCoreKit } from "@web3auth/mpc-core-kit";
import {networks, SignerAsync} from "bitcoinjs-lib";

export function createBitcoinJsSigner (props: {coreKitInstance: Web3AuthMPCCoreKit, network: networks.Network}) : SignerAsync {
    return {
        sign : async (hash: Buffer, lowR?: boolean) => {
            let sig = await props.coreKitInstance.sign(hash)
            const sigBuffer = Buffer.concat([sig.r, sig.s] );
            return sigBuffer;
        },
        publicKey : Point.fromTkeyPoint(props.coreKitInstance.getTssPublicKey()).toBufferSEC1(true), 
        network : props.network
    }
}
