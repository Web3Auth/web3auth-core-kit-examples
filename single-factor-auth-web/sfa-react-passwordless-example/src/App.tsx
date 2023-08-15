import { useEffect, useState } from "react";

// Import Single Factor Auth SDK for no redirect flow
import { Web3Auth } from "@web3auth/single-factor-auth";
import { CHAIN_NAMESPACES, SafeEventEmitterProvider } from "@web3auth/base";
import { EthereumPrivateKeyProvider } from "@web3auth/ethereum-provider";
import { useAuthState } from 'react-firebase-hooks/auth';
import { auth } from './FireBaseConfig';

// RPC libraries for blockchain calls
// import RPC from "./evm.web3";
import RPC from "./evm.ethers";

import {
  signInWithEmailLink,
  isSignInWithEmailLink,
  // UserCredential,
  sendSignInLinkToEmail,
} from "firebase/auth";

import "./App.css";

const verifier = "web3auth-firebase-examples";

const clientId =
  "BEglQSgt4cUWcj6SKRdu5QkOXTsePmMcusG5EAoyjyOYKlVRjIF1iCNnMOTfpzCiunHRrMui8TIwQPXdkQ8Yxuk"; // get from https://dashboard.web3auth.io

const chainConfig = {
  chainNamespace: CHAIN_NAMESPACES.EIP155,
  chainId: "0x5",
  rpcTarget: "https://rpc.ankr.com/eth_goerli",
  displayName: "Goerli Testnet",
  blockExplorer: "https://goerli.etherscan.io",
  ticker: "ETH",
  tickerName: "Ethereum",
};

function App() {
  const [web3authSFAuth, setWeb3authSFAuth] = useState<Web3Auth | null>(null);
  const [usesSfaSDK, setUsesSfaSDK] = useState(false);
  const [provider, setProvider] = useState<SafeEventEmitterProvider | null>(
    null
  );
  const [idToken, setIdToken] = useState<string | null>(null);
  const[ user ] = useAuthState(auth);
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  // const [authUser, setAuthUser] = useState<any>(null);
  const email = 'maharshi@tor.us';


  useEffect(() => {
    const init = async () => {
      try {
        // Initialising Web3Auth Single Factor Auth SDK
        const web3authSfa = new Web3Auth({
          clientId, // Get your Client ID from Web3Auth Dashboard
          web3AuthNetwork: "testnet", // ["cyan", "testnet"]
          usePnPKey: false, // Setting this to true returns the same key as PnP Web SDK, By default, this SDK returns CoreKitKey.
        });
        setWeb3authSFAuth(web3authSfa);
        const provider = new EthereumPrivateKeyProvider({
          config: { chainConfig },
        });
        console.log(user);
        web3authSfa.init(provider);
      } catch (error) {
        console.error(error);
        console.log(isLoggingIn);
      }
    };
    init();
    if(user){
      setIsLoggedIn(true);
    }
    else{
      if(isSignInWithEmailLink(auth, window.location.href)) {
        setIsLoggingIn(true);
        signInWithEmailLink(auth, email, window.location.href)
        .then((result) => {
          console.log(result.user);
          setIsLoggingIn(false);
          setIsLoggedIn(true);
        }).catch((error) => {
          setIsLoggingIn(false);
          uiConsole(error);
        });
      }
    }
  }, []);

  // const signInWithGoogle = async (): Promise<any> => {
  //   try {
  //     const actionCodeSettings = {
  //       url: window.location.href,
  //       handleCodeInApp: true,
  //     };
  //     await sendSignInLinkToEmail(auth, email, actionCodeSettings);
  //     // Obtain emailLink from the user.
  //     let res = null;
  //     if(isSignInWithEmailLink(auth, email)) {
  //       res = await signInWithEmailLink(auth, email, window.location.href);
  //     }
  //     console.log(res);
  //     return res;
  //   } catch (err) {
  //     console.error(err);
  //     throw err;
  //   }
  // };

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

  const login = async () => {
      // login with firebase
      // const loginRes = await signInWithGoogle();
      // get the id token from firebase
      // @ts-ignore
      setIdToken(user.idToken);
      console.log(user);
  
      // trying logging in with the Single Factor Auth SDK
      try {
        if (!web3authSFAuth) {
          uiConsole("Web3Auth Single Factor Auth SDK not initialized yet");
          return;
        }
        console.log(user?.getIdToken);
        // get sub value from firebase id token
        const { sub } = parseToken(user?.getIdToken);
  
        const web3authSfaprovider = await web3authSFAuth.connect({
          verifier,
          verifierId: sub,
          idToken: "",
        });
        if (web3authSfaprovider) {
          setProvider(web3authSfaprovider);
        }
        setUsesSfaSDK(true);
      } catch (err) {
        // Single Factor Auth SDK throws an error if the user has already enabled MFA
        console.error(err);
    }

    setIsLoggingIn(true);
    sendSignInLinkToEmail(auth, email, {
      url: window.location.href,
      handleCodeInApp: true,
    }).then(() => {
      localStorage.setItem('emailForSignIn', email);
      setIsLoggingIn(false);
    }).catch((error) => {
      setIsLoggingIn(false);
      uiConsole(error);
    });
  };

  const getUserInfo = async () => {
    if (usesSfaSDK) {
      uiConsole(
        "You are directly using Single Factor Auth SDK to login the user, hence the Web3Auth <code>getUserInfo</code> function won't work for you. Get the user details directly from id token.",
        parseToken(idToken)
      );
      return;
    }
  };

  const logout = async () => {
    if (usesSfaSDK) {
      console.log(
        "You are directly using Single Factor Auth SDK to login the user, hence the Web3Auth logout function won't work for you. You can logout the user directly from your login provider, or just clear the provider object."
      );
      auth.signOut().then(()=>{
        console.log('successfully logged out');
        setProvider(null);
      }).catch((err)=>{
        console.log(err);
      })
      return;
    }
  };

  const getAccounts = async () => {
    if (!provider) {
      uiConsole("No provider found");
      return;
    }
    const rpc = new RPC(provider);
    const userAccount = await rpc.getAccounts();
    uiConsole(userAccount);
  };

  const getBalance = async () => {
    if (!provider) {
      uiConsole("No provider found");
      return;
    }
    const rpc = new RPC(provider);
    const balance = await rpc.getBalance();
    uiConsole(balance);
  };

  const signMessage = async () => {
    if (!provider) {
      uiConsole("No provider found");
      return;
    }
    const rpc = new RPC(provider);
    const result = await rpc.signMessage();
    uiConsole(result);
  };

  const sendTransaction = async () => {
    if (!provider) {
      uiConsole("No provider found");
      return;
    }
    const rpc = new RPC(provider);
    const result = await rpc.signAndSendTransaction();
    uiConsole(result);
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
      <p>Email: {email}</p>
      <button onClick={login} className="card">
      Login
      </button>
    </> 
  );

  return (
    <div className="container">
      <h1 className="title">
        <a target="_blank" href="http://web3auth.io/" rel="noreferrer">
          Web3Auth
        </a>{" "}
        SFA React Example
      </h1>

        <div className="grid">
          {isLoggedIn ? loginView : logoutView}
        </div>

      <footer className="footer">
        <a
          href="https://github.com/Web3Auth/web3auth-core-kit-examples/tree/main/single-factor-auth-web/sfa-react-example"
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
