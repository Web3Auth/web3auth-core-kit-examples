import { Component } from "@angular/core";
import { ADAPTER_EVENTS, CHAIN_NAMESPACES, IProvider, WEB3AUTH_NETWORK } from "@web3auth/base";
import { EthereumPrivateKeyProvider } from "@web3auth/ethereum-provider";
// IMP START - Quick Start
import { decodeToken, Web3Auth } from "@web3auth/single-factor-auth";
// Firebase libraries for custom authentication
import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider, signInWithPopup, UserCredential } from "firebase/auth";
// IMP END - Quick Start
import Web3 from "web3";

// IMP START - SDK Initialization
// IMP START - Dashboard Registration
const clientId = "BPi5PB_UiIZ-cPz1GtV5i1I2iOSOHuimiXBI0e-Oe_u6X3oVAbCiAZOTEBtTXw4tsluTITPqA8zMsfxIKMjiqNQ"; // get from https://dashboard.web3auth.io
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

const privateKeyProvider = new EthereumPrivateKeyProvider({
  config: { chainConfig },
});

const web3auth = new Web3Auth({
  clientId, // Get your Client ID from Web3Auth Dashboard
  web3AuthNetwork: WEB3AUTH_NETWORK.SAPPHIRE_MAINNET,
  privateKeyProvider,
});

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
  title = "angular-app";

  provider: IProvider | null = null;

  isModalLoaded = false;

  loggedIn = false;

  app = initializeApp(firebaseConfig);

  async ngOnInit() {
    const init = async () => {
      try {
        // IMP START - SDK Initialization
        await web3auth.init();
        // IMP END - SDK Initialization
        this.provider = web3auth.provider;

        if (web3auth.status === ADAPTER_EVENTS.CONNECTED) {
          this.loggedIn = true;
        }
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
    if (!web3auth) {
      this.uiConsole("web3auth initialised yet");
      return;
    }
    // IMP START - Auth Provider Login
    // login with firebase
    const loginRes = await this.signInWithGoogle();
    // get the id token from firebase
    const idToken = await loginRes.user.getIdToken(true);
    console.log(idToken);
    const { payload } = decodeToken(idToken);
    // IMP END - Auth Provider Login

    // IMP START - Login
    const web3authProvider = await web3auth.connect({
      verifier,
      verifierId: (payload as any).sub,
      idToken,
    });
    // IMP END - Login

    if (web3authProvider) {
      this.loggedIn = true;
      this.provider = web3authProvider;
    }
  };

  getUserInfo = async () => {
    // IMP START - Get User Information
    const user = await web3auth.getUserInfo();
    // IMP END - Get User Information
    this.uiConsole(user);
  };

  logout = async () => {
    // IMP START - Logout
    await web3auth.logout();
    // IMP END - Logout
    this.provider = null;
    this.loggedIn = false;
    this.uiConsole("logged out");
  };

  // IMP START - Blockchain Calls
  getAccounts = async () => {
    if (!this.provider) {
      this.uiConsole("provider not initialized yet");
      return;
    }
    const web3 = new Web3(this.provider as any);

    // Get user's Ethereum public address
    const address = await web3.eth.getAccounts();
    this.uiConsole(address);
  };

  getBalance = async () => {
    if (!this.provider) {
      this.uiConsole("provider not initialized yet");
      return;
    }
    const web3 = new Web3(this.provider as any);

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
    if (!this.provider) {
      this.uiConsole("provider not initialized yet");
      return;
    }
    const web3 = new Web3(this.provider as any);

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

  uiConsole(...args: any[]) {
    const el = document.querySelector("#console-ui>p");
    if (el) {
      el.innerHTML = JSON.stringify(args || {}, null, 2);
    }
  }
}
