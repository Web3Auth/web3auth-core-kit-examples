/* eslint-disable react-hooks/exhaustive-deps */
import { FormEvent, useEffect, useState } from "react";
import "./App.css";
import swal from "sweetalert";
import Web3 from "web3";

import {
  COREKIT_STATUS,
  FactorKeyTypeShareDescription,
  getWebBrowserFactor,
  keyToMnemonic,
  mnemonicToKey,
  Point,
  TssSecurityQuestion,
  TssShareType,
  WEB3AUTH_NETWORK,
  Web3AuthMPCCoreKit,
  SubVerifierDetailsParams,
} from "@web3auth/mpc-core-kit";
import TorusSdk from "@toruslabs/customauth";
import { SafeEventEmitterProvider, CHAIN_NAMESPACES } from "@web3auth/base";
import Loading from "./Loading";
import type { provider } from "web3-core";
import BN from "bn.js";
import { keccak256 } from "@toruslabs/torus.js";

export const wcVerifier = "wallet-connect-test";
export const BACKEND_URL = "https://wc-admin.web3auth.com";

const torusdirectsdk = new TorusSdk({
  baseUrl: `${window.location.origin}/serviceworker`,
  enableLogging: true,
  network: "sapphire_mainnet",
  web3AuthClientId: "BPi5PB_UiIZ-cPz1GtV5i1I2iOSOHuimiXBI0e-Oe_u6X3oVAbCiAZOTEBtTXw4tsluTITPqA8zMsfxIKMjiqNQ",
} as any);

const uiConsole = (...args: any[]): void => {
  const el = document.querySelector("#console>p");
  if (el) {
    el.innerHTML = JSON.stringify(args || {}, null, 2);
  }
  console.log(...args);
};

const chainConfig = {
  chainNamespace: CHAIN_NAMESPACES.EIP155,
  chainId: "0xaa36a7",
  displayName: "Ethereum Sepolia",
  tickerName: "Ethereum Sepolia",
  ticker: "ETH",
  rpcTarget: "https://rpc.ankr.com/eth_sepolia",
  blockExplorer: "https://sepolia.etherscan.io",
};

const selectedNetwork = WEB3AUTH_NETWORK.MAINNET;

const coreKitInstance = new Web3AuthMPCCoreKit({
  web3AuthClientId: "BPi5PB_UiIZ-cPz1GtV5i1I2iOSOHuimiXBI0e-Oe_u6X3oVAbCiAZOTEBtTXw4tsluTITPqA8zMsfxIKMjiqNQ",
  web3AuthNetwork: selectedNetwork,
  uxMode: "popup",
  chainConfig,
});

