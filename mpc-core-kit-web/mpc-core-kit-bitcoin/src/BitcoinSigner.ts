import { secp256k1 } from "@tkey/common-types";
import { sigToRSV, Web3AuthMPCCoreKit } from "@web3auth/mpc-core-kit";
import { networks, SignerAsync } from "bitcoinjs-lib";
import { recover } from "@bitcoinerlab/secp256k1";

export function createBitcoinJsSigner(props: { coreKitInstance: Web3AuthMPCCoreKit; network: networks.Network }): SignerAsync {
  return {
    sign: async (hash: Buffer, lowR?: boolean) => {
      let sig = await props.coreKitInstance.sign(hash);
      console.log("sig", sig);
      const { r, s,v } = sigToRSV(sig);
      console.log("r", r);
      console.log("s", s);
      const sigBuffer = Buffer.concat([r, s]);
      console.log("sigBuffer", sigBuffer);

      const recoverPub = recover( new Uint8Array(hash.buffer),new Uint8Array(sigBuffer.buffer), v ? 1 :0 , true)
      console.log("recoverPub", recoverPub)
      console.log(props.coreKitInstance.getPubKeyPoint().toSEC1(secp256k1, true))
      return sigBuffer;
    },
    publicKey: props.coreKitInstance.getPubKeyPoint().toSEC1(secp256k1, true),
    network: props.network,
  };
}
