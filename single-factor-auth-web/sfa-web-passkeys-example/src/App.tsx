import { useEffect, useState } from "react";
import { browserSupportsWebAuthn, startAuthentication, startRegistration } from "@simplewebauthn/browser";
import { Web3Auth } from "@web3auth/single-factor-auth";
import { get, post } from "@toruslabs/http-helpers";
import { CHAIN_NAMESPACES } from "@web3auth/base";
import { EthereumPrivateKeyProvider } from "@web3auth/ethereum-provider";
import Web3 from "web3";

import "./App.css";

const verifier = "passkeys-web3auth-demo";

const chainConfig = {
  chainNamespace: CHAIN_NAMESPACES.EIP155,
  chainId: "0x1", // Please use 0x1 for Mainnet
  rpcTarget: "https://rpc.ankr.com/eth",
  displayName: "Ethereum Mainnet",
  blockExplorer: "https://etherscan.io/",
  ticker: "ETH",
  tickerName: "Ethereum",
};

function App() {
  const [web3Auth, setWeb3Auth] = useState<Web3Auth | null>(null);
  const [provider, setProvider] = useState<any | null>(null);
  const [connected, setConnected] = useState<boolean>(false);

  const [email, setEmail] = useState<string>("");
  const isWebAuthnSupported = browserSupportsWebAuthn();
  const [isWebAuthnLoginEnabled, setIsWebAuthnLoginEnabled] = useState(false);
  const [isWebAuthnRegistrationEnabled, setIsWebAuthnRegistrationEnabled] = useState(false);

  useEffect(() => {
    async function saveEmailLocally() {
      try {
        localStorage.setItem("emailForWeb3AuthPassKeysPlayground", email);
      } catch (error) {
        console.error(error);
      }
    }
    saveEmailLocally();
  }, [email]);

  useEffect(() => {
    async function init() {
      try {
        const clientId = "BPi5PB_UiIZ-cPz1GtV5i1I2iOSOHuimiXBI0e-Oe_u6X3oVAbCiAZOTEBtTXw4tsluTITPqA8zMsfxIKMjiqNQ";
        const web3AuthInstance = new Web3Auth({
          clientId,
          web3AuthNetwork: "sapphire_mainnet",
        });

        const ethereumPrivateKeyProvider = new EthereumPrivateKeyProvider({
          config: { chainConfig },
        });

        await web3AuthInstance.init(ethereumPrivateKeyProvider);
        if (web3AuthInstance.status === "connected") {
          setConnected(true);
        }
        setWeb3Auth(web3AuthInstance);
      } catch (error) {
        uiConsole(error);
      }
    }
    async function getEmailFromLocal() {
      const localEmail = localStorage.getItem("emailForWeb3AuthPassKeysPlayground");
      if (localEmail) {
        setEmail(localEmail);
      } else {
        const chars = "abcdefghijklmnopqrstuvwxyz1234567890";
        let string = "";
        for (let ii = 0; ii < 15; ii++) {
          string += chars[Math.floor(Math.random() * chars.length)];
        }
        setEmail(`${string}@web3auth.com`);
      }
    }
    getEmailFromLocal();
    init();
  }, []);

  useEffect(() => {
    async function emailCheck() {
      try {
        if (isWebAuthnSupported && email!.match(/^([\w.%+-]+)@([\w-]+\.)+([\w]{2,})$/i)) {
          try {
            console.log("fetching webauthn status");
            const url = new URL(`https://wc-admin.web3auth.com/api/v2/webauthn`);
            url.searchParams.append("email", email!);
            const response = await get<{ success: boolean; data: { webauthn_enabled: boolean; cred_id: string; public_key: string } }>(url.href);
            if (response.success) {
              setIsWebAuthnLoginEnabled(true);
              setIsWebAuthnRegistrationEnabled(false);
            } else {
              setIsWebAuthnRegistrationEnabled(true);
              setIsWebAuthnLoginEnabled(false);
            }
          } catch (error) {
            console.error(error);
          }
        }
      } catch (error) {
        uiConsole(error);
      }
    }
    async function saveEmailLocally() {
      try {
        if (email !== "") {
          await localStorage.setItem("emailForWeb3AuthPassKeysPlayground", email);
        }
      } catch (error) {
        console.error(error);
      }
    }
    emailCheck();
    saveEmailLocally();
  }, [email]);

  const triggerPassKeyLogin = async () => {
    try {
      const url = new URL("https://wc-admin.web3auth.com/api/v2/webauthn-generate-authentication-options");
      url.searchParams.append("email", email);
      const resp = await get(url.href);
      const attestationResponse = await startAuthentication(resp as any);
      const url2 = new URL("https://wc-admin.web3auth.com/api/v2/webauthn-verify-authentication");
      const resp2 = await post<{ verified: boolean; id_token: string }>(url2.href, { attestationResponse, email });
      if (resp2.verified) {
        return resp2.id_token;
      }
      throw new Error("Login failed");
    } catch (error) {
      console.error(error);
    }
  };

  const triggerPassKeyRegistration = async () => {
    try {
      const url = new URL("https://wc-admin.web3auth.com/api/v2/webauthn-generate-registration-options");
      url.searchParams.append("email", email);
      const resp = await get(url.href);
      const attestationResponse = await startRegistration(resp as any);
      const url2 = new URL("https://wc-admin.web3auth.com/api/v2/webauthn-verify-registration");
      const resp2 = await post<{ verified: boolean }>(url2.href, { attestationResponse, email });
      if (resp2.verified) {
        setIsWebAuthnRegistrationEnabled(false);
        setIsWebAuthnLoginEnabled(true);
        uiConsole("Registration successful, Proceed to Login");
      } else {
        throw new Error("Registration failed");
      }
    } catch (error) {
      console.error(error);
    }
  };

  const login = async () => {
    if (!web3Auth) {
      uiConsole("web3auth not initialized yet");
      return;
    }

    if (isWebAuthnLoginEnabled) {
      const idToken = await triggerPassKeyLogin();
      await web3Auth.connect({
        verifier,
        idToken: idToken!,
        verifierId: email!,
      });
      if (web3Auth.status === "connected") {
        setConnected(true);
        setProvider(web3Auth.provider);
      }
    } else {
      uiConsole("Please register first");
    }
  };

  const logout = async () => {
    uiConsole("Logging out");
    if (!web3Auth) {
      uiConsole("web3auth not initialized yet");
      return;
    }
    await web3Auth.logout();
    setProvider(null);
    setConnected(false);
  };

  const getUserInfo = async () => {
    const user = await web3Auth?.getUserInfo();
    uiConsole(user);
  };

  const getAccounts = async () => {
    if (!provider) {
      uiConsole("provider not initialized yet");
      return;
    }
    const web3 = new Web3(provider as any);

    // Get user's Ethereum public address
    const address = await web3.eth.getAccounts();
    uiConsole(address);
  };

  const getBalance = async () => {
    if (!provider) {
      uiConsole("provider not initialized yet");
      return;
    }
    const web3 = new Web3(provider as any);

    // Get user's Ethereum public address
    const address = (await web3.eth.getAccounts())[0];

    // Get user's balance in ether
    const balance = web3.utils.fromWei(
      await web3.eth.getBalance(address), // Balance is in wei
      "ether"
    );
    uiConsole(balance);
  };

  const signMessage = async () => {
    if (!provider) {
      uiConsole("provider not initialized yet");
      return;
    }
    const web3 = new Web3(provider as any);

    // Get user's Ethereum public address
    const fromAddress = (await web3.eth.getAccounts())[0];

    const originalMessage = "YOUR_MESSAGE";

    // Sign the message
    const signedMessage = await web3.eth.personal.sign(
      originalMessage,
      fromAddress,
      "test password!" // configure your own password here.
    );
    uiConsole(signedMessage);
  };

  function uiConsole(...args: any[]): void {
    const el = document.querySelector("#console>p");
    if (el) {
      el.innerHTML = JSON.stringify(args || {}, null, 2);
    }
    console.log(...args);
  }

  const updateEmail = (newEmail: string) => {
    setEmail(newEmail);
  };

  const ConnectWeb3AuthButton = () => {
    const [loading, setLoading] = useState(false);

    const LoaderButton: React.FC<{
      isLoading: boolean;
      text: string;
      loadingText: string;
      style: React.CSSProperties; // or any specific type you want for your style
      onClick: () => Promise<void>; // or () => void if it's not an async function
    }> = ({ isLoading, text, loadingText, style, onClick }) => (
      <button onClick={onClick} style={style}>
        {isLoading && (
          <div style={{ display: "inline-block", marginRight: "8px", verticalAlign: "middle" }}>
            <div
              style={{
                border: "2px solid rgba(255, 255, 255, 0.3)", // Lighter border color
                borderTop: "2px solid #fff", // Top border color
                borderRadius: "50%",
                width: "12px", // Half the size of your previous loader
                height: "12px", // Half the size of your previous loader
                animation: "spin 1s linear infinite",
              }}
            ></div>
            <style>{`
              @keyframes spin {
                0% { transform: rotate(0deg); }
                100% { transform: rotate(360deg); }
              }
            `}</style>
          </div>
        )}
        {isLoading ? loadingText : text}
      </button>
    );

    if (provider) {
      return null;
    }
    return (
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "20px", width: "100%" }}>
        <div style={{ width: "100%", display: "flex", justifyContent: "center" }}>
          <label>Enter Your Email</label>
        </div>
        <div style={{ width: "100%", display: "flex", justifyContent: "center" }}>
          <input
            type="email"
            id="email"
            value={email}
            onChange={(e) => {
              updateEmail(e.target.value as string);
            }}
            style={{ padding: "8px", margin: "5px 0", width: "calc(100% - 16px)" }} // 16px: 8px padding on each side
          />
        </div>
        {isWebAuthnRegistrationEnabled && (
          <div style={{ width: "100%", display: "flex", justifyContent: "center" }}>
            <LoaderButton
              isLoading={loading}
              text="Register Passkey"
              loadingText="Registering..."
              style={{ backgroundColor: "#0364ff", padding: "10px", margin: "5px 0", width: "calc(100% - 20px)" }}
              onClick={async () => {
                setLoading(true);
                try {
                  await triggerPassKeyRegistration();
                } catch (e) {
                  console.error(e);
                }
                setLoading(false);
              }}
            />
          </div>
        )}
        {isWebAuthnLoginEnabled && (
          <div style={{ width: "100%", display: "flex", justifyContent: "center" }}>
            <LoaderButton
              isLoading={loading}
              text="Login via Passkey"
              loadingText="Logging in..."
              style={{ backgroundColor: "#0364ff", padding: "10px", margin: "5px 0", width: "calc(100% - 20px)" }}
              onClick={async () => {
                setLoading(true);
                try {
                  await login();
                } catch (e) {
                  console.error(e);
                }
                setLoading(false);
              }}
            />
          </div>
        )}
      </div>
    );
  };

  const loggedInView = (
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
          <button onClick={logout} className="card">
            Log Out
          </button>
        </div>
      </div>
    </>
  );

  const unloggedInView = (
    <>
      <div>
        <div>
          <ConnectWeb3AuthButton />
        </div>
      </div>
    </>
  );

  return (
    <div className="container">
      <h1 className="title">
        <a target="_blank" href="https://web3auth.io/docs/sdk/core-kit/sfa-web" rel="noreferrer">
          Web3Auth Single Factor Auth
        </a>{" "}
        & Passkeys Example
      </h1>

      <div className="grid">{connected ? loggedInView : unloggedInView}</div>
      <div id="console" style={{ whiteSpace: "pre-line" }}>
        <p style={{ whiteSpace: "pre-line" }}></p>
      </div>

      <footer className="footer">
        <a
          href="https://github.com/Web3Auth/web3auth-core-kit-examples/tree/main/single-factor-auth-web/sfa-web-passkeys-example"
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
