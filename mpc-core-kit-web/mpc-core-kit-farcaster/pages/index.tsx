/* eslint-disable @typescript-eslint/no-use-before-define */
import "@farcaster/auth-kit/styles.css";

import { AuthKitProvider, SignInButton, StatusAPIResponse } from "@farcaster/auth-kit";
import { EthereumSigningProvider } from "@web3auth/ethereum-mpc-provider";
import { COREKIT_STATUS, makeEthereumSigner, parseToken, WEB3AUTH_NETWORK, Web3AuthMPCCoreKit } from "@web3auth/mpc-core-kit";
import { ethers } from "ethers";
import Head from "next/head";
import { getCsrfToken, signIn, signOut, useSession } from "next-auth/react";
import { useCallback, useEffect, useState } from "react";
import { tssLib } from "@toruslabs/tss-dkls-lib";

const config = {
  relay: "https://relay.farcaster.xyz",
  rpcUrl: "https://mainnet.optimism.io",
  siweUri: "http://example.com/login",
  domain: "example.com",
};

const verifier = "w3a-farcaster-demo";

function uiConsole(...args: any[]): void {
  const el = document.querySelector("#console>p");
  if (el) {
    el.innerHTML = JSON.stringify(args || {}, null, 2);
  }
}

export default function Home() {
  return (
    <>
      <Head>
        <title>Web3Auth + Farcaster AuthKit + NextAuth Demo</title>
      </Head>
      <main style={{ fontFamily: "Inter, sans-serif" }}>
        <AuthKitProvider config={config}>
          <Content />
        </AuthKitProvider>
      </main>
    </>
  );
}

