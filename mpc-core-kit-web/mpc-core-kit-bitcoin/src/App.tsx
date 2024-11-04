import "./App.css";
import { tssLib } from "@toruslabs/tss-dkls-lib";
import { ADAPTER_EVENTS, CHAIN_NAMESPACES } from "@web3auth/base";
import { EthereumSigningProvider } from "@web3auth/ethereum-mpc-provider";
import { Point, secp256k1 } from "@tkey/common-types";
import { BitcoinComponent } from "./BitcoinComponent";
import {
  COREKIT_STATUS,
  FactorKeyTypeShareDescription,
  generateFactorKey,
  JWTLoginParams,
  keyToMnemonic,
  makeEthereumSigner,
  mnemonicToKey,
  parseToken,
  TssShareType,
  WEB3AUTH_NETWORK,
  Web3AuthMPCCoreKit,
} from "@web3auth/mpc-core-kit";
import { BN } from "bn.js";
import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider, signInWithEmailAndPassword, signInWithPopup, UserCredential } from "firebase/auth";
import { useEffect, useState } from "react";
import { Loading, BlurredLoading } from "./Loading";

const web3AuthClientId = "BPi5PB_UiIZ-cPz1GtV5i1I2iOSOHuimiXBI0e-Oe_u6X3oVAbCiAZOTEBtTXw4tsluTITPqA8zMsfxIKMjiqNQ";
const verifier = "w3a-firebase-demo";

const chainConfig = {
  chainNamespace: CHAIN_NAMESPACES.EIP155,
  chainId: "0xaa36a7",
  rpcTarget: "https://rpc.ankr.com/eth_sepolia",
  displayName: "Ethereum Sepolia Testnet",
  blockExplorerUrl: "https://sepolia.etherscan.io",
  ticker: "ETH",
  tickerName: "Ethereum",
  logo: "https://cryptologos.cc/logos/ethereum-eth-logo.png",
};

let coreKitInstance: Web3AuthMPCCoreKit;
let evmProvider: EthereumSigningProvider;

if (typeof window !== "undefined") {
  coreKitInstance = new Web3AuthMPCCoreKit({
    web3AuthClientId,
    web3AuthNetwork: WEB3AUTH_NETWORK.MAINNET,
    storage: window.localStorage,
    manualSync: true,
    tssLib,
  });

  evmProvider = new EthereumSigningProvider({ config: { chainConfig } });
  evmProvider.setupProvider(makeEthereumSigner(coreKitInstance));
}

const firebaseConfig = {
  apiKey: "AIzaSyB0nd9YsPLu-tpdCrsXn8wgsWVAiYEpQ_E",
  authDomain: "web3auth-oauth-logins.firebaseapp.com",
  projectId: "web3auth-oauth-logins",
  storageBucket: "web3auth-oauth-logins.appspot.com",
  messagingSenderId: "461819774167",
  appId: "1:461819774167:web:e74addfb6cc88f3b5b9c92",
};

