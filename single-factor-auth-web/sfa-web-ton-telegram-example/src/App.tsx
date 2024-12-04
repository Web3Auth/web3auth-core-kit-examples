import { useEffect, useState } from "react";
import { Web3Auth } from "@web3auth/single-factor-auth";
import { CHAIN_NAMESPACES, WEB3AUTH_NETWORK } from "@web3auth/base";
import { CommonPrivateKeyProvider } from "@web3auth/base-provider";
import { getHttpEndpoint } from "@orbs-network/ton-access";
import TonRPC from "./tonRpc";
import { useLaunchParams, User } from "@telegram-apps/sdk-react";
import { useTelegramMock } from "./hooks/useMockTelegramInitData";
import { Sun, Moon, Copy, Check } from "lucide-react";
import TelegramLogo from "./assets/TelegramLogo.svg";
import web3AuthLogoLight from "./assets/web3AuthLogoLight.svg";
import web3AuthLogoDark from "./assets/web3AuthLogoDark.svg";
import "./App.css";

const verifier = "w3a-telegram-demo";
const clientId = "BPi5PB_UiIZ-cPz1GtV5i1I2iOSOHuimiXBI0e-Oe_u6X3oVAbCiAZOTEBtTXw4tsluTITPqA8zMsfxIKMjiqNQ";

// Gravatar fallback URL with a default image
const getGravatarUrl = (identifier: string) => {
  const hash = identifier.toLowerCase(); // Use identifier directly for simplicity
  return `https://www.gravatar.com/avatar/${hash}?d=mp`;
};

function App() {
  const [web3authSfa, setWeb3authSfa] = useState<Web3Auth | null>(null);
  const [web3AuthInitialized, setWeb3AuthInitialized] = useState(false);
  const [userData, setUserData] = useState<User | null>(null);
  const [tonAccountAddress, setTonAccountAddress] = useState<string | null>(null);
  const [signedMessage, setSignedMessage] = useState<string | null>(null);
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
    if (isDarkMode) {
      document.documentElement.classList.add("dark-mode");
      document.body.classList.add("dark-mode");
    } else {
      document.documentElement.classList.remove("dark-mode");
      document.body.classList.remove("dark-mode");
    }
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

  // Set user data directly from initData if available
  useEffect(() => {
    if (initData && initData.user) {
      setUserData(initData.user);
    }
  }, [initData]);

  useEffect(() => {
    const connectWeb3Auth = async () => {
      if (web3authSfa && web3AuthInitialized && initDataRaw) {
        try {
          if (web3authSfa.status === "connected") {
            await web3authSfa.logout();
          }

          const idToken = await getIdTokenFromServer(initDataRaw, initData?.user?.photoUrl);
          if (!idToken) return;

          await web3authSfa.connect({
            verifier,
            verifierId: initData?.user?.id.toString(),
            idToken: idToken,
          });

          // Set TON account address and signed message after connecting
          const tonRpc = new TonRPC(web3authSfa.provider);
          const tonAddress = await tonRpc.getAccounts();
          setTonAccountAddress(tonAddress);

          const messageToSign = "Hello, TON!";
          const signedMsg = await tonRpc.signMessage(messageToSign);
          setSignedMessage(signedMsg);
        } catch (error) {
          console.error("Error during Web3Auth connection:", error);
        }
      }
    };

    if (web3AuthInitialized && initDataRaw) {
      connectWeb3Auth();
    }
  }, [initDataRaw, web3authSfa, web3AuthInitialized, initData?.user?.photoUrl]);

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
        <div className="title">
          <h4>Web3Auth Telegram MiniApp</h4>
        </div>
        <div className="description">
          <p>Seamless wallet access on any chain with Telegram. Just one click, and you're in!</p>
        </div>
      </div>

      <div className="grid">
        <div className={`user-info-box ${userData ? "" : "breathing-outline"}`}>
          {userData ? (
            <>
              <img src={userData.photoUrl || getGravatarUrl(userData.username || userData.id.toString())} alt="User avatar" className="user-avatar" />
              <div className="user-info">
                <div className="id-with-logo">
                  <p>
                    <strong>ID:</strong> {userData?.id}
                  </p>
                  <img src={TelegramLogo} alt="Telegram Logo" className="telegram-logo" />
                </div>
                <p>
                  <strong>Username:</strong> {userData?.username}
                </p>
                <p>
                  <strong>Name:</strong> {`${userData?.firstName} ${userData?.lastName || ""}`}
                </p>
              </div>
            </>
          ) : (
            <p>Loading user info...</p>
          )}
        </div>

        <div
          className={`info-box ${tonAccountAddress ? "" : "breathing-outline"}`}
          onClick={() => tonAccountAddress && copyToClipboard(tonAccountAddress, "account")}
        >
          <div className="info-box-content">
            <p>
              <strong>TON Account:</strong>
              <span className="ellipsed-text">{tonAccountAddress || "Loading..."}</span>
            </p>
            {tonAccountAddress &&
              (copiedStates.account ? <Check className="copy-icon success" size={18} /> : <Copy className="copy-icon" size={18} />)}
          </div>
        </div>

        <div
          className={`info-box ${signedMessage ? "" : "breathing-outline"}`}
          onClick={() => signedMessage && copyToClipboard(signedMessage, "message")}
        >
          <div className="info-box-content">
            <p>
              <strong>Signed Message:</strong>
              <span className="ellipsed-text">{signedMessage || "Loading..."}</span>
            </p>
            {signedMessage && (copiedStates.message ? <Check className="copy-icon success" size={18} /> : <Copy className="copy-icon" size={18} />)}
          </div>
        </div>
      </div>

      <footer className="footer">
        <a
          href="https://web3auth.io/community/t/build-powerful-telegram-mini-apps-with-web3auth/9244"
          target="_blank"
          rel="noopener noreferrer"
          className="learn-more-button"
        >
          Telegram MiniApp Setup Guide
        </a>
      </footer>
    </div>
  );
}

export default App;
