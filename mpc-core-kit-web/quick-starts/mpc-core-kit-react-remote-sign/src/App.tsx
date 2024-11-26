

import "./App.css";
import { tssLib as dklsLib } from "@toruslabs/tss-dkls-lib";
import { tssLib as frostLib } from "@toruslabs/tss-frost-lib";
/* eslint-disable @typescript-eslint/no-use-before-define */
import { ADAPTER_EVENTS, CHAIN_NAMESPACES } from "@web3auth/base";
import { CommonPrivateKeyProvider } from "@web3auth/base-provider";
import { EthereumSigningProvider } from "@web3auth/ethereum-mpc-provider";
import { Point, secp256k1 } from "@tkey/common-types";
import {QRCodeSVG} from 'qrcode.react'

// IMP START - Quick Start
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
// Optional, only for social second factor recovery
import { Web3Auth as Web3AuthSingleFactorAuth } from "@web3auth/single-factor-auth";
import { BN } from "bn.js";
// Firebase libraries for custom authentication
import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider, signInWithEmailAndPassword, signInWithPopup, UserCredential } from "firebase/auth";
import { useEffect, useState } from "react";

// IMP END - Quick Start
// IMP START - Blockchain Calls
// import RPC from "./ethersRPC";
// import RPC from "./viemRPC";
import RPC from "./web3RPC";
import { AuthenticatorService, generateSecretKey, getFactorDetailsAndDescriptions, RemoteFactorDescription } from "@web3auth/mpc-remote-signer-plugin";


// Remote Sign

// const smsService = new SmsService();

// IMP END - Blockchain Calls

// IMP START - Dashboard Registration
const web3AuthClientId = "BPi5PB_UiIZ-cPz1GtV5i1I2iOSOHuimiXBI0e-Oe_u6X3oVAbCiAZOTEBtTXw4tsluTITPqA8zMsfxIKMjiqNQ"; // get from https://dashboard.web3auth.io
// IMP END - Dashboard Registration

// IMP START - Verifier Creation
const verifier = "w3a-firebase-demo";
// IMP END - Verifier Creation

// IMP START - Chain Config
const chainConfig = {
  chainNamespace: CHAIN_NAMESPACES.EIP155,
  chainId: "0xaa36a7",
  rpcTarget: "https://rpc.ankr.com/eth_sepolia",
  // Avoid using public rpcTarget in production.
  // Use services like Infura, Quicknode etc
  displayName: "Ethereum Sepolia Testnet",
  blockExplorerUrl: "https://sepolia.etherscan.io",
  ticker: "ETH",
  tickerName: "Ethereum",
  logo: "https://cryptologos.cc/logos/ethereum-eth-logo.png",
};
// IMP END - Chain Config

// IMP START - SDK Initialization
let coreKitInstance: Web3AuthMPCCoreKit;
let evmProvider: EthereumSigningProvider;

