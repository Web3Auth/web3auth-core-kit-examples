import { secp256k1 } from "@tkey/common-types";
import { sigToRSV, Web3AuthMPCCoreKit } from "@web3auth/mpc-core-kit";
import { networks, SignerAsync } from "bitcoinjs-lib";

export function createBitcoinJsSigner(props: { coreKitInstance: Web3AuthMPCCoreKit; network: networks.Network }): SignerAsync {
  return {
    sign: async (hash: Buffer, lowR?: boolean) => {
      let sig = await props.coreKitInstance.sign(hash, true);
      const { r, s } = sigToRSV(sig);
      const sigBuffer = Buffer.concat([r, s]);
      return sigBuffer;
    },
    publicKey: props.coreKitInstance.getPubKeyPoint().toSEC1(secp256k1, true),
    network: props.network,
  };
}
