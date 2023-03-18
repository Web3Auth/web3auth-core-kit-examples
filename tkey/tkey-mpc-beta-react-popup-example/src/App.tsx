/* eslint-disable no-throw-literal */
/* eslint-disable react-hooks/exhaustive-deps */
/* eslint-disable require-atomic-updates */
/* eslint-disable @typescript-eslint/no-shadow */
import { getPubKeyPoint, Point } from "@tkey/common-types";
import BN from "bn.js";
import { generatePrivate } from "eccrypto";
import { useEffect, useState } from "react";
// import swal from "sweetalert";
import { encrypt, randomSelection } from '@toruslabs/rss-client';
import { tKey } from "./tkey";
import { addFactorKeyMetadata, getTSSPubKey, setupWeb3 } from "./utils";

import "./App.css";

const uiConsole = (...args: any[]): void => {
  const el = document.querySelector("#console>p");
  if (el) {
    el.innerHTML = JSON.stringify(args || {}, null, 2);
  }
  console.log(...args);
};

function App() {
  const [loginResponse, setLoginResponse] = useState<any>(null);
  const [user, setUser] = useState<any>(null);
  const [metadataKey, setMetadataKey] = useState<any>();
  const [localFactorKey, setLocalFactorKey] = useState<BN | null>(null);
  const [oAuthShare, setOAuthShare] = useState<any>(null);
  const [web3, setWeb3] = useState<any>(null);
  const [signingParams, setSigningParams] = useState<any>(null);

  // Init Service Provider inside the useEffect Method

  useEffect(() => {
    if (!localFactorKey) return;
    localStorage.setItem("tKeyLocalStore", localFactorKey.toString("hex"));
  }, [localFactorKey]);

  useEffect(() => {
    const init = async () => {
      // Initialization of Service Provider
      try {
        await (tKey.serviceProvider as any).init();
      } catch (error) {
        console.error(error);
      }
    };
    init();
  }, []);

  // sets up web3
  useEffect(() => {
    const localSetup = async () => {
      const chainConfig =  {
        chainId: "0x5",
        rpcTarget: "https://rpc.ankr.com/eth_goerli",
        displayName: "Goerli Testnet",
        blockExplorer: "https://goerli.etherscan.io",
        ticker: "ETH",
        tickerName: "Ethereum",
      }
      const web3Local = await setupWeb3(chainConfig, loginResponse, signingParams);
      setWeb3(web3Local);
    };
    if (signingParams) {
      localSetup();
    }
  }, [signingParams]);

  const triggerLogin = async () => {
    if (!tKey) {
      uiConsole("tKey not initialized yet");
      return;
    }
    try {
      // Triggering Login using Service Provider ==> opens the popup
      const loginResponse = await (tKey.serviceProvider as any).triggerLogin({
        typeOfLogin: 'jwt',
				verifier: 'mpc-key-demo-passwordless',
        clientId: 'QQRQNGxJ80AZ5odiIjt1qqfryPOeDcb1',
				jwtParams: {
					domain: "https://shahbaz-torus.us.auth0.com",
					verifierIdField: "name",
          connection: "google-oauth2"
				},
      });
      uiConsole("This is the login response:", loginResponse);
      setLoginResponse(loginResponse);
      setUser(loginResponse.userInfo);
      return loginResponse;
    } catch (error) {
      uiConsole(error);
    }
  };

  const initializeNewKey = async () => {
    if (!tKey) {
      uiConsole("tKey not initialized yet");
      return;
    }
    try {
      const loginResponse = await triggerLogin(); // Calls the triggerLogin() function above
      setOAuthShare(loginResponse.privateKey);

      const signatures = loginResponse.signatures.filter((sign: any) => sign !== null);

      const localFactorKey: string | null = localStorage.getItem("tKeyLocalStore");

      // Right not we're depending on if local storage exists to tell us if user is new or existing.
      let factorKey: BN;

      if (!localFactorKey) {
        factorKey = new BN(generatePrivate());
        const deviceTSSShare = new BN(generatePrivate());
        const deviceTSSIndex = 2;
        const factorPub = getPubKeyPoint(factorKey);
        await tKey.initialize({ useTSS: true, factorPub, deviceTSSShare, deviceTSSIndex });
      } else {
        factorKey = new BN(localFactorKey, "hex");
        const factorKeyMetadata = await tKey.storageLayer.getMetadata<{
          message: string;
        }>({
          privKey: factorKey,
        });
        if (factorKeyMetadata.message === "KEY_NOT_FOUND") {
          throw new Error("no metadata for your factor key, reset your account");
        }
        const metadataShare = JSON.parse(factorKeyMetadata.message);
        if (!metadataShare.deviceShare || !metadataShare.tssShare) throw new Error("Invalid data from metadata");
        const metadataDeviceShare = metadataShare.deviceShare;
        await tKey.initialize({ neverInitializeNewKey: true });
        await tKey.inputShareStoreSafe(metadataDeviceShare, true);
        await tKey.reconstructKey();
      }


      // Checks the requiredShares to reconstruct the tKey, starts from 2 by default and each of the above share reduce it by one.
      const { requiredShares } = tKey.getKeyDetails();
      if (requiredShares > 0) {
        throw `Threshold not met. Required Share: ${requiredShares}. You should reset your account.`;
      }
      // 2. Reconstruct the Metadata Key
      const metadataKey = await tKey.reconstructKey();
      setMetadataKey(metadataKey?.privKey.toString("hex"));

      const tssNonce: number = tKey.metadata.tssNonces![tKey.tssTag];
      // tssShare1 = TSS Share from the social login/ service provider
      const tssShare1PubKeyDetails = await tKey.serviceProvider.getTSSPubKey(tKey.tssTag, tssNonce);
      const tssShare1PubKey = { x: tssShare1PubKeyDetails.x.toString("hex"), y: tssShare1PubKeyDetails.y.toString("hex") };

      // tssShare2 = TSS Share from the local storage of the device
      const { tssShare: tssShare2, tssIndex: tssShare2Index } = await tKey.getTSSShare(factorKey);
      
      // 4. derive tss pub key, tss pubkey is implicitly formed using the dkgPubKey and the userShare (as well as userTSSIndex)
      const tssPubKey = getTSSPubKey(tssShare1PubKey, tssShare2, tssShare2Index);
      const compressedTSSPubKey = Buffer.from(`${tssPubKey.getX().toString(16, 64)}${tssPubKey.getY().toString(16, 64)}`, "hex");

      // 5. save factor key and other metadata
      await addFactorKeyMetadata(tKey, factorKey, tssShare2, tssShare2Index, "local storage key");
      await tKey.syncLocalMetadataTransitions();
      setLocalFactorKey(factorKey);

      setSigningParams({
        tssNonce,
        tssShare2,
        tssShare2Index,
        compressedTSSPubKey,
        signatures
      })

      uiConsole(
        "Successfully logged in & initialised MPC TKey SDK",
        "TSS Public Key: ",
        tssPubKey,
        "Metadata Key",
        metadataKey.privKey.toString("hex")
      );
    } catch (error) {
      uiConsole(error, "caught");
    }
  };

  const copyTSSShareIntoManualBackupFactorkey = async() => {
    if (!tKey) {
      throw new Error("tkey does not exist, cannot add factor pub");
    }
    if (!localFactorKey) {
      throw new Error("localFactorKey does not exist, cannot add factor pub");
    }

    const backupFactorKey = new BN(generatePrivate());
    const backupFactorPub = getPubKeyPoint(backupFactorKey);

    await copyExistingTSSShareForNewFactor(backupFactorPub, 2);


  }
  

  const addNewTSSShareAndFactor = async (newFactorPub: Point, newFactorTSSIndex: number) => {
    if (!tKey) {
      throw new Error("tkey does not exist, cannot add factor pub");
    }
    if (!localFactorKey) {
      throw new Error("localFactorKey does not exist, cannot add factor pub");
    }
    if (newFactorTSSIndex !== 2 && newFactorTSSIndex !== 3) {
      throw new Error("tssIndex must be 2 or 3");
    }
    if (!tKey.metadata.factorPubs || !Array.isArray(tKey.metadata.factorPubs[tKey.tssTag])) {
      throw new Error("factorPubs does not exist");
    }

    const factorKey = new BN(localFactorKey, "hex");

    const existingFactorPubs = tKey.metadata.factorPubs[tKey.tssTag].slice();
    const updatedFactorPubs = existingFactorPubs.concat([newFactorPub]);
    const existingTSSIndexes = existingFactorPubs.map((fb) => tKey.getFactorEncs(fb).tssIndex);
    const updatedTSSIndexes = existingTSSIndexes.concat([newFactorTSSIndex]);
    const { tssShare, tssIndex } = await tKey.getTSSShare(factorKey);

    tKey.metadata.addTSSData({
      tssTag: tKey.tssTag,
      factorPubs: updatedFactorPubs,
    });

    const rssNodeDetails = await tKey._getRssNodeDetails();
    const { serverEndpoints, serverPubKeys, serverThreshold } = rssNodeDetails;
    const randomSelectedServers = randomSelection(
      new Array(rssNodeDetails.serverEndpoints.length).fill(null).map((_, i) => i + 1),
      Math.ceil(rssNodeDetails.serverEndpoints.length / 2)
    );

    const verifierNameVerifierId = tKey.serviceProvider.getVerifierNameVerifierId();
    await tKey._refreshTSSShares(true, tssShare, tssIndex, updatedFactorPubs, updatedTSSIndexes, verifierNameVerifierId, {
      selectedServers: randomSelectedServers,
      serverEndpoints,
      serverPubKeys,
      serverThreshold,
      authSignatures: signingParams.signatures,
    });
  };

  const copyExistingTSSShareForNewFactor = async (newFactorPub: Point , newFactorTSSIndex: number) => {
    if (!tKey) {
      throw new Error("tkey does not exist, cannot copy factor pub");
    }
    if (!localFactorKey) {
      throw new Error("localFactorKey does not exist, cannot add factor pub");
    }
    if (newFactorTSSIndex !== 2 && newFactorTSSIndex !== 3) {
      throw new Error("input factor tssIndex must be 2 or 3");
    }
    if (!tKey.metadata.factorPubs || !Array.isArray(tKey.metadata.factorPubs[tKey.tssTag])) {
      throw new Error("factorPubs does not exist, failed in copy factor pub");
    }
    if (!tKey.metadata.factorEncs || typeof tKey.metadata.factorEncs[tKey.tssTag] !== "object") {
      throw new Error("factorEncs does not exist, failed in copy factor pub");
    }
    const factorKey = new BN(localFactorKey, "hex");
    const existingFactorPubs = tKey.metadata.factorPubs[tKey.tssTag].slice();
    const updatedFactorPubs = existingFactorPubs.concat([newFactorPub]);
    const { tssShare, tssIndex } = await tKey.getTSSShare(factorKey);
    if (tssIndex !== newFactorTSSIndex) {
      throw new Error("retrieved tssIndex does not match input factor tssIndex");
    }
    const factorEncs = JSON.parse(JSON.stringify(tKey.metadata.factorEncs[tKey.tssTag]));
    const factorPubID = newFactorPub.x.toString(16, 64);
    factorEncs[factorPubID] = {
      tssIndex: newFactorTSSIndex,
      type: "direct",
      userEnc: await encrypt(
        Buffer.concat([
          Buffer.from("04", "hex"),
          Buffer.from(newFactorPub.x.toString(16, 64), "hex"),
          Buffer.from(newFactorPub.y.toString(16, 64), "hex"),
        ]),
        Buffer.from(tssShare.toString(16, 64), "hex")
      ),
      serverEncs: [],
    };
    tKey.metadata.addTSSData({
      tssTag: tKey.tssTag,
      factorPubs: updatedFactorPubs,
      factorEncs,
    });
  };

  const keyDetails = async () => {
    if (!tKey) {
      uiConsole("tKey not initialized yet");
      return;
    }
    const keyDetails = await tKey.getKeyDetails();
    uiConsole(keyDetails);
    return keyDetails;
  };

  const logout = (): void => {
    uiConsole("Log out");
    setUser(null);
    setLoginResponse(null);
  };

  const getUserInfo = (): void => {
    uiConsole(user);
    return user;
  };

  const getLoginResponse = (): void => {
    uiConsole(loginResponse);
    return loginResponse;
  };

  const getMetadataKey = (): void => {
    uiConsole(metadataKey);
    return metadataKey;
  };

  const resetAccount = async () => {
    try {
      localStorage.removeItem("tKeyLocalStore");
      await tKey.storageLayer.setMetadata({
        privKey: oAuthShare,
        input: { message: "KEY_NOT_FOUND" },
      });
      uiConsole("Reset Account Successful.");
    } catch (e) {
      uiConsole(e);
    }
  };

  const getChainID = async () => {
    if (!web3) {
      console.log("web3 not initialized yet");
      return;
    }
    const chainId = await web3.eth.getChainId();
    uiConsole(chainId);
    return chainId;
  };

  const getAccounts = async () => {
    if (!web3) {
      console.log("web3 not initialized yet");
      return;
    }
    const address = (await web3.eth.getAccounts())[0];
    uiConsole(address);
    return address;
  };

  const getBalance = async () => {
    if (!web3) {
      console.log("web3 not initialized yet");
      return;
    }
    const address = (await web3.eth.getAccounts())[0];
    const balance = web3.utils.fromWei(
      await web3.eth.getBalance(address) // Balance is in wei
    );
    uiConsole(balance);
    return balance;
  };

  const signMessage = async (): Promise<any> => {
    if (!web3) {
      console.log("web3 not initialized yet");
      return;
    }
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
    if (!web3) {
      console.log("web3 not initialized yet");
      return;
    }
    const fromAddress = (await web3.eth.getAccounts())[0];

    const destination = "0x2E464670992574A613f10F7682D5057fB507Cc21";
    const amount = web3.utils.toWei("0.0001"); // Convert 1 ether to wei

    // Submit transaction to the blockchain and wait for it to be mined
    uiConsole("Sending transaction...");
    const receipt = await web3.eth.sendTransaction({
      from: fromAddress,
      to: destination,
      value: amount,
    });
    uiConsole(receipt);
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
          <button onClick={getLoginResponse} className="card">
            See Login Response
          </button>
        </div>
        {/* <div>
          <button onClick={copyExistingTSSShareForNewFactor} className="card">
            Copy Existing TSS Share For New Factor
          </button>
        </div>
        <div>
          <button onClick={addNewTSSShareAndFactor} className="card">
            Add new TSS Share and Factor
          </button>
        </div> */}
        <div>
          <button onClick={keyDetails} className="card">
            Key Details
          </button>
        </div>
        <div>
          <button onClick={getMetadataKey} className="card">
            Metadata Key
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
            <button onClick={resetAccount} className='card'>
                Reset Account (CAUTION)
            </button>
        </div>
      </div>

      <div id="console" style={{ whiteSpace: "pre-line" }}>
        <p style={{ whiteSpace: "pre-line" }}></p>
      </div>
    </>
  );

  const unloggedInView = (
    <div>
      <button onClick={initializeNewKey} className="card">
        Login
      </button>
    </div>
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
        <a href="https://github.com/Web3Auth/web3auth-core-kit-examples/tree/main/tkey/tkey-mpc-beta-react-popup-example" target="_blank" rel="noopener noreferrer">
          Source code
        </a>
      </footer>
    </div>
  );
}

export default App;
