import { useEffect, useState, useCallback, useRef } from "react";
import { Web3Auth } from "@web3auth/single-factor-auth";
import { CHAIN_NAMESPACES, CustomChainConfig, WEB3AUTH_NETWORK } from "@web3auth/base";
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
    networkName: "Sepolia",
    config: {
      chainNamespace: CHAIN_NAMESPACES.EIP155,
      chainId: "0xaa36a7",
      rpcTarget: "https://rpc.ankr.com/eth_sepolia",
      displayName: "Sepolia Testnet",
      blockExplorerUrl: "https://sepolia.etherscan.io",
      ticker: "ETH",
      tickerName: "Ethereum",
    } as CustomChainConfig,
  },
  TON: {
    name: "TON",
    networkName: "Testnet",
  },
  SOLANA: {
    name: "Solana",
    networkName: "Devnet",
  },
} as const;

interface ChainData {
  address: string | null;
  signedMessage: string | null;
  balance: string | null;
  isLoadingAddress: boolean;
  isLoadingMessage: boolean;
  isLoadingBalance: boolean;
  error?: string;
}

interface CachedChainData {
  [chain: string]: {
    address: string | null;
    signedMessage: string | null;
    balance: string | null;
  } | null;
}

const getFallbackAvatar = (user: User) => {
  const name = `${user.firstName} ${user.lastName || ""}`.trim();
  return user.photoUrl || generateGenericAvatarUrl(name);
};

