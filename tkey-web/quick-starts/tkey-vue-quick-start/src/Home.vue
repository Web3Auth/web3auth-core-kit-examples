<!-- eslint-disable vue/no-ref-as-operand -->
<template>
  <div id="app">
    <h2>
      <a target="_blank" href="https://web3auth.io/docs/sdk/core-kit/tkey" rel="noreferrer">
        Web3Auth tKey
      </a>
      Vue.js Quick Start
    </h2>

    <div v-if="!loggedIn">
      <button @click="login" class="card">
        Login
      </button>
      <div v-if="tKeyInitialised">

        <button @click="getDeviceShare" class="card">
          Get Device Share
        </button>
        <label>Backup/ Device Share:</label>
        <input v-model="recoveryShare" />
        <button @click="inputRecoveryShare" class="card">
          Input Recovery Share
        </button>
        <button @click="criticalResetAccount" class="card">
          [CRITICAL] Reset Account
        </button>
        <label>Recover Using Mnemonic Share:</label>
        <input v-model="mnemonicShare" />
        <button @click="MnemonicToShareHex" class="card">
          Get Recovery Share using Mnemonic
        </button>
      </div>
    </div>

    <div v-if="loggedIn">
      <div class="flex-container">
        <div>
          <button class="card" @click="getUserInfo" style="cursor: pointer">
            Get User Info
          </button>
        </div>
        <div>
          <button class="card" @click="keyDetails" style="cursor: pointer">
            Key Details
          </button>
        </div>
        <div>
          <button class="card" @click="exportMnemonicShare" style="cursor: pointer">
            Generate Backup (Mnemonic)
          </button>
        </div>
        <div>
          <button class="card" @click="getAccounts" style="cursor: pointer">
            Get Accounts
          </button>
        </div>
        <div>
          <button class="card" @click="getBalance" style="cursor: pointer">
            Get Balance
          </button>
        </div>
        <div>
          <button class="card" @click="signMessage" style="cursor: pointer">
            Sign Message
          </button>
        </div>
        <div>
          <button class="card" @click="logout" style="cursor: pointer">
            Logout
          </button>
        </div>
        <div>
          <button class="card" @click="criticalResetAccount" style="cursor: pointer">
            [CRITICAL] Reset Account
          </button>
        </div>
      </div>
    </div>
    <div id="console" style="white-space: pre-line">
      <p style="white-space: pre-line"></p>
    </div>

    <footer class="footer">
      <a href="https://github.com/Web3Auth/web3auth-core-kit-examples/tree/main/single-factor-auth-web/quick-starts/sfa-vue-quick-start"
        target="_blank" rel="noopener noreferrer">
        Source code
      </a>
    </footer>
  </div>
</template>

<script lang="ts">
import { ref, onMounted } from "vue";
import { tKey, chainConfig } from './tkey';
import { ShareSerializationModule } from '@tkey/share-serialization';
import { SfaServiceProvider } from '@tkey/service-provider-sfa';
import { WebStorageModule } from '@tkey/web-storage';
import { EthereumPrivateKeyProvider } from "@web3auth/ethereum-provider";
import { IProvider } from "@web3auth/base";
import Web3 from "web3";

// Firebase libraries for custom authentication
import { initializeApp } from "firebase/app";
import { GoogleAuthProvider, getAuth, signInWithPopup, UserCredential } from "firebase/auth";

