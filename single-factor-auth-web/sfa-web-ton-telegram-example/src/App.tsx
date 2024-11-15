import { useEffect, useState, useCallback } from "react";
import { Web3Auth } from "@web3auth/single-factor-auth";
import { CHAIN_NAMESPACES, WEB3AUTH_NETWORK } from "@web3auth/base";
import { EthereumPrivateKeyProvider } from "@web3auth/ethereum-provider";
import TonRPC from "./RPC/tonRpc";
import EthereumRPC from "./RPC/ethRPC-web3";
import SolanaRPC from "./RPC/solanaRPC";
import type { IRPC } from "./RPC/IRPC";
import { useLaunchParams, User } from "@telegram-apps/sdk-react";
import { useTelegramMock } from "./hooks/useMockTelegramInitData";
import { Sun, Moon, Copy, Check, ChevronDown } from "lucide-react";
import TelegramLogo from "./assets/TelegramLogo.svg";
import web3AuthLogoLight from "./assets/web3AuthLogoLight.svg";
import web3AuthLogoDark from "./assets/web3AuthLogoDark.svg";
import "./App.css";

const VERIFIER = "w3a-telegram-demo";
const CLIENT_ID = "BPi5PB_UiIZ-cPz1GtV5i1I2iOSOHuimiXBI0e-Oe_u6X3oVAbCiAZOTEBtTXw4tsluTITPqA8zMsfxIKMjiqNQ";

const generateGenericAvatarUrl = (name: string) => `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=random`;

const CHAINS = {
  ETH: {
    name: "Ethereum",
    config: {
      chainNamespace: CHAIN_NAMESPACES.EIP155,
      chainId: "0xaa36a7",
      rpcTarget: "https://rpc.ankr.com/eth_sepolia",
      displayName: "Sepolia Testnet",
      ticker: "ETH",
      tickerName: "Ethereum",
    },
  },
  TON: { name: "TON" },
  SOLANA: { name: "Solana" },
} as const;

interface ChainData {
  address: string | null;
  signedMessage: string | null;
  isLoadingAddress: boolean;
  isLoadingMessage: boolean;
  error?: string;
}

interface CachedChainData {
  [chain: string]: {
    address: string | null;
    signedMessage: string | null;
  } | null;
}

const getFallbackAvatar = (user: User) => {
  const name = `${user.firstName} ${user.lastName || ""}`.trim();
  return user.photoUrl || generateGenericAvatarUrl(name);
};

