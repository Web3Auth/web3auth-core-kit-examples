<!-- eslint-disable vue/no-ref-as-operand -->
<template>
  <div id="app">
    <h2>
      <a target="_blank" href="https://web3auth.io/docs/sdk/core-kit/mpc-core-kit/" rel="noreferrer"> Web3Auth MPC Core
        Kit </a>
      Vue.js Quick Start
    </h2>

    <div v-if="coreKitStatus !== COREKIT_STATUS.LOGGED_IN">
      <button @click="login" class="card">Login</button>
      <div v-if="coreKitStatus === COREKIT_STATUS.REQUIRED_SHARE">
        <button @click="getDeviceFactor" class="card">Get Device Factor</button>
        <label>Recover Using Mnemonic Factor Key:</label>
        <input v-model="mnemonicFactor" />
        <button @click="getSocialMFAFactorKey" class="card">Get Social Recovery Factor</button>
        <label>Backup/ Device Factor: </label>
        <span v-html="backupFactorKey"></span>
        <button @click="inputBackupFactorKey" class="card">Input Backup Factor Key</button>
        <button @click="criticalResetAccount" class="card">[CRITICAL] Reset Account</button>
        <button @click="MnemonicToFactorKeyHex" class="card">Get Recovery Factor Key using Mnemonic</button>
      </div>
    </div>

    <div v-if="coreKitStatus === COREKIT_STATUS.LOGGED_IN">
      <div class="flex-container">
        <div>
          <button class="card" @click="getUserInfo" style="cursor: pointer">Get User Info</button>
        </div>
        <div>
          <button class="card" @click="keyDetails" style="cursor: pointer">Key Details</button>
        </div>
        <div>
          <button class="card" @click="enableMFA" style="cursor: pointer">Enable MFA</button>
        </div>
        <div>
          <button class="card" @click="getAccounts" style="cursor: pointer">Get Accounts</button>
        </div>
        <div>
          <button class="card" @click="getBalance" style="cursor: pointer">Get Balance</button>
        </div>
        <div>
          <button class="card" @click="signMessage" style="cursor: pointer">Sign Message</button>
        </div>
        <div>
          <button class="card" @click="logout" style="cursor: pointer">Logout</button>
        </div>
        <div>
          <button class="card" @click="criticalResetAccount" style="cursor: pointer">[CRITICAL] Reset Account</button>
        </div>
        <div>
          <button class="card" @click="deleteFactor" style="cursor: pointer">Delete Social Factor</button>
        </div>
        <div>
          <button class="card" @click="createMnemonicFactor" style="cursor: pointer">Generate Backup (Mnemonic)</button>
        </div>
      </div>
    </div>
    <div id="console" style="white-space: pre-line">
      <p style="white-space: pre-line"></p>
    </div>

    <footer class="footer">
      <a href="https://github.com/Web3Auth/web3auth-core-kit-examples/tree/main/mpc-core-kit-web/quick-starts/mpc-core-kit-vue-quick-start"
        target="_blank" rel="noopener noreferrer">
        Source code
      </a>
    </footer>
  </div>
</template>

<script lang="ts">
import { ref, onMounted } from "vue";
// IMP START - Quick Start
import {
  Web3AuthMPCCoreKit,
  WEB3AUTH_NETWORK,
  JWTLoginParams,
  TssShareType,
  parseToken,
  generateFactorKey,
  COREKIT_STATUS,
  keyToMnemonic,
  mnemonicToKey,
  makeEthereumSigner,
  FactorKeyTypeShareDescription,
} from "@web3auth/mpc-core-kit";
import { tssLib } from "@toruslabs/tss-dkls-lib";
import { ADAPTER_EVENTS, CHAIN_NAMESPACES } from "@web3auth/base";
import { Point, secp256k1 } from "@tkey/common-types";
import { EthereumSigningProvider } from "@web3auth/ethereum-mpc-provider";
// Optional, only for social second factor recovery
import {Web3Auth as Web3AuthSingleFactorAuth} from "@web3auth/single-factor-auth";
import { CommonPrivateKeyProvider } from "@web3auth/base-provider";
// IMP END - Quick Start
import Web3 from "web3";
import { BN } from "bn.js";

// Firebase libraries for custom authentication
import { initializeApp } from "firebase/app";
import { GoogleAuthProvider, getAuth, signInWithEmailAndPassword, signInWithPopup, UserCredential } from "firebase/auth";

