/* eslint-disable @typescript-eslint/no-use-before-define */
/* eslint-disable no-console */
/* eslint-disable @typescript-eslint/no-shadow */
"use client";

import { useEffect, useState } from "react";
// IMP START - Quick Start
import { Web3AuthMPCCoreKit, WEB3AUTH_NETWORK, IdTokenLoginParams, TssShareType, parseToken, getWebBrowserFactor, generateFactorKey, COREKIT_STATUS, keyToMnemonic, mnemonicToKey } from "@web3auth/mpc-core-kit";
import { CHAIN_NAMESPACES } from "@web3auth/base";
// IMP END - Quick Start
import Web3 from 'web3';
import { BN } from "bn.js";


// Firebase libraries for custom authentication
import { initializeApp } from "firebase/app";
import { GoogleAuthProvider, getAuth, signInWithPopup, UserCredential } from "firebase/auth";

// IMP START - SDK Initialization
// IMP START - Dashboard Registration
const web3AuthClientId =
  "BPi5PB_UiIZ-cPz1GtV5i1I2iOSOHuimiXBI0e-Oe_u6X3oVAbCiAZOTEBtTXw4tsluTITPqA8zMsfxIKMjiqNQ"; // get from https://dashboard.web3auth.io
// IMP END - Dashboard Registration

// IMP START - Verifier Creation
const verifier = "w3a-firebase-demo";
// IMP END - Verifier Creation

const chainConfig = {
  chainNamespace: CHAIN_NAMESPACES.EIP155,
  chainId: "0x1", // Please use 0x1 for Mainnet
  rpcTarget: "https://rpc.ankr.com/eth",
  displayName: "Ethereum Mainnet",
  blockExplorer: "https://etherscan.io/",
  ticker: "ETH",
  tickerName: "Ethereum",
};

const coreKitInstance = new Web3AuthMPCCoreKit(
  {
    web3AuthClientId,
    web3AuthNetwork: WEB3AUTH_NETWORK.MAINNET,
    chainConfig,
  }
);
// IMP END - SDK Initialization

// IMP START - Auth Provider Login
// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyB0nd9YsPLu-tpdCrsXn8wgsWVAiYEpQ_E",
  authDomain: "web3auth-oauth-logins.firebaseapp.com",
  projectId: "web3auth-oauth-logins",
  storageBucket: "web3auth-oauth-logins.appspot.com",
  messagingSenderId: "461819774167",
  appId: "1:461819774167:web:e74addfb6cc88f3b5b9c92",
};
// IMP END - Auth Provider Login

