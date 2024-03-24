import { startAuthentication, startRegistration } from "@simplewebauthn/browser";
import TorusSdk from "@toruslabs/customauth";
import { get, post } from "@toruslabs/http-helpers";
import { keccak256 } from "@toruslabs/torus.js";
import type { SafeEventEmitterProvider } from "@web3auth/base";
import {
  COREKIT_STATUS,
  FactorKeyTypeShareDescription,
  IdTokenLoginParams,
  keyToMnemonic,
  MPCKeyDetails,
  // mnemonicToKey,
  parseToken,
  TssShareType,
  WEB3AUTH_NETWORK,
  Web3AuthMPCCoreKit,
} from "@web3auth/mpc-core-kit";
import BN from "bn.js";
import { generatePrivate } from "eccrypto";
// Firebase libraries for custom authentication
import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider, signInWithPopup, UserCredential } from "firebase/auth";
import * as React from "react";
import { createContext, ReactNode, useCallback, useContext, useEffect, useState } from "react";
import swal from "sweetalert";

import AuthenticatorService from "./authenticatorService";
import SmsPasswordless from "./smsService";
import { getWalletProvider, IWalletProvider } from "./walletProvider";
export const BACKEND_URL = "https://wc-admin.web3auth.com";

const verifier = "w3a-firebase-demo";

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyB0nd9YsPLu-tpdCrsXn8wgsWVAiYEpQ_E",
  authDomain: "web3auth-oauth-logins.firebaseapp.com",
  projectId: "web3auth-oauth-logins",
  storageBucket: "web3auth-oauth-logins.appspot.com",
  messagingSenderId: "461819774167",
  appId: "1:461819774167:web:e74addfb6cc88f3b5b9c92",
};

const coreKitClientId = "BPi5PB_UiIZ-cPz1GtV5i1I2iOSOHuimiXBI0e-Oe_u6X3oVAbCiAZOTEBtTXw4tsluTITPqA8zMsfxIKMjiqNQ";

export interface IMPCCoreKitContext {
  provider: IWalletProvider | null;
  isLoading: boolean;
  user: any;
  address: string;
  balance: string;
  keyDetail: MPCKeyDetails;
  coreKitStatus: COREKIT_STATUS;
  login: () => Promise<void>;
  logout: () => Promise<void>;
  keyDetails: () => Promise<MPCKeyDetails>;
  getUserInfo: () => Promise<any>;
  getAddress: () => Promise<string>;
  getBalance: () => Promise<string>;
  sendTransaction: (amount: string, destination: string) => Promise<void>;
  enableMFA: () => Promise<void>;
  criticalResetAccount: () => Promise<void>;
  setupSmsRecovery: (number: string) => Promise<void>;
  recoverViaNumber: () => Promise<void>;
  setupAuthenticatorRecovery: () => Promise<void>;
  recoverViaAuthenticatorApp: () => Promise<void>;
  setupEmailPasswordlessRecovery: (email: string) => Promise<void>;
  recoverViaEmailPasswordless: (email: string) => Promise<void>;
  setupPasskeyRecovery: (passkey: string) => Promise<void>;
  recoverViaPasskey: (passkey: string) => Promise<void>;
}

export const MPCCoreKitContext = createContext<IMPCCoreKitContext>({
  provider: null,
  isLoading: false,
  user: null,
  address: null,
  balance: null,
  keyDetail: null,
  coreKitStatus: null,
  login: async () => {},
  logout: async () => {},
  keyDetails: async () => null,
  getUserInfo: async () => null,
  getAddress: async () => "",
  getBalance: async () => "",
  sendTransaction: async () => {},
  enableMFA: async () => {},
  criticalResetAccount: async () => {},
  setupSmsRecovery: async () => {},
  recoverViaNumber: async () => {},
  setupAuthenticatorRecovery: async () => {},
  recoverViaAuthenticatorApp: async () => {},
  setupEmailPasswordlessRecovery: async () => {},
  recoverViaEmailPasswordless: async () => {},
  setupPasskeyRecovery: async () => {},
  recoverViaPasskey: async () => {},
});