export default {
  // eslint-disable-next-line vue/multi-word-component-names
  name: "Home",
  props: {
    msg: String,
  },
  setup() {
    const coreKitStatus = ref<COREKIT_STATUS>(COREKIT_STATUS.NOT_INITIALIZED);
    const backupFactorKey = ref<string>("");
    const mnemonicFactor = ref<string>("");

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
      manualSync: true,
      storage: window.localStorage,
      tssLib,
    });

    // Setup provider for EVM Chain
    const evmProvider = new EthereumSigningProvider({ config: { chainConfig } });
    evmProvider.setupProvider(makeEthereumSigner(coreKitInstance));

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

    // Firebase Initialisation
    const app = initializeApp(firebaseConfig);
    // IMP END - Auth Provider Login

    onMounted(async () => {
      const init = async () => {
        try {
          // IMP START - SDK Initialization
          await coreKitInstance.init();
          // IMP END - SDK Initialization

          coreKitStatus.value = coreKitInstance.status;
        } catch (error) {
          console.error(error);
        }
      };

      init();
    });

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

        coreKitStatus.value = coreKitInstance.status;
      } catch (err) {
        uiConsole(err);
      }
    };

    // IMP START - Recover MFA Enabled Account
    const inputBackupFactorKey = async () => {
      if (!coreKitInstance) {
        throw new Error("coreKitInstance not found");
      }
      if (!backupFactorKey.value) {
        throw new Error("backupFactorKey not found");
      }
      const factorKey = new BN(backupFactorKey.value, "hex");
      await coreKitInstance.inputFactorKey(factorKey);

      coreKitStatus.value = coreKitInstance.status;

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
          privateKeyProvider,
          usePnPKey: false, // Setting this to true returns the same key as PnP Web SDK, By default, this SDK returns CoreKitKey.
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
        backupFactorKey.value = factorKey! as string;
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
        backupFactorKey.value = factorKey!;
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
        shareDescription: FactorKeyTypeShareDescription.SeedPhrase,
      });
      const factorKeyMnemonic = await keyToMnemonic(factorKey.private.toString("hex"));

      if (coreKitInstance.status === COREKIT_STATUS.LOGGED_IN) {
        await coreKitInstance.commitChanges();
      }

      uiConsole("Export factor key mnemonic: ", factorKeyMnemonic);
    };

    const MnemonicToFactorKeyHex = async () => {
      if (!coreKitInstance) {
        throw new Error("coreKitInstance is not set");
      }
      try {
        const factorKey = await mnemonicToKey(mnemonicFactor.value);
        backupFactorKey.value = factorKey;
        return factorKey;
      } catch (error) {
        uiConsole(error);
      }
    };

    const getUserInfo = async () => {
      // IMP START - Get User Information
      const user = await coreKitInstance.getUserInfo();
      // IMP END - Get User Information
      uiConsole(user);
    };

    const logout = async () => {
      // IMP START - Logout
      await coreKitInstance.logout();
      // IMP END - Logout
      coreKitStatus.value = coreKitInstance.status;
      uiConsole("logged out");
    };

    // IMP START - Blockchain Calls
    const getAccounts = async () => {
      if (!coreKitInstance) {
        uiConsole("provider not initialized yet");
        return;
      }
      const web3 = new Web3(evmProvider);

      // Get user's Ethereum public address
      const address = await web3.eth.getAccounts();
      uiConsole(address);
    };

    const getBalance = async () => {
      if (!coreKitInstance) {
        uiConsole("provider not initialized yet");
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
      uiConsole(balance);
    };

    const signMessage = async () => {
      if (!coreKitInstance) {
        uiConsole("provider not initialized yet");
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
      // if (selectedNetwork === WEB3AUTH_NETWORK.MAINNET) {
      //   throw new Error("reset account is not recommended on mainnet");
      // }
      await coreKitInstance.tKey.storageLayer.setMetadata({
        privKey: new BN(coreKitInstance.state.postBoxKey!, "hex"),
        input: { message: "KEY_NOT_FOUND" },
      });
      if (coreKitInstance.status === COREKIT_STATUS.LOGGED_IN) {
        await coreKitInstance.commitChanges();
      }
      uiConsole("reset");
      logout();
    };

    function uiConsole(...args: any[]): void {
      const el = document.querySelector("#console>p");
      if (el) {
        el.innerHTML = JSON.stringify(args || {}, null, 2);
      }
      console.log(...args);
    }

    return {
      coreKitStatus,
      getDeviceFactor,
      deleteFactor,
      COREKIT_STATUS,
      backupFactorKey,
      inputBackupFactorKey,
      mnemonicFactor,
      MnemonicToFactorKeyHex,
      login,
      logout,
      getUserInfo,
      getAccounts,
      getBalance,
      signMessage,
      criticalResetAccount,
      keyDetails,
      enableMFA,
      createMnemonicFactor,
      getSocialMFAFactorKey,
    };
  },
};
</script>

<!-- Add "scoped" attribute to limit CSS to this component only -->
<style scoped>
#app {
  width: 80%;
  margin: auto;
  padding: 0 2rem;
}

h3 {
  margin: 40px 0 0;
}

ul {
  list-style-type: none;
  padding: 0;
}

li {
  display: inline-block;
  margin: 0 10px;
}

a {
  color: #42b983;
}

.card {
  margin: 0.5rem;
  padding: 0.7rem;
  text-align: center;
  color: #0070f3;
  background-color: #fafafa;
  text-decoration: none;
  border: 1px solid #0070f3;
  border-radius: 10px;
  transition: color 0.15s ease, border-color 0.15s ease;
  width: 100%;
}

.card:hover,
.card:focus,
.card:active {
  cursor: pointer;
  background-color: #f1f1f1;
}

.flex-container {
  display: flex;
  flex-flow: row wrap;
}

.flex-container>div {
  width: 100px;
  margin: 10px;
  text-align: center;
  line-height: 75px;
  font-size: 30px;
}

#console {
  width: 100%;
  height: 100%;
  overflow: auto;
  word-wrap: break-word;
  font-size: 16px;
  font-family: monospace;
  text-align: left;
}

.disabledDiv {
  pointer-events: none;
  opacity: 0.4;
}

.flex-column {
  display: flex;
  flex-direction: column;
}
</style>