function App() {
  const [coreKitStatus, setCoreKitStatus] = useState<COREKIT_STATUS>(COREKIT_STATUS.NOT_INITIALIZED);
  const [backupFactorKey, setBackupFactorKey] = useState<string>("");
  const [mnemonicFactor, setMnemonicFactor] = useState<string>("");

  // Firebase Initialisation
  const app = initializeApp(firebaseConfig);

  useEffect(() => {
    const init = async () => {
      // IMP START - SDK Initialization
      await coreKitInstance.init();
      // IMP END - SDK Initialization

      setCoreKitStatus(coreKitInstance.status);
    };
    init();
  }, []);

  // IMP START - Auth Provider Login
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
  // IMP END - Auth Provider Login

  const login = async () => {
    try {
      if (!coreKitInstance) {
        throw new Error('initiated to login');
      }
      // IMP START - Auth Provider Login
      const loginRes = await signInWithGoogle();
      const idToken = await loginRes.user.getIdToken(true);
      const parsedToken = parseToken(idToken);
      // IMP END - Auth Provider Login

      // IMP START - Login
      const idTokenLoginParams = {
        verifier,
        verifierId: parsedToken.sub,
        idToken,
      } as IdTokenLoginParams;

      await coreKitInstance.loginWithJWT(idTokenLoginParams);
      // IMP END - Login

      // IMP START - Recover MFA Enabled Account
      if (coreKitInstance.status === COREKIT_STATUS.REQUIRED_SHARE) {
        uiConsole("required more shares, please enter your backup/ device factor key, or reset account [unrecoverable once reset, please use it with caution]");
      }
      // IMP END - Recover MFA Enabled Account

      setCoreKitStatus(coreKitInstance.status);
    }
    catch (err) {
      uiConsole(err);
    }
  };
  // IMP START - Recover MFA Enabled Account
  const inputBackupFactorKey = async () => {
    if (!coreKitInstance) {
      throw new Error("coreKitInstance not found");
    }
    if (!backupFactorKey) {
      throw new Error("backupFactorKey not found");
    }
    const factorKey = new BN(backupFactorKey, "hex")
    await coreKitInstance.inputFactorKey(factorKey);

    setCoreKitStatus(coreKitInstance.status);

    if (coreKitInstance.status === COREKIT_STATUS.REQUIRED_SHARE) {
      uiConsole("required more shares even after inputing backup factor key, please enter your backup/ device factor key, or reset account [unrecoverable once reset, please use it with caution]");
    }
  };
  // IMP END - Recover MFA Enabled Account

  // IMP START - Enable Multi Factor Authentication
  const enableMFA = async () => {
    if (!coreKitInstance) {
      throw new Error("coreKitInstance is not set");
    }
    const factorKey = await coreKitInstance.enableMFA({});
    const factorKeyMnemonic = keyToMnemonic(factorKey);

    uiConsole("MFA enabled, device factor stored in local store, deleted hashed cloud key, your backup factor key: ", factorKeyMnemonic);
  };
  // IMP END - Enable Multi Factor Authentication

  const keyDetails = async () => {
    if (!coreKitInstance) {
      throw new Error('coreKitInstance not found');
    }
    uiConsole(coreKitInstance.getKeyDetails());
  };

  const getDeviceFactor = async () => {
    try {
      const factorKey = await getWebBrowserFactor(coreKitInstance!);
      setBackupFactorKey(factorKey!);
      uiConsole("Device share: ", factorKey);
    } catch (e) {
      uiConsole(e);
    }
  };

  const exportMnemonicFactor = async (): Promise<void> => {
    if (!coreKitInstance) {
      throw new Error("coreKitInstance is not set");
    }
    uiConsole("export share type: ", TssShareType.RECOVERY);
    const factorKey = generateFactorKey();
    await coreKitInstance.createFactor({
      shareType: TssShareType.RECOVERY,
      factorKey: factorKey.private
    });
    const factorKeyMnemonic = await keyToMnemonic(factorKey.private.toString("hex"));
    uiConsole("Export factor key mnemonic: ", factorKeyMnemonic);
  };

  const MnemonicToFactorKeyHex = async (mnemonic: string) => {
    if (!coreKitInstance) {
      throw new Error("coreKitInstance is not set");
    }
    try {
      const factorKey = await mnemonicToKey(mnemonic);
      setBackupFactorKey(factorKey);
      return factorKey;
    } catch (error) {
      uiConsole(error);
    }
  };

  const getUserInfo = async () => {
    // IMP START - Get User Information
    const user = coreKitInstance.getUserInfo();
    // IMP END - Get User Information
    uiConsole(user);
  };

  const logout = async () => {
    // IMP START - Logout
    await coreKitInstance.logout();
    // IMP END - Logout
    setCoreKitStatus(coreKitInstance.status);
    uiConsole("logged out");
  };

  // IMP START - Blockchain Calls
  const getAccounts = async () => {
    if (!coreKitInstance) {
      uiConsole("provider not initialized yet");
      return;
    }
    const web3 = new Web3(coreKitInstance.provider as any);

    // Get user's Ethereum public address
    const address = await web3.eth.getAccounts();
    uiConsole(address);
  };

  const getBalance = async () => {
    if (!coreKitInstance) {
      uiConsole("provider not initialized yet");
      return;
    }
    const web3 = new Web3(coreKitInstance.provider as any);

    // Get user's Ethereum public address
    const address = (await web3.eth.getAccounts())[0];

    // Get user's balance in ether
    const balance = web3.utils.fromWei(
      await web3.eth.getBalance(address), // Balance is in wei
      "ether"
    );
    uiConsole(balance);
  };

  const signMessage = async () => {
    if (!coreKitInstance) {
      uiConsole("provider not initialized yet");
      return;
    }
    const web3 = new Web3(coreKitInstance.provider as any);

    // Get user's Ethereum public address
    const fromAddress = (await web3.eth.getAccounts())[0];

    const originalMessage = "YOUR_MESSAGE";

    // Sign the message
    const signedMessage = await web3.eth.personal.sign(
      originalMessage,
      fromAddress,
      "test password!" // configure your own password here.
    );
    uiConsole(signedMessage);
  };
  // IMP END - Blockchain Calls

  const criticalResetAccount = async (): Promise<void> => {
    // This is a critical function that should only be used for testing purposes
    // Resetting your account means clearing all the metadata associated with it from the metadata server
    // The key details will be deleted from our server and you will not be able to recover your account
    if (!coreKitInstance) {
      throw new Error("coreKitInstance is not set");
    }
    //@ts-ignore
    // if (selectedNetwork === WEB3AUTH_NETWORK.MAINNET) {
    //   throw new Error("reset account is not recommended on mainnet");
    // }
    await coreKitInstance.tKey.storageLayer.setMetadata({
      privKey: new BN(coreKitInstance.metadataKey!, "hex"),
      input: { message: "KEY_NOT_FOUND" },
    });
    uiConsole('reset');
    logout();
  }


  function uiConsole(...args: any[]): void {
    const el = document.querySelector("#console>p");
    if (el) {
      el.innerHTML = JSON.stringify(args || {}, null, 2);
    }
    console.log(...args);
  }

  const loggedInView = (
    <>
      <div className="flex-container">
        <div>
          <button onClick={getUserInfo} className="card">
            Get User Info
          </button>
        </div>
        <div>
          <button onClick={keyDetails} className='card'>
            Key Details
          </button>
        </div>
        <div>
          <button onClick={enableMFA} className='card'>
            Enable MFA
          </button>
        </div>
        <div>
          <button onClick={getAccounts} className="card">
            Get Accounts
          </button>
        </div>
        <div>
          <button onClick={getBalance} className="card">
            Get Balance
          </button>
        </div>
        <div>
          <button onClick={signMessage} className="card">
            Sign Message
          </button>
        </div>
        <div>
          <button onClick={logout} className="card">
            Log Out
          </button>
        </div>
        <div>
          <button onClick={criticalResetAccount} className="card">
            [CRITICAL] Reset Account
          </button>
        </div>
        <div>
          <button onClick={exportMnemonicFactor} className='card'>
            Generate Backup (Mnemonic)
          </button>
        </div>
      </div>
    </>
  );

  const unloggedInView = (
    <>
      <button onClick={login} className="card">
        Login
      </button>
      <div className={coreKitStatus === COREKIT_STATUS.REQUIRED_SHARE ? "" : "disabledDiv"} >

        <button onClick={() => getDeviceFactor()} className="card">
          Get Device Factor
        </button>
        <label>Backup/ Device Factor:</label>
        <input value={backupFactorKey} onChange={(e) => setBackupFactorKey(e.target.value)}></input>
        <button onClick={() => inputBackupFactorKey()} className="card">
          Input Backup Factor Key
        </button>
        <button onClick={criticalResetAccount} className="card">
          [CRITICAL] Reset Account
        </button>
        <label>Recover Using Mnemonic Factor Key:</label>
        <input value={mnemonicFactor} onChange={(e) => setMnemonicFactor(e.target.value)}></input>
        <button onClick={() => MnemonicToFactorKeyHex(mnemonicFactor)} className="card">
          Get Recovery Factor Key using Mnemonic
        </button>
      </div>
    </>
  );

  return (
    <div className="container">
      <h1 className="title">
        <a target="_blank" href="https://web3auth.io/docs/sdk/core-kit/mpc-core-kit/" rel="noreferrer">
          Web3Auth MPC Core Kit
        </a>{" "}
        React Quick Start
      </h1>

      <div className="grid">{coreKitStatus === COREKIT_STATUS.LOGGED_IN ? loggedInView : unloggedInView}</div>
      <div id="console" style={{ whiteSpace: "pre-line" }}>
        <p style={{ whiteSpace: "pre-line" }}></p>
      </div>

      <footer className="footer">
        <a
          href="https://github.com/Web3Auth/web3auth-core-kit-examples/tree/main/mpc-core-kit-web/quick-starts/mpc-core-kit-react-quick-start"
          target="_blank"
          rel="noopener noreferrer"
        >
          Source code
        </a>
      </footer>
    </div>
  );
}

export default App;