function App() {
  const [coreKitStatus, setCoreKitStatus] = useState<COREKIT_STATUS>(COREKIT_STATUS.NOT_INITIALIZED);
  const [backupFactorKey, setBackupFactorKey] = useState<string>("");
  const [mnemonicFactor, setMnemonicFactor] = useState<string>("");
  const [showRecoveryOptions, setShowRecoveryOptions] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isBlurred, setIsBlurred] = useState(false);

  const app = initializeApp(firebaseConfig);

  useEffect(() => {
    const init = async () => {
      setIsLoading(true);
      await coreKitInstance.init();
      setCoreKitStatus(coreKitInstance.status);
      setIsLoading(false);
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
      setIsLoading(true);
      const loginRes = await signInWithGoogle();
      const idToken = await loginRes.user.getIdToken(true);
      const parsedToken = parseToken(idToken);

      const idTokenLoginParams = {
        verifier,
        verifierId: parsedToken.sub,
        idToken,
      } as JWTLoginParams;

      await coreKitInstance.loginWithJWT(idTokenLoginParams);
      if (coreKitInstance.status === COREKIT_STATUS.LOGGED_IN) {
        await coreKitInstance.commitChanges();
      }
      setIsLoading(false);

      if (coreKitInstance.status === COREKIT_STATUS.REQUIRED_SHARE) {
        setShowRecoveryOptions(true);
        uiConsole(
          "required more shares, please enter your backup/ device factor key, or reset account [unrecoverable once reset, please use it with caution]"
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
        "required more shares even after inputing backup factor key, please enter your backup/ device factor key, or reset account [unrecoverable once reset, please use it with caution]"
      );
    }
  };

  const getSocialMFAFactorKey = async (): Promise<string> => {
    try {
      // Create a temporary instance of the MPC Core Kit, used to create an encryption key for the Social Factor
      const tempCoreKitInstance = new Web3AuthMPCCoreKit({
        web3AuthClientId,
        web3AuthNetwork: WEB3AUTH_NETWORK.MAINNET,
        storage: window.localStorage,
        tssLib,
      });

      await tempCoreKitInstance.init();

        // Login using Firebase Email Password
        const auth = getAuth(app);
        const res = await signInWithEmailAndPassword(auth, "custom+jwt@firebase.login", "Testing@123");
        uiConsole(res);
        const idToken = await res.user.getIdToken(true);
        const userInfo = parseToken(idToken);

        // Use the Web3Auth SFA SDK to generate an account using the Social Factor
        await tempCoreKitInstance.loginWithJWT({
          verifier,
          verifierId: userInfo.sub,
          idToken,
        });
      

      // Get the private key using the Social Factor, which can be used as a factor key for the MPC Core Kit
      const factorKey = await tempCoreKitInstance.state.postBoxKey;
      uiConsole("Social Factor Key: ", factorKey);
      setBackupFactorKey(factorKey as string);
      tempCoreKitInstance.logout();
      return factorKey as string;
    } catch (err) {
      uiConsole(err);
      return "";
    }
  };

  const enableMFA = async () => {
    if (!coreKitInstance) {
      throw new Error("coreKitInstance is not set");
    }
    try {
      setIsBlurred(true);
      const factorKey = new BN(await getSocialMFAFactorKey(), "hex");
      console.log("Using the Social Factor Key to Enable MFA, please wait...");
      await coreKitInstance.enableMFA({ factorKey, shareDescription: FactorKeyTypeShareDescription.SocialShare });

      if (coreKitInstance.status === COREKIT_STATUS.LOGGED_IN) {
        await coreKitInstance.commitChanges();
      }
      setIsBlurred(false);
      uiConsole(
        "MFA enabled, device factor stored in local store, deleted hashed cloud key, your backup factor key is associated with the firebase email password account in the app"
      );
    } catch (e) {
      setIsBlurred(false);
      uiConsole(e);
    }
  };

  const deleteFactor = async () => {
    setIsBlurred(true);
    let factorPub: string | undefined;
    for (const [key, value] of Object.entries(coreKitInstance.getKeyDetails().shareDescriptions)) {
      if (value.length > 0) {
        const parsedData = JSON.parse(value[0]);
        if (parsedData.module === FactorKeyTypeShareDescription.SocialShare) {
          factorPub = key;
        }
      }
    }
    if (factorPub) {
      uiConsole("Deleting Social Factor, please wait...", "Factor Pub:", factorPub);
      const pub = Point.fromSEC1(secp256k1, factorPub);
      await coreKitInstance.deleteFactor(pub);
      await coreKitInstance.commitChanges();
      uiConsole("Social Factor deleted");
    } else {
      uiConsole("No social factor found to delete");
    }
    setIsBlurred(false);
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
      setBackupFactorKey(factorKey as string);
      uiConsole("Device share: ", factorKey);
    } catch (e) {
      uiConsole(e);
    }
  };

  const createMnemonicFactor = async (): Promise<void> => {
    if (!coreKitInstance) {
      throw new Error("coreKitInstance is not set");
    }
    setIsBlurred(true);
    uiConsole("export share type: ", TssShareType.RECOVERY);
    const factorKey = generateFactorKey();
    await coreKitInstance.createFactor({
      shareType: TssShareType.RECOVERY,
      factorKey: factorKey.private,
      shareDescription: FactorKeyTypeShareDescription.SeedPhrase,
    });
    const factorKeyMnemonic = await keyToMnemonic(factorKey.private.toString("hex"));
    if (coreKitInstance.status === COREKIT_STATUS.LOGGED_IN) {
      await coreKitInstance.commitChanges();
    }
    uiConsole("Export factor key mnemonic: ", factorKeyMnemonic);
    setIsBlurred(false);
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
    setShowRecoveryOptions(false);
    uiConsole("logged out");
  };

  const criticalResetAccount = async (): Promise<void> => {
    if (!coreKitInstance) {
      throw new Error("coreKitInstance is not set");
    }
    setIsBlurred(true);
    await coreKitInstance.tKey.storageLayer.setMetadata({
      privKey: new BN(coreKitInstance.state.postBoxKey! as string, "hex"),
      input: { message: "KEY_NOT_FOUND" },
    });
    if (coreKitInstance.status === COREKIT_STATUS.LOGGED_IN) {
      await coreKitInstance.commitChanges();
    }
    uiConsole("reset");
    logout();
    setIsBlurred(false);
  };

  function uiConsole(...args: any): void {
    const el = document.querySelector("#console>p");
    if (el) {
      el.innerHTML = JSON.stringify(args || {}, null, 2);
    }
    console.log(...args);
  }

  const loggedInView = (
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
        <button onClick={enableMFA} className="card">
          Enable MFA
        </button>
      </div>
      <div>
        <button onClick={createMnemonicFactor} className="card">
          Generate Backup (Mnemonic)
        </button>
      </div>
      <div>
        <button onClick={criticalResetAccount} className="card danger">
          [CRITICAL] Reset Account
        </button>
      </div>
      <div>
        <button onClick={deleteFactor} className="card danger">
          Delete Social Factor
        </button>
      </div>
      <div>
        <button onClick={logout} className="card">
          Log Out
        </button>
      </div>
      {isBlurred ? <BlurredLoading /> : <BitcoinComponent coreKitInstance={coreKitInstance} />}
    </div>
  );

  const unloggedInView = (
    <div className="flex-container">
      {coreKitStatus === COREKIT_STATUS.REQUIRED_SHARE ? (
        <div
          className={`recovery-options ${showRecoveryOptions ? "" : "hidden"} ${
            coreKitStatus === COREKIT_STATUS.REQUIRED_SHARE ? "" : "disabledDiv"
          }`}
        >
          <h3>Account Recovery Options</h3>
          <div className="recovery-section">
            <h4>Device / Social MFA Factor</h4>
            <button onClick={() => getDeviceFactor()} className="card">
              Get Device Factor
            </button>
            <button onClick={() => getSocialMFAFactorKey()} className="card">
              Get Social MFA Factor
            </button>
          </div>

          <div className="recovery-section">
            <h4>Device / Social MFA Factor</h4>
            <div className="input-group">
              <input value={backupFactorKey} readOnly placeholder="Your backup factor will appear here" />
              <button onClick={() => inputBackupFactorKey()} className="card">
                Use Backup Factor to Login
              </button>
            </div>
          </div>

          <div className="recovery-section">
            <h4>Mnemonic Factor</h4>
            <div className="input-group">
              <input value={mnemonicFactor} onChange={(e) => setMnemonicFactor(e.target.value)} placeholder="Enter your mnemonic phrase" />
              <button onClick={() => MnemonicToFactorKeyHex(mnemonicFactor)} className="card">
                Recover Using Mnemonic
              </button>
            </div>
          </div>

          <div className="recovery-section danger-zone">
            <h4>Danger Zone</h4>
            <button onClick={criticalResetAccount} className="card danger">
              [CRITICAL] Reset Account
            </button>
          </div>
        </div>
      ) : (
        <button onClick={login} className="card">
          Login
        </button>
      )}
    </div>
  );

  return (
    <div className="container">
      <h1 className="title">
        <a target="_blank" href="https://web3auth.io/docs/sdk/core-kit/mpc-core-kit" rel="noreferrer">
          Web3Auth MPC Core Kit
        </a>{" "}
        Bitcoin Example
      </h1>

      {isLoading ? (
        <Loading />
      ) : (
        <div className="two-panel-layout">
          <div className="left-panel">
            <div className="grid">{coreKitStatus === COREKIT_STATUS.LOGGED_IN ? loggedInView : unloggedInView}</div>
          </div>
          {coreKitStatus === COREKIT_STATUS.LOGGED_IN && (
            <div className="right-panel">
              <div id="console" style={{ whiteSpace: "pre-line" }}>
                <p style={{ whiteSpace: "pre-line" }}></p>
              </div>
            </div>
          )}
        </div>
      )}

      <footer className="footer">
        <a
          href="https://github.com/Web3Auth/web3auth-core-kit-examples/tree/main/mpc-core-kit-web/mpc-core-kit-bitcoin"
          target="_blank"
          rel="noopener noreferrer"
        >
          Source code
        </a>
        <a href="https://coinfaucet.eu/en/btc-testnet/" target="_blank" rel="noopener noreferrer">
          Faucet
        </a>
      </footer>
    </div>
  );
}

export default App;