export function useMPCCoreKit(): IMPCCoreKitContext {
  return useContext(MPCCoreKitContext);
}

interface IMPCCoreKitProps {
  children?: ReactNode;
}

export const MPCCoreKitProvider = ({ children }: IMPCCoreKitProps) => {
  const [coreKitInstance, setCoreKitInstance] = useState<Web3AuthMPCCoreKit | null>(null);
  const [coreKitStatus, setCoreKitStatus] = useState<COREKIT_STATUS>(COREKIT_STATUS.NOT_INITIALIZED);
  const [torusdirectsdk, setTorusdirectsdk] = useState<TorusSdk | null>(null);
  const [provider, setProvider] = useState<IWalletProvider | null>(null);
  const [account, setAccount] = useState<string | null>("0x1234");
  const [balance, setBalance] = useState<string | null>("0");
  const [user, setUser] = useState<any | null>(null);
  const [keyDetail, setKeyDetail] = useState<MPCKeyDetails | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const app = initializeApp(firebaseConfig);

  const uiConsole = (...args: unknown[]): void => {
    const el = document.querySelector("#console");
    if (el) {
      el.innerHTML = JSON.stringify(args || {}, null, 2);
    }
    console.log(...args);
  };

  const setWalletProvider = useCallback(async (web3authProvider: SafeEventEmitterProvider | null) => {
    const walletProvider = getWalletProvider(web3authProvider, uiConsole);
    setProvider(walletProvider);
    // setAddress(await walletProvider.getAddress());
    // setBalance(await walletProvider.getBalance());
  }, []);

  useEffect(() => {
    async function init() {
      try {
        setIsLoading(true);
        const coreKit = new Web3AuthMPCCoreKit({
          web3AuthClientId: coreKitClientId,
          web3AuthNetwork: WEB3AUTH_NETWORK.MAINNET,
        });

        if (coreKit.status === COREKIT_STATUS.REQUIRED_SHARE) {
          uiConsole(
            "required more shares, please enter your backup/ device factor key, or reset account unrecoverable once reset, please use it with caution]"
          );
        }

        setCoreKitInstance(coreKit);
        await coreKit.init();

        const torusSdk = new TorusSdk({
          baseUrl: window.location.origin,
          // user will be redirect to auth page after login
          redirectPathName: "auth",
          enableLogging: true,
          uxMode: "popup",
          network: "testnet",
          web3AuthClientId: "torus-default",
        } as any);
        await torusSdk.init({ skipSw: true });
        setTorusdirectsdk(torusSdk);
      } catch (error) {
        uiConsole(error);
      } finally {
        setIsLoading(false);
      }
    }
    init();
  }, [setWalletProvider]);

  const signInWithGoogle = async (): Promise<UserCredential> => {
    try {
      const auth = getAuth(app);
      const googleProvider = new GoogleAuthProvider();
      const res = await signInWithPopup(auth, googleProvider);
      console.log(res);
      return res;
    } catch (err) {
      console.error(err);
      throw err;
    }
  };

  const login = async () => {
    try {
      if (!coreKitInstance) {
        throw new Error("initiated to login");
      }
      const loginRes = await signInWithGoogle();
      const idToken = await loginRes.user.getIdToken(true);
      const parsedToken = parseToken(idToken);

      const idTokenLoginParams = {
        verifier,
        verifierId: parsedToken.sub,
        idToken,
      } as IdTokenLoginParams;

      await coreKitInstance.loginWithJWT(idTokenLoginParams);

      if (coreKitInstance.status === COREKIT_STATUS.REQUIRED_SHARE) {
        uiConsole(
          "required more shares, please enter your backup/ device factor key, or reset account [unrecoverable once reset, please use it with caution]"
        );
      }
      setCoreKitStatus(coreKitInstance.status);
      // setCoreKitStatus(coreKitInstance.status);
      if (coreKitInstance.provider) {
        console.log("setting wallet provider");
        setWalletProvider(coreKitInstance.provider);
      }
    } catch (err) {
      uiConsole(err);
    }
  };

  const logout = async () => {
    uiConsole("Logging out");
    if (!coreKitInstance) {
      uiConsole("web3auth not initialized yet");
      return;
    }
    await coreKitInstance.logout();
    // setCoreKitStatus(coreKitInstance.status);
    setProvider(null);
    uiConsole("Logged out");
  };

  const keyDetails = async () => {
    if (!coreKitInstance) {
      throw new Error("coreKitInstance not found");
    }
    const result = await coreKitInstance.getKeyDetails();
    setKeyDetail(result);
    uiConsole(result);
    return result;
  };

  const getUserInfo = async () => {
    if (!coreKitInstance) {
      uiConsole("web3auth not initialized yet");
      return;
    }
    const userInfo = await coreKitInstance.getUserInfo();
    setUser(userInfo);
    uiConsole(userInfo);
    return userInfo;
  };

  const getAddress = async () => {
    if (!provider) {
      uiConsole("provider not initialized yet");
      return "";
    }
    const updatedAddress = await provider.getAddress();
    setAccount(updatedAddress);
    uiConsole(updatedAddress);
    return account;
  };

  const getBalance = async () => {
    if (!provider) {
      uiConsole("provider not initialized yet");
      return "";
    }
    const updatedBalance = await provider.getBalance();
    setBalance(updatedBalance);
    uiConsole(updatedBalance);
    return balance;
  };

  const sendTransaction = async (amount: string, destination: string) => {
    if (!provider) {
      uiConsole("provider not initialized yet");
    }
    await provider.sendTransaction(amount, destination);
  };

  const enableMFA = async () => {
    if (!coreKitInstance) {
      throw new Error("coreKitInstance is not set");
    }
    const factorKey = await coreKitInstance.enableMFA({});
    const factorKeyMnemonic = keyToMnemonic(factorKey);

    uiConsole("MFA enabled, device factor stored in local store, deleted hashed cloud key, your backup factor key: ", factorKeyMnemonic);
  };

  const criticalResetAccount = async (): Promise<void> => {
    setIsLoading(true);
    // This is a critical function that should only be used for testing purposes
    // Resetting your account means clearing all the metadata associated with it from the metadata server
    // The key details will be deleted from our server and you will not be able to recover your account
    if (!coreKitInstance) {
      throw new Error("coreKitInstance is not set");
    }

    await coreKitInstance.tKey.storageLayer.setMetadata({
      privKey: new BN(coreKitInstance.metadataKey!, "hex"),
      input: { message: "KEY_NOT_FOUND" },
    });
    uiConsole("reset");
    setProvider(null);
    setIsLoading(false);
  };

  // email passwordless related logic
  const getHashedPrivateKey = (postboxKey: string, clientId: string): BN => {
    const uid = `${postboxKey}_${clientId}`;
    let hashUid = keccak256(Buffer.from(uid, "utf8"));
    hashUid = hashUid.replace("0x", "");
    return new BN(hashUid, "hex");
  };

  const setupSmsRecovery = async (number: string): Promise<void> => {
    try {
      if (!coreKitInstance) {
        throw new Error("coreKitInstance is not set");
      }
      if (!coreKitInstance.tKey.privKey) {
        throw new Error("user is not logged in, tkey is not reconstructed yet.");
      }
      if (!number || number.startsWith("+") === false) {
        throw new Error("number is not set with format +{cc}-{number}");
      }
      // get the tkey address
      const { privKey } = coreKitInstance.tKey;

      // check if we are setting up the sms recovery for the first time.
      // share descriptions contain the details of all the factors/ shares you set up for the user.
      const shareDescriptions = Object.values(coreKitInstance.getKeyDetails().shareDescriptions).map((i) => ((i || [])[0] ? JSON.parse(i[0]) : {}));
      // for sms otp, we have set up a custom share/ factor with module type as "mobile_sms" defined in CustomFactorsModuleType.MOBILE_SMS in this example.
      const shareDescriptionsMobile = shareDescriptions.find((shareDescription) => shareDescription.authenticator === "sms");
      if (shareDescriptionsMobile?.authenticator === "sms") {
        console.log("sms recovery already setup");
        uiConsole("sms console already setup");
        return;
      }

      const result = await SmsPasswordless.registerSmsOTP(privKey, number);
      uiConsole("please use this code to verify your phone number", result);
      console.log("otp code", result);

      const verificationCode = await swal("Enter your backup share, please enter the correct code first time :)", {
        content: "input" as any,
      }).then((value) => {
        return value;
      });

      if (!verificationCode || verificationCode.length !== 6) {
        console.error("Invalid verification code entered");
        uiConsole("Invalid verification code entered");
      }
      setIsLoading(true);
      const { metadataPubKey: pubKey } = coreKitInstance.getKeyDetails();
      const address = `${pubKey.x.toString(16, 64)}${pubKey.y.toString(16, 64)}`;
      const newBackUpFactorKey = new BN(generatePrivate());
      await SmsPasswordless.addSmsRecovery(address, verificationCode, newBackUpFactorKey);

      // setup the sms recovery factor key and share in tkey.
      await coreKitInstance.createFactor({
        factorKey: newBackUpFactorKey,
        shareDescription: FactorKeyTypeShareDescription.Other,
        shareType: TssShareType.RECOVERY,
        additionalMetadata: {
          authenticator: "sms",
          mobile: number,
        },
      });
      // await coreKitInstance.addCustomShare(newBackUpFactorKey, { module: CustomFactorsModuleType.MOBILE_SMS, number });
      uiConsole("sms recovery setup complete");
    } catch (error: unknown) {
      console.error(error);

      if ((error as any).message) {
        uiConsole((error as any).message);
      } else if ((error as any).ok === false) {
        const errorBody = await (error as any).json();
        uiConsole(errorBody);
      } else {
        uiConsole(error as Error);
      }
    }
    setIsLoading(false);
  };

  const recoverViaNumber = async (): Promise<void> => {
    try {
      if (!coreKitInstance) {
        throw new Error("coreKitInstance is not set");
      }

      if (coreKitInstance.status === COREKIT_STATUS.NOT_INITIALIZED) {
        throw new Error("user is not logged in, ");
      }

      const shareDescriptionDetails = coreKitInstance.tKey.metadata.getShareDescription();
      if (!shareDescriptionDetails) {
        throw new Error("keyDetails is not set");
      }

      // check if we are setting up the sms recovery for the first time.
      // share descriptions contain the details of all the factors/ shares you set up for the user.
      const shareDescriptions = Object.values(shareDescriptionDetails).map((i) => ((i || [])[0] ? JSON.parse(i[0]) : {}));
      // for sms otp, we have set up a custom share/ factor with module type as "mobile_sms" defined in CustomFactorsModuleType.MOBILE_SMS in this example.
      const shareDescriptionsMobile = shareDescriptions.find((shareDescription) => shareDescription.authenticator === "sms");
      if (!shareDescriptionsMobile) {
        console.log(shareDescriptions);
        console.error("sms recovery not setup");
        uiConsole("sms recovery not setup");
        return;
      }

      setIsLoading(true);
      console.log("sms recovery already setup", shareDescriptionsMobile);

      const { number } = shareDescriptionsMobile;
      const { pubKey } = coreKitInstance.tKey.getKeyDetails();
      const address = `${pubKey.x.toString(16, 64)}${pubKey.y.toString(16, 64)}`;
      const result = await SmsPasswordless.requestSMSOTP(address);
      uiConsole("please use this code to verify your phone number", number, "code", result);
      console.log("otp code", result);

      const verificationCode = await swal("Enter your backup share, please enter the correct code first time :)", {
        content: "input" as any,
      }).then((value) => {
        return value;
      });

      if (!verificationCode || verificationCode.length !== 6) {
        console.error("Invalid verification code entered");
        uiConsole("Invalid verification code entered");
      }

      const backupFactorKey = await SmsPasswordless.verifySMSOTPRecovery(address, verificationCode);
      if (!backupFactorKey) {
        throw new Error("Invalid verification code entered");
      }

      await coreKitInstance.inputFactorKey(backupFactorKey);
      if (coreKitInstance.provider) {
        console.log("setting wallet provider");
        setWalletProvider(coreKitInstance.provider);
      }
      uiConsole("recover with sms complete");
      setCoreKitStatus(coreKitInstance.status);
    } catch (error: unknown) {
      console.error(error);
      if ((error as any).ok === false) {
        const errorBody = await (error as any).json();
        uiConsole(errorBody);
      } else {
        uiConsole(error as Error);
      }
    }
    setIsLoading(false);
  };

  const setupAuthenticatorRecovery = async (): Promise<void> => {
    try {
      if (!coreKitInstance) {
        throw new Error("coreKitInstance is not set");
      }
      if (coreKitInstance.status !== COREKIT_STATUS.LOGGED_IN) {
        throw new Error("user is not logged in, tkey is not reconstructed yet.");
      }

      // get the tkey address
      const { privKey } = coreKitInstance.tKey;

      // check if we are setting up the sms recovery for the first time.
      // share descriptions contain the details of all the factors/ shares you set up for the user.
      const shareDescriptions = Object.values(coreKitInstance.getKeyDetails().shareDescriptions).map((i) => ((i || [])[0] ? JSON.parse(i[0]) : {}));
      // for authenticator, we have set up a custom share/ factor with module type as "authenticator" defined in CustomFactorsModuleType.AUTHENTICATOR in this example.

      const shareDescriptionsMobile = shareDescriptions.find((shareDescription) => shareDescription.authenticator === "authenticator");
      if (shareDescriptionsMobile?.authenticator === "authenticator") {
        console.log("authenticator recovery already setup");
        uiConsole("authenticator recovery already setup");
        return;
      }

      const secretKey = AuthenticatorService.generateSecretKey();
      await AuthenticatorService.register(privKey, secretKey);
      uiConsole("please use this secret key to enter any authenticator app like google", secretKey);
      console.log("secret key", secretKey);

      const verificationCode = await swal(
        `Enter your authenticator code for this secret key: ${secretKey}, please enter the correct code first time :)`,
        {
          content: "input" as any,
        }
      ).then((value) => {
        return value;
      });

      if (!verificationCode) {
        console.error("Invalid verification code entered");
        uiConsole("Invalid verification code entered");
      }
      setIsLoading(true);

      const { pubKey } = coreKitInstance.tKey.getKeyDetails();
      const address = `${pubKey.x.toString(16, 64)}${pubKey.y.toString(16, 64)}`;
      const newBackUpFactorKey = new BN(generatePrivate());
      await AuthenticatorService.addAuthenticatorRecovery(address, verificationCode, newBackUpFactorKey);

      // setup the authenticator recovery factor key and share in tkey.
      // for authenticator, we have set up a custom share/ factor with module type as "authenticator" defined in CustomFactorsModuleType.AUTHENTICATOR in this example.
      // for security reasons, we do not store the secret key in tkey.
      await coreKitInstance.createFactor({
        factorKey: newBackUpFactorKey,
        shareType: TssShareType.RECOVERY,
        shareDescription: FactorKeyTypeShareDescription.Other,
        additionalMetadata: {
          authenticator: "authenticator",
        },
      });
      uiConsole("authenticator recovery setup complete");
    } catch (error: unknown) {
      console.error(error);
      if ((error as any).message) {
        uiConsole((error as any).message);
      } else if ((error as any).ok === false) {
        const errorBody = await (error as any).json();
        uiConsole(errorBody);
      } else {
        uiConsole(error as Error);
      }
    }
    setIsLoading(false);
  };

  const recoverViaAuthenticatorApp = async (): Promise<void> => {
    try {
      if (!coreKitInstance) {
        throw new Error("coreKitInstance is not set");
      }

      if (coreKitInstance.status === COREKIT_STATUS.NOT_INITIALIZED) {
        throw new Error("user is not logged in, ");
      }

      const shareDescriptionDetails = coreKitInstance.tKey.metadata.getShareDescription();
      if (!shareDescriptionDetails) {
        throw new Error("keyDetails is not set");
      }

      // check if we are setting up the sms recovery for the first time.
      // share descriptions contain the details of all the factors/ shares you set up for the user.
      const shareDescriptions = Object.values(shareDescriptionDetails).map((i) => ((i || [])[0] ? JSON.parse(i[0]) : {}));
      // for authenticator, we have set up a custom share/ factor with module type as "authenticator" defined in CustomFactorsModuleType.AUTHENTICATOR in this example.
      const shareDescriptionsMobile = shareDescriptions.find((shareDescription) => shareDescription.authenticator === "authenticator");
      if (!shareDescriptionsMobile) {
        console.error("authenticator recovery not setup");
        uiConsole("authenticator recovery not setup");
        return;
      }

      console.log("authenticator recovery already setup", shareDescriptionsMobile);

      const { pubKey } = coreKitInstance.tKey.getKeyDetails();
      const address = `${pubKey.x.toString(16, 64)}${pubKey.y.toString(16, 64)}`;

      const verificationCode = await swal("Enter your authenticator code, please enter the correct code first time :)", {
        content: "input" as any,
      }).then((value) => {
        return value;
      });

      if (!verificationCode) {
        console.error("Invalid verification code entered");
        uiConsole("Invalid verification code entered");
      }
      setIsLoading(true);

      const backupFactorKey = await AuthenticatorService.verifyAuthenticatorRecovery(address, verificationCode);
      if (!backupFactorKey) {
        throw new Error("Invalid verification code entered");
      }

      await coreKitInstance.inputFactorKey(backupFactorKey);
      if (coreKitInstance.provider) setWalletProvider(coreKitInstance.provider);
    } catch (error: unknown) {
      console.error(error);
      if ((error as any).ok === false) {
        const errorBody = await (error as any).json();
        uiConsole(errorBody);
      } else {
        uiConsole(error as Error);
      }
    }
    setIsLoading(false);
  };

  const setupEmailPasswordlessRecovery = async (email: string) => {
    try {
      if (!torusdirectsdk.isInitialized) {
        uiConsole("torusdirectsdk not initialized yet");
        return;
      }
      if (!coreKitInstance) {
        throw new Error("coreKitInstance not found");
      }
      // Triggering Login using Service Provider ==> opens the popup
      console.log("starting login");
      const loginRes = await torusdirectsdk.triggerLogin({
        typeOfLogin: "jwt",
        verifier: "email-passwordless-web3auth",
        jwtParams: {
          domain: "https://wc-auth.web3auth.com",
          verifierIdField: "name",
          connection: "email",
          login_hint: email,
        },
        clientId: "QQRQNGxJ80AZ5odiIjt1qqfryPOeDcb1",
      });
      console.log("loginRes", loginRes);
      const postboxkey = loginRes.oAuthKeyData.privKey;
      const newBackUpFactorKey = getHashedPrivateKey(postboxkey, coreKitClientId)! as BN;
      await coreKitInstance.createFactor({
        factorKey: newBackUpFactorKey,
        shareDescription: FactorKeyTypeShareDescription.Other,
        shareType: TssShareType.RECOVERY,
      });
      uiConsole("setup email passwordless complete");
    } catch (error) {
      uiConsole(error);
    }
  };

  const recoverViaEmailPasswordless = async (email: string) => {
    try {
      if (!torusdirectsdk) {
        uiConsole("torusdirectsdk not initialized yet");
        return;
      }
      if (!coreKitInstance) {
        throw new Error("coreKitInstance not found");
      }
      // Triggering Login using customAuth
      const loginRes = await torusdirectsdk.triggerLogin({
        typeOfLogin: "jwt",
        verifier: "email-passwordless-web3auth",
        jwtParams: {
          domain: "https://wc-auth.web3auth.com",
          verifierIdField: "name",
          connection: "email",
          login_hint: email,
        },
        clientId: "QQRQNGxJ80AZ5odiIjt1qqfryPOeDcb1",
      });
      console.log("loginRes", loginRes);
      const postboxkey = loginRes.oAuthKeyData.privKey;

      const newBackUpFactorKey = getHashedPrivateKey(postboxkey, coreKitClientId);
      await coreKitInstance.inputFactorKey(newBackUpFactorKey);
      if (coreKitInstance.provider) setWalletProvider(coreKitInstance.provider);
      uiConsole("recover with email passwordless complete");
    } catch (error) {
      uiConsole(error);
    }
  };

  const setupPasskeyRecovery = async (email: string) => {
    try {
      if (!coreKitInstance) {
        throw new Error("initiated to login");
      }

      const url = new URL(`${BACKEND_URL}/api/v2/webauthn-generate-registration-options`);
      url.searchParams.append("email", email);
      const resp = (await get(url.href)) as any;
      const attestationResponse = await startRegistration(resp);
      const url2 = new URL(`${BACKEND_URL}/api/v2/webauthn-verify-registration`);
      const resp2 = await post<{ verified: boolean; id_token: string }>(url2.href, { attestationResponse, email });
      if (resp2.verified) {
        // Registration successful
        console.log("Registration successful");
        // get id token
        const idToken = resp2.id_token;

        const { sub } = parseToken(idToken);
        const passkeyVerifier = "w3a-firebase-demo";
        const loginDetails = await torusdirectsdk?.getTorusKey(passkeyVerifier, sub, { verifier_id: sub }, idToken as string);

        const oauthKey = loginDetails?.oAuthKeyData.privKey;
        const newBackUpFactorKey = new BN(oauthKey.toString(), "hex");

        await coreKitInstance.createFactor({
          factorKey: newBackUpFactorKey,
          shareType: TssShareType.RECOVERY,
          shareDescription: FactorKeyTypeShareDescription.Other,
          additionalMetadata: {
            authenticator: "authenticator",
          },
        });
        uiConsole("authenticator recovery setup complete");
      } else {
        throw new Error("Registration failed");
      }
    } catch (error) {
      console.error(error);
      uiConsole(error);
    }
  };

  const recoverViaPasskey = async (email: string) => {
    try {
      if (!coreKitInstance) {
        throw new Error("initiated to login");
      }

      const url = new URL(`${BACKEND_URL}/api/v2/webauthn-generate-authentication-options`);
      url.searchParams.append("email", email);
      const resp = (await get(url.href)) as any;
      const attestationResponse = await startAuthentication(resp);
      const url2 = new URL(`${BACKEND_URL}/api/v2/webauthn-verify-authentication`);
      const resp2 = await post<{ verified: boolean; id_token: string }>(url2.href, { attestationResponse, email });
      if (resp2.verified) {
        // Registration successful
        console.log("Login successful");
        const idToken = resp2.id_token;
        // get id token
        const { sub } = parseToken(idToken);
        const passkeyVerifier = "w3a-firebase-demo";
        const loginDetails = await torusdirectsdk?.getTorusKey(passkeyVerifier, sub, { verifier_id: sub }, idToken as string);

        const oauthKey = loginDetails?.oAuthKeyData.privKey;
        const backupFactorKey = new BN(oauthKey.toString(), "hex");

        await coreKitInstance.inputFactorKey(backupFactorKey);
        if (coreKitInstance.provider) setWalletProvider(coreKitInstance.provider);
      } else {
        throw new Error("Login failed");
      }
    } catch (error) {
      console.error(error);
    }
  };

  const contextProvider = {
    provider,
    user,
    isLoading,
    address: account,
    balance,
    keyDetail,
    coreKitStatus,
    login,
    logout,
    keyDetails,
    getUserInfo,
    getAddress,
    getBalance,
    sendTransaction,
    enableMFA,
    criticalResetAccount,
    setupSmsRecovery,
    recoverViaNumber,
    setupAuthenticatorRecovery,
    recoverViaAuthenticatorApp,
    setupEmailPasswordlessRecovery,
    recoverViaEmailPasswordless,
    setupPasskeyRecovery,
    recoverViaPasskey,
  };
  return <MPCCoreKitContext.Provider value={contextProvider}>{children}</MPCCoreKitContext.Provider>;
};
