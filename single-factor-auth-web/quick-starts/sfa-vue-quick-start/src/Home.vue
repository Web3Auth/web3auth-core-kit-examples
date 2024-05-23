<!-- eslint-disable vue/no-ref-as-operand -->
<template>
  <div id="app">
    <h2>
      <a target="_blank" href="https://web3auth.io/docs/sdk/core-kit/sfa-web" rel="noreferrer"> Web3Auth Single Factor Auth </a>
      & Vue.js Quick Start
    </h2>

    <button v-if="!loggedIn" class="card" @click="login" style="cursor: pointer">Login</button>

    <div v-if="loggedIn">
      <div class="flex-container">
        <div>
          <button class="card" @click="getUserInfo" style="cursor: pointer">Get User Info</button>
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
      </div>
    </div>
    <div id="console" style="white-space: pre-line">
      <p style="white-space: pre-line"></p>
    </div>

    <footer class="footer">
      <a
        href="https://github.com/Web3Auth/web3auth-core-kit-examples/tree/main/single-factor-auth-web/quick-starts/sfa-vue-quick-start"
        target="_blank"
        rel="noopener noreferrer"
      >
        Source code
      </a>
    </footer>
  </div>
</template>

<script lang="ts">
import { ref, onMounted } from "vue";
// IMP START - Quick Start
import { Web3Auth, decodeToken } from "@web3auth/single-factor-auth";
import { CHAIN_NAMESPACES, IProvider, ADAPTER_EVENTS, WEB3AUTH_NETWORK } from "@web3auth/base";
import { EthereumPrivateKeyProvider } from "@web3auth/ethereum-provider";
// IMP END - Quick Start
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
    let provider = <IProvider | null>null;

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

    // Firebase Initialisation
    const app = initializeApp(firebaseConfig);
    // IMP END - Auth Provider Login

    onMounted(async () => {
      const init = async () => {
        try {
          // IMP START - SDK Initialization
          await web3auth.init();
          // IMP END - SDK Initialization
          provider = web3auth.provider;
          if (web3auth.status === ADAPTER_EVENTS.CONNECTED) {
            loggedIn.value = true;
          }
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
      if (!web3auth) {
        uiConsole("web3auth initialised yet");
        return;
      }
      // IMP START - Auth Provider Login
      // login with firebase
      const loginRes = await signInWithGoogle();
      // get the id token from firebase
      const idToken = await loginRes.user.getIdToken(true);
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
        loggedIn.value = true;
        provider = web3authProvider;
      }
    };

    const getUserInfo = async () => {
      // IMP START - Get User Information
      const user = await web3auth.getUserInfo();
      // IMP END - Get User Information
      uiConsole(user);
    };

    const logout = async () => {
      // IMP START - Logout
      await web3auth.logout();
      // IMP END - Logout
      provider = null;
      loggedIn.value = false;
      uiConsole("logged out");
    };

    // IMP START - Blockchain Calls
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
    // IMP END - Blockchain Calls

    function uiConsole(...args: any[]): void {
      const el = document.querySelector("#console>p");
      if (el) {
        el.innerHTML = JSON.stringify(args || {}, null, 2);
      }
      console.log(...args);
    }

    return {
      loggedIn,
      provider,
      web3auth,
      login,
      logout,
      getUserInfo,
      getAccounts,
      getBalance,
      signMessage,
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

.flex-container > div {
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
</style>
