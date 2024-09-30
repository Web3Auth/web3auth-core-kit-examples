import { useEffect, useState } from "react";
import {
  Web3AuthMPCCoreKit,
  WEB3AUTH_NETWORK,
  TssShareType,
  parseToken,
  generateFactorKey,
  COREKIT_STATUS,
  keyToMnemonic,
  mnemonicToKey,
} from "@web3auth/mpc-core-kit";

import { BN } from "bn.js";

import { initializeApp } from "firebase/app";
import { GoogleAuthProvider, getAuth, signInWithPopup, UserCredential } from "firebase/auth";

import "./App.css";
import { tssLib } from "@toruslabs/tss-frost-lib";
import SolanaRPC from "./solanaRPC";

const web3AuthClientId = "BPi5PB_UiIZ-cPz1GtV5i1I2iOSOHuimiXBI0e-Oe_u6X3oVAbCiAZOTEBtTXw4tsluTITPqA8zMsfxIKMjiqNQ"; // get from https://dashboard.web3auth.io

const verifier = "w3a-firebase-demo";

const coreKitInstance = new Web3AuthMPCCoreKit({
  web3AuthClientId,
  web3AuthNetwork: WEB3AUTH_NETWORK.MAINNET,
  storage: window.localStorage,
  manualSync: true,
  tssLib,
});

const firebaseConfig = {
  apiKey: "AIzaSyB0nd9YsPLu-tpdCrsXn8wgsWVAiYEpQ_E",
  authDomain: "web3auth-oauth-logins.firebaseapp.com",
  projectId: "web3auth-oauth-logins",
  storageBucket: "web3auth-oauth-logins.appspot.com",
  messagingSenderId: "461819774167",
  appId: "1:461819774167:web:e74addfb6cc88f3b5b9c92"
};

