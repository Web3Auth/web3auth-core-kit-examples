import { useEffect, useState } from "react";
import { Web3Auth, decodeToken } from "@web3auth/single-factor-auth";
import { CHAIN_NAMESPACES, WEB3AUTH_NETWORK } from "@web3auth/base";
import { CommonPrivateKeyProvider } from "@web3auth/base-provider";
import { getHttpEndpoint } from "@orbs-network/ton-access";
import { useLaunchParams } from "@telegram-apps/sdk-react"; // For capturing initDataRaw from Telegram WebApp

import TonRPC from "./tonRpc"; // Your TonRPC utility for blockchain interaction
import Loading from "./Loading"; // Loading component to show during login process
import "./App.css"; // Import any necessary styles

// Get TON testnet RPC endpoint
const testnetRpc = await getHttpEndpoint({
  network: "testnet",
  protocol: "json-rpc",
});

// Web3Auth configuration
const verifier = "w3a-telegram-demo"; // Your verifier name for Web3Auth
const clientId = "BPi5PB_UiIZ-cPz1GtV5i1I2iOSOHuimiXBI0e-Oe_u6X3oVAbCiAZOTEBtTXw4tsluTITPqA8zMsfxIKMjiqNQ"; // Web3Auth Client ID

// TON chain configuration for Web3Auth
const chainConfig = {
  chainNamespace: CHAIN_NAMESPACES.OTHER,
  chainId: "testnet", // TON testnet chain ID
  rpcTarget: testnetRpc,
  displayName: "TON Testnet",
  blockExplorerUrl: "https://testnet.tonscan.org",
  ticker: "TON",
  tickerName: "Toncoin",
};

// Create a provider for the TON blockchain
const privateKeyProvider = new CommonPrivateKeyProvider({
  config: { chainConfig },
});

// Initialize Web3Auth
const web3authSfa = new Web3Auth({
  clientId, // Web3Auth Client ID
  web3AuthNetwork: WEB3AUTH_NETWORK.SAPPHIRE_MAINNET,
  usePnPKey: false, // Default key is CoreKitKey; change to true for PnP Web SDK key
  privateKeyProvider,
});

function App() {
  const [isLoggingIn, setIsLoggingIn] = useState(false); // Loader state
  const [loggedIn, setLoggedIn] = useState(false); // Login state
  const [provider, setProvider] = useState<any>(null); // Web3Auth provider
  const [initDataRaw, setInitDataRaw] = useState<string | null>(null); // Store initDataRaw from Telegram

  // Capture initDataRaw from Telegram WebApp upon opening
  useEffect(() => {
    const { initDataRaw } = useLaunchParams(); // Extract initDataRaw using TWA SDK
    if (initDataRaw) {
      setInitDataRaw(initDataRaw); // Store initDataRaw in state
    }
  }, []);

  // Automatically authenticate and connect Web3Auth once initDataRaw is available
  useEffect(() => {
    const connectWeb3Auth = async () => {
      if (!loggedIn && web3authSfa.status === "ready" && initDataRaw) {
        setIsLoggingIn(true); // Show loader while logging in
        try {
          const idToken = await getIdTokenFromServer(); // Fetch idToken from server
          if (!idToken) {
            console.error("No ID token found");
            setIsLoggingIn(false);
            return;
          }

          const { payload } = decodeToken(idToken);
          await web3authSfa.connect({
            verifier,
            verifierId: (payload as any).sub, // Use Telegram user ID as verifierId
            idToken: idToken,
          });

          setProvider(web3authSfa.provider); // Set Web3Auth provider
          setLoggedIn(true); // Update login status
        } catch (error) {
          console.error("Error during Web3Auth connection:", error);
        } finally {
          setIsLoggingIn(false); // Hide loader after login attempt
        }
      }
    };

    if (initDataRaw) {
      connectWeb3Auth(); // Trigger login process when initDataRaw is available
    }
  }, [initDataRaw, loggedIn]);

  // Function to request idToken from your server using initDataRaw
  const getIdTokenFromServer = async () => {
    try {
      const response = await fetch(`${process.env.REACT_APP_SERVER_URL}/auth/telegram`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ initDataRaw }),
      });
      const data = await response.json();
      return data.token; // Return idToken received from the server
    } catch (error) {
      console.error("Error fetching idToken from server:", error);
      return null;
    }
  };

  // Methods for handling different actions when logged in

  const getUserInfo = async () => {
    if (!provider) {
      console.log("Web3Auth Single Factor Auth SDK not initialized yet");
      return;
    }
    const userInfo = await web3authSfa.getUserInfo();
    console.log(userInfo);
  };

  const getAccounts = async () => {
    if (!provider) {
      console.log("No provider found");
      return;
    }
    const rpc = new TonRPC(web3authSfa.provider);
    const userAccount = await rpc.getAccounts();
    console.log(userAccount);
  };

  const getBalance = async () => {
    if (!provider) {
      console.log("No provider found");
      return;
    }
    const rpc = new TonRPC(web3authSfa.provider);
    const balance = await rpc.getBalance();
    console.log(balance);
  };

  const signMessage = async () => {
    if (!provider) {
      console.log("No provider found");
      return;
    }
    const rpc = new TonRPC(web3authSfa.provider);
    const result = await rpc.signMessage("Hello, TON!");
    console.log(`Message signed. Signature: ${result}`);
  };

  const sendTransaction = async () => {
    if (!provider) {
      console.log("No provider found");
      return;
    }
    const rpc = new TonRPC(web3authSfa.provider);
    const result = await rpc.sendTransaction();
    console.log(result);
  };

  const authenticateUser = async () => {
    if (!provider) {
      console.log("No provider found");
      return;
    }
    const userCredential = await web3authSfa.authenticateUser();
    console.log(userCredential);
  };

  const getPrivateKey = async () => {
    if (!web3authSfa.provider) {
      console.log("No provider found");
      return "";
    }
    const rpc = new TonRPC(web3authSfa.provider);
    const privateKey = await rpc.getPrivateKey();
    return privateKey;
  };

  // Main app view when the user is logged in
  const loginView = (
    <>
      <div className="flex-container">
        <button onClick={getUserInfo} className="card">
          Get User Info
        </button>
        <button onClick={authenticateUser} className="card">
          Authenticate User
        </button>
        <button onClick={getAccounts} className="card">
          Get Accounts
        </button>
        <button onClick={getBalance} className="card">
          Get Balance
        </button>
        <button onClick={signMessage} className="card">
          Sign Message
        </button>
        <button onClick={sendTransaction} className="card">
          Send Transaction
        </button>
        <button onClick={getPrivateKey} className="card">
          Get Private Key
        </button>
        <button onClick={async () => await web3authSfa.logout()} className="card">
          Log Out
        </button>
      </div>

      <div id="console" style={{ whiteSpace: "pre-line" }}>
        <p style={{ whiteSpace: "pre-line" }}></p>
      </div>
    </>
  );

  // View when the user is logged out
  const logoutView = (
    <button onClick={async () => await web3authSfa.init()} className="card">
      Login
    </button>
  );

  return (
    <div className="container">
      <h1 className="title">Web3Auth SFA React TON Example</h1>

      {/* Show the loader while logging in */}
      {isLoggingIn ? <Loading /> : <div className="grid">{web3authSfa ? (loggedIn ? loginView : logoutView) : null}</div>}

      <footer className="footer">
        <a href="https://github.com/Web3Auth" target="_blank" rel="noopener noreferrer">
          Source code
        </a>
      </footer>
    </div>
  );
}

export default App;