function Content() {
  const [error, setError] = useState(false);
  const [web3auth, setWeb3Auth] = useState<any>();
  const [provider, setProvider] = useState<any>();
  const [loggedIn, setLoggedIn] = useState(false);

  useEffect(() => {
    const init = async () => {
      try {
        const coreKitInstance = new Web3AuthMPCCoreKit({
          web3AuthClientId: "BPi5PB_UiIZ-cPz1GtV5i1I2iOSOHuimiXBI0e-Oe_u6X3oVAbCiAZOTEBtTXw4tsluTITPqA8zMsfxIKMjiqNQ", // Your Web3Auth Client ID
          web3AuthNetwork: WEB3AUTH_NETWORK.MAINNET, // Web3Auth Network
          storage: window.localStorage,
          manualSync: true, // This is the recommended approach since it allows you to control the sync process
          tssLib: tssLib,
        });
        setWeb3Auth(coreKitInstance);

        const evmProvider = new EthereumSigningProvider({
          config: {
            chainConfig: {
              chainNamespace: "eip155",
              chainId: "0xaa36a7",
              rpcTarget: "https://api.web3auth.io/infura-service/v1/11155111/BPi5PB_UiIZ-cPz1GtV5i1I2iOSOHuimiXBI0e-Oe_u6X3oVAbCiAZOTEBtTXw4tsluTITPqA8zMsfxIKMjiqNQ",
              displayName: "Ethereum Sepolia Testnet",
              blockExplorerUrl: "https://sepolia.etherscan.io",
              ticker: "ETH",
              tickerName: "Ethereum",
            },
          },
        });
        evmProvider.setupProvider(makeEthereumSigner(coreKitInstance));
        setProvider(evmProvider);
        await coreKitInstance.init();

        if (coreKitInstance.status === COREKIT_STATUS.LOGGED_IN) {
          console.log("Web3Auth Status", coreKitInstance.status);
        }
      } catch (e) {
        console.error(e);
      }
    };

    init();
  }, []);

  const login = async (idToken: any) => {
    if (!web3auth) {
      throw new Error("Web3Auth CoreKit not initialized");
    }
    const decodedToken = parseToken(idToken);

    await web3auth.loginWithJWT({
      verifier, // Your verifier name from Web3Auth Dashboard
      verifierId: (decodedToken as any).sub, // based on your setup
      idToken, // JWT token from your backend
    });
    if (web3auth.status === COREKIT_STATUS.LOGGED_IN) {
      await web3auth.commitChanges(); // Needed to commit for new accounts, when using manualSync: true
      setLoggedIn(true);
    }
    // return web3authProvider;
  };

  const logOut = async () => {
    await web3auth.logout();
    await signOut();
    setLoggedIn(false);
  };

  const getNonce = useCallback(async () => {
    const nonce = await getCsrfToken();
    if (!nonce) throw new Error("Unable to generate nonce");
    return nonce;
  }, []);

  const handleSuccess = useCallback(async (res: StatusAPIResponse) => {
    console.log("response", res);
    await signIn("credentials", {
      message: res.message,
      signature: res.signature,
      name: res.displayName,
      username: res.username,
      pfp: res.pfpUrl,
      redirect: false,
    });
    const response = await fetch("/api/login", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ userData: res }),
    });
    const data = await response.json();
    const { token } = data;
    console.log("token", token);
    await login(token);
    const accounts = await getAccounts();
    console.log("accounts", accounts);
  }, []);

  const getAccounts = async () => {
    if (!provider) {
      console.log("provider not initialized yet");
      return;
    }

    const ethersProvider = new ethers.BrowserProvider(provider);

    const signer = await ethersProvider.getSigner();

    // Get user's Ethereum public address
    const address = await signer.getAddress();
    console.log("ETH Address:", address);
    uiConsole("ETH Address:", address);
    return address;
  };

  const getBalance = async () => {
    if (!provider) {
      console.log("provider not initialized yet");
      return;
    }

    const ethersProvider = new ethers.BrowserProvider(provider);

    const signer = await ethersProvider.getSigner();

    // Get user's Ethereum public address
    const address = signer.getAddress();

    const balance = ethers.formatEther(
      await ethersProvider.getBalance(address) // Balance is in wei
    );
    console.log("Balance:", balance);
    uiConsole("Balance:", balance);
    return balance;
  };

  const signMessage = async () => {
    if (!provider) {
      console.log("provider not initialized yet");
      return;
    }
    const ethersProvider = new ethers.BrowserProvider(provider);
    const signer = await ethersProvider.getSigner();

    const message = "Hello world!";
    const signedMessage = await signer.signMessage(message);
    console.log("Signed Message:", signedMessage);
    uiConsole(signedMessage);
    return signedMessage;
  };

  const signTransaction = async () => {
    if (!provider) {
      console.log("provider not initialized yet");
      return;
    }
    const ethersProvider = new ethers.BrowserProvider(provider);
    const signer = await ethersProvider.getSigner();

    const destination = "0xeaA8Af602b2eDE45922818AE5f9f7FdE50cFa1A8";
    const amount = ethers.parseEther("0.005");
    const tx = await signer.sendTransaction({
      to: destination,
      value: amount,
      // maxPriorityFeePerGas: "5000000000", // Max priority fee per gas
      // maxFeePerGas: "6000000000000", // Max fee per gas
    });

    const receipt = await tx.wait();
    console.log("Transaction Receipt:", receipt);
    uiConsole(receipt);
    return receipt;
  };

  const enableMFA = async () => {
    if (!web3auth) {
      throw new Error("Web3Auth CoreKit not initialized");
    }
    await web3auth.enableMFA({});
  };

  return (
    <div>
      <div style={{ position: "fixed", top: "12px", right: "12px" }}>
        <SignInButton nonce={getNonce} onSuccess={handleSuccess} onError={() => setError(true)} onSignOut={() => logOut()} />
        {error && <div>Unable to sign in at this time.</div>}
      </div>

      <div style={{ paddingTop: "33vh", textAlign: "center" }}>
        <h1>Web3Auth + @farcaster/auth-kit + NextAuth</h1>
        <p>
          This example app shows how to use{" "}
          <a href="https://docs.farcaster.xyz/auth-kit/introduction" target="_blank" rel="noreferrer">
            Farcaster AuthKit
          </a>{" "}
          and{" "}
          <a href="https://next-auth.js.org/" target="_blank" rel="noreferrer">
            NextAuth.js
          </a>{" "}
          with{" "}
          <a href="https://web3auth.io" target="_blank" rel="noreferrer">
            Web3Auth
          </a>
          .
        </p>
        <Profile />
        {loggedIn ? (
          <>
            <p>
              <button type="button" style={{ padding: "6px 12px", cursor: "pointer" }} onClick={() => logOut()}>
                Click here to sign out
              </button>
            </p>
            <p>
              <button type="button" style={{ padding: "6px 12px", margin: "6px 6px", cursor: "pointer" }} onClick={() => getAccounts()}>
                Get Account
              </button>
              <button type="button" style={{ padding: "6px 12px", margin: "6px 6px", cursor: "pointer" }} onClick={() => getBalance()}>
                Get Balance
              </button>
              <button type="button" style={{ padding: "6px 12px", margin: "6px 6px", cursor: "pointer" }} onClick={() => signMessage()}>
                Sign Message
              </button>
              <button type="button" style={{ padding: "6px 12px", margin: "6px 6px", cursor: "pointer" }} onClick={() => signTransaction()}>
                Send Transaction
              </button>
              {/* TODO */}
              {/* Add Enable MFA */}
              <button
                type="button"
                style={{ padding: "6px 12px", margin: "6px 6px", cursor: "pointer" }}
                onClick={() => {
                  enableMFA();
                }}
              >
                Enable MFA
              </button>
            </p>
            <div id="console" style={{ whiteSpace: "pre-line" }}>
              <p style={{ whiteSpace: "pre-line" }}></p>
            </div>
          </>
        ) : (
          <></>
        )}
      </div>

      <p style={{ paddingTop: "22vh", textAlign: "center" }}>
        <a
          href="https://github.com/Web3Auth/web3auth-core-kit-examples/tree/main/mpc-core-kit-web/mpc-core-kit-farcaster"
          target="_blank"
          rel="noreferrer"
        >
          Source code
        </a>
      </p>
      <p style={{ paddingTop: "2vh", textAlign: "center" }}>
        <a
          href="https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2FWeb3Auth%2Fweb3auth-core-kit-examples%2Ftree%2Fmain%2Fmpc-core-kit-web%2Fmpc-core-kit-farcaster"
          target="_blank"
          rel="noreferrer"
        >
          <img src="https://vercel.com/button" alt="Deploy with Vercel" />
        </a>
      </p>
    </div>
  );
}

function Profile() {
  const { data: session } = useSession();

  return session ? (
    <div style={{ fontFamily: "sans-serif" }}>
      <p>Signed in as {session.user?.name}</p>
    </div>
  ) : (
    <p>Click the &quot;Sign in with Farcaster&quot; button above, then scan the QR code to sign in.</p>
  );
}
