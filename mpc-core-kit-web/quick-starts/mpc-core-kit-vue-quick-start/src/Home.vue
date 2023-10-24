<!-- eslint-disable vue/no-ref-as-operand -->
<template>
  <div id="app">
    <h2>
      <a target="_blank" href="https://web3auth.io/docs/sdk/core-kit/tkey" rel="noreferrer">
        Web3Auth MPC Core Kit
      </a>
      Vue.js Quick Start
    </h2>

    <div v-if="coreKitStatus !== COREKIT_STATUS.LOGGED_IN">
      <button @click="login" class="card">
        Login
      </button>
      <div v-if="coreKitStatus === COREKIT_STATUS.REQUIRED_SHARE">

        <button @click="getDeviceFactor" class="card">
          Get Device Factor
        </button>
        <label>Backup/ Device Factor:</label>
        <input v-model="backupFactorKey" />
        <button @click="inputBackupFactorKey" class="card">
          Input Backup Factor Key
        </button>
        <button @click="criticalResetAccount" class="card">
          [CRITICAL] Reset Account
        </button>
        <label>Recover Using Mnemonic Factor Key:</label>
        <input v-model="mnemonicFactor" />
        <button @click="MnemonicToFactorKeyHex" class="card">
          Get Recovery Factor Key using Mnemonic
        </button>
      </div>
    </div>

    <div v-if="coreKitStatus === COREKIT_STATUS.LOGGED_IN">
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
          <button class="card" @click="enableMFA" style="cursor: pointer">
            Enable MFA
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
        <div>
          <button class="card" @click="exportMnemonicFactor" style="cursor: pointer">
            Generate Backup (Mnemonic)
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
import { Web3AuthMPCCoreKit, WEB3AUTH_NETWORK, IdTokenLoginParams, TssShareType, parseToken, getWebBrowserFactor, generateFactorKey, COREKIT_STATUS, keyToMnemonic, mnemonicToKey } from "@web3auth/mpc-core-kit";
import Web3 from 'web3';
import { BN } from "bn.js";

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
    const coreKitStatus = ref<COREKIT_STATUS>(COREKIT_STATUS.NOT_INITIALIZED);
    const backupFactorKey = ref<string>("");
    const mnemonicFactor = ref<string>("");

    const verifier = "w3a-firebase-demo";

    // Your web app's Firebase configuration
    const firebaseConfig = {
      apiKey: "AIzaSyB0nd9YsPLu-tpdCrsXn8wgsWVAiYEpQ_E",
      authDomain: "web3auth-oauth-logins.firebaseapp.com",
      projectId: "web3auth-oauth-logins",
      storageBucket: "web3auth-oauth-logins.appspot.com",
      messagingSenderId: "461819774167",
      appId: "1:461819774167:web:e74addfb6cc88f3b5b9c92",
    };

    const coreKitInstance = new Web3AuthMPCCoreKit(
      {
        web3AuthClientId: 'BPi5PB_UiIZ-cPz1GtV5i1I2iOSOHuimiXBI0e-Oe_u6X3oVAbCiAZOTEBtTXw4tsluTITPqA8zMsfxIKMjiqNQ',
        web3AuthNetwork: WEB3AUTH_NETWORK.MAINNET,
      }
    );

    // Firebase Initialisation
    const app = initializeApp(firebaseConfig);

    onMounted(async () => {
      const init = async () => {
        try {
          await coreKitInstance.init();

          coreKitStatus.value = coreKitInstance.status;
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

    const login = async () => {
      try {
        if (!coreKitInstance) {
          throw new Error('initiated to login');
        }
        const loginRes = await signInWithGoogle();
        const idToken = await loginRes.user.getIdToken(true);
        const parsedToken = parseToken(idToken);

        const idTokenLoginParams = {
          verifier,
          verifierId: parsedToken.sub,
          idToken,
        } as IdTokenLoginParams;

        await coreKitInstance.loginWithJWT(idTokenLoginParams);

        if (coreKitInstance.status === COREKIT_STATUS.REQUIRED_SHARE) {
          uiConsole("required more shares, please enter your backup/ device factor key, or reset account [unrecoverable once reset, please use it with caution]");
        }

        coreKitStatus.value = coreKitInstance.status;
      }
      catch (err) {
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
      const factorKey = new BN(backupFactorKey.value, "hex")
      await coreKitInstance.inputFactorKey(factorKey);

      coreKitStatus.value = coreKitInstance.status;

      if (coreKitInstance.status === COREKIT_STATUS.REQUIRED_SHARE) {
        uiConsole("required more shares even after inputing backup factor key, please enter your backup/ device factor key, or reset account [unrecoverable once reset, please use it with caution]");
      }
    };

    const enableMFA = async () => {
      if (!coreKitInstance) {
        throw new Error("coreKitInstance is not set");
      }
      const factorKey = await coreKitInstance.enableMFA({});
      const factorKeyMnemonic = keyToMnemonic(factorKey);

      uiConsole("MFA enabled, device factor stored in local store, deleted hashed cloud key, your backup factor key: ", factorKeyMnemonic);
    };

    const keyDetails = async () => {
      if (!coreKitInstance) {
        throw new Error('coreKitInstance not found');
      }
      uiConsole(coreKitInstance.getKeyDetails());
    };

    const getDeviceFactor = async () => {
      try {
        const factorKey = await getWebBrowserFactor(coreKitInstance!);
        backupFactorKey.value = factorKey!;
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
      uiConsole(coreKitInstance.getUserInfo());
    };

    const logout = async () => {
      await coreKitInstance.logout();
      coreKitStatus.value = coreKitInstance.status;
      uiConsole("logged out");
    };


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

    return {
      coreKitStatus,
      getDeviceFactor,
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
      exportMnemonicFactor
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