// CopyableContent Component
const CopyableContent = ({ content, type, isTouchDevice }: { content: string; type: "address" | "message"; isTouchDevice: boolean }) => {
  const [isLongPressing, setIsLongPressing] = useState(false);
  const [showCopiedFeedback, setShowCopiedFeedback] = useState(false);
  const longPressTimer = useRef<NodeJS.Timeout>();
  const feedbackTimer = useRef<NodeJS.Timeout>();

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(content);

      if (isTouchDevice && "vibrate" in navigator) {
        navigator.vibrate([50]);
      }

      setShowCopiedFeedback(true);

      if (feedbackTimer.current) {
        clearTimeout(feedbackTimer.current);
      }

      feedbackTimer.current = setTimeout(() => {
        setShowCopiedFeedback(false);
      }, 2000);
    } catch (err) {
      console.error("Failed to copy:", err);
    }
  }, [content, isTouchDevice]);

  const handleTouchStart = useCallback(() => {
    if (!isTouchDevice) return;

    setIsLongPressing(true);
    longPressTimer.current = setTimeout(() => {
      handleCopy();
    }, 500);
  }, [isTouchDevice, handleCopy]);

  const handleTouchEnd = useCallback(() => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
    }
    setIsLongPressing(false);
  }, []);

  useEffect(() => {
    return () => {
      if (longPressTimer.current) clearTimeout(longPressTimer.current);
      if (feedbackTimer.current) clearTimeout(feedbackTimer.current);
    };
  }, []);

  return (
    <div className="copyable-content-container">
      <div
        className={`copyable-content ${isLongPressing ? "long-pressing" : ""} ${showCopiedFeedback ? "copied" : ""}`}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
        onTouchCancel={handleTouchEnd}
        onClick={isTouchDevice ? undefined : handleCopy}
      >
        <div className="content">
          <span className="ellipsed-text">{content}</span>
        </div>

        <button className={`copy-button ${showCopiedFeedback ? "copied" : ""}`} onClick={handleCopy}>
          {showCopiedFeedback ? (
            <Check className="copy-icon success" size={isTouchDevice ? 24 : 18} />
          ) : (
            <Copy className="copy-icon" size={isTouchDevice ? 24 : 18} />
          )}
        </button>

        {showCopiedFeedback && (
          <div className="copy-feedback">
            <div className="feedback-content">
              <Check size={20} />
              <span>Copied!</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

// Chain Switcher Component
const ChainSwitcher = ({
  selectedChain,
  onChainSelect,
}: {
  selectedChain: keyof typeof CHAINS;
  onChainSelect: (chain: keyof typeof CHAINS) => void;
}) => {
  const { platform } = useLaunchParams() || {};
  const isTouchDevice = ["android", "android_x", "ios", "weba"].includes(platform || "");

  return isTouchDevice ? (
    <TouchChainSwitcher selectedChain={selectedChain} onChainSelect={onChainSelect} />
  ) : (
    <DesktopChainSwitcher selectedChain={selectedChain} onChainSelect={onChainSelect} />
  );
};

// Touch-optimized Chain Switcher
const TouchChainSwitcher = ({
  selectedChain,
  onChainSelect,
}: {
  selectedChain: keyof typeof CHAINS;
  onChainSelect: (chain: keyof typeof CHAINS) => void;
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [touchStart, setTouchStart] = useState(0);
  const [touchEnd, setTouchEnd] = useState(0);
  const minSwipeDistance = 50;

  const handleTouchStart = (e: React.TouchEvent) => {
    setTouchStart(e.touches[0].clientX);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    setTouchEnd(e.touches[0].clientX);
  };

  const handleTouchEnd = () => {
    const distance = touchStart - touchEnd;
    const isLeftSwipe = distance > minSwipeDistance;
    const isRightSwipe = distance < -minSwipeDistance;

    const chains = Object.keys(CHAINS);
    const currentIndex = chains.indexOf(selectedChain);

    if (isLeftSwipe && currentIndex < chains.length - 1) {
      handleChainChange(chains[currentIndex + 1]);
    } else if (isRightSwipe && currentIndex > 0) {
      handleChainChange(chains[currentIndex - 1]);
    }
  };

  const handleChainChange = (chain: string) => {
    if ("vibrate" in navigator) {
      navigator.vibrate(50);
    }
    onChainSelect(chain as keyof typeof CHAINS);
  };

  return (
    <div className="touch-chain-switcher">
      <div
        ref={containerRef}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        className="chain-buttons-container"
      >
        {Object.entries(CHAINS).map(([key, value]) => (
          <div key={key} onClick={() => handleChainChange(key)} className={`chain-button ${selectedChain === key ? "selected" : ""}`}>
            {value.name}
            <div className="network-label">{value.networkName}</div>
          </div>
        ))}
      </div>
      <div className="swipe-indicator">
        {Object.keys(CHAINS).map((key) => (
          <div key={key} className={`indicator-dot ${selectedChain === key ? "active" : ""}`} />
        ))}
      </div>
    </div>
  );
};

// Desktop Chain Switcher
const DesktopChainSwitcher = ({
  selectedChain,
  onChainSelect,
}: {
  selectedChain: keyof typeof CHAINS;
  onChainSelect: (chain: keyof typeof CHAINS) => void;
}) => {
  const [isOpen, setIsOpen] = useState(false);

  const handleSelect = (chain: keyof typeof CHAINS) => {
    onChainSelect(chain);
    setIsOpen(false);
  };

  return (
    <div className="chain-selector">
      <button onClick={() => setIsOpen(!isOpen)} className="chain-selector-button">
        <span>
          {CHAINS[selectedChain].name}
          <div className="network-label">{CHAINS[selectedChain].networkName}</div>
        </span>
        <ChevronDown />
      </button>

      {isOpen && (
        <div className="chain-dropdown">
          {Object.entries(CHAINS).map(([key, value]) => (
            <button
              key={key}
              onClick={() => handleSelect(key as keyof typeof CHAINS)}
              className={`chain-option ${selectedChain === key ? "selected" : ""}`}
            >
              <span>
                {value.name}
                <div className="network-label">{value.networkName}</div>
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

// InfoBox Component with Network & Balance
const InfoBox = ({
  chainData,
  selectedChain,
  isTouchDevice,
  type,
}: {
  chainData: ChainData;
  selectedChain: keyof typeof CHAINS;
  isTouchDevice: boolean;
  type: "address" | "message";
}) => {
  const content = type === "address" ? chainData.address : chainData.signedMessage;
  const isLoading = type === "address" ? chainData.isLoadingAddress : chainData.isLoadingMessage;
  const label = type === "address" ? `${CHAINS[selectedChain].name} Account` : "Signed Message";

  return (
    <div className={`info-box ${isLoading ? "breathing-outline" : ""}`}>
      <div className="network-info">
        <strong>Network:</strong> {CHAINS[selectedChain].networkName}
      </div>

      {type === "address" && (
        <div className="balance-info">
          <strong>Balance: </strong>
          {chainData.isLoadingBalance ? (
            <div className="loading-placeholder"></div>
          ) : (
            <span>
              {chainData.balance || "0"} {CHAINS[selectedChain].name}
            </span>
          )}
        </div>
      )}

      <div className="info-box-content">
        <div>
          <strong>{label}:</strong>
          {isLoading ? (
            <div className="loading-placeholder"></div>
          ) : (
            content && <CopyableContent content={content} type={type} isTouchDevice={isTouchDevice} />
          )}
        </div>
      </div>
    </div>
  );
};

function App() {
  const [selectedChain, setSelectedChain] = useState<keyof typeof CHAINS>("ETH");
  const [web3authSfa, setWeb3authSfa] = useState<Web3Auth | null>(null);
  const [web3AuthInitialized, setWeb3AuthInitialized] = useState(false);
  const [userData, setUserData] = useState<User | null>(null);
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [chainData, setChainData] = useState<ChainData>({
    address: null,
    signedMessage: null,
    balance: null,
    isLoadingAddress: true,
    isLoadingMessage: true,
    isLoadingBalance: true,
    error: undefined,
  });
  const [chainDataCache, setChainDataCache] = useState<CachedChainData>({});

  const { platform, initDataRaw, initData } = useLaunchParams() || {};
  const isTouchDevice = ["android", "android_x", "ios", "weba"].includes(platform || "");

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
          isLoadingBalance: false,
        }));
        return;
      }
  
      // Check cache first unless force refresh is requested
      if (!forceRefresh && chainDataCache[selectedChain]) {
        setChainData({
          ...chainDataCache[selectedChain]!,
          isLoadingAddress: false,
          isLoadingMessage: false,
          isLoadingBalance: false,
          error: undefined,
        });
        return;
      }
  
      setChainData((prev) => ({
        ...prev,
        isLoadingAddress: true,
        isLoadingMessage: true,
        isLoadingBalance: true,
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
  
        const [addressResponse, messageResponse, balanceResponse] = await Promise.all([
          rpc.getAccounts(),
          rpc.signMessage(`Hello from ${selectedChain}!`),
          rpc.getBalance()  // Now this is properly typed as Promise<RPCResponse<string>>
        ]);
  
        // Since all responses are now properly typed as RPCResponse<string>
        if (addressResponse.error || messageResponse.error || balanceResponse.error) {
          throw new Error(addressResponse.error || messageResponse.error || balanceResponse.error);
        }
  
        // Using non-null assertion since we've checked for errors
        const newData = {
          address: addressResponse.data!,
          signedMessage: messageResponse.data!,
          balance: balanceResponse.data!,
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
          isLoadingBalance: false,
        });
      } catch (error) {
        console.error("Error getting chain data:", error);
        setChainData({
          address: null,
          signedMessage: null,
          balance: null,
          isLoadingAddress: false,
          isLoadingMessage: false,
          isLoadingBalance: false,
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
                isLoadingBalance: false,
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

      if (chainDataCache[chain]) {
        setChainData({
          ...chainDataCache[chain]!,
          isLoadingAddress: false,
          isLoadingMessage: false,
          isLoadingBalance: false,
          error: undefined,
        });
        return;
      }

      setChainData((prev) => ({
        ...prev,
        isLoadingAddress: true,
        isLoadingMessage: true,
        isLoadingBalance: true,
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
        <ChainSwitcher selectedChain={selectedChain} onChainSelect={switchChain} />

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

        <InfoBox chainData={chainData} selectedChain={selectedChain} isTouchDevice={isTouchDevice} type="address" />

        <InfoBox chainData={chainData} selectedChain={selectedChain} isTouchDevice={isTouchDevice} type="message" />
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