function App() {
  const [coreKitStatus, setCoreKitStatus] = useState<COREKIT_STATUS>(COREKIT_STATUS.NOT_INITIALIZED);
  const [backupFactorKey, setBackupFactorKey] = useState<string>("");
  const [mnemonicFactor, setMnemonicFactor] = useState<string>("");

  const app = initializeApp(firebaseConfig);


  useEffect(() => {
    const init = async () => {
      await coreKitInstance.init();
      setCoreKitStatus(coreKitInstance.status);
    };
    init();
  }, []);

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
      };

      // Uncomment to test with loginWithOAuth
      // const verifierConfig = {
      //   subVerifierDetails: {
      //     typeOfLogin: 'google',
      //     verifier: 'w3a-google-demo',
      //     clientId:
      //       '519228911939-cri01h55lsjbsia1k7ll6qpalrus75ps.apps.googleusercontent.com',
      //   }
      // } as SubVerifierDetailsParams;

      // await coreKitInstance.loginWithOauth(verifierConfig);

      await coreKitInstance.loginWithJWT(idTokenLoginParams);

      if (coreKitInstance.status === COREKIT_STATUS.LOGGED_IN) {
        // Needed for new accounts
        await coreKitInstance.commitChanges();
      }

      if (coreKitInstance.status === COREKIT_STATUS.REQUIRED_SHARE) {
        uiConsole(
          "Required more shares, please enter your backup/ device factor key, or reset account [unrecoverable once reset, please use it with caution]"
        );
      }

      setCoreKitStatus(coreKitInstance.status);
    } catch (err) {
      uiConsole(err);
    }
  };


  const inputBackupFactorKey = async () => {
    if (!coreKitInstance) {
      throw new Error("coreKitInstance not found");
    }
    if (!backupFactorKey) {
      throw new Error("backupFactorKey not found");
    }
    const factorKey = new BN(backupFactorKey, "hex");
    await coreKitInstance.inputFactorKey(factorKey);

    setCoreKitStatus(coreKitInstance.status);

    if (coreKitInstance.status === COREKIT_STATUS.REQUIRED_SHARE) {
      uiConsole(
        "Required more shares even after inputing backup factor key, please enter your backup/ device factor key, or reset account [unrecoverable once reset, please use it with caution]"
      );
    }
  };

  const enableMFA = async () => {
    if (!coreKitInstance) {
      throw new Error("CoreKitInstance is not set");
    }
    try {
      const factorKey = await coreKitInstance.enableMFA({});
      const factorKeyMnemonic = await keyToMnemonic(factorKey);


      if (coreKitInstance.status === COREKIT_STATUS.LOGGED_IN) {
        await coreKitInstance.commitChanges();
      }

      uiConsole("MFA enabled, device factor stored in local store, deleted hashed cloud key, your backup factor key:", factorKeyMnemonic);
    } catch (e) {
      uiConsole(e);
    }
  };

  const keyDetails = async () => {
    if (!coreKitInstance) {
      throw new Error("coreKitInstance not found");
    }
    uiConsole(coreKitInstance.getKeyDetails());
  };

  const getDeviceFactor = async () => {
    try {
      const factorKey = await coreKitInstance.getDeviceFactor();
      setBackupFactorKey(factorKey!);
      uiConsole("Device share: ", factorKey);
    } catch (e) {
      uiConsole(e);
    }
  };

  const createMnemonicFactor = async (): Promise<void> => {
    if (!coreKitInstance) {
      throw new Error("coreKitInstance is not set");
    }
    uiConsole("export share type: ", TssShareType.RECOVERY);
    const factorKey = generateFactorKey();
    await coreKitInstance.createFactor({
      shareType: TssShareType.RECOVERY,
      factorKey: factorKey.private,
    });
    const factorKeyMnemonic = await keyToMnemonic(factorKey.private.toString("hex"));
    if (coreKitInstance.status === COREKIT_STATUS.LOGGED_IN) {
      await coreKitInstance.commitChanges();
    }
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
    const user = coreKitInstance.getUserInfo();
    uiConsole(user);
  };

  const logout = async () => {
    await coreKitInstance.logout();
    setCoreKitStatus(coreKitInstance.status);
    uiConsole("Logged out");
  };


  const getAccounts = async () => {
    if (!coreKitInstance) {
      uiConsole("Provider not initialized yet");
      return;
    }
    const solanaRPC = new SolanaRPC(coreKitInstance);
    const address = solanaRPC.getAccount();
    uiConsole(address);
  };

  const exportSeed = async () => {
    if (!coreKitInstance) {
      uiConsole("Provider not initialized yet");
      return;
    }
    try {

      const key = await coreKitInstance._UNSAFE_exportTssEd25519Seed();
      uiConsole(key);
    } catch (e) {
      uiConsole(e);
    }
  }

  const getBalance = async () => {
    if (!coreKitInstance) {
      uiConsole("Provider not initialized yet");
      return;
    }

    const solanaRPC = new SolanaRPC(coreKitInstance);
    const balance = await solanaRPC.getBalance();
    uiConsole(balance);
  };

  const requestFaucet = async () => {
    if (!coreKitInstance) {
      uiConsole("Provider not initialized yet");
      return;
    }

    const solanaRPC = new SolanaRPC(coreKitInstance);
    const hash = await solanaRPC.requestFaucet();
    uiConsole(`Hash: https://explorer.solana.com/tx/${hash}?cluster=devnet`);
  };

  const processRequest = (method: () => void) => {
    try {
      method();
    } catch (error) {
      uiConsole(error);
    }
  }

  const signMessage = async () => {
    if (!coreKitInstance) {
      uiConsole("Provider not initialized yet");
      return;
    }

    uiConsole("Signing Message...");

    const solanaRPC = new SolanaRPC(coreKitInstance);
    const signedMessage = await solanaRPC.signMessage();
    uiConsole(signedMessage);
  };

  const sendTransaction = async () => {
    if (!coreKitInstance) {
      uiConsole("Provider not initialized yet");
      return;
    }

    uiConsole("Sending Transaction...");

    const solanaRPC = new SolanaRPC(coreKitInstance);
    const hash = await solanaRPC.sendTransaction();
    uiConsole(`Hash: https://explorer.solana.com/tx/${hash}?cluster=devnet`);
  };

  const criticalResetAccount = async (): Promise<void> => {
    // This is a critical function that should only be used for testing purposes
    // Resetting your account means clearing all the metadata associated with it from the metadata server
    // The key details will be deleted from our server and you will not be able to recover your account
    if (!coreKitInstance) {
      throw new Error("coreKitInstance is not set");
    }

    await coreKitInstance.tKey.storageLayer.setMetadata({
      privKey: new BN(coreKitInstance.state.postBoxKey!, "hex"),
      input: { message: "KEY_NOT_FOUND" },
    });

    if (coreKitInstance.status === COREKIT_STATUS.LOGGED_IN) {
      await coreKitInstance.commitChanges();
    }
    uiConsole("Reset successful");
    logout();
  };

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
          <button onClick={keyDetails} className="card">
            Key Details
          </button>
        </div>
        <div>
          <button onClick={() => processRequest(enableMFA)} className="card">
            Enable MFA
          </button>
        </div>
        <div>
          <button onClick={getAccounts} className="card">
            Get Accounts
          </button>
        </div>
        <div>
          <button onClick={() => processRequest(requestFaucet)} className="card">
            Request Faucet
          </button>
        </div>
        <div>
          <button onClick={() => processRequest(getBalance)} className="card">
            Get Balance
          </button>
        </div>
        <div>
          <button onClick={() => processRequest(signMessage)} className="card">
            Sign Message
          </button>
        </div>
        <div>
          <button onClick={() => processRequest(sendTransaction)} className="card">
            Send Transaction
          </button>
        </div>
        <div>
          <button onClick={() => processRequest(logout)} className="card">
            Log Out
          </button>
        </div>
        <div>
          <button onClick={criticalResetAccount} className="card">
            [CRITICAL] Reset Account
          </button>
        </div>
        <div>
          <button onClick={exportSeed} className="card">
            [CRITICAL] Export Seed
          </button>
        </div>
        <div>
          <button onClick={createMnemonicFactor} className="card">
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
      <div className={coreKitStatus === COREKIT_STATUS.REQUIRED_SHARE ? "" : "disabledDiv"}>
        <button onClick={() => getDeviceFactor()} className="card">
          Get Device Factor
        </button>
        <label>Recover Using Mnemonic Factor Key:</label>
        <input value={mnemonicFactor} onChange={(e) => setMnemonicFactor(e.target.value)}></input>
        <button onClick={() => MnemonicToFactorKeyHex(mnemonicFactor)} className="card">
          Get Recovery Factor Key using Mnemonic
        </button>
        <label>Backup/ Device Factor: {backupFactorKey}</label>
        <button onClick={() => inputBackupFactorKey()} className="card">
          Input Backup Factor Key
        </button>
        <button onClick={criticalResetAccount} className="card">
          [CRITICAL] Reset Account
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
        Solana Example
      </h1>

      <div className="grid">{coreKitStatus === COREKIT_STATUS.LOGGED_IN ? loggedInView : unloggedInView}</div>
      <div id="console" style={{ whiteSpace: "pre-line" }}>
        <p style={{ whiteSpace: "pre-line" }}></p>
      </div>

      <footer className="footer">
        <a
          href="https://github.com/Web3Auth/web3auth-core-kit-examples/tree/main/mpc-core-kit-web/mpc-core-kit-solana"
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
