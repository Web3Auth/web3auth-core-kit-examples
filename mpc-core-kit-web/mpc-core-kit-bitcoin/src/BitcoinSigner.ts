import { secp256k1 } from "@tkey/common-types";
import { Web3AuthMPCCoreKit } from "@web3auth/mpc-core-kit";
import { networks, SignerAsync } from "bitcoinjs-lib";
import * as bitcoinjs from "bitcoinjs-lib";
import ECPairFactory from "ecpair";

import ecc from "@bitcoinerlab/secp256k1";

const ECPair = ECPairFactory(ecc);

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


export function createBitcoinJsSignerBip340(props: { coreKitInstance: Web3AuthMPCCoreKit; network: networks.Network }): SignerAsync {
  const bufPubKey = props.coreKitInstance.getPubKeyPoint().toSEC1(secp256k1, true);
  const xOnlyPubKey = bufPubKey.subarray(1, 33);
  const keyPair = ECPair.fromPublicKey(bufPubKey);
  const tweakedChildNode = keyPair.tweak(bitcoinjs.crypto.taggedHash("TapTweak", xOnlyPubKey));  return {
    sign: async (msg: Buffer) => {
      let sig = await props.coreKitInstance.sign(msg);
      return sig;
    },
    signSchnorr: async (msg: Buffer) => {
      let sig = await props.coreKitInstance.sign(msg);
      return sig;
    },
    publicKey: tweakedChildNode.publicKey,
    network: props.network,
  };
}
