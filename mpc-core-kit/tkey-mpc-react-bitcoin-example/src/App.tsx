import "./App.css";

import TorusUtils from "@toruslabs/torus.js";
import { getPubKeyPoint } from "@tkey-mpc/common-types";
import BN from "bn.js";
import { generatePrivate } from "eccrypto";
import { useEffect, useState } from "react";
import swal from "sweetalert";
import { tKey } from "./tkey";
import { addFactorKeyMetadata, setupWeb3, copyExistingTSSShareForNewFactor, addNewTSSShareAndFactor, getEcCrypto } from "./utils";
import { utils } from "@toruslabs/tss-client";
import { OpenloginSessionManager } from "@toruslabs/openlogin-session-manager";
import { networks, Psbt } from "bitcoinjs-lib";
import ecc from "@bitcoinerlab/secp256k1";
import ECPairFactory from "ecpair";
import { testnet } from "bitcoinjs-lib/src/networks";
import { p2pkh } from "bitcoinjs-lib/src/payments";
import { TorusServiceProvider } from "@tkey-mpc/service-provider-torus";
import { ShareSerializationModule } from "@tkey-mpc/share-serialization";
import {TorusLoginResponse} from "@toruslabs/customauth";
import { SignerAsync } from "bitcoinjs-lib";

const { getTSSPubKey } = utils;
const ECPair = ECPairFactory(ecc);

const uiConsole = (...args: any[]): void => {
  const el = document.querySelector("#console>p");
  if (el) {
    el.innerHTML = JSON.stringify(args || {}, null, 2);
  }
  console.log(...args);
};

const BTCValidator = (pubkey: Buffer, msghash: Buffer, signature: Buffer): boolean => ECPair.fromPublicKey(pubkey).verify(msghash, signature);


