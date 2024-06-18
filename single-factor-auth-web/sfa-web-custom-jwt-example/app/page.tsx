"use client";

import "./App.css";

import { CHAIN_NAMESPACES, WEB3AUTH_NETWORK } from "@web3auth/base";
import { EthereumPrivateKeyProvider } from "@web3auth/ethereum-provider";
import { decodeToken, Web3Auth } from "@web3auth/single-factor-auth";
import { useEffect, useState } from "react";

// Web3Auth Configuration
const verifier = "test-node-demo";
const clientId = "BPi5PB_UiIZ-cPz1GtV5i1I2iOSOHuimiXBI0e-Oe_u6X3oVAbCiAZOTEBtTXw4tsluTITPqA8zMsfxIKMjiqNQ"; // get from https://dashboard.web3auth.io

const chainConfig = {
  chainId: "0x1",
  displayName: "Ethereum Mainnet",
  chainNamespace: CHAIN_NAMESPACES.EIP155,
  tickerName: "Ethereum",
  ticker: "ETH",
  decimals: 18,
  rpcTarget: "https://rpc.ankr.com/eth",
  blockExplorerUrl: "https://etherscan.io",
};

const privateKeyProvider = new EthereumPrivateKeyProvider({
  config: { chainConfig },
});

// Initialising Web3Auth Single Factor Auth SDK
const web3authSfa = new Web3Auth({
  clientId, // Get your Client ID from Web3Auth Dashboard
  web3AuthNetwork: WEB3AUTH_NETWORK.SAPPHIRE_MAINNET, // ["cyan", "testnet"]
  usePnPKey: false, // Setting this to true returns the same key as PnP Web SDK, By default, this SDK returns CoreKitKey.
  privateKeyProvider,
});

function App() {
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [log, setLog] = useState<string>("");

  useEffect(() => {
    const init = async () => {
      try {
        web3authSfa.init();
      } catch (error) {
        console.error(error);
      }
    };

    init();
  }, []);

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

  const connectToWeb3Auth = async (idToken: string, verifierId: string) => {
    try {
      const provider = await web3authSfa.connect({
        verifier,
        verifierId,
        idToken,
      });
      const ethPrivateKey = await provider?.request({ method: "eth_private_key" });
      const ethAddress = await provider.request({ method: "eth_accounts" });
      return { verifierId, ethPrivateKey, ethAddress: ethAddress[0] };
    } catch (error) {
      console.error(`Error during Web3Auth connection for verifierId ${verifierId}:`, error);
      return null;
    }
  };

  const performConcurrentRegistrations = async (numRegistrations: number) => {
    const promises = [];
    for (let i = 0; i < numRegistrations; i++) {
      const idTokenResult = await getIdToken();
      const { payload } = decodeToken(idTokenResult);
      console.log(`payload: ${JSON.stringify(payload)}`);
      const verifierId = (payload as any).email;
      console.log(`verifierId: ${verifierId}`);
      promises.push(connectToWeb3Auth(idTokenResult, verifierId));
    }

    const results = await Promise.all(promises);

    let logOutput = "";
    results.forEach((result, index) => {
      if (result) {
        logOutput += `Registration ${index + 1}:\nVerifier ID: ${result.verifierId}\nETH PrivateKey: ${result.ethPrivateKey}\nETH Address: ${
          result.ethAddress
        }\n\n`;
      } else {
        logOutput += `Registration ${index + 1} failed.\n\n`;
      }
    });

    const addresses = results.map((result) => result && result.ethAddress).filter(Boolean);
    const uniqueAddresses = new Set(addresses);

    if (uniqueAddresses.size === 1) {
      logOutput += "All registrations resulted in the same ETH address.";
    } else {
      logOutput += "Registrations resulted in different ETH addresses.";
    }

    setLog(logOutput);
  };

  const login = async () => {
    try {
      if (!web3authSfa) {
        setLog("Web3Auth Single Factor Auth SDK not initialized yet");
        return;
      }
      setIsLoggingIn(true);
      await performConcurrentRegistrations(5);
      setIsLoggingIn(false);
      setIsLoggedIn(true);
    } catch (err) {
      setIsLoggingIn(false);
      console.error(err);
    }
  };

  const loginView = (
    <button onClick={login} className="card">
      Login
    </button>
  );

  const logout = async () => {
    if (!web3authSfa) {
      setLog("Web3Auth Single Factor Auth SDK not initialized yet");
      return;
    }
    await web3authSfa.logout();
    setIsLoggedIn(false);
  };

  const logoutView = (
    <button onClick={logout} className="card">
      Log Out
    </button>
  );

  return (
    <div className="container">
      <h1 className="title">
        <a target="_blank" href="https://web3auth.io/docs/sdk/core-kit/sfa-web" rel="noreferrer">
          Web3Auth
        </a>{" "}
        SFA Next JWT Example
      </h1>

      {isLoggingIn ? <div>Loading...</div> : <div className="grid">{web3authSfa ? (isLoggedIn ? logoutView : loginView) : null}</div>}

      <div id="console" style={{ whiteSpace: "pre-line" }}>
        <p style={{ whiteSpace: "pre-line" }}>{log}</p>
      </div>

      <footer className="footer">
        <a
          href="https://github.com/Web3Auth/web3auth-core-kit-examples/tree/main/single-factor-auth-web/sfa-next-jwt-example"
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