function App() {
  const [selectedChain, setSelectedChain] = useState<keyof typeof CHAINS>("ETH");
  const [web3authSfa, setWeb3authSfa] = useState<Web3Auth | null>(null);
  const [web3AuthInitialized, setWeb3AuthInitialized] = useState(false);
  const [userData, setUserData] = useState<User | null>(null);
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [chainData, setChainData] = useState<ChainData>({
    address: null,
    signedMessage: null,
    isLoadingAddress: true,
    isLoadingMessage: true,
  });
  const [chainDataCache, setChainDataCache] = useState<CachedChainData>({});
  const [copiedStates, setCopiedStates] = useState({
    address: false,
    message: false,
  });

  const { initDataRaw, initData } = useLaunchParams() || {};

  useTelegramMock();

  // Load cache from sessionStorage on mount
  useEffect(() => {
    const cachedData = sessionStorage.getItem("chainDataCache");
    if (cachedData) {
      try {
        const parsed = JSON.parse(cachedData);
        setChainDataCache(parsed);
      } catch (error) {
        console.error("Error parsing cached chain data:", error);
      }
    }
  }, []);

  // Save cache to sessionStorage when it changes
  useEffect(() => {
    if (Object.keys(chainDataCache).length > 0) {
      sessionStorage.setItem("chainDataCache", JSON.stringify(chainDataCache));
    }
  }, [chainDataCache]);

  const toggleDarkMode = useCallback(() => {
    setIsDarkMode((prev) => !prev);
  }, []);

  const copyToClipboard = useCallback(async (text: string, type: "address" | "message") => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedStates((prev) => ({ ...prev, [type]: true }));
      setTimeout(() => {
        setCopiedStates((prev) => ({ ...prev, [type]: false }));
      }, 2000);
    } catch (err) {
      console.error("Failed to copy text:", err);
    }
  }, []);

  const getIdTokenFromServer = useCallback(async (initDataRaw: string, photoUrl?: string) => {
    const isMocked = !!sessionStorage.getItem("____mocked");
    const response = await fetch(`${import.meta.env.VITE_SERVER_URL}/auth/telegram`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ initDataRaw, isMocked, photoUrl }),
    });
    const data = await response.json();
    return data.token;
  }, []);

  const getChainData = useCallback(
    async (forceRefresh = false) => {
      if (!web3authSfa?.provider) {
        setChainData((prev) => ({
          ...prev,
          error: "Provider not initialized",
          isLoadingAddress: false,
          isLoadingMessage: false,
        }));
        return;
      }

      // Check cache first unless force refresh is requested
      if (!forceRefresh && chainDataCache[selectedChain]) {
        setChainData({
          ...chainDataCache[selectedChain]!,
          isLoadingAddress: false,
          isLoadingMessage: false,
          error: undefined,
        });
        return;
      }

      setChainData((prev) => ({
        ...prev,
        isLoadingAddress: true,
        isLoadingMessage: true,
        error: undefined,
      }));

      try {
        let rpc: IRPC;

        switch (selectedChain) {
          case "TON": {
            rpc = await TonRPC.getInstance(web3authSfa.provider);
            break;
          }
          case "ETH": {
            rpc = EthereumRPC.getInstance(web3authSfa.provider);
            break;
          }
          case "SOLANA": {
            rpc = await SolanaRPC.getInstance(web3authSfa.provider);
            break;
          }
          default:
            throw new Error(`Unsupported chain: ${selectedChain}`);
        }

        const [addressResponse, messageResponse] = await Promise.all([rpc.getAccounts(), rpc.signMessage(`Hello from ${selectedChain}!`)]);

        if (addressResponse.error || messageResponse.error) {
          throw new Error(addressResponse.error || messageResponse.error);
        }

        const newData = {
          address: addressResponse.data!,
          signedMessage: messageResponse.data!,
        };

        // Update cache
        setChainDataCache((prev) => ({
          ...prev,
          [selectedChain]: newData,
        }));

        setChainData({
          ...newData,
          isLoadingAddress: false,
          isLoadingMessage: false,
        });
      } catch (error) {
        console.error("Error getting chain data:", error);
        setChainData({
          address: null,
          signedMessage: null,
          isLoadingAddress: false,
          isLoadingMessage: false,
          error: error instanceof Error ? error.message : "An error occurred while fetching chain data",
        });

        // Clear cache for this chain on error
        setChainDataCache((prev) => ({
          ...prev,
          [selectedChain]: null,
        }));
      }
    },
    [web3authSfa, selectedChain, chainDataCache]
  );

  useEffect(() => {
    const initializeWeb3Auth = async () => {
      try {
        const privateKeyProvider = new EthereumPrivateKeyProvider({
          config: { chainConfig: CHAINS.ETH.config },
        });

        const web3auth = new Web3Auth({
          clientId: CLIENT_ID,
          web3AuthNetwork: WEB3AUTH_NETWORK.SAPPHIRE_MAINNET,
          usePnPKey: false,
          privateKeyProvider,
        });

        setWeb3authSfa(web3auth);
        await web3auth.init();
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
        try {
          if (web3authSfa.status === "connected") {
            await web3authSfa.logout();
          }

          if (web3authSfa.status === "ready") {
            const idToken = await getIdTokenFromServer(initDataRaw, initData?.user?.photoUrl);
            await web3authSfa.connect({
              verifier: VERIFIER,
              verifierId: initData?.user?.id?.toString() || "",
              idToken,
            });
          }

          if (web3authSfa.status === "connected") {
            if (chainDataCache[selectedChain]) {
              setChainData({
                ...chainDataCache[selectedChain]!,
                isLoadingAddress: false,
                isLoadingMessage: false,
                error: undefined,
              });
            } else {
              await getChainData(false);
            }
          }
        } catch (error) {
          console.error("Error during Web3Auth connection:", error);
        }
      }
    };

    connectWeb3Auth();
  }, [initDataRaw, web3authSfa, web3AuthInitialized, getIdTokenFromServer, getChainData, chainDataCache, selectedChain, initData?.user]);

  useEffect(() => {
    document.documentElement.classList.toggle("dark-mode", isDarkMode);
    document.body.classList.toggle("dark-mode", isDarkMode);
  }, [isDarkMode]);

  useEffect(() => {
    if (initData?.user) {
      setUserData(initData.user);
    }
  }, [initData]);

  const switchChain = useCallback(
    async (chain: keyof typeof CHAINS) => {
      setSelectedChain(chain);
      setIsDropdownOpen(false);

      if (chainDataCache[chain]) {
        setChainData({
          ...chainDataCache[chain]!,
          isLoadingAddress: false,
          isLoadingMessage: false,
          error: undefined,
        });
        return;
      }

      setChainData((prev) => ({
        ...prev,
        isLoadingAddress: true,
        isLoadingMessage: true,
        error: undefined,
      }));

      try {
        if (web3authSfa && web3AuthInitialized) {
          await getChainData(false);
        }
      } catch (error) {
        console.error("Error switching chain:", error);
      }
    },
    [web3authSfa, web3AuthInitialized, getChainData, chainDataCache]
  );

  const renderContent = useCallback(
    (type: "address" | "message") => {
      const { error, isLoadingAddress, isLoadingMessage, address, signedMessage } = chainData;
      const isLoading = type === "address" ? isLoadingAddress : isLoadingMessage;
      const content = type === "address" ? address : signedMessage;

      if (error) {
        return <span className="error-text">{error}</span>;
      }
      if (isLoading) {
        return <div className="loading-placeholder"></div>;
      }
      return <span className="ellipsed-text">{content || `No ${type} available`}</span>;
    },
    [chainData]
  );

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
        <div className="chain-selector">
          <button onClick={() => setIsDropdownOpen(!isDropdownOpen)} className="chain-selector-button">
            {CHAINS[selectedChain].name}
            <ChevronDown />
          </button>

          {isDropdownOpen && (
            <div className="chain-dropdown">
              {Object.entries(CHAINS).map(([key, value]) => (
                <button
                  key={key}
                  onClick={() => switchChain(key as keyof typeof CHAINS)}
                  className={`chain-option ${selectedChain === key ? "selected" : ""}`}
                >
                  {value.name}
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="user-info-box">
          {userData ? (
            <>
              <img
                src={getFallbackAvatar(userData)}
                alt="User avatar"
                className="user-avatar"
                onError={(e) => {
                  const target = e.target as HTMLImageElement;
                  target.src = generateGenericAvatarUrl("User");
                }}
              />
              <div className="user-info">
                <div className="id-with-logo">
                  <p>
                    <strong>ID:</strong> {userData.id}
                  </p>
                  <img src={TelegramLogo} alt="Telegram Logo" className="telegram-logo" />
                </div>
                <p>
                  <strong>Username:</strong> {userData.username}
                </p>
                <p>
                  <strong>Name:</strong> {userData.firstName} {userData.lastName || ""}
                </p>
              </div>
            </>
          ) : (
            <div className="breathing-outline">
              <div className="loading-placeholder"></div>
            </div>
          )}
        </div>

        <div className={`info-box ${chainData.isLoadingAddress ? "breathing-outline" : ""}`}>
          <div className="info-box-content">
            <div>
              <strong>{CHAINS[selectedChain].name} Account:</strong>
              {renderContent("address")}
            </div>
            {chainData.address && !chainData.error && !chainData.isLoadingAddress && (
              <div onClick={() => copyToClipboard(chainData.address!, "address")}>
                {copiedStates.address ? <Check className="copy-icon success" size={18} /> : <Copy className="copy-icon" size={18} />}
              </div>
            )}
          </div>
        </div>

        <div className={`info-box ${chainData.isLoadingMessage ? "breathing-outline" : ""}`}>
          <div className="info-box-content">
            <div>
              <strong>Signed Message:</strong>
              {renderContent("message")}
            </div>
            {chainData.signedMessage && !chainData.error && !chainData.isLoadingMessage && (
              <div onClick={() => copyToClipboard(chainData.signedMessage!, "message")}>
                {copiedStates.message ? <Check className="copy-icon success" size={18} /> : <Copy className="copy-icon" size={18} />}
              </div>
            )}
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
