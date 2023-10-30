import { Component } from "@angular/core";
import { Web3Auth } from "@web3auth/single-factor-auth";
import { CHAIN_NAMESPACES, IProvider } from "@web3auth/base";
import { EthereumPrivateKeyProvider } from "@web3auth/ethereum-provider";
import Web3 from "web3";

// Firebase libraries for custom authentication
import { initializeApp } from "firebase/app";
import { GoogleAuthProvider, getAuth, signInWithPopup, UserCredential } from "firebase/auth";

const clientId = "BEglQSgt4cUWcj6SKRdu5QkOXTsePmMcusG5EAoyjyOYKlVRjIF1iCNnMOTfpzCiunHRrMui8TIwQPXdkQ8Yxuk"; // get from https://dashboard.web3auth.io

const verifier = "w3a-firebase-demo";

const chainConfig = {
  chainNamespace: CHAIN_NAMESPACES.EIP155,
  chainId: "0x1", // Please use 0x1 for Mainnet
  rpcTarget: "https://rpc.ankr.com/eth",
  displayName: "Ethereum Mainnet",
  blockExplorer: "https://etherscan.io/",
  ticker: "ETH",
  tickerName: "Ethereum",
};

const web3auth = new Web3Auth({
  clientId, // Get your Client ID from Web3Auth Dashboard
  web3AuthNetwork: "sapphire_mainnet",
});

const privateKeyProvider = new EthereumPrivateKeyProvider({
  config: { chainConfig },
});

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyB0nd9YsPLu-tpdCrsXn8wgsWVAiYEpQ_E",
  authDomain: "web3auth-oauth-logins.firebaseapp.com",
  projectId: "web3auth-oauth-logins",
  storageBucket: "web3auth-oauth-logins.appspot.com",
  messagingSenderId: "461819774167",
  appId: "1:461819774167:web:e74addfb6cc88f3b5b9c92",
};

@Component({
  selector: "app-root",
  templateUrl: "./app.component.html",
  styleUrls: ["./app.component.css"],
})

export class AppComponent {
  title = "angular-app";

  provider: IProvider | null = null;
  userInfo: any = null;

  isModalLoaded = false;

  loggedIn = false;

  app = initializeApp(firebaseConfig);

  async ngOnInit() {
    const init = async () => {
      try {
        await web3auth.init(privateKeyProvider);
        this.provider = web3auth.provider;

        if (web3auth.sessionId) {
          this.loggedIn = true;
        }
      } catch (error) {
        console.error(error);
      }
    };

    init();
  }

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

  parseToken = (token: string) => {
    try {
      const base64Url = token.split(".")[1];
      const base64 = base64Url.replace("-", "+").replace("_", "/");
      return JSON.parse(window.atob(base64 || ""));
    } catch (err) {
      console.error(err);
      return null;
    }
  };

  login = async () => {
    if (!web3auth.ready) {
      this.uiConsole("web3auth initialised yet");
      return;
    }
    // login with firebase
    const loginRes = await this.signInWithGoogle();
    // get the id token from firebase
    const idToken = await loginRes.user.getIdToken(true);
    this.userInfo = this.parseToken(idToken);
    
    const web3authProvider = await web3auth.connect({
      verifier,
      verifierId: this.userInfo?.email,
      idToken,
    });

    if (web3authProvider) {
      this.loggedIn = true;
      this.provider = web3authProvider;
    }
  };

  getUserInfo = async () => {
    this.uiConsole(this.userInfo);
  };
  
  logout = async () => {
    await web3auth.logout();
    this.provider = null;
    this.loggedIn = false;
    this.uiConsole("logged out");
  };

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

  uiConsole(...args: any[]) {
    const el = document.querySelector("#console-ui>p");
    if (el) {
      el.innerHTML = JSON.stringify(args || {}, null, 2);
    }
  }
}
