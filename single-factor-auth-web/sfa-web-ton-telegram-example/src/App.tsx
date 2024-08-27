import { useEffect, useState } from "react";
import { Web3Auth, decodeToken } from "@web3auth/single-factor-auth";
import { CHAIN_NAMESPACES, WEB3AUTH_NETWORK } from "@web3auth/base";
import { CommonPrivateKeyProvider } from "@web3auth/base-provider";
import { getHttpEndpoint } from "@orbs-network/ton-access";
import { useAuth0 } from "@auth0/auth0-react";

// TonRPC libraries for blockchain calls
import TonRPC from "./tonRpc";

import Loading from "./Loading";
import "./App.css";

const testnetRpc = await getHttpEndpoint({
  network: "testnet",
  protocol: "json-rpc",
});
const verifier = "w3a-a0-github-demo";
const clientId = "BPi5PB_UiIZ-cPz1GtV5i1I2iOSOHuimiXBI0e-Oe_u6X3oVAbCiAZOTEBtTXw4tsluTITPqA8zMsfxIKMjiqNQ"; // get from https://dashboard.web3auth.io

const chainConfig = {
  chainNamespace: CHAIN_NAMESPACES.OTHER,
  chainId: "testnet", // Replace with actual TON chain ID
  rpcTarget: testnetRpc,
  displayName: "TON Testnet",
  blockExplorerUrl: "https://testnet.tonscan.org",
  ticker: "TON",
  tickerName: "Toncoin",
};

const privateKeyProvider = new CommonPrivateKeyProvider({
  config: { chainConfig },
});

const web3authSfa = new Web3Auth({
  clientId, // Get your Client ID from Web3Auth Dashboard
  web3AuthNetwork: WEB3AUTH_NETWORK.SAPPHIRE_MAINNET,
  usePnPKey: false, // Setting this to true returns the same key as PnP Web SDK, By default, this SDK returns CoreKitKey.
  privateKeyProvider,
});

