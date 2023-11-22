import { keccak256 } from "@toruslabs/torus.js";
import BN from "bn.js";
import Ec from "elliptic";

export const getEcCrypto = () => {
  // eslint-disable-next-line new-cap
  return new Ec.ec("secp256k1");
};

export const getHashedPrivateKey = (postboxKey: string, clientId: string): BN => {
  const uid = `${postboxKey}_${clientId}`;
  let hashUid = keccak256(Buffer.from(uid, "utf8"));
  hashUid = hashUid.replace("0x", "");
  return new BN(hashUid, "hex");
};
