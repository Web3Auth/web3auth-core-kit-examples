<!-- eslint-disable vue/no-ref-as-operand -->
<template>
  <div id="app">
    <header>
      <h1>Web3Auth Single Factor Auth & Vue.js</h1>
    </header>

    <main>
      <div v-if="!loggedIn" class="login-container">
        <button class="btn btn-primary" @click="login">Login</button>
      </div>

      <div v-if="loggedIn" class="dashboard">
        <div class="user-actions">
          <button class="btn" @click="getUserInfo">Get User Info</button>
          <button class="btn" @click="getAccounts">Get Accounts</button>
          <button class="btn" @click="getBalance">Get Balance</button>
          <button class="btn" @click="signMessage">Sign Message</button>
          <button class="btn btn-danger" @click="logout">Logout</button>
        </div>
        <div id="console">
          <h3>Console Output:</h3>
          <pre></pre>
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
    </main>

    <footer>
      <a href="https://github.com/Web3Auth/web3auth-core-kit-examples/tree/main/single-factor-auth-web/quick-starts/sfa-vue-quick-start"
        target="_blank" rel="noopener noreferrer">
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
// IMP START - Blockchain Calls
import RPC from "./ethersRPC";
// import RPC from "./viemRPC";
// import RPC from "./web3RPC";
// IMP END - Blockchain Calls

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
      const address = await RPC.getAccounts(provider);
      uiConsole(address);
    };

    const getBalance = async () => {
      if (!provider) {
        uiConsole("provider not initialized yet");
        return;
      }
      const balance = await RPC.getBalance(provider);
      uiConsole(balance);
    };

    const signMessage = async () => {
      if (!provider) {
        uiConsole("provider not initialized yet");
        return;
      }
      const signedMessage = await RPC.signMessage(provider);
      uiConsole(signedMessage);
    };


    const sendTransaction = async () => {
      if (!provider) {
        uiConsole("provider not initialized yet");
        return;
      }
      uiConsole("Sending Transaction...");
      const transactionReceipt = await RPC.sendTransaction(provider);
      uiConsole(transactionReceipt);
    };
    // IMP END - Blockchain Calls

    function uiConsole(...args: any[]): void {
      const el = document.querySelector("#console>pre");
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
  font-family: "Arial", sans-serif;
  max-width: 800px;
  margin: 0 auto;
  padding: 2rem;
  color: #333;
}

header {
  margin-bottom: 2rem;
}

h1 {
  color: #2c3e50;
  font-size: 2rem;
}

.login-container {
  display: flex;
  justify-content: center;
  margin-top: 2rem;
}

.dashboard {
  background-color: #f8f9fa;
  border-radius: 8px;
  padding: 2rem;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
}

.user-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 1rem;
  margin-bottom: 2rem;
}

.btn {
  padding: 0.5rem 1rem;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  transition: background-color 0.3s, transform 0.1s;
}

.btn:hover {
  transform: translateY(-2px);
}

.btn-primary {
  background-color: #3498db;
  color: white;
}

.btn-primary:hover {
  background-color: #2980b9;
}

.btn-danger {
  background-color: #e74c3c;
  color: white;
}

.btn-danger:hover {
  background-color: #c0392b;
}

#console {
  background-color: #2c3e50;
  color: #ecf0f1;
  border-radius: 4px;
  padding: 1rem;
  font-family: monospace;
  text-align: left;
}

#console h3 {
  margin-top: 0;
  color: #3498db;
}

#console pre {
  white-space: pre-wrap;
  word-break: break-all;
  margin: 0;
}

footer {
  margin-top: 2rem;
  text-align: center;
}

footer a {
  color: #3498db;
  text-decoration: none;
}

footer a:hover {
  text-decoration: underline;
}
</style>