function App() {
  const [loginResponse, setLoginResponse] = useState<any | null>(null);
  const [user, setUser] = useState<any>(null);
  const [metadataKey, setMetadataKey] = useState<string>();
  const [localFactorKey, setLocalFactorKey] = useState<BN | null>(null);
  const [oAuthShare, setOAuthShare] = useState<BN | null>(null);
  const [web3, setWeb3] = useState<SignerAsync | null>(null);
  const [signingParams, setSigningParams] = useState<any>(null);
  const [bitcoinUTXID, setBitcoinUTXID] = useState<string | null>(null);
  const [fundingTxIndex, setFundingTxIndex] = useState<string | null>(null);
  const [sessionManager, setSessionManager] = useState<OpenloginSessionManager<typeof signingParams>>(new OpenloginSessionManager({}));

  // Init Service Provider inside the useEffect Method

  useEffect(() => {
    if (!localFactorKey) return;
    localStorage.setItem(
      `tKeyLocalStore\u001c${loginResponse!.userInfo.verifier}\u001c${loginResponse!.userInfo.verifierId}`,
      JSON.stringify({
        factorKey: localFactorKey.toString("hex"),
        verifier: loginResponse!.userInfo.verifier,
        verifierId: loginResponse!.userInfo.verifierId,
      })
    );
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [localFactorKey]);

  useEffect(() => {
    const init = async () => {
      // Initialization of Service Provider
      try {
        await (tKey.serviceProvider as any).init();
        const sessionId = localStorage.getItem("sessionId");
        const sessionManager = new OpenloginSessionManager({
          sessionTime: 86400,
          sessionId: sessionId!,
        });
        setSessionManager(sessionManager);
        if (sessionId) {
          const signingParams: any = await sessionManager!.authorizeSession();
          uiConsole("signingParams", signingParams);

          const factorKeyMetadata = await tKey.storageLayer.getMetadata<{
            message: string;
          }>({
            privKey: signingParams.factorKey,
          });
          const metadataShare = JSON.parse(factorKeyMetadata.message);

          if (!metadataShare.deviceShare || !metadataShare.tssShare) throw new Error("Invalid data from metadata");
          uiConsole("Metadata Share:", metadataShare.deviceShare, "Index:", metadataShare.tssIndex);
          const metadataDeviceShare = metadataShare.deviceShare;

          tKey.serviceProvider.postboxKey = new BN(signingParams.oAuthShare, "hex");
          (tKey.serviceProvider as TorusServiceProvider).verifierName = signingParams.userInfo.verifier;
          (tKey.serviceProvider as TorusServiceProvider).verifierId = signingParams.userInfo.verifierId;

          await tKey.initialize({ neverInitializeNewKey: true });
          await tKey.inputShareStoreSafe(metadataDeviceShare, true);
          const metadataKey = await tKey.reconstructKey();
          setMetadataKey(metadataKey?.privKey.toString("hex"));
          setOAuthShare(signingParams.oAuthShare);
          setLocalFactorKey(signingParams.factorKey);
          setUser(signingParams.userInfo);
          const loginResponse = {
            userInfo: signingParams.userInfo,
            signatures: signingParams.signatures,
            privateKey: signingParams.oAuthShare,
          };
          setLoginResponse(loginResponse);
          signingParams["compressedTSSPubKey"] = Buffer.from(signingParams.compressedTSSPubKey.padStart(64, "0"), "hex");
          setSigningParams(signingParams);

          uiConsole(
            "Successfully logged in & initialised MPC TKey SDK",
            "TSS Public Key: ",
            tKey.getTSSPub(),
            "Metadata Key",
            metadataKey.privKey.toString("hex"),
            "With Factors/Shares:",
            tKey.getMetadata().getShareDescription()
          );
        }
      } catch (error) {
        uiConsole(error);
      }
    };
    init();
  }, []);

  // sets up web3
  useEffect(() => {
    const localSetup = async () => {
      const web3Local = await setupWeb3(loginResponse, signingParams);
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
      const loginResponse: TorusLoginResponse = await (tKey.serviceProvider as TorusServiceProvider).triggerLogin({
        typeOfLogin: "google",
        verifier: "google-tkey-w3a",
        clientId: "774338308167-q463s7kpvja16l4l0kko3nb925ikds2p.apps.googleusercontent.com",
      });
      setLoginResponse(loginResponse);
      setUser(loginResponse.userInfo);
      return loginResponse;
    } catch (error) {
      uiConsole(error);
    }
  };

  useEffect(() => {
    setBitcoinUTXID("Enter UTXID here")
    setFundingTxIndex("FundingTxIndex (often 0)")
  }, []);

  const initializeNewKey = async () => {
    if (!tKey) {
      uiConsole("tKey not initialized yet");
      return;
    }
    try {
      const loginResponse = await triggerLogin(); // Calls the triggerLogin() function above
      
      const OAuthShare = new BN(TorusUtils.getPostboxKey(loginResponse!), "hex");
      setOAuthShare(OAuthShare);
      //@ts-ignore
      const signatures = loginResponse.sessionData.sessionTokenData.filter(i => Boolean(i)).map((session) => JSON.stringify({ data: session.token, sig: session.signature }));

      const tKeyLocalStoreString = localStorage.getItem(
        `tKeyLocalStore\u001c${loginResponse!.userInfo.verifier}\u001c${loginResponse!.userInfo.verifierId}`
      );
      const tKeyLocalStore = JSON.parse(tKeyLocalStoreString || "{}");

      let factorKey: BN | null = null;

      const existingUser = await isMetadataPresent(OAuthShare);

      if (!existingUser) {
        factorKey = new BN(generatePrivate());
        const deviceTSSShare = new BN(generatePrivate());
        const deviceTSSIndex = 2;
        const factorPub = getPubKeyPoint(factorKey);
        await tKey.initialize({
          useTSS: true,
          factorPub,
          deviceTSSShare,
          deviceTSSIndex,
        });
      } else {
        if (tKeyLocalStore.verifier === loginResponse!.userInfo.verifier && tKeyLocalStore.verifierId === loginResponse!.userInfo.verifierId) {
          factorKey = new BN(tKeyLocalStore.factorKey, "hex");
        } else {
          try {
            factorKey = await swal("Enter your backup share", {
              content: "input" as any,
            }).then(async (value) => {
              uiConsole(value);
              return await (tKey.modules.shareSerialization as ShareSerializationModule).deserialize(value, "mnemonic");
            });
          } catch (error) {
            uiConsole(error);
            throw new Error("Invalid backup share");
          }
        }
        if (factorKey === null) throw new Error("Backup share not found");
        //@ts-ignore
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
        uiConsole("Metadata Share:", metadataShare.deviceShare, "Index:", metadataShare.tssIndex);
        const metadataDeviceShare = metadataShare.deviceShare;
        await tKey.initialize({ neverInitializeNewKey: true });
        await tKey.inputShareStoreSafe(metadataDeviceShare, true);
        await tKey.reconstructKey();
      }

      // Checks the requiredShares to reconstruct the tKey, starts from 2 by default and each of the above share reduce it by one.
      const { requiredShares } = tKey.getKeyDetails();
      if (requiredShares > 0) {
        throw new Error(`Threshold not met. Required Share: ${requiredShares}. You should reset your account.`);
      }
      // 2. Reconstruct the Metadata Key
      const metadataKey = await tKey.reconstructKey();
      setMetadataKey(metadataKey?.privKey.toString("hex"));

      const tssNonce: number = tKey.metadata.tssNonces![tKey.tssTag];
      // tssShare1 = TSS Share from the social login/ service provider
      const tssShare1PubKeyDetails = await tKey.serviceProvider.getTSSPubKey(tKey.tssTag, tssNonce);

      const tssShare1PubKey = {
        x: tssShare1PubKeyDetails.pubKey.x.toString("hex"),
        y: tssShare1PubKeyDetails.pubKey.y.toString("hex"),
      };

      // tssShare2 = TSS Share from the local storage of the device
      const { tssShare: tssShare2, tssIndex: tssShare2Index } = await tKey.getTSSShare(factorKey);

      const ec = getEcCrypto();
      const tssShare2ECPK = ec.curve.g.mul(tssShare2);
      const tssShare2PubKey = {
        x: tssShare2ECPK.getX().toString("hex"),
        y: tssShare2ECPK.getY().toString("hex"),
      };

      // 4. derive tss pub key, tss pubkey is implicitly formed using the dkgPubKey and the userShare (as well as userTSSIndex)
      const tssPubKey = getTSSPubKey(tssShare1PubKey, tssShare2PubKey, tssShare2Index);
      // console.log("tssPub", tssPubKey);

      const compressedTSSPubKey = Buffer.from(`${tssPubKey.getX().toString(16, 64)}${tssPubKey.getY().toString(16, 64)}`, "hex");
      const prefixedCompressedTSSPubKey = Buffer.from(`04${compressedTSSPubKey.toString("hex")}`, "hex");
      const ECPubKey = ECPair.fromPublicKey(prefixedCompressedTSSPubKey, { network: testnet });
      const { address: btcAddress } = p2pkh({ pubkey: ECPubKey.publicKey, network: testnet });

      // 5. save factor key and other metadata
      if (
        !existingUser ||
        !(tKeyLocalStore.verifier === loginResponse!.userInfo.verifier && tKeyLocalStore.verifierId === loginResponse!.userInfo.verifierId)
      ) {
        await addFactorKeyMetadata(tKey, factorKey, tssShare2, tssShare2Index, "local storage share");
      }
      await tKey.syncLocalMetadataTransitions();

      setLocalFactorKey(factorKey);

      const nodeDetails = await tKey.serviceProvider.getTSSNodeDetails()

      const signingParams = {
        oAuthShare: OAuthShare,
        factorKey,
        btcAddress,
        ecPublicKey: ECPubKey.publicKey,
        tssNonce,
        tssShare2,
        tssShare2Index,
        compressedTSSPubKey,
        signatures,
        userInfo: loginResponse!.userInfo,
        nodeDetails,
      };

      setSigningParams(signingParams);

      uiConsole("signingParams", signingParams);

      uiConsole(
        "Successfully logged in & initialised MPC TKey SDK",
        "TSS Public Key: ",
        tKey.getTSSPub(),
        "BTC Address:",
        btcAddress,
        "Metadata Key",
        metadataKey.privKey.toString("hex"),
        "With Factors/Shares:",
        tKey.getMetadata().getShareDescription()
      );

      createSession(signingParams);
    } catch (error) {
      uiConsole(error, "caught");
    }
  };

  async function createSession(signingParams: any) {
    try {
      const sessionId = OpenloginSessionManager.generateRandomSessionKey();
      sessionManager!.sessionKey = sessionId!;
      if (!signingParams) {
        throw new Error("User not logged in");
      }
      signingParams["compressedTSSPubKey"] = Buffer.from(signingParams.compressedTSSPubKey).toString("hex");
      await sessionManager!.createSession(signingParams);
      localStorage.setItem("sessionId", sessionId);
      uiConsole("Successfully created session");
    } catch (err) {
      uiConsole("error creating session", err);
    }
  }

  const isMetadataPresent = async (privateKeyBN: BN) => {
    const metadata = await tKey.storageLayer.getMetadata({
      privKey: privateKeyBN,
    });
    if (metadata && Object.keys(metadata).length > 0 && (metadata as any).message !== "KEY_NOT_FOUND") {
      return true;
    } else {
      return false;
    }
  };

  const copyTSSShareIntoManualBackupFactorkey = async () => {
    try {
      if (!tKey) {
        throw new Error("tkey does not exist, cannot add factor pub");
      }
      if (!localFactorKey) {
        throw new Error("localFactorKey does not exist, cannot add factor pub");
      }

      const backupFactorKey = new BN(generatePrivate());
      const backupFactorPub = getPubKeyPoint(backupFactorKey);

      await copyExistingTSSShareForNewFactor(tKey, backupFactorPub, localFactorKey);

      const { tssShare: tssShare2, tssIndex: tssIndex2 } = await tKey.getTSSShare(localFactorKey);
      await addFactorKeyMetadata(tKey, backupFactorKey, tssShare2, tssIndex2, "manual share");
      const serializedShare = await (tKey.modules.shareSerialization as ShareSerializationModule).serialize(backupFactorKey, "mnemonic");
      await tKey.syncLocalMetadataTransitions();
      uiConsole("Successfully created manual backup. Manual Backup Factor: ", serializedShare);
    } catch (err) {
      uiConsole(`Failed to copy share to new manual factor: ${err}`);
    }
  };

  const createNewTSSShareIntoManualBackupFactorkey = async () => {
    try {
      if (!tKey) {
        throw new Error("tkey does not exist, cannot add factor pub");
      }
      if (!localFactorKey) {
        throw new Error("localFactorKey does not exist, cannot add factor pub");
      }

      const backupFactorKey = new BN(generatePrivate());
      const backupFactorPub = getPubKeyPoint(backupFactorKey);
      const tKeyShareDescriptions = await tKey.getMetadata().getShareDescription();
      let backupFactorIndex = 2;
      for (const [key, value] of Object.entries(tKeyShareDescriptions)) {
        // eslint-disable-next-line no-loop-func, array-callback-return
        //@ts-ignore
        value.map((factor: any) => {
          factor = JSON.parse(factor);
          if (factor.tssShareIndex > backupFactorIndex) {
            backupFactorIndex = factor.tssShareIndex;
          }
        });
      }
      uiConsole("backupFactorIndex:", backupFactorIndex + 1);
      await addNewTSSShareAndFactor(tKey, backupFactorPub, backupFactorIndex + 1, localFactorKey, signingParams.signatures);

      const { tssShare: tssShare2, tssIndex: tssIndex2 } = await tKey.getTSSShare(backupFactorKey);
      await addFactorKeyMetadata(tKey, backupFactorKey, tssShare2, tssIndex2, "manual share");
      const serializedShare = await (tKey.modules.shareSerialization as ShareSerializationModule).serialize(backupFactorKey, "mnemonic");

      await tKey.syncLocalMetadataTransitions();
      uiConsole(" Successfully created manual backup.Manual Backup Factor: ", serializedShare);
    } catch (err) {
      uiConsole(`Failed to create new manual factor ${err}`);
    }
  };

  const deleteTkeyLocalStore = async () => {
    localStorage.removeItem(`tKeyLocalStore\u001c${loginResponse.userInfo.verifier}\u001c${loginResponse.userInfo.verifierId}`);
    uiConsole("Successfully deleted tKey local store");
  };

  const keyDetails = async () => {
    if (!tKey) {
      uiConsole("tKey not initialized yet");
      return;
    }

    uiConsole("TSS Public Key: ", tKey.getTSSPub(), "With Factors/Shares:", tKey.getMetadata().getShareDescription());
  };

  const logout = (): void => {
    uiConsole("Log out");
    setUser(null);
    setLoginResponse(null);
    localStorage.removeItem("sessionId");
  };

  const getUserInfo = (): void => {
    uiConsole(user);
    return user;
  };

  const getLoginResponse = (): void => {
    uiConsole(loginResponse);
    return loginResponse;
  };

  const getMetadataKey = (): string => {
    uiConsole(metadataKey);
    return metadataKey!;
  };

  const resetAccount = async () => {
    try {
      localStorage.removeItem(`tKeyLocalStore\u001c${loginResponse.userInfo.verifier}\u001c${loginResponse.userInfo.verifierId}`);
      await tKey.storageLayer.setMetadata({
        privKey: oAuthShare!,
        input: { message: "KEY_NOT_FOUND" },
      });
      uiConsole("Reset Account Successful.");
    } catch (e) {
      uiConsole(e);
    }
  };

  const getAccounts = async () => {
    if (!web3) {
      uiConsole("web3 not initialized yet");
      return;
    }
    uiConsole("Bitcoin address", signingParams.btcAddress);
    return signingParams.btcAddress;
  };

  const sendTransaction = async () => {
    if (!web3) {
      uiConsole("web3 not initialized yet");
      return;
    }
    if (bitcoinUTXID?.length !== 64) {
      uiConsole("invalid bitcoin utxid");
      return;
    }
    try {
      parseInt(fundingTxIndex as string);
    } catch (e) { 
      uiConsole("invalid funding tx index");
      return }
    
    // unspent transaction
    const txId = bitcoinUTXID; // looks like this "bb072aa6a43af31642b635e82bd94237774f8240b3e6d99a1b659482dce013c6"
    const total = 170; // 0.0000017
    const value = 20;
    const miner = 50;

    // fetch transaction from testnet
    const txHex = await (await fetch(`https://blockstream.info/testnet/api/tx/${txId}/hex`)).text();
    console.log("txHex", txHex);

    const outAddr = await getAccounts();
    console.log(outAddr, typeof outAddr)
    const psbt = new Psbt({ network: networks.testnet })
      .addInput({
        hash: txId,
        index: parseInt(fundingTxIndex as string),
        nonWitnessUtxo: Buffer.from(txHex, "hex"),
      })
      .addOutput({
        address: outAddr,
        value: value,
      })
      .addOutput({
        address: signingParams.btcAddress,
        value: total - value - miner,
      });

    uiConsole("Signing transaction...");
    await psbt.signInputAsync(0, web3);
    psbt.validateSignaturesOfInput(0, BTCValidator);
    const validation = psbt.validateSignaturesOfInput(0, BTCValidator);
    const signedTransaction = psbt.finalizeAllInputs().extractTransaction().toHex()
    uiConsole("Signed Transaction: ", signedTransaction, "Copy the above into https://blockstream.info/testnet/tx/push");
    console.log(validation ? "Validated" : "failed");
    console.log("signedTransaction: ", signedTransaction );
  };

  const loggedInView = (
    <>
      <h2 className="subtitle">Account Details</h2>
      <div className="flex-container">
        <button onClick={getUserInfo} className="card">
          Get User Info
        </button>

        <button onClick={getLoginResponse} className="card">
          See Login Response
        </button>

        <button onClick={keyDetails} className="card">
          Key Details
        </button>

        <button onClick={getMetadataKey} className="card">
          Metadata Key
        </button>

        <button onClick={logout} className="card">
          Log Out
        </button>
      </div>
      <h2 className="subtitle">Recovery/ Key Manipulation</h2>
      <div className="flex-container">
        <button onClick={copyTSSShareIntoManualBackupFactorkey} className="card">
          Copy Existing TSS Share For New Factor Manual
        </button>

        <button onClick={createNewTSSShareIntoManualBackupFactorkey} className="card">
          Create New TSSShare Into Manual Backup Factor
        </button>

        <button onClick={deleteTkeyLocalStore} className="card">
          Delete tKey Local Store (enables Recovery Flow)
        </button>

        <button onClick={resetAccount} className="card">
          Reset Account (CAUTION)
        </button>
      </div>
      <h2 className="subtitle">Blockchain Calls</h2>
      <div className="flex-container">
        <button onClick={getAccounts} className="card">
          Get Bitcoin Address
        </button>

        <button onClick={()=> window.open("https://coinfaucet.eu/en/btc-testnet/", "_blank")} className="card">
          Get Testnet Bitcoin from Faucet
        </button>


      <input value={bitcoinUTXID as string} onChange={(e) => setBitcoinUTXID(e.target.value)}></input>
      <input value={fundingTxIndex as string} onChange={(e) => setFundingTxIndex(e.target.value)}></input>

        <button onClick={sendTransaction} className="card">
          Sign PSBT Transaction
        </button>
      </div>

      <div id="console" style={{ whiteSpace: "pre-line" }}>
        <p style={{ whiteSpace: "pre-line" }}></p>
      </div>
    </>
  );

  const unloggedInView = (
    <button onClick={() => initializeNewKey()} className="card">
        Login
      </button>
  );

  return (
    <div className="container">
      <h1 className="title">
        <a target="_blank" href="https://web3auth.io/docs/guides/mpc" rel="noreferrer">
          Web3Auth Core Kit tKey MPC Beta
        </a>{" "}
        & ReactJS Bitcoin Example
      </h1>

      <div className="grid">{user ? loggedInView : unloggedInView}</div>

      <footer className="footer">
        <a
          href="https://github.com/Web3Auth/web3auth-core-kit-examples/tree/main/mpc-core-kit/tkey-mpc-react-bitcoin-example"
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
