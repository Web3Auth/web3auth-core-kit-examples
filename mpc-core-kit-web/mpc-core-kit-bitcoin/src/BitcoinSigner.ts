import { secp256k1 } from "@tkey/common-types";
import { Web3AuthMPCCoreKit } from "@web3auth/mpc-core-kit";
import { networks, SignerAsync } from "bitcoinjs-lib";
import * as bitcoinjs from "bitcoinjs-lib";
import ECPairFactory from "ecpair";

import ecc from "@bitcoinerlab/secp256k1";
import BN from "bn.js";

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
  const tweak = bitcoinjs.crypto.taggedHash("TapTweak", xOnlyPubKey);
  const tweakedChildNode = keyPair.tweak(tweak);
  const pk = tweakedChildNode.publicKey;

  // const pk = props.coreKitInstance.getPubKeyPoint().toSEC1(secp256k1, true);
  return {
    sign: async (msg: Buffer) => {
      let sig = await props.coreKitInstance.sign(msg);
      return sig;
    },
    signSchnorr: async (msg: Buffer) => {
      const keyTweak = new BN(tweak);
      let sig = await props.coreKitInstance.sign(msg, { keyTweak });
      return sig;
    },
    publicKey: pk,
    network: props.network,
  };
}