export default {
  // eslint-disable-next-line vue/multi-word-component-names
  name: "Home",
  props: {
    msg: String,
  },
  setup() {
    const loggedIn = ref<boolean>(false);
    const tKeyInitialised = ref<boolean>(false);
    let provider = <IProvider | null>(null);
    let userInfo = <any>({});
    const recoveryShare = ref<string>("");
    const mnemonicShare = ref<string>("");

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

    // Firebase Initialisation
    const app = initializeApp(firebaseConfig);

    onMounted(async () => {
      const init = async () => {
        try {
          await (tKey.serviceProvider as SfaServiceProvider).init(ethereumPrivateKeyProvider);
        } catch (error) {
          console.error(error);
        }
      };

      init();
    });

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

    const parseToken = (token: string) => {
      try {
        const base64Url = token.split(".")[1];
        const base64 = base64Url.replace("-", "+").replace("_", "/");
        return JSON.parse(window.atob(base64 || ""));
      } catch (err) {
        console.error(err);
        return null;
      }
    };

    const login = async () => {
      try {
        // login with firebase
        const loginRes = await signInWithGoogle();
        // get the id token from firebase
        const idToken = await loginRes.user.getIdToken(true);
        userInfo = parseToken(idToken);

        await (
          tKey.serviceProvider as SfaServiceProvider
        ).connect({
          verifier,
          verifierId: userInfo.sub,
          idToken,
        });

        await tKey.initialize();

        tKeyInitialised.value = true;

        var { requiredShares } = tKey.getKeyDetails();

        if (requiredShares > 0) {
          uiConsole('Please enter your backup shares, requiredShares:', requiredShares);
        } else {
          await reconstructKey();
        }
      }
      catch (err) {
        uiConsole(err);
      }
    };

    const reconstructKey = async () => {
      try {
        const reconstructedKey = await tKey.reconstructKey();
        const privateKey = reconstructedKey?.privKey.toString('hex');

        await ethereumPrivateKeyProvider.setupProvider(privateKey);
        provider = ethereumPrivateKeyProvider;
        loggedIn.value = true;
        setDeviceShare();
      } catch (e) {
        uiConsole(e);
      }
    };

    const inputRecoveryShare = async () => {
      try {
        await tKey.inputShare(recoveryShare.value);
        await reconstructKey();
        uiConsole('Recovery Share Input Successfully');
        return;
      } catch (error) {
        uiConsole('Input Recovery Share Error:', error);
      }
    };

    const keyDetails = async () => {
      if (!tKey) {
        uiConsole("tKey not initialized yet");
        return;
      }
      const keyDetails = await tKey.getKeyDetails();
      uiConsole(keyDetails);
    };

    const setDeviceShare = async () => {
      try {
        // checking if a device share exists
        const deviceShare = await getDeviceShare();

        // checking if the share is valid, if valid, no need to generate new device share
        if (deviceShare) {
          const keyDetails = await tKey.getKeyDetails();
          if (keyDetails.shareDescriptions[deviceShare.share.shareIndex.toString("hex")]) {
            uiConsole('Device Share Already Present');
            return;
          } else {
            uiConsole('Current Device Share is Invalid, Generating New Share.');
          }
        }

        const generateShareResult = await tKey.generateNewShare();
        const share = await tKey.outputShareStore(
          generateShareResult.newShareIndex,
        );
        await (
          tKey.modules.webStorage as WebStorageModule
        ).storeDeviceShare(share);
        uiConsole('Device Share Set', JSON.stringify(share));
      } catch (error) {
        uiConsole('Error', (error as any)?.message.toString(), 'error');
      }
    };

    const getDeviceShare = async () => {
      try {
        const share = await (
          tKey.modules.webStorage as WebStorageModule
        ).getDeviceShare();

        if (share) {
          uiConsole(
            'Device Share Captured Successfully across',
            JSON.stringify(share),
          );
          recoveryShare.value = share.share.share.toString('hex');
          return share;
        }
        uiConsole('Device Share Not found');
        return null;
      } catch (error) {
        uiConsole('Error', (error as any)?.message.toString(), 'error');
      }
    };

    const exportMnemonicShare = async () => {
      try {
        const generateShareResult = await tKey.generateNewShare();
        const share = await tKey.outputShareStore(
          generateShareResult.newShareIndex,
        ).share.share;
        const mnemonic = await (
          tKey.modules.shareSerialization as ShareSerializationModule
        ).serialize(share, 'mnemonic');
        uiConsole(mnemonic);
        return mnemonic;
      } catch (error) {
        uiConsole(error);
      }
    };

    const MnemonicToShareHex = async () => {
      if (!tKey) {
        uiConsole('tKey not initialized yet');
        return;
      }
      try {
        const share = await (
          tKey.modules.shareSerialization as ShareSerializationModule
        ).deserialize(mnemonicShare.value, 'mnemonic');
        recoveryShare.value = share.toString("hex");
        return share;
      } catch (error) {
        uiConsole(error, mnemonicShare.value);
      }
    };

    const getUserInfo = async () => {
      uiConsole(userInfo);
    };

    const logout = async () => {
      provider = null;
      loggedIn.value = false;
      userInfo = {};
      uiConsole("logged out");
    };

    const getAccounts = async () => {
      if (!provider) {
        uiConsole("provider not initialized yet");
        return;
      }
      const web3 = new Web3(provider as any);

      // Get user's Ethereum public address
      const address = await web3.eth.getAccounts();
      uiConsole(address);
    };

    const getBalance = async () => {
      if (!provider) {
        uiConsole("provider not initialized yet");
        return;
      }
      const web3 = new Web3(provider as any);

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
      if (!provider) {
        uiConsole("provider not initialized yet");
        return;
      }
      const web3 = new Web3(provider as any);

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

    const criticalResetAccount = async (): Promise<void> => {
      // This is a critical function that should only be used for testing purposes
      // Resetting your account means clearing all the metadata associated with it from the metadata server
      // The key details will be deleted from our server and you will not be able to recover your account
      if (!tKeyInitialised) {
        throw new Error("tKeyInitialised is initialised yet");
      }
      await tKey.storageLayer.setMetadata({
        privKey: tKey.serviceProvider.postboxKey,
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

    return {
      loggedIn,
      tKeyInitialised,
      provider,
      recoveryShare,
      mnemonicShare,
      login,
      logout,
      getUserInfo,
      getAccounts,
      getBalance,
      signMessage,
      inputRecoveryShare,
      getDeviceShare,
      MnemonicToShareHex,
      criticalResetAccount,
      keyDetails,
      exportMnemonicShare,
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
