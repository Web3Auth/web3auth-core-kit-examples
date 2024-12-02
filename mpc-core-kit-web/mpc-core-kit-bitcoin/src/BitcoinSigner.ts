import { secp256k1 } from "@tkey/common-types";
import { Web3AuthMPCCoreKit } from "@web3auth/mpc-core-kit";
import { networks, SignerAsync } from "bitcoinjs-lib";

export function createBitcoinJsSigner(props: { coreKitInstance: Web3AuthMPCCoreKit; network: networks.Network }): SignerAsync {
  return {
    sign: async (msg: Buffer) => {
      let sig = await props.coreKitInstance.sign(msg);
      return sig;
    },
    publicKey: props.coreKitInstance.getPubKeyPoint().toSEC1(secp256k1, true),
    network: props.network,
  };
}
