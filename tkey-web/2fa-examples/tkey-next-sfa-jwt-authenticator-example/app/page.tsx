"use client";

import "./App.css";

import { CHAIN_NAMESPACES } from "@web3auth/base";
import { EthereumPrivateKeyProvider } from "@web3auth/ethereum-provider";
// Import Single Factor Auth SDK for no redirect flow
import { Web3Auth } from "@web3auth/single-factor-auth";
import { useEffect, useState } from "react";
import { CustomFactorsModuleType } from "./constants";
import swal from "sweetalert";
import { ethereumPrivateKeyProvider, tKey } from "./tkey";
import Web3 from "web3";
import { WebStorageModule } from "@tkey/web-storage";
import SfaServiceProvider from "@tkey/service-provider-sfa";

import AuthenticatorService from "./authenticatorService";

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

const privateKeyProvider = new EthereumPrivateKeyProvider({
  config: { chainConfig },
});

function App() {
  const [user, setUser] = useState<any>(null);
  const [privateKey, setPrivateKey] = useState<any>();
  const [oAuthShare, setOAuthShare] = useState<any>();
  const [provider, setProvider] = useState<any>();
  const [idToken, setIdToken] = useState<string | null>(null);

  // Init Service Provider inside the useEffect Method
  useEffect(() => {
    const init = async () => {
      // Initialization of Service Provider
      try {
        await (tKey.serviceProvider as any).init(ethereumPrivateKeyProvider);
      } catch (error) {
        console.error(error);
      }
    };
    init();
    const ethProvider = async () => {
      /*
			pass user's private key here.
			after calling setupProvider, we can use
			*/
      if (privateKey) {
        await ethereumPrivateKeyProvider.setupProvider(privateKey);
        console.log(ethereumPrivateKeyProvider.provider);
        setProvider(ethereumPrivateKeyProvider.provider);
      }
    };
    ethProvider();
  }, [privateKey]);

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
      if (!tKey) {
        uiConsole("tKey not initialized yet");
        return;
      }
      const idToken = await getIdToken();
      console.log(idToken);
      setIdToken(idToken);

      const { sub } = parseToken(idToken);
      setUser(sub);

      const OAuthShareKey = await (tKey.serviceProvider as SfaServiceProvider).connect({
        verifier,
        verifierId: sub,
        idToken,
      });

      uiConsole("OAuthShareKey", OAuthShareKey);
      setOAuthShare(OAuthShareKey);

      initializeNewKey();
    } catch (err) {
      // Single Factor Auth SDK throws an error if the user has already enabled MFA
      // One can use the Web3AuthNoModal SDK to handle this case
      console.error(err);
    }
  };

  const initializeNewKey = async () => {
    if (!tKey) {
      uiConsole("tKey not initialized yet");
      return;
    }
    try {
      // Initialization of tKey
      await tKey.initialize(); // 1/2 flow
      // Gets the deviceShare
      console.log(tKey);
      var { requiredShares } = tKey.getKeyDetails();

      uiConsole("requiredShares", requiredShares);
      const deviceShare = await getDeviceShare();

      if (requiredShares > 0) {
        if (deviceShare) {
          try {
            // 2/2 flow
            await (tKey.modules.webStorage as any).inputShareFromWebStorage();
          } catch (error) {
            uiConsole(error);
          }
        }
        var { requiredShares } = tKey.getKeyDetails();
        if (requiredShares > 0) {
          return;
        }
      }
      const reconstructedKey = await tKey.reconstructKey();
      setPrivateKey(reconstructedKey?.privKey.toString("hex"));
      uiConsole("Private Key: " + reconstructedKey.privKey.toString("hex"));
    } catch (error) {
      uiConsole(error, "caught");
    }
  };

  const getUserInfo = (): void => {
    uiConsole(user);
  };

  const getPrivateKey = (): void => {
    uiConsole(privateKey);
  };

  const getChainID = async () => {
    if (!provider) {
      console.log("provider not initialized yet");
      return;
    }
    const web3 = new Web3(provider);
    const chainId = await web3.eth.getChainId();
    uiConsole(chainId);
  };

  const changeSecurityQuestionAndAnswer = async () => {
    if (!tKey) {
      uiConsole("tKey not initialized yet");
      return;
    }
    // swal is just a pretty dialog box
    swal("Enter password (>10 characters)", {
      content: "input" as any,
    }).then(async (value) => {
      if (value.length > 10) {
        await (tKey.modules.securityQuestions as any).changeSecurityQuestionAndAnswer(value, "whats your password?");
        swal("Success", "Successfully changed new share with password.", "success");
        uiConsole("Successfully changed new share with password.");
      } else {
        swal("Error", "Password must be >= 11 characters", "error");
      }
    });
    const keyDetails = await tKey.getKeyDetails();
    uiConsole(keyDetails);
  };

  const generateNewShareWithPassword = async () => {
    if (!tKey) {
      uiConsole("tKey not initialized yet");
      return;
    }
    // swal is just a pretty dialog box
    swal("Enter password (>10 characters)", {
      content: "input" as any,
    }).then(async (value) => {
      if (value.length > 10) {
        try {
          await (tKey.modules.securityQuestions as any).generateNewShareWithSecurityQuestions(value, "whats your password?");
          swal("Success", "Successfully generated new share with password.", "success");
          uiConsole("Successfully generated new share with password.");
        } catch (error) {
          swal("Error", (error as any)?.message.toString(), "error");
        }
      } else {
        swal("Error", "Password must be >= 11 characters", "error");
      }
    });
  };

  const generateMnemonic = async () => {
    if (!tKey) {
      uiConsole("tKey not initialized yet");
      return;
    }
    try {
      const newShare = await tKey.generateNewShare();
      const mnemonic = await tKey.outputShare(newShare.newShareIndex, "mnemonic");
      uiConsole("Mnemonic: " + mnemonic);
    } catch (error) {
      uiConsole(error);
    }
  };

  const getDeviceShare = async () => {
    try {
      const share = await (tKey.modules.webStorage as WebStorageModule).getDeviceShare();

      if (share) {
        uiConsole("Device Share Captured Successfully across", JSON.stringify(share));
        return share;
      }
      uiConsole("Device Share Not found");
      return null;
    } catch (error) {
      uiConsole("Error", (error as any)?.message.toString(), "error");
    }
  };

  const backupShareRecover = async () => {
    if (!tKey) {
      uiConsole("tKey not initialized yet");
      return;
    }
    // swal is just a pretty dialog box
    swal("Enter mnemonic", {
      content: "input" as any,
    }).then(async (value) => {
      try {
        await tKey.inputShare(value, "mnemonic"); // 2/2 flow
        // const { requiredShares } = tKey.getKeyDetails();
        // if (requiredShares <= 0) {
        const reconstructedKey = await tKey.reconstructKey();
        console.log(reconstructedKey);
        uiConsole("Private Key: " + reconstructedKey.privKey.toString("hex"));
        setPrivateKey(reconstructedKey?.privKey.toString("hex"));
        // }
      } catch (error) {
        uiConsole(error);
      }
    });
  };

  const keyDetails = async () => {
    if (!tKey) {
      uiConsole("tKey not initialized yet");
      return;
    }
    const keyDetails = await tKey.getKeyDetails();
    uiConsole(keyDetails);
  };

  const resetAccount = async () => {
    if (!tKey) {
      uiConsole("tKey not initialized yet");
      return;
    }
    try {
      uiConsole(oAuthShare);
      await tKey.storageLayer.setMetadata({
        privKey: oAuthShare,
        input: { message: "KEY_NOT_FOUND" },
      });
      uiConsole("Reset Account Successful.");
    } catch (e) {
      uiConsole(e);
    }
  };

  const logout = (): void => {
    uiConsole("Log out");
    setUser(null);
  };

  const getAccounts = async (): Promise<string> => {
    if (!provider) {
      console.log("provider not initialized yet");
      return ``;
    }
    const web3 = new Web3(provider);
    const address = (await web3.eth.getAccounts())[0];
    uiConsole(address);
    return address;
  };

  const getBalance = async () => {
    if (!provider) {
      console.log("provider not initialized yet");
      return;
    }
    const web3 = new Web3(provider);
    const address = (await web3.eth.getAccounts())[0];
    const balance = web3.utils.fromWei(
      await web3.eth.getBalance(address),
      "ether" // Balance is in wei
    );
    uiConsole(balance);
  };

  const signMessage = async (): Promise<any> => {
    if (!provider) {
      console.log("provider not initialized yet");
      return;
    }
    const web3 = new Web3(provider);
    const fromAddress = (await web3.eth.getAccounts())[0];
    const originalMessage = [
      {
        type: "string",
        name: "fullName",
        value: "Satoshi Nakamoto",
      },
      {
        type: "uint32",
        name: "userId",
        value: "1212",
      },
    ];
    const params = [originalMessage, fromAddress];
    const method = "eth_signTypedData";
    const signedMessage = await (web3.currentProvider as any)?.sendAsync({
      id: 1,
      method,
      params,
      fromAddress,
    });
    uiConsole(signedMessage);
  };

  const sendTransaction = async () => {
    if (!provider) {
      console.log("provider not initialized yet");
      return;
    }
    const web3 = new Web3(provider);
    const fromAddress = (await web3.eth.getAccounts())[0];

    const destination = "0x7aFac68875d2841dc16F1730Fba43974060b907A";
    const amount = web3.utils.toWei("0.0001"); // Convert 1 ether to wei

    // Submit transaction to the blockchain and wait for it to be mined
    const receipt = await web3.eth.sendTransaction({
      from: fromAddress,
      to: destination,
      value: amount,
      maxPriorityFeePerGas: "5000000000", // Max priority fee per gas
      maxFeePerGas: "6000000000000", // Max fee per gas
    });
    uiConsole(receipt);
  };

  //authenticator logic

  const recoverViaAuthenticatorApp = async (): Promise<void> => {
    try {
      if (!tKey) {
        uiConsole("tKey not initialized yet");
        return;
      }

      const keyDetails = tKey.getKeyDetails();
      if (!keyDetails) {
        throw new Error("keyDetails is not set");
      }

      // check if we are setting up the sms recovery for the first time.
      // share descriptions contain the details of all the factors/ shares you set up for the user.
      const shareDescriptions = Object.values(keyDetails.shareDescriptions).map((i) => ((i || [])[0] ? JSON.parse(i[0]) : {}));
      // for authenticator, we have set up a custom share/ factor with module type as "authenticator" defined in CustomFactorsModuleType.AUTHENTICATOR in this example.
      const shareDescriptionsMobile = shareDescriptions.find((shareDescription) => shareDescription.module === CustomFactorsModuleType.AUTHENTICATOR);
      if (!shareDescriptionsMobile) {
        console.error("authenticator recovery not setup");
        uiConsole("authenticator recovery not setup");
      }

      console.log("authenticator recovery already setup", shareDescriptionsMobile);

      const { pubKey } = await tKey.getKeyDetails();
      const address = `${pubKey.x.toString(16, 64)}${pubKey.y.toString(16, 64)}`;

      const verificationCode = await swal("Enter your authenticator code, please enter the correct code first time :)", {
        content: "input" as any,
      }).then((value) => {
        return value;
      });

      if (!verificationCode) {
        console.error("Invalid verification code entered");
        uiConsole("Invalid verification code entered");
      }

      const newShare = await AuthenticatorService.verifyAuthenticatorRecovery(address, verificationCode);
      if (!newShare) {
        throw new Error("Invalid verification code entered");
      }
      await tKey.inputShare(newShare);
      const { requiredShares } = tKey.getKeyDetails();
      if (requiredShares <= 0) {
        const reconstructedKey = await tKey.reconstructKey();
        setPrivateKey(reconstructedKey?.privKey.toString("hex"));
        uiConsole("Private Key: " + reconstructedKey.privKey.toString("hex"));
      }
    } catch (error: unknown) {
      console.error(error);
      uiConsole((error as Error).message);
    }
  };

  const setupAuthenticatorRecovery = async (): Promise<void> => {
    try {
      if (!tKey) {
        uiConsole("tKey not initialized yet");
        return;
      }

      // get the tkey address
      const privKey = privateKey;

      // check if we are setting up the sms recovery for the first time.
      // share descriptions contain the details of all the factors/ shares you set up for the user.
      const shareDescriptions = Object.values(tKey.getKeyDetails().shareDescriptions).map((i) => ((i || [])[0] ? JSON.parse(i[0]) : {}));
      uiConsole(shareDescriptions);

      // for authenticator, we have set up a custom share/ factor with module type as "authenticator" defined in CustomFactorsModuleType.AUTHENTICATOR in this example.
      const shareDescriptionsMobile = shareDescriptions.find((shareDescription) => shareDescription.module === CustomFactorsModuleType.AUTHENTICATOR);
      if (shareDescriptionsMobile) {
        console.log("authenticator recovery already setup");
        uiConsole("authenticator recovery already setup");
        return;
      }

      const secretKey = AuthenticatorService.generateSecretKey();
      await AuthenticatorService.register(privKey, secretKey);
      uiConsole("please use this secret key to enter any authenticator app like google", secretKey);
      console.log("secret key", secretKey);

      const verificationCode = await swal(
        `Enter your authenticator code for this secret key: ${secretKey}, please enter the correct code first time :)`,
        {
          content: "input" as any,
        }
      ).then((value) => {
        return value;
      });

      if (!verificationCode) {
        console.error("Invalid verification code entered");
        uiConsole("Invalid verification code entered");
      }
      const { pubKey } = await tKey.getKeyDetails();
      const address = `${pubKey.x.toString(16, 64)}${pubKey.y.toString(16, 64)}`;

      //get share index and BN from newShare
      const newShare = await tKey.generateNewShare();
      const newShareIndex = newShare.newShareIndex.toString(16);
      const newShareBN = newShare.newShareStores[newShareIndex].share.share;
      await AuthenticatorService.addAuthenticatorRecovery(address, verificationCode, newShareBN);

      // setup the sms recovery share in tKey.
      // for sms otp, we have set up a custom share with module type as defined in CustomFactorsModuleType.AUTHENTICATOR in this example.
      // add ShareDescription to tKey
      await tKey.addShareDescription(
        newShareIndex,
        JSON.stringify({
          dateAdded: Date.now(),
          module: CustomFactorsModuleType.AUTHENTICATOR,
        }),
        true
      );
      uiConsole("authenticator recovery setup complete");
    } catch (error: unknown) {
      console.error(error);
      uiConsole((error as Error).message);
    }
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
          <button onClick={generateNewShareWithPassword} className="card">
            Generate Password Share
          </button>
        </div>
        <div>
          <button onClick={changeSecurityQuestionAndAnswer} className="card">
            Change Password Share
          </button>
        </div>
        <div>
          <button onClick={generateMnemonic} className="card">
            Generate Backup (Mnemonic)
          </button>
        </div>
        <div>
          <button onClick={backupShareRecover} className="card">
            Input Backup Share
          </button>
        </div>
        <div>
          <button onClick={keyDetails} className="card">
            Key Details
          </button>
        </div>
        <div>
          <button onClick={getPrivateKey} className="card">
            Private Key
          </button>
        </div>
        <div>
          <button onClick={getChainID} className="card">
            Get Chain ID
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
        <div>
          <button onClick={resetAccount} className="card">
            Reset Account (CAUTION)
          </button>
        </div>
      </div>

      <hr />
      <h4>Authenticator Logic</h4>

      <div className="flex-container">
        <button onClick={setupAuthenticatorRecovery} className="card">
          Setup Authenticator
        </button>
        <button onClick={recoverViaAuthenticatorApp} className="card">
          Recover using Authenticator
        </button>
      </div>

      <div id="console" style={{ whiteSpace: "pre-line" }}>
        <p style={{ whiteSpace: "pre-line" }}></p>
      </div>
    </>
  );

  const unloggedInView = (
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
        SFA Next JWT + authenticator Example
      </h1>

      <div className="grid">{user ? loggedInView : unloggedInView}</div>

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
