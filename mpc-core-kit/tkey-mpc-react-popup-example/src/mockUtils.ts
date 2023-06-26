import KJUR from "jsrsasign";

import TorusUtils from "@toruslabs/torus.js";
import { TORUS_NETWORK } from "@toruslabs/constants";
import { NODE_DETAILS_SAPPHIRE_DEVNET } from "@toruslabs/fnd-base";


const { torusNodeSSSEndpoints } = NODE_DETAILS_SAPPHIRE_DEVNET

const torusNodeEndpoints = torusNodeSSSEndpoints as string[]

const torus = new TorusUtils({
    clientId: "YOUR_CLIENT_ID",
    network: TORUS_NETWORK.SAPPHIRE_DEVNET,
    enableOneKey: true,
  });

const jwtPrivateKey = `-----BEGIN PRIVATE KEY-----\nMEECAQAwEwYHKoZIzj0CAQYIKoZIzj0DAQcEJzAlAgEBBCCD7oLrcKae+jVZPGx52Cb/lKhdKxpXjl9eGNa1MlY57A==\n-----END PRIVATE KEY-----`;
export const generateIdToken = (email: any) => {
  const alg = "ES256";
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

  const options = {
    expiresIn: 120,
    algorithm: alg,
  };

  const header = { alg, typ: "JWT" };
  // @ts-ignore
  const token = KJUR.jws.JWS.sign(alg, header, payload, jwtPrivateKey, options);

  return token;
};

export async function fetchPostboxKeyAndSigs(opts: any) {
  const { verifierName, verifierId } = opts;
  const token = generateIdToken(verifierId);

  const retrieveSharesResponse = await torus.retrieveShares(torusNodeEndpoints, verifierName, { verifier_id: verifierId }, token);

  const signatures: any = [];
  retrieveSharesResponse.sessionTokenData.filter((session) => {
    if (session) {
      signatures.push(
        JSON.stringify({
          data: session.token,
          sig: session.signature,
        })
      );
    }
    return null;
  });

  return {
    signatures,
    postboxkey: retrieveSharesResponse.privKey.toString(),
  };
}