function App() {
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [loggedIn, setLoggedIn] = useState(false);
  const { isAuthenticated, isLoading, getIdTokenClaims, loginWithRedirect, logout: auth0Logout } = useAuth0();
  const [provider, setProvider] = useState<any>(null);

  useEffect(() => {
    const init = async () => {
      try {
        await web3authSfa.init();
        if (web3authSfa.status === "connected") {
          setLoggedIn(true);
          setProvider(web3authSfa.provider);
        }
      } catch (error) {
        console.error("Error during Web3Auth initialization:", error);
      }
    };

    init();
  }, []);

  useEffect(() => {
    const connectWeb3Auth = async () => {
      if (isAuthenticated && !loggedIn && web3authSfa.status === "ready") {
        try {
          setIsLoggingIn(true);
          const idToken = (await getIdTokenClaims())?.__raw;
          if (!idToken) {
            console.error("No ID token found");
            return;
          }
          const { payload } = decodeToken(idToken);
          await web3authSfa.connect({
            verifier,
            verifierId: (payload as any).sub,
            idToken: idToken,
          });
          setIsLoggingIn(false);
          setLoggedIn(true);
          setProvider(web3authSfa.provider);
        } catch (err) {
          setIsLoggingIn(false);
          console.error("Error during Web3Auth connection:", err);
        }
      }
    };

    connectWeb3Auth();
  }, [isAuthenticated, loggedIn, getIdTokenClaims]);

  const login = async () => {
    if (!web3authSfa) {
      uiConsole("Web3Auth Single Factor Auth SDK not initialized yet");
      return;
    }
    if (web3authSfa.status === "not_ready") {
      await web3authSfa.init();
    }
    await loginWithRedirect();
  };

  const getUserInfo = async () => {
    if (!provider) {
      uiConsole("Web3Auth Single Factor Auth SDK not initialized yet");
      return;
    }
    const userInfo = await web3authSfa.getUserInfo();
    uiConsole(userInfo);
  };

  const logout = async () => {
    if (!provider) {
      uiConsole("Web3Auth Single Factor Auth SDK not initialized yet");
      return;
    }
    await web3authSfa.logout();
    setLoggedIn(false);
    setProvider(null);
    auth0Logout({ logoutParams: { returnTo: window.location.origin } });
  };

  const getAccounts = async () => {
    if (!provider) {
      uiConsole("No provider found");
      return;
    }
    const rpc = new TonRPC(web3authSfa.provider);
    const userAccount = await rpc.getAccounts();
    uiConsole(userAccount);
  };

  const getBalance = async () => {
    if (!provider) {
      uiConsole("No provider found");
      return;
    }
    const rpc = new TonRPC(web3authSfa.provider);
    const balance = await rpc.getBalance();
    uiConsole(balance);
  };

  const signMessage = async () => {
    if (!provider) {
      uiConsole("No provider found");
      return;
    }
    const rpc = new TonRPC(web3authSfa.provider);
    const result = await rpc.signMessage("Hello, TON!");
    uiConsole(`Message signed. Signature: ${result}`);
  };

  const sendTransaction = async () => {
    if (!provider) {
      uiConsole("No provider found");
      return;
    }
    const rpc = new TonRPC(web3authSfa.provider);
    const result = await rpc.sendTransaction();
    uiConsole(result);
  };

  const authenticateUser = async () => {
    if (!provider) {
      uiConsole("No provider found");
      return;
    }
    const userCredential = await web3authSfa.authenticateUser();
    uiConsole(userCredential);
  };

  const getPrivateKey = async () => {
    if (!web3authSfa.provider) {
      uiConsole("No provider found");
      return "";
    }
    const rpc = new TonRPC(web3authSfa.provider);
    const privateKey = await rpc.getPrivateKey();
    return privateKey;
  };

  function uiConsole(...args: any[]): void {
    const el = document.querySelector("#console>p");
    if (el) {
      el.innerHTML = JSON.stringify(args || {}, null, 2);
    }
  }

  const loginView = (
    <>
      <div className="flex-container">
        <div>
          <button onClick={getUserInfo} className="card">
            Get User Info
          </button>
        </div>
        <div>
          <button onClick={authenticateUser} className="card">
            Authenticate User
          </button>
        </div>
        <div>
          <button onClick={getAccounts} className="card">
            Get Accounts
          </button>
        </div>
        <div>
          <button onClick={getBalance} className="card">
            Get Balance
          </button>
        </div>
        <div>
          <button onClick={signMessage} className="card">
            Sign Message
          </button>
        </div>
        <div>
          <button onClick={sendTransaction} className="card">
            Send Transaction
          </button>
        </div>
        <div>
          <button onClick={getPrivateKey} className="card">
            Get Private Key
          </button>
        </div>
        <div>
          <button onClick={logout} className="card">
            Log Out
          </button>
        </div>
      </div>

      <div id="console" style={{ whiteSpace: "pre-line" }}>
        <p style={{ whiteSpace: "pre-line" }}></p>
      </div>
    </>
  );

  const logoutView = (
    <button onClick={login} className="card">
      Login
    </button>
  );

  return (
    <div className="container">
      <h1 className="title">
        <a target="_blank" href="https://web3auth.io/docs/sdk/core-kit/sfa-web" rel="noreferrer">
          Web3Auth
        </a>{" "}
        SFA React Ton GitHub Example
      </h1>

      {isLoading || isLoggingIn ? <Loading /> : <div className="grid">{web3authSfa ? (loggedIn ? loginView : logoutView) : null}</div>}

      <footer className="footer">
        <a
          href="https://github.com/Web3Auth/web3auth-core-kit-examples/tree/main/single-factor-auth-web/sfa-web-ton-telegram-example"
          target="_blank"
          rel="noopener noreferrer"
        >
          Source code
        </a>
      </footer>
    </div>
  );
}

export default App;