function App() {
  const [coreKitStatus, setCoreKitStatus] = useState<COREKIT_STATUS>(COREKIT_STATUS.NOT_INITIALIZED);
  const [backupFactorKey, setBackupFactorKey] = useState<string | undefined>("");
  const [provider, setProvider] = useState<SafeEventEmitterProvider | null>(null);
  const [email, setEmail] = useState<string>("hello@web3auth.io");
  const [isLoading, setIsLoading] = useState(false);
  const [autoRecover, setAutoRecover] = useState(false);
  const [seedPhrase, setSeedPhrase] = useState<string>("");
  const [web3, setWeb3] = useState<any>(null);
  const [question, setQuestion] = useState<string | undefined>("");
  const [factorPubToDelete, setFactorPubToDelete] = useState<string>("");
  const [currentWalletIndex, setCurrentWalletIndex] = useState<number>(0);

  const verifier = "w3a-auth0-demo";
  const coreKitClientId = "BPi5PB_UiIZ-cPz1GtV5i1I2iOSOHuimiXBI0e-Oe_u6X3oVAbCiAZOTEBtTXw4tsluTITPqA8zMsfxIKMjiqNQ";
  const securityQuestion: TssSecurityQuestion = new TssSecurityQuestion();

  useEffect(() => {
    const init = async () => {
      await coreKitInstance.init();

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

      console.log("Initializing TorusSdk")
      
      await torusdirectsdk.init({ skipSw: true });
      console.log("TorusSdk initialized", torusdirectsdk.isInitialized);

    };
    init();
  }, []);

  useEffect(() => {
    if (coreKitInstance.status === COREKIT_STATUS.LOGGED_IN) {
      const userInfo = coreKitInstance?.getUserInfo();
      if (userInfo) {
        const email = userInfo.email;
        const loginMethod = userInfo.typeOfLogin;
        const storageKey = generateStorageKey(email, loginMethod);
        const storedIndex = localStorage.getItem(storageKey);
        if (storedIndex) {
          setCurrentWalletIndex(parseInt(storedIndex));
          setTSSWalletIndex(parseInt(storedIndex));
        }
      }
    }
  }, [coreKitInstance]);

  useEffect(() => {
    if (provider) {
      const web3 = new Web3(provider as provider);
      setWeb3(web3);
    }
  }, [provider]);

  const login = async () => {
    try {
      if (!coreKitInstance) {
        throw new Error("initiated to login");
      }
      console.log("login");
      
      const verifierConfig: SubVerifierDetailsParams = {
        subVerifierDetails: {
          verifier: verifier,
          clientId: "hUVVf4SEsZT7syOiL0gLU9hFEtm2gQ6O",
          typeOfLogin: "jwt",
          jwtParams: {
            domain: "https://web3auth.au.auth0.com",
            connection: "github",
          },
        },
      };

      await coreKitInstance.loginWithOauth(verifierConfig);

      console.log("login success");
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

      setCoreKitStatus(coreKitInstance.status);
      const userInfo = coreKitInstance.getUserInfo();
      if (userInfo) {
        const { email, typeOfLogin } = userInfo;
        updateWalletIndexFromStorage(email, typeOfLogin);
      }
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

  const generateStorageKey = (email: string, loginMethod: string) => {
    return `walletIndex_${loginMethod}_${email}`;
  };

  const updateWalletIndexFromStorage = (email: string, loginMethod: string) => {
    const storageKey = generateStorageKey(email, loginMethod);
    const storedIndex = localStorage.getItem(storageKey);
    if (storedIndex) {
      const index = parseInt(storedIndex);
      setTSSWalletIndex(index);
      setCurrentWalletIndex(index);
    } else {
      setTSSWalletIndex(currentWalletIndex);
    }
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

  const keyDetails = async () => {
    if (!coreKitInstance) {
      throw new Error("coreKitInstance not found");
    }
    uiConsole(coreKitInstance.getKeyDetails());
  };

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
      const userInfo = coreKitInstance.getUserInfo();
      if (userInfo) {
        const { email, typeOfLogin } = userInfo;
        updateWalletIndexFromStorage(email, typeOfLogin);
      }
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

  const getChainID = async () => {
    if (!web3) {
      uiConsole("web3 not initialized yet");
      return;
    }
    const chainId = await web3.eth.getChainId();
    uiConsole(chainId);
    return chainId;
  };

  const getAccounts = async () => {
    if (!web3) {
      uiConsole("web3 not initialized yet");
      return;
    }
    const address = (await web3.eth.getAccounts())[0];
    uiConsole(address);
    return address;
  };

  const getBalance = async () => {
    if (!web3) {
      uiConsole("web3 not initialized yet");
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
      uiConsole("web3 not initialized yet");
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
    const userInfo = coreKitInstance.getUserInfo();
    if (userInfo) {
      const { email, typeOfLogin } = userInfo;
      updateWalletIndexFromStorage(email, typeOfLogin);
      const storageKey = generateStorageKey(email, typeOfLogin);
      localStorage.setItem(storageKey, "0");
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

    const destination = "0x7DF1fEf832b57E46dE2E1541951289C04B2781Aa";
    const amount = web3.utils.toWei("0.001"); // Convert 1 ether to wei

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

  // email passwordless related logic
  const getHashedPrivateKey = (postboxKey: string, clientId: string): BN => {
    const uid = `${postboxKey}_${clientId}`;
    let hashUid = keccak256(Buffer.from(uid, "utf8"));
    hashUid = hashUid.replace("0x", "");
    return new BN(hashUid, "hex");
  };

  const setupEmailPasswordless = async () => {
    // try {
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
      let newBackUpFactorKey = getHashedPrivateKey(postboxkey, coreKitClientId)! as BN;
      await coreKitInstance.createFactor({
        factorKey: newBackUpFactorKey,
        shareDescription: FactorKeyTypeShareDescription.Other,
        shareType: TssShareType.RECOVERY,
      });
      const userInfo = coreKitInstance.getUserInfo();
      if (userInfo) {
        const { email, typeOfLogin } = userInfo;
        updateWalletIndexFromStorage(email, typeOfLogin);
      }
      uiConsole("setup email passwordless complete");
    //} catch (error) {
    //  uiConsole(error);
    //}
  };

  const recoverWithEmailPasswordless = async () => {
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

      let newBackUpFactorKey = getHashedPrivateKey(postboxkey, coreKitClientId);
      if (autoRecover) {
        await coreKitInstance.inputFactorKey(newBackUpFactorKey);
        if (coreKitInstance.provider) setProvider(coreKitInstance.provider);
      } else {
        setBackupFactorKey(newBackUpFactorKey.toString("hex"));
        uiConsole("email passwordless backup factor key: ", newBackUpFactorKey.toString("hex"));
      }
      uiConsole("recover with email passwordless complete");
    } catch (error) {
      uiConsole(error);
    }
  };

  const onEmailChanged = async (e: FormEvent<HTMLInputElement>) => {
    e.preventDefault();
    const newEmail = e.currentTarget.value;
    setEmail(newEmail);
  };

  const setTSSWalletIndex = async (index = 0) => {
    await coreKitInstance.setTssWalletIndex(index);
    const userInfo = coreKitInstance?.getUserInfo();
    if (userInfo) {
      const email = userInfo.email;
      const loginMethod = userInfo.typeOfLogin;
      const storageKey = generateStorageKey(email, loginMethod);
      localStorage.setItem(storageKey, index.toString());
    }
    // Update state and ensure UI is in sync
    setCurrentWalletIndex(index);
    // Log new account details
    await getAccounts();
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

            <button onClick={keyDetails} className="card">
              Key Details
            </button>

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
          <h2 className="subtitle">Multi Account</h2>
          <div className="flex-container">
            <button onClick={() => setTSSWalletIndex(1)} className="card">
              Switch to wallet index: 1
            </button>
            <button onClick={() => setTSSWalletIndex(2)} className="card">
              Switch to wallet index: 2
            </button>
            <button onClick={() => setTSSWalletIndex(0)} className="card">
              Switch to wallet index: 0/default
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

          <h4>Email passwordless</h4>

          <div className="flex-container">
            <input placeholder={"Enter your email.."} value={email} onChange={(e) => onEmailChanged(e)}></input>
            <button onClick={setupEmailPasswordless} className="card">
              Register your 2fa factor key with your email without password
            </button>
          </div>

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

        <h4>PassKey</h4>

        <div className="flex-container">
          <input placeholder={"Enter your email.."} value={email} onChange={(e) => onEmailChanged(e)}></input>
          <button onClick={recoverWithEmailPasswordless} className="card">
            Recover with Email Passwordless
          </button>
        </div>

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
            Web3Auth MPC Core Kit Auth0 + github + Email passwordless
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
