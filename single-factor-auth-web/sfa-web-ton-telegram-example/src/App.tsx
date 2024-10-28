import { useEffect, useState } from "react";
import { Web3Auth, decodeToken } from "@web3auth/single-factor-auth";
import { CHAIN_NAMESPACES, WEB3AUTH_NETWORK } from "@web3auth/base";
import { CommonPrivateKeyProvider } from "@web3auth/base-provider";
import { getHttpEndpoint } from "@orbs-network/ton-access";
import TonRPC from "./tonRpc";
import { useLaunchParams } from "@telegram-apps/sdk-react";
import { useTelegramMock } from "./hooks/useMockTelegramInitData";
import { Sun, Moon, Copy, Check } from "lucide-react";
import Loading from "./components/Loading";
import TelegramLogo from "./assets/TelegramLogo.svg";
import web3AuthLogoLight from "./assets/web3AuthLogoLight.svg";
import web3AuthLogoDark from "./assets/web3AuthLogoDark.svg";
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
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [copiedStates, setCopiedStates] = useState<{ [key: string]: boolean }>({
    account: false,
    message: false,
  });

  const { initDataRaw, initData } = useLaunchParams() || {};

  useTelegramMock();

  const toggleDarkMode = () => {
    setIsDarkMode(!isDarkMode);
  };

  useEffect(() => {
    const newBgColor = isDarkMode ? "#1a1a1a" : "#ffffff";
    const newTextColor = isDarkMode ? "#ffffff" : "#333333";
    document.documentElement.style.setProperty("--bg-color", newBgColor);
    document.documentElement.style.setProperty("--text-color", newTextColor);
    document.documentElement.classList.toggle("dark-mode", isDarkMode);
  }, [isDarkMode]);

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

          const idToken = await getIdTokenFromServer(initDataRaw, initData?.user.photoUrl);
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
  }, [initDataRaw, web3authSfa, web3AuthInitialized, initData?.user.photoUrl]);

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

  const copyToClipboard = async (text: string, type: "account" | "message") => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedStates((prev) => ({
        ...prev,
        [type]: true,
      }));

      // Reset the copied state after 2 seconds
      setTimeout(() => {
        setCopiedStates((prev) => ({
          ...prev,
          [type]: false,
        }));
      }, 2000);
    } catch (err) {
      console.error("Failed to copy text:", err);
    }
  };

  return (
    <div className="container">
      <div className="header">
        <div className="logo-container">
          <img src={isDarkMode ? web3AuthLogoDark : web3AuthLogoLight} alt="Web3Auth Logo" className="web3auth-logo" />
          <button onClick={toggleDarkMode} className="theme-toggle" aria-label="Toggle dark mode">
            {isDarkMode ? <Sun className="text-yellow-500" /> : <Moon className="text-gray-700" />}
          </button>
        </div>
        <h4 className="title">Telegram MiniApp Demo</h4>
      </div>

      <div className="description">
        <p>
          Seamlessly generate a blockchain wallet with Web3Auth right inside Telegram. This demo shows a wallet for the TON blockchain, but it's fully
          adaptable for any other chain. No extra steps—just connect and go!
        </p>
      </div>

      <div className="how-it-works">
        <h3>How It Works</h3>
        <ul>
          <li>Your Telegram account authenticates you securely, creating an embedded wallet.</li>
          <li>The wallet is available across both desktop and mobile Telegram clients.</li>
          <li>Your wallet stays accessible whenever you log in with Telegram—no setup needed each time.</li>
        </ul>
      </div>

      {isLoggingIn ? (
        <Loading />
      ) : (
        <div className="grid">
          {isLoggedIn && (
            <>
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
              <div className="info-box" onClick={() => copyToClipboard(tonAccountAddress || "", "account")}>
                <div className="info-box-content">
                  <p>
                    <strong>TON Account:</strong>
                    <span className="ellipsed-text">{tonAccountAddress}</span>
                  </p>
                  {copiedStates.account ? <Check className="copy-icon success" size={18} /> : <Copy className="copy-icon" size={18} />}
                </div>
              </div>
              <div className="info-box" onClick={() => copyToClipboard(signedMessage || "", "message")}>
                <div className="info-box-content">
                  <p>
                    <strong>Signed Message:</strong>
                    <span className="ellipsed-text">{signedMessage}</span>
                  </p>
                  {copiedStates.message ? <Check className="copy-icon success" size={18} /> : <Copy className="copy-icon" size={18} />}
                </div>
              </div>
            </>
          )}
        </div>
      )}

      <footer className="footer">
        <a
          href="https://web3auth.io/community/t/build-powerful-telegram-mini-apps-with-web3auth/9244"
          target="_blank"
          rel="noopener noreferrer"
          className="learn-more-button"
        >
          Wanna learn how to create this bot?
        </a>
      </footer>
    </div>
  );
}

export default App;
