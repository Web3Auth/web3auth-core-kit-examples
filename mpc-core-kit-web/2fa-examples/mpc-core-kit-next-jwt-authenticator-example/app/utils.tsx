import BN from "bn.js";
import { keccak256 } from "@toruslabs/torus.js";
import Ec from "elliptic";
import jwt, { Algorithm } from "jsonwebtoken";

const privateKey = "MEECAQAwEwYHKoZIzj0CAQYIKoZIzj0DAQcEJzAlAgEBBCCD7oLrcKae+jVZPGx52Cb/lKhdKxpXjl9eGNa1MlY57A==";
const jwtPrivateKey = `-----BEGIN PRIVATE KEY-----\n${privateKey}\n-----END PRIVATE KEY-----`;

export const generateIdToken = (email: string, alg: Algorithm) => {
  const iat = Math.floor(Date.now() / 1000);
  const payload = {
    iss: "torus-key-test",
    aud: "torus-key-test",
    name: email,
    email,
    scope: "email",
    iat,
    eat: iat + 120,
  };

  const algo = {
    expiresIn: 120,
    algorithm: alg,
  };

  return jwt.sign(payload, jwtPrivateKey, algo);
};

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
