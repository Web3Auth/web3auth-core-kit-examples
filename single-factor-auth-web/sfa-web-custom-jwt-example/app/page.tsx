"use client";

import "./App.css";

import { CHAIN_NAMESPACES } from "@web3auth/base";
import { EthereumPrivateKeyProvider } from "@web3auth/ethereum-provider";
// Import Single Factor Auth SDK for no redirect flow
import { Web3Auth } from "@web3auth/single-factor-auth";
import { useEffect, useState } from "react";

// RPC libraries for blockchain calls
import RPC from "./evm.web3";
// import RPC from "./evm.ethers";
import Loading from "./Loading";

const verifier = "w3a-jwt-for-sfa-web";

const clientId = "BEglQSgt4cUWcj6SKRdu5QkOXTsePmMcusG5EAoyjyOYKlVRjIF1iCNnMOTfpzCiunHRrMui8TIwQPXdkQ8Yxuk"; // get from https://dashboard.web3auth.io

const chainConfig = {
  chainId: "0x1",
  displayName: "Ethereum Mainnet",
  chainNamespace: CHAIN_NAMESPACES.EIP155,
  tickerName: "Ethereum",
  ticker: "ETH",
  decimals: 18,
  rpcTarget: "https://rpc.ankr.com/eth",
  blockExplorer: "https://etherscan.io",
};

// Initialising Web3Auth Single Factor Auth SDK
const web3authSfa = new Web3Auth({
  clientId, // Get your Client ID from Web3Auth Dashboard
  web3AuthNetwork: "testnet", // ["cyan", "testnet"]
  usePnPKey: false, // Setting this to true returns the same key as PnP Web SDK, By default, this SDK returns CoreKitKey.
});

const privateKeyProvider = new EthereumPrivateKeyProvider({
  config: { chainConfig },
});

function App() {
  const [usesSfaSDK, setUsesSfaSDK] = useState(false);
  const [idToken, setIdToken] = useState<string | null>(null);
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  useEffect(() => {
    const init = async () => {
      try {
        web3authSfa.init(privateKeyProvider);
      } catch (error) {
        console.error(error);
      }
    };

    init();
  }, []);

  const parseToken = (token: any) => {
    try {
      const base64Url = token.split(".")[1];
      const base64 = base64Url.replace("-", "+").replace("_", "/");
      return JSON.parse(window.atob(base64 || ""));
    } catch (err) {
      console.error(err);
      return null;
    }
  };

  const getIdToken = async () => {
    // Get ID Token from server
    const res = await fetch("http://localhost:8080/api/token", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
    });
    const data = await res.json();
    return data?.token;
  };

  function uiConsole(...args: any[]): void {
    const el = document.querySelector("#console>p");
    if (el) {
      el.innerHTML = JSON.stringify(args || {}, null, 2);
    }
  }

  const login = async () => {
    // trying logging in with the Single Factor Auth SDK
    try {
      if (!web3authSfa) {
        uiConsole("Web3Auth Single Factor Auth SDK not initialized yet");
        return;
      }
      setIsLoggingIn(true);
      const idTokenResult = await getIdToken();
      console.log(idTokenResult);
      setIdToken(idTokenResult);
      const { sub } = parseToken(idTokenResult);
      await web3authSfa.connect({
        verifier,
        verifierId: sub,
        idToken: idTokenResult,
      });
      setUsesSfaSDK(true);
      setIsLoggingIn(false);
      setIsLoggedIn(true);
    } catch (err) {
      // Single Factor Auth SDK throws an error if the user has already enabled MFA
      // One can use the Web3AuthNoModal SDK to handle this case
      setIsLoggingIn(false);
      console.error(err);
    }
  };

  const getUserInfo = async () => {
    if (usesSfaSDK) {
      uiConsole(
        "You are directly using Single Factor Auth SDK to login the user, hence the Web3Auth <code>getUserInfo</code> function won't work for you. Get the user details directly from id token.",
        parseToken(idToken)
      );
    }
  };

  const logout = async () => {
    if (usesSfaSDK) {
      console.log(
        "You are directly using Single Factor Auth SDK to login the user, hence the Web3Auth logout function won't work for you. You can logout the user directly from your login provider, or just clear the provider object."
      );
      web3authSfa.logout();
      setIsLoggedIn(false);
    }
  };

  const getAccounts = async () => {
    if (!web3authSfa.provider) {
      uiConsole("No provider found");
      return;
    }
    const rpc = new RPC(web3authSfa.provider);
    const userAccount = await rpc.getAccounts();
    uiConsole(userAccount);
  };

  const getBalance = async () => {
    if (!web3authSfa.provider) {
      uiConsole("No provider found");
      return;
    }
    const rpc = new RPC(web3authSfa.provider);
    const balance = await rpc.getBalance();
    uiConsole(balance);
  };

  const signMessage = async () => {
    if (!web3authSfa.provider) {
      uiConsole("No provider found");
      return;
    }
    const rpc = new RPC(web3authSfa.provider);
    const result = await rpc.signMessage();
    uiConsole(result);
  };

  const sendTransaction = async () => {
    if (!web3authSfa.provider) {
      uiConsole("No provider found");
      return;
    }
    const rpc = new RPC(web3authSfa.provider);
    const result = await rpc.signAndSendTransaction();
    uiConsole(result);
  };

  const authenticateUser = async () => {
    try {
      const userCredential = await web3authSfa.authenticateUser();
      uiConsole(userCredential);
    } catch (err) {
      uiConsole(err);
    }
  };

  const addChain = async () => {
    try {
      const newChain = {
        chainId: "0x5",
        displayName: "Goerli",
        chainNamespace: CHAIN_NAMESPACES.EIP155,
        tickerName: "Goerli",
        ticker: "ETH",
        decimals: 18,
        rpcTarget: "https://rpc.ankr.com/eth_goerli",
        blockExplorer: "https://goerli.etherscan.io",
      };
      await web3authSfa.addChain(newChain);
      uiConsole("Chain added successfully");
    } catch (err) {
      uiConsole(err);
    }
  };

  const switchChain = async () => {
    try {
      await web3authSfa.switchChain({ chainId: "0x5" });
      uiConsole("Chain switched successfully");
    } catch (err) {
      uiConsole(err);
    }
  };

  const loginView = (
    <>
      <div className="flex-container">
        <div>
          <button onClick={getUserInfo} className="card">
            Get User Info
          </button>
        </div>
        <div>
          <button onClick={() => uiConsole(idToken)} className="card">
            Get OAuth ID Token
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
          <button onClick={addChain} className="card">
            Add Chain
          </button>
        </div>
        <div>
          <button onClick={switchChain} className="card">
            Switch Chain
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
        <a target="_blank" href="http://web3auth.io/" rel="noreferrer">
          Web3Auth
        </a>{" "}
        SFA Next JWT Example
      </h1>

      {isLoggingIn ? <Loading /> : <div className="grid">{web3authSfa ? (isLoggedIn ? loginView : logoutView) : null}</div>}

      <footer className="footer">
        <a
          href="https://github.com/Web3Auth/web3auth-core-kit-examples/tree/main/single-factor-auth-web/sfa-next-jwt-example "
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
