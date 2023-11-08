/* eslint-disable react-hooks/exhaustive-deps */
import React, { useEffect, useState } from "react";
import "./App.css";
import { CustomFactorsModuleType } from "./constants";
import swal from "sweetalert";
import { ethereumPrivateKeyProvider, tKey } from "./tkey";
import Web3 from "web3";
import SfaServiceProvider from "@tkey/service-provider-sfa";
import { WebStorageModule } from "@tkey/web-storage";
import SmsPasswordless from "./smsService";

// Firebase libraries for custom authentication
import { initializeApp } from "firebase/app";
import { GoogleAuthProvider, getAuth, signInWithPopup, UserCredential } from "firebase/auth";

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyB0nd9YsPLu-tpdCrsXn8wgsWVAiYEpQ_E",
  authDomain: "web3auth-oauth-logins.firebaseapp.com",
  projectId: "web3auth-oauth-logins",
  storageBucket: "web3auth-oauth-logins.appspot.com",
  messagingSenderId: "461819774167",
  appId: "1:461819774167:web:e74addfb6cc88f3b5b9c92",
};

function App() {
  const [user, setUser] = useState<any>(null);
  const [privateKey, setPrivateKey] = useState<any>();
  const [oAuthShare, setOAuthShare] = useState<any>();
  const [provider, setProvider] = useState<any>();
  const [idToken, setIdToken] = useState<string | null>(null);
  const [number, setNumber] = useState<string>("");
  const app = initializeApp(firebaseConfig);

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

  const signInWithGoogle = async (): Promise<UserCredential> => {
    try {
      const auth = getAuth(app);
      const googleProvider = new GoogleAuthProvider();
      const res = await signInWithPopup(auth, googleProvider);
      console.log(res);
      return res;
    } catch (err) {
      console.error(err);
      throw err;
    }
  };

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
    if (!tKey) {
      uiConsole("tKey not initialized yet");
      return;
    }
    try {
      const loginRes = await signInWithGoogle();
      // get the id token from firebase
      const idToken = await loginRes.user.getIdToken(true);
      setIdToken(idToken);
      console.log(idToken);

      // get sub value from firebase id token
      const { sub } = parseToken(idToken);
      setUser(sub);

      const verifier = "web3auth-firebase-examples";

      const OAuthShareKey = await (tKey.serviceProvider as SfaServiceProvider).connect({
        verifier,
        verifierId: sub,
        idToken,
      });

      uiConsole("OAuthShareKey", OAuthShareKey);
      setOAuthShare(OAuthShareKey);

      // uiConsole('Public Key : ' + loginResponse.publicAddress);
      // uiConsole('Email : ' + loginResponse.userInfo.email);

      initializeNewKey();
    } catch (error) {
      console.log(error);
      uiConsole(error);
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

  // const deleteDeviceShare = async () => {
  // 	try {
  // 	  const metadata = await tKey.getMetadata();
  // 	  await EncryptedStorage.removeItem(metadata.pubKey.x.toString('hex'));
  // 	  uiConsole('Device Share Deleted');
  // 	} catch (error) {
  // 	  uiConsole('Error', (error as any)?.message.toString(), 'error');
  // 	}
  // };

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

  const recoverShare = async () => {
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
          await (tKey.modules.securityQuestions as any).inputShareFromSecurityQuestions(value); // 2/2 flow
          const { requiredShares } = tKey.getKeyDetails();
          if (requiredShares <= 0) {
            const reconstructedKey = await tKey.reconstructKey();
            setPrivateKey(reconstructedKey?.privKey.toString("hex"));
            uiConsole("Private Key: " + reconstructedKey.privKey.toString("hex"));
          }
          const newShare = await tKey.generateNewShare();
          const shareStore = await tKey.outputShareStore(newShare.newShareIndex);
          await (tKey.modules.webStorage as any).storeDeviceShare(shareStore);
          swal("Success", "Successfully logged you in with the recovery password.", "success");
          uiConsole("Successfully logged you in with the recovery password.");
        } catch (error) {
          swal("Error", (error as any)?.message.toString(), "error");
          uiConsole(error);
          logout();
        }
      } else {
        swal("Error", "Password must be >= 11 characters", "error");
        uiConsole("Looks like you entered an invalid password. Please try again via logging in or reset your account.");
      }
    });
  };

  const recoverViaNumber = async (): Promise<void> => {
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
      console.log("shareDescriptions", shareDescriptions);
      // for sms otp, we have set up a custom share/ factor with module type as "mobile_sms" defined in CustomFactorsModuleType.MOBILE_SMS in this example.
      const shareDescriptionsMobile = shareDescriptions.find((shareDescription) => shareDescription.module === CustomFactorsModuleType.MOBILE_SMS);
      if (!shareDescriptionsMobile) {
        console.error("sms recovery not setup");
        uiConsole("sms recovery not setup");
      }

      console.log("sms recovery already setup", shareDescriptionsMobile);

      const { number } = shareDescriptionsMobile;
      const { pubKey } = await tKey.getKeyDetails();
      const address = `${pubKey.x.toString(16, 64)}${pubKey.y.toString(16, 64)}`;
      const result = await SmsPasswordless.requestSMSOTP(address);
      uiConsole("please use this code to verify your phone number", number, "code", result);
      console.log("otp code", result);

      const verificationCode = await swal("Enter your backup share, please enter the correct code first time :)", {
        content: "input" as any,
      }).then((value) => {
        return value;
      });

      if (!verificationCode || verificationCode.length !== 6) {
        console.error("Invalid verification code entered");
        uiConsole("Invalid verification code entered");
      }

      const newShare = await SmsPasswordless.verifySMSOTPRecovery(address, verificationCode);
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

  const setupSmsRecovery = async (): Promise<void> => {
    try {
      if (!tKey) {
        uiConsole("tKey not initialized yet");
        return;
      }

      const privKey = privateKey;
      // check if we are setting up the sms recovery for the first time.
      // share descriptions contain the details of all the factors/ shares you set up for the user.
      const shareDescriptions = Object.values(tKey.getKeyDetails().shareDescriptions).map((i) => ((i || [])[0] ? JSON.parse(i[0]) : {}));
      // for sms otp, we have set up a custom share/ factor with module type as "mobile_sms" defined in CustomFactorsModuleType.MOBILE_SMS in this example.
      const shareDescriptionsMobile = shareDescriptions.find((shareDescription) => shareDescription.module === CustomFactorsModuleType.MOBILE_SMS);
      if (shareDescriptionsMobile) {
        console.log("shareDescriptions", shareDescriptions);
        console.log("sms recovery already setup");
        uiConsole("sms recovery already setup");
        return;
      }

      const result = await SmsPasswordless.registerSmsOTP(privKey, number);
      uiConsole("please use this code to verify your phone number", result);
      console.log("otp code", result);

      const verificationCode = await swal("Enter your backup share, please enter the correct code first time :)", {
        content: "input" as any,
      }).then((value) => {
        return value;
      });

      if (!verificationCode || verificationCode.length !== 6) {
        console.error("Invalid verification code entered");
        uiConsole("Invalid verification code entered");
      }

      const { pubKey } = await tKey.getKeyDetails();
      const address = `${pubKey.x.toString(16, 64)}${pubKey.y.toString(16, 64)}`;

      //get share index and BN from newShare
      const newShare = await tKey.generateNewShare();
      const newShareIndex = newShare.newShareIndex.toString(16);
      const newShareBN = newShare.newShareStores[newShareIndex].share.share;

      //   const newShareIndex = newShare.newShareIndex;
      await SmsPasswordless.addSmsRecovery(address, verificationCode, newShareBN);

      // setup the sms recovery share in tKey.
      // for sms otp, we have set up a custom share with module type as defined in CustomFactorsModuleType.MOBILE_SMS in this example.
      // add ShareDescription to tKey
      await tKey.addShareDescription(
        newShareIndex,
        JSON.stringify({
          dateAdded: Date.now(),
          module: CustomFactorsModuleType.MOBILE_SMS,
        }),
        true
      );
      uiConsole("sms recovery setup complete");
    } catch (error: unknown) {
      console.error(error);
      uiConsole((error as Error).message);
    }
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

  const getIdToken = (): void => {
    uiConsole(idToken);
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
      await web3.eth.getBalance(address) // Balance is in wei
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

  const uiConsole = (...args: any[]): void => {
    const el = document.querySelector("#console>p");
    if (el) {
      el.innerHTML = JSON.stringify(args || {}, null, 2);
    }
    console.log(...args);
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
      <h4>sms otp logic</h4>

      <div>
        <button onClick={recoverViaNumber} className="card">
          Recover using phone number
        </button>
        <div className="flex-container">
          <input placeholder={"Enter number +{cc}-{number}"} value={number} onChange={(e) => setNumber(e.target.value)}></input>
          <button onClick={setupSmsRecovery} className="card">
            Setup SMS Recovery
          </button>
        </div>
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
          Web3Auth (tKey)
        </a>
        & ReactJS Ethereum Example
      </h1>

      <div className="grid">{user ? loggedInView : unloggedInView}</div>

      <footer className="footer">
        <a
          href="https://github.com/Web3Auth/web3auth-core-kit-examples/tree/main/tkey/tkey-react-redirect-example"
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
