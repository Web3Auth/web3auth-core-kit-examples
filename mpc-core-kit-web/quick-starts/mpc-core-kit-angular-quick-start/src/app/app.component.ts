import { Component } from "@angular/core";
// IMP START - Quick Start
import { CHAIN_NAMESPACES } from "@web3auth/base";
import { CommonPrivateKeyProvider } from "@web3auth/base-provider"; // Optional, only for social second factor recovery
import { EthereumSigningProvider } from "@web3auth/ethereum-mpc-provider";
import {
  COREKIT_STATUS,
  generateFactorKey,
  getWebBrowserFactor,
  IdTokenLoginParams,
  keyToMnemonic,
  mnemonicToKey,
  parseToken,
  TssShareType,
  WEB3AUTH_NETWORK,
  Web3AuthMPCCoreKit,
} from "@web3auth/mpc-core-kit";
import Web3AuthSingleFactorAuth from "@web3auth/single-factor-auth"; // Optional, only for social second factor recovery
// IMP END - Quick Start
import { BN } from "bn.js";
// IMP START - Auth Provider Login
// Firebase libraries for custom authentication
import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider, signInWithEmailAndPassword, signInWithPopup, UserCredential } from "firebase/auth";
// IMP END - Auth Provider Login
import Web3 from "web3";

// IMP START - SDK Initialization
// IMP START - Dashboard Registration
const web3AuthClientId = "BPi5PB_UiIZ-cPz1GtV5i1I2iOSOHuimiXBI0e-Oe_u6X3oVAbCiAZOTEBtTXw4tsluTITPqA8zMsfxIKMjiqNQ"; // get from https://dashboard.web3auth.io
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

const coreKitInstance = new Web3AuthMPCCoreKit({
  web3AuthClientId,
  web3AuthNetwork: WEB3AUTH_NETWORK.MAINNET,
  setupProviderOnInit: false, // needed to skip the provider setup
  manualSync: true, // This is the recommended approach
});

// Setup provider for EVM Chain
const evmProvider = new EthereumSigningProvider({ config: { chainConfig } });
evmProvider.setupProvider(coreKitInstance);
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

@Component({
  selector: "app-root",
  templateUrl: "./app.component.html",
  styleUrls: ["./app.component.css"],
})
export class AppComponent {
  title = "Web3Auth tKey Angular Quick Start";

  coreKitStatus: COREKIT_STATUS = COREKIT_STATUS.NOT_INITIALIZED;

  app = initializeApp(firebaseConfig);

  backupFactorKey = "";

  mnemonicFactor = "";

  getBackupFactorKeyInputEvent(event: any) {
    this.backupFactorKey = event.target.value;
  }

  getMnemonicFactorInputEvent(event: any) {
    this.mnemonicFactor = event.target.value;
  }

  async ngOnInit() {
    const init = async () => {
      try {
        // IMP START - SDK Initialization
        await coreKitInstance.init();
        // IMP END - SDK Initialization

        this.coreKitStatus = coreKitInstance.status;
      } catch (error) {
        console.error(error);
      }
    };

    init();
  }

