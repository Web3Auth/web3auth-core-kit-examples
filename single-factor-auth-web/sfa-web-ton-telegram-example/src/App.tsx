import { useEffect, useState } from "react";
import { Web3Auth, decodeToken } from "@web3auth/single-factor-auth";
import { CHAIN_NAMESPACES, WEB3AUTH_NETWORK } from "@web3auth/base";
import { CommonPrivateKeyProvider } from "@web3auth/base-provider";
import { getHttpEndpoint } from "@orbs-network/ton-access";
import TonRPC from "./tonRpc"; // Import the TonRPC class
import { useLaunchParams } from "@telegram-apps/sdk-react";
import { useTelegramMock } from "./hooks/useMockTelegramInitData";
import Loading from "./Loading";
import TelegramLogo from "./assets/Logo.svg"; // Assuming the logo is in the assets folder
import "./App.css";

const verifier = "w3a-telegram-demo";
const clientId = "BPi5PB_UiIZ-cPz1GtV5i1I2iOSOHuimiXBI0e-Oe_u6X3oVAbCiAZOTEBtTXw4tsluTITPqA8zMsfxIKMjiqNQ";

function App() {
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [web3authSfa, setWeb3authSfa] = useState<Web3Auth | null>(null);
  const [web3AuthInitialized, setWeb3AuthInitialized] = useState(false);
  const [userData, setUserData] = useState<any | null>(null); // State to hold parsed user info
  const [tonAccountAddress, setTonAccountAddress] = useState<string | null>(null);
  const [signedMessage, setSignedMessage] = useState<string | null>(null);
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  const { initDataRaw } = useLaunchParams() || {};

  useTelegramMock(); // Initialize the Telegram mock data

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

        setWeb3authSfa(web3authInstance);

        console.log("Initializing Web3Auth...");
        await web3authInstance.init(); // Ensure Web3Auth is initialized
        console.log("Web3Auth initialized.");

        setWeb3AuthInitialized(true);
      } catch (error) {
        console.error("Error fetching TON Testnet RPC endpoint: ", error);
      }
    };

    initializeWeb3Auth();
  }, []);

  useEffect(() => {
    const connectWeb3Auth = async () => {
      if (web3authSfa && web3AuthInitialized && initDataRaw) {
        setIsLoggingIn(true);
        try {
          console.log("Checking Web3Auth connection status...");

          if (web3authSfa.status === "connected") {
            await web3authSfa.logout();
            console.log("Logged out successfully.");
          }

          if (web3authSfa.status === "not_ready") {
            await web3authSfa.init();
            console.log("Web3Auth initialized.");
          }

          const idToken = await getIdTokenFromServer(initDataRaw);
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

          console.log("Successfully logged in.");
          setUserData(payload);
          setIsLoggedIn(true);

          // Initialize TonRPC and fetch the account address
          const tonRpc = new TonRPC(web3authSfa.provider);
          const tonAddress = await tonRpc.getAccounts();
          setTonAccountAddress(tonAddress); // Set the TON address dynamically

          // Sign a message and set it
          const messageToSign = "Hello, TON!";
          const signedMsg = await tonRpc.signMessage(messageToSign);
          setSignedMessage(signedMsg); // Set the signed message
        } catch (error) {
          console.error("Error during Web3Auth connection:", error);
        } finally {
          setIsLoggingIn(false);
        }
      }
    };

    if (web3AuthInitialized && initDataRaw) {
      connectWeb3Auth();
    }
  }, [initDataRaw, web3authSfa, web3AuthInitialized]);

  const getIdTokenFromServer = async (initDataRaw: string) => {
    const isMocked = !!sessionStorage.getItem("____mocked");

    const response = await fetch(`${import.meta.env.VITE_SERVER_URL}/auth/telegram`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ initDataRaw, isMocked }),
    });

    const data = await response.json();
    console.log("Received ID token from server:", data.token);
    return data.token;
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    alert("Copied to clipboard!");
  };

  const userInfoBox = (
    <div className="user-info-box">
      <img src={userData?.avatar_url} alt="User avatar" className="user-avatar" />
      <div className="user-info">
        <div className="id-with-logo">
          <p>
            <strong>ID:</strong> {userData?.telegram_id}
          </p>
          <img src={TelegramLogo} alt="Telegram Logo" className="telegram-logo" />
        </div>
        <p>
          <strong>Username:</strong> {userData?.username}
        </p>
        <p>
          <strong>Name:</strong> {userData?.name}
        </p>
      </div>
    </div>
  );

  const tonAccountBox = (
    <div className="info-box" onClick={() => copyToClipboard(tonAccountAddress || "")}>
      <p>
        <strong>TON Account:</strong> {tonAccountAddress}
      </p>
    </div>
  );

  const signedMessageBox = (
    <div className="info-box" onClick={() => copyToClipboard(signedMessage || "")}>
      <p>
        <strong>Signed Message:</strong> {signedMessage}
      </p>
    </div>
  );

  const logoutView = (
    <div className="loader-container">
      <Loading />
    </div>
  );

  return (
    <div className="container">
      <h1 className="title">Web3Auth TON Telegram MiniApp</h1>
      {isLoggingIn ? (
        <Loading />
      ) : (
        <div className="grid">
          {isLoggedIn ? (
            <>
              {userInfoBox}
              {tonAccountBox}
              {signedMessageBox}
            </>
          ) : (
            logoutView
          )}
        </div>
      )}
      <footer className="footer">
        <a href="https://github.com/Web3Auth" target="_blank" rel="noopener noreferrer">
          Source code
        </a>
      </footer>
    </div>
  );
}

export default App;
