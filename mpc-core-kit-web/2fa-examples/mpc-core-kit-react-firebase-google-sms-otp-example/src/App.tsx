/* eslint-disable @typescript-eslint/no-shadow */
import "./App.css";

import type { SafeEventEmitterProvider } from "@web3auth/base";
import {
  COREKIT_STATUS,
  FactorKeyTypeShareDescription,
  getWebBrowserFactor,
  keyToMnemonic,
  mnemonicToKey,
  IdTokenLoginParams,
  // mnemonicToKey,
  parseToken,
  Point,
  TssSecurityQuestion,
  TssShareType,
  WEB3AUTH_NETWORK,
  Web3AuthMPCCoreKit,
} from "@web3auth/mpc-core-kit";
import BN from "bn.js";
import { generatePrivate } from "eccrypto";
import { useEffect, useState } from "react";
import swal from "sweetalert";
import Web3 from "web3";
import type { provider } from "web3-core";

import AuthenticatorService from "./authenticatorService";
import Loading from "./Loading";
import SmsPasswordless from "./smsService";
import { generateIdToken } from "./utils";

import { initializeApp } from "firebase/app";
import { GoogleAuthProvider, getAuth, signInWithPopup, UserCredential } from "firebase/auth";

const uiConsole = (...args: any[]): void => {
  const el = document.querySelector("#console>p");
  if (el) {
    el.innerHTML = JSON.stringify(args || {}, null, 2);
  }
  console.log(...args);
};

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyB0nd9YsPLu-tpdCrsXn8wgsWVAiYEpQ_E",
  authDomain: "web3auth-oauth-logins.firebaseapp.com",
  projectId: "web3auth-oauth-logins",
  storageBucket: "web3auth-oauth-logins.appspot.com",
  messagingSenderId: "461819774167",
  appId: "1:461819774167:web:e74addfb6cc88f3b5b9c92",
};

