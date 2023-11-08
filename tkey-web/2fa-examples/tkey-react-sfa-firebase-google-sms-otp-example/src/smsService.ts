import { post } from "@toruslabs/http-helpers";
import BN from "bn.js";
import type { ec } from "elliptic";
import Ec from "elliptic";
import { keccak256 } from "ethereum-cryptography/keccak";

class SmsPasswordless {
  readonly smsbackendUrl: string = `${process.env.REACT_APP_BACKEND_ENDPOINT}/api/v1`;

  constructor() {
    if (!process.env.REACT_APP_BACKEND_ENDPOINT) {
      throw new Error(
        "env REACT_APP_BACKEND_ENDPOINT is not defined. You likely don't have an .env file, use one of the example files or create one."
      );
    }
  }

  async registerSmsOTP(privKey: BN, number: string): Promise<string | undefined> {
    const ec = new Ec.ec("secp256k1");
    const privKeyPair: ec.KeyPair = ec.keyFromPrivate(privKey.toString(16, 64));
    const pubKey = privKeyPair.getPublic();
    const sig = ec.sign(keccak256(Buffer.from(number, "utf8")), Buffer.from(privKey.toString(16, 64), "hex"));

    const data = {
      pubKey: {
        x: pubKey.getX().toString(16, 64),
        y: pubKey.getY().toString(16, 64),
      },
      sig: {
        r: sig.r.toString(16, 64),
        s: sig.s.toString(16, 64),
        v: new BN(sig.recoveryParam as number).toString(16, 2),
      },
      number,
    };

    await post<{
      success: boolean;
      id_token?: string;
      message: string;
    }>(`${this.smsbackendUrl}/register`, data);

    // this is to send sms to the user instantly after registration.
    const startData = {
      address: `${pubKey.getX().toString(16, 64)}${pubKey.getY().toString(16, 64)}`,
    };

    // Sends the user sms.
    const resp2 = await post<{ success: boolean; code?: string }>(`${this.smsbackendUrl}/start`, startData);
    return resp2.code;
  }

  async addSmsRecovery(address: string, code: string, factorKey: BN) {
    if (!factorKey) throw new Error("factorKey is not defined");
    if (!address) throw new Error("address is not defined");

    const data = {
      address,
      code,
      data: {
        // If the verification is complete, we save the factorKey for the user address.
        // This factorKey is used to verify the user in the future on a new device and recover tss share.
        factorKey: factorKey.toString(16, 64),
      },
    };

    await post(`${this.smsbackendUrl}/verify`, data);
  }

  async requestSMSOTP(address: string): Promise<string | undefined> {
    const startData = {
      address,
    };
    const resp2 = await post<{ success?: boolean; code?: string }>(`${this.smsbackendUrl}/start`, startData);
    return resp2.code;
  }

  async verifySMSOTPRecovery(address: string, code: string): Promise<BN | undefined> {
    const verificationData = {
      address,
      code,
    };

    const response = await post<{ data?: Record<string, string> }>(`${this.smsbackendUrl}/verify`, verificationData);
    const { data } = response;
    return data ? new BN(data.factorKey, "hex") : undefined;
  }
}

export default new SmsPasswordless();
