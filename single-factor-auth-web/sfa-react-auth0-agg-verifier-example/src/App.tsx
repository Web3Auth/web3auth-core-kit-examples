import { useEffect, useState } from "react";

// Import Single Factor Auth SDK for no redirect flow
import { Web3Auth } from "@web3auth/single-factor-auth";
import { CHAIN_NAMESPACES, SafeEventEmitterProvider } from "@web3auth/base";
import { EthereumPrivateKeyProvider } from "@web3auth/ethereum-provider";
import { GoogleLogin, CredentialResponse } from '@react-oauth/google';

// RPC libraries for blockchain calls
// import RPC from "./evm.web3";
import RPC from "./evm.ethers";

import { useAuth0 } from "@auth0/auth0-react";
// import { auth } from './FireBaseConfig';
// import {
//   GoogleAuthProvider,
//   signInWithPopup,
// } from "firebase/auth";

import "./App.css";

import Loading from "./Loading";

const verifier = "w3a-agg-google-auth0";

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
  const [idToken, setIdToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [provider, setProvider] = useState<SafeEventEmitterProvider | null>(
    null
  );
  const { getIdTokenClaims, loginWithPopup } = useAuth0();

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

        web3authSfa.init(provider);
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
  // const signInWithGoogle = async () => {
  //   try {
  //     const googleProvider = new GoogleAuthProvider();
  //     const res = await signInWithPopup(auth, googleProvider);
  //     console.log(res);
  //     const idToken = await res.user.getIdToken(true);
  //     console.log("idToken", parseToken(idToken));
  //     const { email } = parseToken(idToken);
  //     console.log("email", email);
  //     const subVerifierInfoArray = [
  //       {
  //         verifier: "w3a-google-firebase",
  //         idToken: idToken!,
  //       }
  //     ]
  //     await web3authSFAuth?.connect({
  //       verifier,
  //       verifierId: email,
  //       idToken: idToken!,
  //       subVerifierInfoArray,
  //     });
  //     setUsesSfaSDK(true);
  //     setLoading(false);
  //     setIsLoggedIn(true);
  //   } catch (err) {
  //     console.error(err);
  //     throw err;
  //   }
  // };

  const loginAuth0GitHub = async () => {
    // trying logging in with the Single Factor Auth SDK
    try {
      if (!web3authSFAuth) {
        uiConsole("Web3Auth Single Factor Auth SDK not initialized yet");
        return;
      }
      setLoading(true);
      await loginWithPopup();
      const idToken = (await getIdTokenClaims())?.__raw.toString();
      setIdToken(idToken!);
      console.log("idToken", parseToken(idToken));
      const { email } = parseToken(idToken);
      const subVerifierInfoArray = [
        {
          verifier: "w3a-auth0-github",
          idToken: idToken!,
        }
      ]
      const web3authSfaprovider = await web3authSFAuth.connect({
        verifier,
        verifierId: email,
        idToken: idToken!,
        subVerifierInfoArray,
      });
      if (web3authSfaprovider) {
        setProvider(web3authSfaprovider);
      }
      setUsesSfaSDK(true);
      setLoading(false);
      setIsLoggedIn(true);
    } catch (err) {
      // Single Factor Auth SDK throws an error if the user has already enabled MFA
      // One can use the Web3AuthNoModal SDK to handle this case
      setLoading(false);
      console.error(err);
    }
  };

  // const loginAuth0EmailPasswordless = async () => {
  //   // trying logging in with the Single Factor Auth SDK
  //   try {
  //     if (!web3authSFAuth) {
  //       uiConsole("Web3Auth Single Factor Auth SDK not initialized yet");
  //       return;
  //     }
  //     setLoading(true);
  //     await loginWithPopup();
  //     const idToken = (await getIdTokenClaims())?.__raw.toString();
  //     setIdToken(idToken!);
  //     console.log("idToken", parseToken(idToken));
  //     const { email } = parseToken(idToken);
  //     const subVerifierInfoArray = [
  //       {
  //         verifier: "w3a-auth0-email-pswdles",
  //         idToken: idToken!,
  //       }
  //     ]
  //     await web3authSFAuth.connect({
  //       verifier,
  //       verifierId: email,
  //       idToken: idToken!,
  //       subVerifierInfoArray,
  //     });
  //     setUsesSfaSDK(true);
  //     setLoading(false);
  //     setIsLoggedIn(true);
  //   } catch (err) {
  //     // Single Factor Auth SDK throws an error if the user has already enabled MFA
  //     // One can use the Web3AuthNoModal SDK to handle this case
  //     setLoading(false);
  //     console.error(err);
  //   }
  // };

  const onSuccess = async (response: CredentialResponse) => {
    try {
      if (!web3authSFAuth) {
        uiConsole("Web3Auth Single Factor Auth SDK not initialized yet");
        return;
      }
      setLoading(true);
      const idToken = response.credential;
      setIdToken(idToken!);
      const { email } = parseToken(idToken);
      console.log(email);
      const subVerifierInfoArray = [
        {
          verifier: "w3a-google",
          idToken: idToken!,
        }
      ]
      const web3authSfaprovider = await web3authSFAuth.connect({
        verifier,
        verifierId: email,
        idToken: idToken!,
        subVerifierInfoArray,
      });
      if (web3authSfaprovider) {
        setProvider(web3authSfaprovider);
      }
      setUsesSfaSDK(true);
      setLoading(false);
      setIsLoggedIn(true);
    } catch (err) {
      // Single Factor Auth SDK throws an error if the user has already enabled MFA
      // One can use the Web3AuthNoModal SDK to handle this case
      setLoading(false);
      console.error(err);
    }
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
      web3authSFAuth?.logout();
      return;
    }
  };

  const getAccounts = async () => {
    if (!provider) {
      uiConsole("No provider found");
      return;
    }
    const rpc = new RPC(provider!);
    const userAccount = await rpc.getAccounts();
    uiConsole(userAccount);
  };

  const getBalance = async () => {
    if (!provider) {
      uiConsole("No provider found");
      return;
    }
    const rpc = new RPC(provider!);
    const balance = await rpc.getBalance();
    uiConsole(balance);
  };

  const signMessage = async () => {
    if (!provider) {
      uiConsole("No provider found");
      return;
    }
    const rpc = new RPC(provider!);
    const result = await rpc.signMessage();
    uiConsole(result);
  };

  const sendTransaction = async () => {
    if (!provider) {
      uiConsole("No provider found");
      return;
    }
    const rpc = new RPC(provider!);
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
      <button onClick={loginAuth0GitHub} className="card">
        Login using <b>Github</b> [ via Auth0 ]
      </button>
      <GoogleLogin onSuccess={onSuccess} />
    </>
  );

  return (
    <div className="container">
      <h1 className="title">
        <a target="_blank" href="http://web3auth.io/" rel="noreferrer">
          Web3Auth
        </a>{" "}
        SFA React Auth0 GitHub Example
      </h1>

      {loading ? (
          <Loading /> 
        ): (
          <div className="grid">
            {isLoggedIn ? loginView : logoutView}
          </div>
        )}

      <footer className="footer">
        <a
          href="https://github.com/Web3Auth/web3auth-core-kit-examples/tree/main/single-factor-auth-web/sfa-react-agg-verifier-example "
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