function App() {
  const [backupFactorKey, setBackupFactorKey] = useState<string | undefined>("");
  // const [loginResponse, setLoginResponse] = useState<any>(null);
  const [coreKitInstance, setCoreKitInstance] = useState<Web3AuthMPCCoreKit | null>(null);
  const [coreKitStatus, setCoreKitStatus] = useState<COREKIT_STATUS>(COREKIT_STATUS.NOT_INITIALIZED);
  const [provider, setProvider] = useState<SafeEventEmitterProvider | null>(null);
  const [web3, setWeb3] = useState<any>(null);
  const [seedPhrase, setSeedPhrase] = useState<string>("");
  const [number, setNumber] = useState<string>("");
  const [answer, setAnswer] = useState<string | undefined>(undefined);
  const [newAnswer, setNewAnswer] = useState<string | undefined>(undefined);
  const [question, setQuestion] = useState<string | undefined>("");
  const [questionInput, setQuestionInput] = useState<string>("");
  const [newQuestion, setNewQuestion] = useState<string | undefined>(undefined);
  const [isLoading, setIsLoading] = useState(false);
  const [autoRecover, setAutoRecover] = useState(false);
  const [factorPubToDelete, setFactorPubToDelete] = useState<string>("");
  const app = initializeApp(firebaseConfig);

  const securityQuestion: TssSecurityQuestion = new TssSecurityQuestion();

  useEffect(() => {
    const init = async () => {
      const coreKitInstance = new Web3AuthMPCCoreKit({
        web3AuthClientId: "torus-key-test",
        web3AuthNetwork: WEB3AUTH_NETWORK.MAINNET,
        uxMode: "popup",
      });
      await coreKitInstance.init();
      setCoreKitInstance(coreKitInstance);

      if (coreKitInstance.provider) setProvider(coreKitInstance.provider);
      if (coreKitInstance.status === COREKIT_STATUS.REQUIRED_SHARE) {
        uiConsole(
          "required more shares, please enter your backup/ device factor key, or reset account unrecoverable once reset, please use it with caution]"
        );
      }

      setCoreKitStatus(coreKitInstance.status);

      try {
        if (coreKitInstance.status === COREKIT_STATUS.LOGGED_IN) {
          const question = await securityQuestion.getQuestion(coreKitInstance);
          console.log(question);
          if (question) {
            setQuestion(question);
          }
        }
      } catch {}
    };
    init();
  }, []);

  useEffect(() => {
    if (provider) {
      const web3 = new Web3(provider as provider);
      setWeb3(web3);
    }
  }, [provider]);

  const keyDetails = async () => {
    if (!coreKitInstance) {
      throw new Error("coreKitInstance not found");
    }
    uiConsole(coreKitInstance.getKeyDetails());
  };

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
      console.log("token", parsedToken);

      const idTokenLoginParams = {
        verifier: "w3a-firebase-demo",
        verifierId: parsedToken.sub,
        idToken,
      } as IdTokenLoginParams;

      await coreKitInstance.loginWithJWT(idTokenLoginParams);

      try {
        let result = securityQuestion.getQuestion(coreKitInstance!);
        setQuestion(result);
      } catch (e) {
        setQuestion(undefined);
        uiConsole(e);
      }

      if (coreKitInstance.status === COREKIT_STATUS.REQUIRED_SHARE) {
        uiConsole(
          "required more shares, please enter your backup/ device factor key, or reset account [unrecoverable once reset, please use it with caution]"
        );
      }

      setCoreKitStatus(coreKitInstance.status);

      if (coreKitInstance.provider) setProvider(coreKitInstance.provider);
      try {
        const question = await securityQuestion.getQuestion(coreKitInstance);
        console.log(question);
        if (question) {
          setQuestion(question);
        }
      } catch {}
    } catch (error: unknown) {
      if ((error as Error).message) {
        console.log("required more shares");
        uiConsole((error as Error).message);
        setIsLoading(false);
      } else {
        console.error(error);
        uiConsole(error);
        setIsLoading(false);
      }
    }
    setIsLoading(false);
  };

  const logout = async () => {
    if (!coreKitInstance) {
      throw new Error("coreKitInstance not found");
    }
    await coreKitInstance.logout();
    uiConsole("Log out");
    setProvider(null);
    // setLoginResponse(null);
    await coreKitInstance.init();
    window.location.reload();
  };

  const getUserInfo = (): void => {
    const user = coreKitInstance?.getUserInfo();
    uiConsole(user);
  };

  // const getLoginResponse = (): void => {
  //   uiConsole(loginResponse);
  // };

  const exportShare = async (): Promise<void> => {
    if (!provider) {
      throw new Error("provider is not set.");
    }
    setIsLoading(true);
    try {
      const share = await coreKitInstance?.createFactor({
        shareType: TssShareType.RECOVERY,
      });
      uiConsole(share);
    } catch (error: unknown) {
      if ((error as Error).message) {
        uiConsole((error as Error).message);
      } else {
        uiConsole(error);
      }
    }
    setIsLoading(false);
  };

  const deleteFactor = async (): Promise<void> => {
    setIsLoading(true);
    try {
      if (!coreKitInstance) {
        throw new Error("coreKitInstance is not set");
      }

      const pubBuffer = Buffer.from(factorPubToDelete, "hex");
      const pub = Point.fromBufferSEC1(pubBuffer);
      await coreKitInstance.deleteFactor(pub.toTkeyPoint());
      uiConsole("factor deleted");
    } catch (error: unknown) {
      if ((error as Error).message) {
        uiConsole((error as Error).message);
      } else {
        uiConsole(error);
      }
    }
    setIsLoading(false);
  };

  const getDeviceShare = async () => {
    const factorKey = await getWebBrowserFactor(coreKitInstance!);
    if (autoRecover) {
      await coreKitInstance?.inputFactorKey(new BN(factorKey!, "hex"));
      if (coreKitInstance?.provider) setProvider(coreKitInstance.provider);
    } else {
      setBackupFactorKey(factorKey);
      uiConsole("Device share: ", factorKey);
    }
    uiConsole("Device share: ", factorKey);
  };

  const enableMFA = async () => {
    if (!coreKitInstance) {
      throw new Error("coreKitInstance is not set");
    }
    setIsLoading(true);
    try {
      const factorKey = await coreKitInstance.enableMFA({});
      const factorKeyMnemonic = await keyToMnemonic(factorKey);
      uiConsole("MFA enabled, device factor stored in local store, deleted hashed cloud key, your backup factor key: ", factorKeyMnemonic);
    } catch (error: unknown) {
      if ((error as Error).message) {
        uiConsole((error as Error).message);
      } else {
        uiConsole(error);
      }
    }
    setIsLoading(false);
  };

  const inputBackupFactorKey = async () => {
    try {
      if (!coreKitInstance) {
        throw new Error("coreKitInstance not found");
      }
      if (!backupFactorKey) {
        throw new Error("backupFactorKey not found");
      }
      let factorKey: BN;
      try {
        factorKey = new BN(mnemonicToKey(backupFactorKey), "hex");
      } catch {
        factorKey = new BN(backupFactorKey, "hex");
      }

      // const factorKey = new BN(backupFactorKey, "hex");
      setIsLoading(true);
      await coreKitInstance.inputFactorKey(factorKey);

      if (coreKitInstance.status === COREKIT_STATUS.REQUIRED_SHARE) {
        uiConsole(
          "required more shares even after inputing backup factor key, please enter your backup/ device factor key, or reset account [unrecoverable once reset, please use it with caution]"
        );
      }

      if (coreKitInstance.provider) {
        setProvider(coreKitInstance.provider);
      }
    } catch (error: unknown) {
      if ((error as Error).message) {
        uiConsole((error as Error).message);
      } else {
        uiConsole(error);
      }
    }
    setIsLoading(false);
  };

  const submitBackupShare = async (): Promise<void> => {
    if (!coreKitInstance) {
      throw new Error("coreKitInstance is not set");
    }
    if (!backupFactorKey) {
      throw new Error("seedPhrase is not set");
    }
    // const key = mnemonicToKey(seedPhrase);
    // const key = seedPhrase;
    const key = backupFactorKey || "";
    console.log(backupFactorKey, "hex");
    await coreKitInstance.inputFactorKey(new BN(key, "hex"));
    uiConsole("submitted");
    if (coreKitInstance.provider) setProvider(coreKitInstance.provider);
  };

  const setupSmsRecovery = async (): Promise<void> => {
    try {
      if (!coreKitInstance) {
        throw new Error("coreKitInstance is not set");
      }
      if (!coreKitInstance.tKey.privKey) {
        throw new Error("user is not logged in, tkey is not reconstructed yet.");
      }
      if (!number || number.startsWith("+") === false) {
        throw new Error("number is not set with fromat +{cc}-{number}");
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
      if (autoRecover) {
        await coreKitInstance.inputFactorKey(backupFactorKey);
        if (coreKitInstance.provider) setProvider(coreKitInstance.provider);
      } else {
        setBackupFactorKey(backupFactorKey.toString("hex"));
        uiConsole("Authenticator App share: ", backupFactorKey.toString("hex"));
      }
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

      if (autoRecover) {
        await coreKitInstance.inputFactorKey(backupFactorKey);
        if (coreKitInstance.provider) setProvider(coreKitInstance.provider);
      } else {
        setBackupFactorKey(backupFactorKey.toString("hex"));
        uiConsole("Authenticator App share: ", backupFactorKey.toString("hex"));
      }
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

  const getChainID = async () => {
    if (!web3) {
      return;
    }
    const chainId = await web3.eth.getChainId();
    uiConsole(chainId);
    return chainId;
  };

  // const deleteLocalStore = () => {
  //   localStorage.removeItem("corekit_store");
  //   uiConsole("local tkey share deleted, pls logout.");
  // };

  const getAccounts = async () => {
    if (!web3) {
      console.log("web3 not initialized yet");
      return;
    }
    const address = (await web3.eth.getAccounts())[0];
    uiConsole(address);
    return address;
  };

  const getBalance = async () => {
    if (!web3) {
      console.log("web3 not initialized yet");
      return;
    }
    const address = (await web3.eth.getAccounts())[0];
    const balance = web3.utils.fromWei(
      await web3.eth.getBalance(address) // Balance is in wei
    );
    uiConsole(balance);
    return balance;
  };

  const signMessage = async (): Promise<any> => {
    if (!web3) {
      console.log("web3 not initialized yet");
      return;
    }
    const fromAddress = (await web3.eth.getAccounts())[0];
    const originalMessage = [
      {
        type: "string",
        name: "fullName",
        value: "Satoshi Nakamoto",
      },
      {
        type: "uint32",
        name: "userId",
        value: "1212",
      },
    ];
    const params = [originalMessage, fromAddress];
    const method = "eth_signTypedData";
    setIsLoading(true);
    const signedMessage = await (web3.currentProvider as any)?.sendAsync({
      id: 1,
      method,
      params,
      fromAddress,
    });
    uiConsole(signedMessage);
    setIsLoading(false);
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

  const sendTransaction = async () => {
    if (!web3) {
      console.log("web3 not initialized yet");
      return;
    }
    const fromAddress = (await web3.eth.getAccounts())[0];

    const destination = "0x2E464670992574A613f10F7682D5057fB507Cc21";
    const amount = web3.utils.toWei("0.0001"); // Convert 1 ether to wei

    // Submit transaction to the blockchain and wait for it to be mined
    setIsLoading(true);
    uiConsole("Sending transaction...");
    try {
      const receipt = await web3.eth.sendTransaction({
        from: fromAddress,
        to: destination,
        value: amount,
      });
      uiConsole(receipt);
    } catch (e) {
      uiConsole(e);
    }
    setIsLoading(false);
  };

  // security question related logic

  const recoverSecurityQuestionFactor = async () => {
    if (!coreKitInstance) {
      throw new Error("coreKitInstance not found");
    }

    try {
      const result = securityQuestion.getQuestion(coreKitInstance);
      setQuestion(result);

      const answer = await swal(`${result}`, {
        content: "input" as any,
      }).then((value) => {
        return value;
      });

      setIsLoading(true);
      const factorKey = await securityQuestion.recoverFactor(coreKitInstance, answer);
      if (autoRecover) {
        await coreKitInstance.inputFactorKey(new BN(factorKey, "hex"));
        if (coreKitInstance.provider) setProvider(coreKitInstance.provider);
      } else {
        setBackupFactorKey(factorKey);
        uiConsole("Security Question share: ", factorKey);
      }
    } catch (e) {
      setQuestion(undefined);
      uiConsole("Security Question not setup");
    }
    setIsLoading(false);
  };

  const createSecurityQuestion = async (question: string, answer: string) => {
    if (!coreKitInstance) {
      throw new Error("coreKitInstance is not set");
    }
    setIsLoading(true);
    try {
      if (!question || !answer) {
        throw new Error("question or answer is not set");
      }
      await securityQuestion.setSecurityQuestion({ mpcCoreKit: coreKitInstance, question, answer, shareType: TssShareType.RECOVERY });
      setNewQuestion(undefined);
      const result = await securityQuestion.getQuestion(coreKitInstance);
      if (result) {
        setQuestion(question);
      }
      uiConsole("Security Question created");
    } catch (e) {
      if ((e as any).message) {
        uiConsole((e as any).message);
      } else {
        uiConsole(e);
      }
    }
    setIsLoading(false);
  };

  const changeSecurityQuestion = async (newQuestion: string, newAnswer: string, answer: string) => {
    if (!coreKitInstance) {
      throw new Error("coreKitInstance is not set");
    }
    setIsLoading(true);
    try {
      if (!newQuestion || !newAnswer || !answer) {
        throw new Error("newQuestion, newAnswer or answer is not set");
      }
      await securityQuestion.changeSecurityQuestion({ mpcCoreKit: coreKitInstance, newQuestion, newAnswer, answer });
      const result = await securityQuestion.getQuestion(coreKitInstance);
      if (result) {
        setQuestion(question);
      }
      uiConsole("Security Question changed");
    } catch (e) {
      if ((e as any).message) {
        uiConsole((e as any).message);
      } else {
        uiConsole(e);
      }
    }
    setIsLoading(false);
  };

  const deleteSecurityQuestion = async () => {
    if (!coreKitInstance) {
      throw new Error("coreKitInstance is not set");
    }
    setIsLoading(true);
    try {
      await securityQuestion.deleteSecurityQuestion(coreKitInstance);
      setQuestion(undefined);
      uiConsole("Security Question deleted");
    } catch (e) {
      if ((e as any).message) {
        uiConsole((e as any).message);
      } else {
        uiConsole(e);
      }
    }
    setIsLoading(false);
  };

  const getFactorPublicKeys = async () => {
    if (!coreKitInstance) {
      throw new Error("coreKitInstance is not set");
    }
    const publicKeys = await coreKitInstance.tKey.metadata.factorPubs;
    if (!publicKeys) {
      throw new Error("publicKeys not found");
    }
    const publicKeyCompress = publicKeys[coreKitInstance.tKey.tssTag].map((i) => {
      const point = Point.fromTkeyPoint(i);
      return point.toBufferSEC1(true).toString("hex");
    });
    uiConsole(publicKeyCompress);
  };

  const loggedInView = (
    <>
      <div className="flex-cont">
        <div className="flex-child">
          <h2 className="subtitle">Account Details</h2>
          <div className="flex-container">
            <button onClick={getUserInfo} className="card">
              Get User Info
            </button>

            {/* <button onClick={getLoginResponse} className="card">
          See Login Response
        </button> */}

            <button onClick={keyDetails} className="card">
              Key Details
            </button>

            {/* <button onClick={deleteLocalStore} className="card">
              Delete local store (enables Recovery Flow)
            </button> */}

            <button onClick={criticalResetAccount} className="card">
              Reset Account (CAUTION)
            </button>

            <button onClick={getFactorPublicKeys} className="card">
              Get Factor Public Keys
            </button>
            <button onClick={logout} className="card">
              Log Out
            </button>
          </div>
          <h2 className="subtitle">Recovery/ Key Manipulation</h2>
          <h4>Enabling MFA</h4>
          <div className="flex-container">
            <button onClick={enableMFA} className="card">
              Enable MFA (this will enable recovery flow)
            </button>
          </div>

          <div>
            <h4>Export</h4>
            <div className="flex-container">
              <button onClick={exportShare} className="card">
                Export backup share
              </button>
            </div>

            <div className="flex-container hide">
              <label>Factor Key:</label>
              <input value={backupFactorKey || ""} onChange={(e) => setBackupFactorKey(e.target.value)}></input>
              <button onClick={() => inputBackupFactorKey()} className="card">
                Input Factor Key
              </button>
            </div>
            <div className="flex-container hide">
              <label>Factor pub:</label>
              <input value={factorPubToDelete} onChange={(e) => setFactorPubToDelete(e.target.value)}></input>
              <button onClick={deleteFactor} className="card">
                Delete Factor
              </button>
            </div>
          </div>

          <h4>SMS OTP (Mocked)</h4>

          <div className="flex-container">
            <input placeholder={"Enter number +{cc}-{number}"} value={number || ""} onChange={(e) => setNumber(e.target.value)}></input>
            <button onClick={setupSmsRecovery} className="card">
              Setup SMS Recovery
            </button>
          </div>

          {/* to test security question logic, uncomment this block */}

          {/* <h4>Security Question</h4>

          <div>{question}</div>
          <div className="flex-container">
            <div className={question ? " disabledDiv" : ""}>
              <p>Set Security Question</p>
              <input value={questionInput} placeholder="question" onChange={(e) => setQuestionInput(e.target.value)}></input>
              <input value={answer} placeholder="answer" onChange={(e) => setAnswer(e.target.value)}></input>
              <button onClick={() => createSecurityQuestion(questionInput, answer!)} className="card">
                Create Security Question
              </button>
            </div>
            <div className={!question ? " disabledDiv" : ""}>
              <p>Change Security Question</p>

              <div>
                <input value={newQuestion} placeholder="newQuestion" onChange={(e) => setNewQuestion(e.target.value)}></input>
                <input value={newAnswer} placeholder="newAnswer" onChange={(e) => setNewAnswer(e.target.value)}></input>
                <input value={answer} placeholder="oldAnswer" onChange={(e) => setAnswer(e.target.value)}></input>
              </div>
              <button onClick={() => changeSecurityQuestion(newQuestion!, newAnswer!, answer!)} className="card">
                Change Security Question
              </button>
            </div>
          </div>
          <div className="flex-container">
            <div className={!question ? "disabledDiv" : ""}>
              <button onClick={() => deleteSecurityQuestion()} className="card">
                Delete Security Question
              </button>
            </div>
          </div> */}
          <h2 className="subtitle">Blockchain Calls</h2>
          <div className="flex-container">
            <button onClick={getChainID} className="card">
              Get Chain ID
            </button>

            <button onClick={getAccounts} className="card">
              Get Accounts
            </button>

            <button onClick={getBalance} className="card">
              Get Balance
            </button>

            <button onClick={signMessage} className="card">
              Sign Message
            </button>

            <button onClick={sendTransaction} className="card">
              Send Transaction
            </button>
          </div>
        </div>
        <div className="flex-child">
          <div id="console" style={{ whiteSpace: "pre-line" }}>
            <p style={{ whiteSpace: "pre-line" }}></p>
          </div>
        </div>
      </div>
    </>
  );

  const unloggedInView = (
    <>
      <div style={{ width: "80%" }}>
        <button onClick={() => login()} className="card">
          Login
        </button>
      </div>
      <div>
        <input type="checkbox" checked={autoRecover} onChange={(e) => setAutoRecover(e.target.checked)}></input> <span>Continue After Recovery</span>
      </div>
      <div className={coreKitStatus === COREKIT_STATUS.REQUIRED_SHARE ? "" : "disabledDiv"} style={{ width: "80%" }}>
        <button onClick={() => getDeviceShare()} className="card">
          Recover using Device Share
        </button>

        <button onClick={recoverViaNumber} className="card">
          Recover using Phone Number
        </button>

        <div className={!question ? "" : ""}>
          {/* <label>Recover Using Security Answer:</label>
          <label>{question}</label> */}
          {/* <input value={answer} onChange={(e) => setAnswer(e.target.value)}></input> */}
          <button onClick={() => recoverSecurityQuestionFactor()} className="card">
            Recover Using Security Answer
          </button>
        </div>

        <div className="centerFlex">
          <p>Backup/ Device factor key:</p>
          <input value={backupFactorKey || ""} onChange={(e) => setBackupFactorKey(e.target.value)}></input>
        </div>

        <button onClick={() => inputBackupFactorKey()} className={`card ${backupFactorKey ? "" : "disabledDiv"}`} disabled={!backupFactorKey}>
          Input Factor Key
        </button>

        <button onClick={criticalResetAccount} className="card">
          [CRITICAL] Reset Account
        </button>

        <div className="disabledDiv" style={{ visibility: "hidden" }}>
          <textarea value={seedPhrase as string} onChange={(e) => setSeedPhrase(e.target.value)}></textarea>
          <button onClick={submitBackupShare} className="card">
            Submit backup share
          </button>
        </div>
      </div>
      <div id="console" style={{ whiteSpace: "pre-line" }}>
        <p style={{ whiteSpace: "pre-line" }}></p>
      </div>
    </>
  );

  return (
    <>
      <div className="container">
        <h1 className="title">
          <a target="_blank" href="https://web3auth.io/docs/guides/mpc" rel="noreferrer">
            Web3Auth MPC Core Kit FireBase + SMS OTP
          </a>{" "}
          & ReactJS Ethereum Example
        </h1>

        <div className="grid">{provider ? loggedInView : unloggedInView}</div>

        <footer className="footer">
          <a href="https://github.com/Web3Auth/mpc-core-kit-demo" target="_blank" rel="noopener noreferrer">
            Source code
          </a>
        </footer>
      </div>

      {isLoading && <Loading />}
    </>
  );
}

export default App;
