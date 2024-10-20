import { useEffect, useState } from "react";
import { Web3Auth, decodeToken } from "@web3auth/single-factor-auth";
import { CHAIN_NAMESPACES, WEB3AUTH_NETWORK } from "@web3auth/base";
import { CommonPrivateKeyProvider } from "@web3auth/base-provider";
import { getHttpEndpoint } from "@orbs-network/ton-access";
import { useLaunchParams, isTMA } from "@telegram-apps/sdk-react";
import { mockTelegramEnvironment } from "./hooks/useMockTelegramInitData";
// import TonRPC from "./tonRpc";
import Loading from "./Loading";
import "./App.css";

const verifier = "w3a-telegram-demo";
const clientId = "BPi5PB_UiIZ-cPz1GtV5i1I2iOSOHuimiXBI0e-Oe_u6X3oVAbCiAZOTEBtTXw4tsluTITPqA8zMsfxIKMjiqNQ";

function App() {
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [loggedIn, setLoggedIn] = useState(false);
  const [provider, setProvider] = useState<any>(null);
  const [initDataRaw, setInitDataRaw] = useState<string | null>(null);
  const [web3authSfa, setWeb3authSfa] = useState<Web3Auth | null>(null);
  const [web3AuthInitialized, setWeb3AuthInitialized] = useState(false);

  const { initDataRaw: launchData } = useLaunchParams() || {};

  useEffect(() => {
    const checkTelegramEnvironment = async () => {
      if (await isTMA()) {
        console.log("Running inside Telegram Mini App.");
      } else {
        console.warn("Not running inside Telegram Mini App. Mocking environment for development...");
        if (process.env.NODE_ENV === "development") {
          mockTelegramEnvironment();
        }
      }

      if (launchData) {
        console.log("initDataRaw found: ", launchData);
        setInitDataRaw(launchData);
      } else {
        console.warn("initDataRaw not found or undefined.");
      }
    };

    checkTelegramEnvironment();
  }, [launchData]);

  useEffect(() => {
    const initializeWeb3Auth = async () => {
      try {
        console.log("Fetching TON Testnet RPC endpoint...");
        const testnetRpc = await getHttpEndpoint({
          network: "testnet",
          protocol: "json-rpc",
        });

        console.log("TON Testnet RPC endpoint: ", testnetRpc);

        const chainConfig = {
          chainNamespace: CHAIN_NAMESPACES.OTHER,
          chainId: "testnet",
          rpcTarget: testnetRpc,
          displayName: "TON Testnet",
          blockExplorerUrl: "https://testnet.tonscan.org",
          ticker: "TON",
          tickerName: "Toncoin",
        };

        const privateKeyProvider = new CommonPrivateKeyProvider({
          config: { chainConfig },
        });

        const web3authInstance = new Web3Auth({
          clientId,
          web3AuthNetwork: WEB3AUTH_NETWORK.SAPPHIRE_MAINNET,
          usePnPKey: false,
          privateKeyProvider,
        });

        console.log("Web3Auth initialized.");
        setWeb3authSfa(web3authInstance);

        await web3authInstance.init(); // Ensure Web3Auth is initialized
        setWeb3AuthInitialized(true);
        console.log("Web3Auth is now ready.");
      } catch (error) {
        console.error("Error fetching TON Testnet RPC endpoint: ", error);
      }
    };

    initializeWeb3Auth();
  }, []);

  useEffect(() => {
    const connectWeb3Auth = async () => {
      if (web3authSfa && web3AuthInitialized && !loggedIn && initDataRaw) {
        setIsLoggingIn(true);
        try {
          console.log("Starting Web3Auth connection...");

          const idToken = await getIdTokenFromServer();
          if (!idToken) {
            console.error("No ID token found.");
            setIsLoggingIn(false);
            return;
          }

          const { payload } = decodeToken(idToken);
          console.log("Decoded idToken payload: ", payload);

          await web3authSfa.connect({
            verifier,
            verifierId: (payload as any).sub,
            idToken: idToken,
          });

          setProvider(web3authSfa.provider);
          setLoggedIn(true);
          console.log("Successfully logged in.");
        } catch (error) {
          console.error("Error during Web3Auth connection:", error);
        } finally {
          setIsLoggingIn(false);
        }
      } else {
        console.warn("Web3Auth is not ready or already logged in.");
      }
    };

    if (web3AuthInitialized && initDataRaw) {
      connectWeb3Auth();
    }
  }, [initDataRaw, loggedIn, web3authSfa, web3AuthInitialized]);

  const getIdTokenFromServer = async () => {
    console.log("Requesting ID token from server with initDataRaw: ", initDataRaw);
    try {
      const response = await fetch(`${process.env.REACT_APP_SERVER_URL}/auth/telegram`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({ initDataRaw }),
        credentials: "include",
        mode: "cors",
      });
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data = await response.json();
      console.log("ID token received: ", data.token);
      return data.token;
    } catch (error) {
      console.error("Error fetching ID token from server: ", error);
      return null;
    }
  };

  const getUserInfo = async () => {
    if (!provider) {
      console.log("Web3Auth Single Factor Auth SDK not initialized yet");
      return;
    }
    const userInfo = await web3authSfa?.getUserInfo();
    console.log(userInfo);
  };

  const loginView = (
    <>
      <div className="flex-container">
        <button onClick={getUserInfo} className="card">
          Get User Info
        </button>
        {/* Add other actions here */}
      </div>
    </>
  );

  const logoutView = (
    <button onClick={async () => await web3authSfa?.init()} className="card">
      Login
    </button>
  );

  return (
    <div className="container">
      <h1 className="title">Web3Auth SFA React TON Example</h1>
      {isLoggingIn ? <Loading /> : <div className="grid">{provider ? (loggedIn ? loginView : logoutView) : null}</div>}
      <footer className="footer">
        <a href="https://github.com/Web3Auth" target="_blank" rel="noopener noreferrer">
          Source code
        </a>
      </footer>
    </div>
  );
}

export default App;
