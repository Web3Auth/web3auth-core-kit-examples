import { useEffect, useState } from "react";

// Import Single Factor Auth SDK for no redirect flow
import { decodeToken, Web3Auth } from "@web3auth/single-factor-auth";
import { CHAIN_NAMESPACES, WEB3AUTH_NETWORK } from "@web3auth/base";
import { EthereumPrivateKeyProvider } from "@web3auth/ethereum-provider";
import { auth } from "./FireBaseConfig";
import { useAuthState } from "react-firebase-hooks/auth";

// RPC libraries for blockchain calls
// import RPC from "./evm.web3";
// import RPC from "./evm.viem";
import RPC from "./evm.ethers";
import Loading from "./Loading";

import { signInWithEmailLink, isSignInWithEmailLink, sendSignInLinkToEmail } from "firebase/auth";

import "./App.css";

const verifier = "web3auth-firebase-examples";

const clientId = "BEglQSgt4cUWcj6SKRdu5QkOXTsePmMcusG5EAoyjyOYKlVRjIF1iCNnMOTfpzCiunHRrMui8TIwQPXdkQ8Yxuk"; // get from https://dashboard.web3auth.io

const chainConfig = {
  chainNamespace: CHAIN_NAMESPACES.EIP155,
  chainId: "0x1",
  rpcTarget: "https://rpc.ankr.com/eth",
  displayName: "Ethereum Mainnet",
  blockExplorerUrl: "https://etherscan.io",
  ticker: "ETH",
  tickerName: "Ethereum",
};

const ethereumPrivateKeyProvider = new EthereumPrivateKeyProvider({
  config: { chainConfig },
});

const web3authSfa = new Web3Auth({
  clientId, // Get your Client ID from Web3Auth Dashboard
  web3AuthNetwork: WEB3AUTH_NETWORK.CYAN, // ["cyan", "testnet"]
  usePnPKey: false, // Setting this to true returns the same key as PnP Web SDK, By default, this SDK returns CoreKitKey.
  privateKeyProvider: ethereumPrivateKeyProvider,
});

function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const [email, setEmail] = useState<string>("hello@web3auth.io");
  const [user] = useAuthState(auth);

  useEffect(() => {
    const init = async () => {
      try {
        // Initialising Web3Auth Single Factor Auth SDK
        web3authSfa.init();
      } catch (error) {
        uiConsole(error);
      }
    };
    init();
  }, []);

  useEffect(() => {
    if (isSignInWithEmailLink(auth, window.location.href)) {
      const email = localStorage.getItem("email_for_web3auth_sfa_demo") || "hello@web3auth.io";
      signInWithEmailLink(auth, email, window.location.href)
        .then(async (loginRes) => {
          uiConsole(loginRes);
          const idToken = await loginRes.user.getIdToken(true);
          if (!idToken) {
            uiConsole("No ID Token found");
            return;
          }
          const { payload } = decodeToken(idToken);

          await web3authSfa.connect({
            verifier,
            verifierId: (payload as any).email,
            idToken: idToken,
          });

          setIsLoggedIn(true);
        })
        .catch((error) => {
          uiConsole(error);
        });
    }
  }, []);

  const signInWithEmailPasswordless = async (): Promise<any> => {
    setIsLoading(true);
    try {
      await sendSignInLinkToEmail(auth, email, {
        url: window.location.href,
        handleCodeInApp: true,
      });
      setIsLoading(false);
    } catch (error) {
      setIsLoading(false);
      uiConsole(error);
    }
  };

  const getUserInfo = async () => {
    uiConsole("Get the user details directly from your login provider.", user);
    return;
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
        chainId: "0xaa36a7",
        displayName: "Sepolia Testnet ETH",
        chainNamespace: CHAIN_NAMESPACES.EIP155,
        tickerName: "Sepolia Testnet ETH",
        ticker: "ETH",
        decimals: 18,
        rpcTarget: "https://rpc.ankr.com/eth_sepolia",
        blockExplorerUrl: "https://sepolia.etherscan.io",
      };
      await web3authSfa.addChain(newChain);
      uiConsole("Chain added successfully");
    } catch (err) {
      uiConsole(err);
    }
  };

  const switchChain = async () => {
    try {
      await web3authSfa.switchChain({ chainId: "0xaa36a7" });
      uiConsole("Chain switched successfully");
    } catch (err) {
      uiConsole(err);
    }
  };

  const logout = async () => {
    auth
      .signOut()
      .then(() => {
        uiConsole("successfully logged out");
      })
      .catch((err) => {
        uiConsole(err);
      });
    setIsLoggedIn(false);
    web3authSfa.logout();
    return;
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

  function uiConsole(...args: any[]): void {
    const el = document.querySelector("#console>p");
    if (el) {
      el.innerHTML = JSON.stringify(args || {}, null, 2);
    }
    console.log(...args);
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
    <>
      <p>Email:</p>
      <input
        type="text"
        value={email}
        onChange={(e) => {
          setEmail(e.target.value);
          localStorage.setItem("email_for_web3auth_sfa_demo", e.target.value);
        }}
      />
      <button onClick={signInWithEmailPasswordless} className="card">
        Login
      </button>
      <div id="console" style={{ whiteSpace: "pre-line" }}>
        <p style={{ whiteSpace: "pre-line" }}></p>
      </div>
    </>
  );

  return (
    <div className="container">
      <h1 className="title">
        <a target="_blank" href="https://web3auth.io/docs/sdk/core-kit/sfa-web" rel="noreferrer">
          Web3Auth
        </a>{" "}
        SFA React Example
      </h1>

      {isLoading ? <Loading /> : <div className="grid">{isLoggedIn ? loginView : logoutView}</div>}

      <footer className="footer">
        <a
          href="https://github.com/Web3Auth/web3auth-core-kit-examples/tree/main/single-factor-auth-web/sfa-web-passwordless-example"
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