if (typeof window !== "undefined") {
  coreKitInstance = new Web3AuthMPCCoreKit({
    web3AuthClientId,
    web3AuthNetwork: WEB3AUTH_NETWORK.MAINNET,
    storage: window.localStorage,
    // manualSync: true, // This is the recommended approach
    tssLib: dklsLib,
  });

  
  // Setup provider for EVM Chain
  // evmProvider = new EthereumSigningProvider({ config: { chainConfig } });
  // evmProvider.setupProvider(makeEthereumSigner(coreKitInstance));
}
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

  const [showQrCode, setShowQrCode] = useState(false);
  const [qrCodeSVG, setQrCodeSVG] = useState<string>("");
  const [otpValue, setOtpValue] = useState<string>("");
  const [otpValue2, setOtpValue2] = useState<string>("");

  const [authenticatorService, setAuthenticatorService] = useState<AuthenticatorService<Web3AuthMPCCoreKit>>();

  // Firebase Initialisation
  const app = initializeApp(firebaseConfig);

  useEffect(() => {
    const init = async () => {
      //028fd23521363d1ec06161fbfb8237045b49c4f0864b040e0ded296de19d623e7c
      //030fd23521363d1ec06161fbfb8237045b49c4f0864b040e0ded296de19d623e8f
      const point = Point.fromScalar(new BN("86e2703b0b4bb8d771b5ad06ff8318a40889e4e72a38e94156f9774bbd34a93c", "hex"), secp256k1);
      console.log("point", point.toSEC1(secp256k1, true).toString("hex"));
      // IMP START - SDK Initialization
      await coreKitInstance.init();
      // IMP END - SDK Initialization

      if (coreKitInstance.status === COREKIT_STATUS.LOGGED_IN) {
        const authenticatorService = new AuthenticatorService({
          backendUrl : "http://localhost:3021",
          web3authNetwork: WEB3AUTH_NETWORK.MAINNET,
          remoteSignerInstance: coreKitInstance,
        })
        setAuthenticatorService(authenticatorService) 
      }
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
        throw new Error("initiated to login");
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
      } as JWTLoginParams;

      await coreKitInstance.loginWithJWT(idTokenLoginParams);
      if (coreKitInstance.status === COREKIT_STATUS.LOGGED_IN) {
        await coreKitInstance.commitChanges(); // Needed for new accounts
      }
      // IMP END - Login

      // IMP START - Recover MFA Enabled Account
      if (coreKitInstance.status === COREKIT_STATUS.REQUIRED_SHARE) {
        uiConsole(
          "required more shares, please enter your backup/ device factor key, or reset account [unrecoverable once reset, please use it with caution]"
        );
      }
      // IMP END - Recover MFA Enabled Account
      const authenticatorService = new AuthenticatorService({
        backendUrl : "http://localhost:3021",
        web3authNetwork: WEB3AUTH_NETWORK.MAINNET,
        remoteSignerInstance: coreKitInstance,
      })
      setAuthenticatorService(authenticatorService)
      setCoreKitStatus(coreKitInstance.status);
    } catch (err) {
      uiConsole(err);
    }
  };


  // Remote Sign
  const registerAuthenticatorSecret = async () => {
    if (!coreKitInstance || !authenticatorService) {
      throw new Error("coreKitInstance not found");
    }
    const result = await authenticatorService.startRegisterFactor()

    console.log(result);
    // qrcode
    
    setQrCodeSVG(result.secretKey);
    setShowQrCode(true);
  };

  const deleteAuthenticator = async () => {
    if (!coreKitInstance || !authenticatorService) {
      throw new Error("coreKitInstance not found");
    }
    await authenticatorService.unregisterFactor();
  }

  const registerAuthenticatorFactorkey = async ( code : string) => {
    if (!coreKitInstance || !authenticatorService) {
      throw new Error("coreKitInstance not found");
    }

    const factorkey = generateFactorKey();
    await authenticatorService.verifyRegistration( code, factorkey.private.toString("hex") );
    await coreKitInstance.commitChanges();
    setShowQrCode(false);
  }

  const remoteSetup = async (code : string) => {
    if (!coreKitInstance) {
      throw new Error("coreKitInstance not found");
    }

    const details = coreKitInstance.getKeyDetails();
    const {factorPub} = getFactorDetailsAndDescriptions( details.shareDescriptions, "authenticator")
    // to do add more security measure
    const updated = await authenticatorService?.setupRemoteSignerUsingAuthenticatorCode( code )

    setCoreKitStatus(coreKitInstance.status);
  }


  // IMP START - Recover MFA Enabled Account
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
  // IMP END - Recover MFA Enabled Account

  // IMP START - Export Social Account Factor
  const getSocialMFAFactorKey = async (): Promise<string> => {
    try {
      // Initialise the Web3Auth SFA SDK
      // You can do this on the constructor as well for faster experience
      const privateKeyProvider = new CommonPrivateKeyProvider({ config: { chainConfig } });

      const web3authSfa = new Web3AuthSingleFactorAuth({
        clientId: web3AuthClientId, // Get your Client ID from Web3Auth Dashboard
        web3AuthNetwork: WEB3AUTH_NETWORK.MAINNET,
        usePnPKey: false,
        privateKeyProvider, // Setting this to true returns the same key as PnP Web SDK, By default, this SDK returns CoreKitKey.
      });
      await web3authSfa.init();

      if (web3authSfa.status !== ADAPTER_EVENTS.CONNECTED) {
        // Login using Firebase Email Password
        const auth = getAuth(app);
        const res = await signInWithEmailAndPassword(auth, "custom+jwt@firebase.login", "Testing@123");
        console.log(res);
        const idToken = await res.user.getIdToken(true);
        const userInfo = parseToken(idToken);

        // Use the Web3Auth SFA SDK to generate an account using the Social Factor
        await web3authSfa.connect({
          verifier,
          verifierId: userInfo.sub,
          idToken,
        });
      }

      // Get the private key using the Social Factor, which can be used as a factor key for the MPC Core Kit
      const factorKey = await web3authSfa!.provider!.request({
        method: "private_key",
      });
      uiConsole("Social Factor Key: ", factorKey);
      setBackupFactorKey(factorKey as string);
      web3authSfa.logout();
      return factorKey as string;
    } catch (err) {
      uiConsole(err);
      return "";
    }
  };
  // IMP END - Export Social Account Factor

  // IMP START - Enable Multi Factor Authentication
  const enableMFA = async () => {
    if (!coreKitInstance) {
      throw new Error("coreKitInstance is not set");
    }
    try {
      const factorKey = new BN(await getSocialMFAFactorKey(), "hex");
      uiConsole("Using the Social Factor Key to Enable MFA, please wait...");
      await coreKitInstance.enableMFA({factorKey, shareDescription: FactorKeyTypeShareDescription.SocialShare });

      if (coreKitInstance.status === COREKIT_STATUS.LOGGED_IN) {
        await coreKitInstance.commitChanges();
      }

      uiConsole(
        "MFA enabled, device factor stored in local store, deleted hashed cloud key, your backup factor key is associated with the firebase email password account in the app"
      );
    } catch (e) {
      uiConsole(e);
    }
  };
  // IMP END - Enable Multi Factor Authentication

  // IMP START - Delete Factor
  const deleteFactor = async () => {
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
  };
  // IMP END - Delete Factor

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

  const createMnemonicFactor = async ( tssShareType: TssShareType): Promise<void> => {
    if (!coreKitInstance) {
      throw new Error("coreKitInstance is not set");
    }
    uiConsole("export share type: ", tssShareType);
    const factorKey = generateFactorKey();
    await coreKitInstance.createFactor({
      shareType: tssShareType,
      factorKey: factorKey.private,
      shareDescription: FactorKeyTypeShareDescription.SeedPhrase,
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
  // Check the RPC file for the implementation
  const getAccounts = async () => {
    const address = await RPC.getAccounts(evmProvider);
    uiConsole(address);
  };

  const setAccountIndex = async ( index: number) => {
    const result = await coreKitInstance.setTssWalletIndex(index);
  }

  const getBalance = async () => {
    const balance = await RPC.getBalance(evmProvider);
    uiConsole(balance);
  };

  const signMessage = async () => {
    // const signedMessage = await RPC.signMessage(evmProvider);

    const originalMessage = "YOUR_MESSAGE";
    const signedMessage = await coreKitInstance.sign(Buffer.from(originalMessage))
    uiConsole(signedMessage);
  };

  const sendTransaction = async () => {
    uiConsole("Sending Transaction...");
    const transactionReceipt = await RPC.sendTransaction(evmProvider);
    uiConsole(transactionReceipt);
  };
  // IMP END - Blockchain Calls

  const criticalResetAccount = async (): Promise<void> => {
    // This is a critical function that should only be used for testing purposes
    // Resetting your account means clearing all the metadata associated with it from the metadata server
    // The key details will be deleted from our server and you will not be able to recover your account
    if (!coreKitInstance) {
      throw new Error("coreKitInstance is not set");
    }
    // if (selectedNetwork === WEB3AUTH_NETWORK.MAINNET) {
    //   throw new Error("reset account is not recommended on mainnet");
    // }
    await coreKitInstance.tKey.storageLayer.setMetadata({
      privKey: new BN(coreKitInstance.state.postBoxKey! as string, "hex"),
      input: { message: "KEY_NOT_FOUND" },
    });
    if (coreKitInstance.status === COREKIT_STATUS.LOGGED_IN) {
      await coreKitInstance.commitChanges();
    }
    uiConsole("reset");
    logout();
  };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
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
        <button onClick={getAccounts} className="card">
          Get Accounts
        </button>
      </div>

      <div>
        <button onClick={()=>setAccountIndex(0)} className="card">
          setAccountIndex 0
        </button>
      </div> 
      <div>
        <button onClick={()=>setAccountIndex(1)} className="card">
          setAccountIndex 1
        </button>
      </div> 
      <div>
        <button onClick={()=>setAccountIndex(2)} className="card">
          setAccountIndex 2
        </button>
      </div> 

      <div>
        <button onClick={()=>setAccountIndex(3)} className="card">
          setAccountIndex 3
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
        <button onClick={sendTransaction} className="card">
          Send Transaction
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
        <button onClick={deleteFactor} className="card">
          Delete Social Factor
        </button>
      </div>
      <div>
        <button onClick={()=>createMnemonicFactor(TssShareType.DEVICE)} className="card">
          Generate Backup (Mnemonic) Share Index 2 (Device)
        </button>
      </div>
      <div>
        <button onClick={()=>createMnemonicFactor(TssShareType.RECOVERY)} className="card">
          Generate Backup (Mnemonic) Share Index 3 (Recovery)
        </button>
      </div>
      <div>
        <button onClick={registerAuthenticatorSecret} className="card">
          Register Authenticator
        </button>
        <input value={otpValue} onChange={(e) => setOtpValue(e.target.value)}/>
        <button onClick={deleteAuthenticator} className="card">
          Delete Authenticator
        </button>
      </div>
    </div>
  );

  const unloggedInView = (
    <div className="flex-container">
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
        <button onClick={() => getSocialMFAFactorKey()} className="card">
          Get Social MFA Factor
        </button>
        <label>Backup/ Device Factor: {backupFactorKey}</label>
        <button onClick={() => inputBackupFactorKey()} className="card">
          Input Backup Factor Key
        </button>

        <input value={otpValue2} onChange={(e) => setOtpValue2(e.target.value)} />

        <button onClick={()=>remoteSetup(otpValue2)} className="card"> Verify Otp and setup Remote Signer </button>
        <button onClick={criticalResetAccount} className="card">
          [CRITICAL] Reset Account
        </button>
      </div>
    </div>
  );


  const QRCodeRegisterView = () => {
    return <div id="qrcode" style={{ textAlign: "center" , position:"absolute" }} >
      <QRCodeSVG value={qrCodeSVG} size={300} />
      <span>{qrCodeSVG}</span>
      <input value={otpValue} onChange={(e) => setOtpValue(e.target.value)}/>
      <button onClick={() => registerAuthenticatorFactorkey(otpValue)} >Verify</button>
    </div>;
  };

  return (
    <div className="container">

      { showQrCode && <QRCodeRegisterView />}
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
