import { Component } from "@angular/core";
import { tKey, chainConfig } from './tkey';
import { ShareSerializationModule } from '@tkey/share-serialization';
import { SfaServiceProvider } from '@tkey/service-provider-sfa';
import { WebStorageModule } from '@tkey/web-storage';
import { EthereumPrivateKeyProvider } from "@web3auth/ethereum-provider";
import Web3 from "web3";
import { IProvider } from "@web3auth/base";

// Firebase libraries for custom authentication
import { initializeApp } from "firebase/app";
import { GoogleAuthProvider, getAuth, signInWithPopup, UserCredential } from "firebase/auth";

const verifier = "w3a-firebase-demo";

const ethereumPrivateKeyProvider = new EthereumPrivateKeyProvider({
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
  title = "Web3Auth tKey Angular Quick Start";
  tKeyInitialised: boolean = false;
  provider: IProvider | null = null;
  loggedIn: boolean = false;
  userInfo: any = null;
  recoveryShare: string = "";
  mnemonicShare: string = "";

  getRecoveryShareInputEvent(event: any) {
    this.recoveryShare = event.target.value;
  }
  getMnemonicShareInputEvent(event: any) {
    this.mnemonicShare = event.target.value;
  }

  app = initializeApp(firebaseConfig);

  async ngOnInit() {
    const init = async () => {
      try {
        await (tKey.serviceProvider as SfaServiceProvider).init(
          ethereumPrivateKeyProvider,
        );
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
    try {
      // login with firebase
      const loginRes = await this.signInWithGoogle();
      // get the id token from firebase
      const idToken = await loginRes.user.getIdToken(true);
      this.userInfo = this.parseToken(idToken);

      await (
        tKey.serviceProvider as SfaServiceProvider
      ).connect({
        verifier,
        verifierId: this.userInfo.sub,
        idToken,
      });

      await tKey.initialize();

      this.tKeyInitialised = true;

      var {requiredShares} = tKey.getKeyDetails();

      if (requiredShares > 0) {
        this.uiConsole('Please enter your backup shares, requiredShares:', requiredShares);
      } else {
        await this.reconstructKey();
      }
    }
    catch (err) {
      this.uiConsole(err);
    }
  };

  reconstructKey = async () => {
    try {
      const reconstructedKey = await tKey.reconstructKey();
      const privateKey = reconstructedKey?.privKey.toString('hex');

      await ethereumPrivateKeyProvider.setupProvider(privateKey);
      this.provider = ethereumPrivateKeyProvider;
      this.loggedIn = true;
      this.setDeviceShare();
    } catch (e) {
      this.uiConsole(e);
    }
  };

  inputRecoveryShare = async (share: string) => {
    try {
      await tKey.inputShare(share);
      await this.reconstructKey();
      this.uiConsole('Recovery Share Input Successfully');
      return;
    } catch (error) {
      this.uiConsole('Input Recovery Share Error:', error);
    }
  };

  setDeviceShare = async () => {
    try {
      const generateShareResult = await tKey.generateNewShare();
      const share = await tKey.outputShareStore(
        generateShareResult.newShareIndex,
      );
      await (
        tKey.modules["webStorage"] as WebStorageModule
      ).storeDeviceShare(share);
      this.uiConsole('Device Share Set', JSON.stringify(share));
    } catch (error) {
      this.uiConsole('Error', (error as any)?.message.toString(), 'error');
    }
  };

  getDeviceShare = async () => {
    try {
      const share = await (
        tKey.modules["webStorage"] as WebStorageModule
      ).getDeviceShare();

      if (share) {
        this.uiConsole(
          'Device Share Captured Successfully across',
          JSON.stringify(share),
        );
        this.recoveryShare = share.share.share.toString('hex');
        return share;
      }
      this.uiConsole('Device Share Not found');
      return null;
    } catch (error) {
      this.uiConsole('Error', (error as any)?.message.toString(), 'error');
      return null;
    }
  };

  exportMnemonicShare = async () => {
    try {
      const generateShareResult = await tKey.generateNewShare();
      const share = await tKey.outputShareStore(
        generateShareResult.newShareIndex,
      ).share.share;
      const mnemonic = await (
        tKey.modules["shareSerialization"] as ShareSerializationModule
      ).serialize(share, 'mnemonic');
      this.uiConsole(mnemonic);
      return mnemonic;
    } catch (error) {
      this.uiConsole(error);
      return null;
    }
  };

  MnemonicToShareHex = async (mnemonic: string) => {
    if (!tKey) {
      this.uiConsole('tKey not initialized yet');
      return;
    }
    try {
      const share = await (
        tKey.modules["shareSerialization"] as ShareSerializationModule
      ).deserialize(mnemonic, 'mnemonic');
      this.recoveryShare = share.toString("hex");
      return share;
    } catch (error) {
      this.uiConsole(error);
    }
  }; 

  keyDetails = async () => {
		if (!tKey) {
			this.uiConsole("tKey not initialized yet");
			return;
		}
		const keyDetails = await tKey.getKeyDetails();
		this.uiConsole(keyDetails);
	};

  getUserInfo = async () => {
    this.uiConsole(this.userInfo);
  };
  
  logout = async () => {
    this.provider = null;
    this.loggedIn = false;
    this.userInfo = null;
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

  criticalResetAccount = async (): Promise<void> => {
    // This is a critical function that should only be used for testing purposes
    // Resetting your account means clearing all the metadata associated with it from the metadata server
    // The key details will be deleted from our server and you will not be able to recover your account
    if (!this.tKeyInitialised) {
      throw new Error("tKeyInitialised is initialised yet");
    }
    await tKey.storageLayer.setMetadata({
      privKey: tKey.serviceProvider.postboxKey,
      input: { message: "KEY_NOT_FOUND" },
    });
    this.uiConsole('reset');
    this.logout();
  }

  uiConsole(...args: any[]) {
    const el = document.querySelector("#console-ui>p");
    if (el) {
      el.innerHTML = JSON.stringify(args || {}, null, 2);
    }
  }
}