  // IMP START - Auth Provider Login
  signInWithGoogle = async (): Promise<UserCredential> => {
    try {
      const auth = getAuth(this.app);
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

  login = async () => {
    try {
      if (!coreKitInstance) {
        throw new Error("initiated to login");
      }
      // IMP START - Auth Provider Login
      const loginRes = await this.signInWithGoogle();
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
      if (coreKitInstance.status === COREKIT_STATUS.LOGGED_IN) {
        await coreKitInstance.commitChanges(); // Needed for new accounts
      }
      // IMP END - Login

      // IMP START - Recover MFA Enabled Account
      if (coreKitInstance.status === COREKIT_STATUS.REQUIRED_SHARE) {
        this.uiConsole(
          "required more shares, please enter your backup/ device factor key, or reset account [unrecoverable once reset, please use it with caution]"
        );
      }
      // IMP END - Recover MFA Enabled Account

      this.coreKitStatus = coreKitInstance.status;
    } catch (err) {
      this.uiConsole(err);
    }
  };

  // IMP START - Recover MFA Enabled Account
  inputBackupFactorKey = async () => {
    if (!coreKitInstance) {
      throw new Error("coreKitInstance not found");
    }
    if (!this.backupFactorKey) {
      throw new Error("backupFactorKey not found");
    }
    const factorKey = new BN(this.backupFactorKey, "hex");
    await coreKitInstance.inputFactorKey(factorKey);

    this.coreKitStatus = coreKitInstance.status;

    if (coreKitInstance.status === COREKIT_STATUS.REQUIRED_SHARE) {
      this.uiConsole(
        "required more shares even after inputing backup factor key, please enter your backup/ device factor key, or reset account [unrecoverable once reset, please use it with caution]"
      );
    }
  };
  // IMP END - Recover MFA Enabled Account

  // IMP START - Export Social Account Factor
  getSocialMFAFactorKey = async (): Promise<string> => {
    try {
      // Initialise the Web3Auth SFA SDK
      // You can do this on the constructor as well for faster experience
      const web3authSfa = new Web3AuthSingleFactorAuth({
        clientId: web3AuthClientId, // Get your Client ID from Web3Auth Dashboard
        web3AuthNetwork: WEB3AUTH_NETWORK.MAINNET,
        usePnPKey: false, // Setting this to true returns the same key as PnP Web SDK, By default, this SDK returns CoreKitKey.
      });
      const privateKeyProvider = new CommonPrivateKeyProvider({ config: { chainConfig } });
      await web3authSfa.init(privateKeyProvider);

      // Login using Firebase Email Password
      const auth = getAuth(this.app);
      const res = await signInWithEmailAndPassword(auth, "custom+jwt@firebase.login", "Testing@123");
      console.log(res);
      const idToken = await res.user.getIdToken(true);
      const userInfo = parseToken(idToken);

      // Use the Web3Auth SFA SDK to generate an account using the Social Factor
      const web3authProvider = await web3authSfa.connect({
        verifier,
        verifierId: userInfo.sub,
        idToken,
      });

      // Get the private key using the Social Factor, which can be used as a factor key for the MPC Core Kit
      const factorKey = await web3authProvider?.request({
        method: "private_key",
      });
      this.uiConsole("Social Factor Key: ", factorKey);
      this.backupFactorKey = factorKey as string;
      return factorKey as string;
    } catch (err) {
      this.uiConsole(err);
      return "";
    }
  };
  // IMP END - Export Social Account Factor

  // IMP START - Enable Multi Factor Authentication
  enableMFA = async () => {
    if (!coreKitInstance) {
      throw new Error("coreKitInstance is not set");
    }
    try {
      const factorKey = new BN(await this.getSocialMFAFactorKey(), "hex");
      await coreKitInstance.enableMFA({ factorKey });

      if (coreKitInstance.status === COREKIT_STATUS.LOGGED_IN) {
        await coreKitInstance.commitChanges();
      }

      this.uiConsole(
        "MFA enabled, device factor stored in local store, deleted hashed cloud key, your backup factor key is associated with the firebase email password account in the app"
      );
    } catch (e) {
      this.uiConsole(e);
    }
  };
  // IMP END - Enable Multi Factor Authentication

  keyDetails = async () => {
    if (!coreKitInstance) {
      throw new Error("coreKitInstance not found");
    }
    this.uiConsole(coreKitInstance.getKeyDetails());
  };

  getDeviceFactor = async () => {
    try {
      const factorKey = await getWebBrowserFactor(coreKitInstance!);
      this.backupFactorKey = factorKey as string;
      this.uiConsole("Device share: ", factorKey);
    } catch (e) {
      this.uiConsole(e);
    }
  };

  exportMnemonicFactor = async (): Promise<void> => {
    if (!coreKitInstance) {
      throw new Error("coreKitInstance is not set");
    }
    this.uiConsole("export share type: ", TssShareType.RECOVERY);
    const factorKey = generateFactorKey();
    await coreKitInstance.createFactor({
      shareType: TssShareType.RECOVERY,
      factorKey: factorKey.private,
    });
    const factorKeyMnemonic = await keyToMnemonic(factorKey.private.toString("hex"));
    if (coreKitInstance.status === COREKIT_STATUS.LOGGED_IN) {
      await coreKitInstance.commitChanges(); // Needed for new accounts
    }
    this.uiConsole("Export factor key mnemonic: ", factorKeyMnemonic);
  };

  MnemonicToFactorKeyHex = async (mnemonic: string) => {
    if (!coreKitInstance) {
      throw new Error("coreKitInstance is not set");
    }
    try {
      const factorKey = await mnemonicToKey(mnemonic);
      this.backupFactorKey = factorKey;
      return factorKey;
    } catch (error) {
      this.uiConsole(error);
      return null;
    }
  };

  getUserInfo = async () => {
    // IMP START - Get User Information
    const user = coreKitInstance.getUserInfo();
    // IMP END - Get User Information
    this.uiConsole(user);
  };

  // IMP START - Blockchain Calls
  getAccounts = async () => {
    if (!coreKitInstance) {
      this.uiConsole("provider not initialized yet");
      return;
    }
    const web3 = new Web3(evmProvider);

    // Get user's Ethereum public address
    const address = await web3.eth.getAccounts();
    this.uiConsole(address);
  };

  getBalance = async () => {
    if (!coreKitInstance) {
      this.uiConsole("provider not initialized yet");
      return;
    }
    const web3 = new Web3(evmProvider);

    // Get user's Ethereum public address
    const address = (await web3.eth.getAccounts())[0];

    // Get user's balance in ether
    const balance = web3.utils.fromWei(
      await web3.eth.getBalance(address), // Balance is in wei
      "ether"
    );
    this.uiConsole(balance);
  };

  signMessage = async () => {
    if (!coreKitInstance) {
      this.uiConsole("provider not initialized yet");
      return;
    }
    const web3 = new Web3(evmProvider);

    // Get user's Ethereum public address
    const fromAddress = (await web3.eth.getAccounts())[0];

    const originalMessage = "YOUR_MESSAGE";

    // Sign the message
    const signedMessage = await web3.eth.personal.sign(
      originalMessage,
      fromAddress,
      "test password!" // configure your own password here.
    );
    this.uiConsole(signedMessage);
  };
  // IMP END - Blockchain Calls

  criticalResetAccount = async (): Promise<void> => {
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
      privKey: new BN(coreKitInstance.metadataKey!, "hex"),
      input: { message: "KEY_NOT_FOUND" },
    });
    if (coreKitInstance.status === COREKIT_STATUS.LOGGED_IN) {
      await coreKitInstance.commitChanges();
    }
    this.uiConsole("reset");
    this.logout();
  };

  logout = async () => {
    // IMP START - Logout
    await coreKitInstance.logout();
    // IMP END - Logout
    this.coreKitStatus = coreKitInstance.status;
    this.uiConsole("logged out");
  };

  uiConsole(...args: any[]) {
    const el = document.querySelector("#console-ui>p");
    if (el) {
      el.innerHTML = JSON.stringify(args || {}, null, 2);
    }
  }
}
