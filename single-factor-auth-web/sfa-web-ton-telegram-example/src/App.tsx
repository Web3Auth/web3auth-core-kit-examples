import { useEffect, useState } from "react";
import { Web3Auth, decodeToken } from "@web3auth/single-factor-auth";
import { CHAIN_NAMESPACES, WEB3AUTH_NETWORK } from "@web3auth/base";
import { CommonPrivateKeyProvider } from "@web3auth/base-provider";
import { getHttpEndpoint } from "@orbs-network/ton-access";
import TonRPC from "./tonRpc"; // Import the TonRPC class
import { useLaunchParams, mainButton } from "@telegram-apps/sdk-react";
import { useTelegramMock } from "./hooks/useMockTelegramInitData";
import Loading from "./components/Loading";
import TelegramLogo from "./assets/TelegramLogo.svg"; // Assuming the logo is in the assets folder
import "./App.css";

const verifier = "w3a-telegram-demo";
const clientId = "BPi5PB_UiIZ-cPz1GtV5i1I2iOSOHuimiXBI0e-Oe_u6X3oVAbCiAZOTEBtTXw4tsluTITPqA8zMsfxIKMjiqNQ";

function App() {
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [web3authSfa, setWeb3authSfa] = useState<Web3Auth | null>(null);
  const [web3AuthInitialized, setWeb3AuthInitialized] = useState(false);
  const [userData, setUserData] = useState<any | null>(null);
  const [tonAccountAddress, setTonAccountAddress] = useState<string | null>(null);
  const [signedMessage, setSignedMessage] = useState<string | null>(null);
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  const { initDataRaw, initData, themeParams } = useLaunchParams() || {};

  useTelegramMock(); // Initialize the Telegram mock data

  useEffect(() => {
    if (themeParams) {
      const bgColor = themeParams.bg_color || "#ffffff";
      const textColor = themeParams.text_color || "#333333";
      document.documentElement.style.setProperty("--bg-color", bgColor);
      document.documentElement.style.setProperty("--text-color", textColor);
    }
  }, []);

  useEffect(() => {
    const initializeWeb3Auth = async () => {
      try {
        const testnetRpc = await getHttpEndpoint({
          network: "testnet",
          protocol: "json-rpc",
        });

        const chainConfig = {
          chainNamespace: CHAIN_NAMESPACES.OTHER,
          chainId: "testnet",
          rpcTarget: testnetRpc,
          displayName: "TON Testnet",
          ticker: "TON",
          tickerName: "Toncoin",
        };

        const privateKeyProvider = new CommonPrivateKeyProvider({ config: { chainConfig } });

        const web3authInstance = new Web3Auth({
          clientId,
          web3AuthNetwork: WEB3AUTH_NETWORK.SAPPHIRE_MAINNET,
          usePnPKey: false,
          privateKeyProvider,
        });

        setWeb3authSfa(web3authInstance);

        await web3authInstance.init();
        setWeb3AuthInitialized(true);
      } catch (error) {
        console.error("Error initializing Web3Auth:", error);
      }
    };

    initializeWeb3Auth();
  }, []);

  useEffect(() => {
    const connectWeb3Auth = async () => {
      if (web3authSfa && web3AuthInitialized && initDataRaw) {
        setIsLoggingIn(true);
        try {
          if (web3authSfa.status === "connected") {
            await web3authSfa.logout();
          }

          const idToken = await getIdTokenFromServer(initDataRaw, initData.user.photoUrl);
          if (!idToken) return;

          const { payload } = decodeToken(idToken);

          await web3authSfa.connect({
            verifier,
            verifierId: (payload as any).sub,
            idToken: idToken,
          });

          setUserData(payload);
          setIsLoggedIn(true);

          const tonRpc = new TonRPC(web3authSfa.provider);
          const tonAddress = await tonRpc.getAccounts();
          setTonAccountAddress(tonAddress);

          const messageToSign = "Hello, TON!";
          const signedMsg = await tonRpc.signMessage(messageToSign);
          setSignedMessage(signedMsg);

          mainButton.setParams({
            text: tonAccountAddress ? "Copy TON Address" : "Copy Signed Message",
            backgroundColor: "#000000",
            textColor: "#ffffff",
            isVisible: true,
          });

          mainButton.onClick(() => {
            const textToCopy = tonAccountAddress || signedMessage || "";
            navigator.clipboard.writeText(textToCopy);
            alert("Copied to clipboard!");
          });
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
  }, [initDataRaw, web3authSfa, web3AuthInitialized, tonAccountAddress, signedMessage]);

  const getIdTokenFromServer = async (initDataRaw: string, photoUrl: string | undefined) => {
    const isMocked = !!sessionStorage.getItem("____mocked");
    const response = await fetch(`${import.meta.env.VITE_SERVER_URL}/auth/telegram`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ initDataRaw, isMocked, photoUrl }),
    });
    const data = await response.json();
    return data.token;
  };

  return (
    <div className="container">
      <h1 className="title">Web3Auth TON Telegram MiniApp</h1>
      {isLoggingIn ? <Loading /> : null}
      {isLoggedIn ? (
        <div className="grid">
          <div className="user-info-box">
            <img src={userData?.avatar_url} alt="User avatar" className="user-avatar" />
            <div className="user-info">
              <p>
                <strong>Username:</strong> {userData?.username}
              </p>
              <p>
                <strong>Name:</strong> {userData?.name}
              </p>
            </div>
          </div>
        </div>
      ) : null}
      <footer className="footer">
        <a href="https://github.com/Web3Auth" target="_blank" rel="noopener noreferrer">
          Source code
        </a>
      </footer>
    </div>
  );
}

export default App;
