import "./App.css";

import { getPubKeyECC, getPubKeyPoint } from "@tkey/common-types";
import BN from "bn.js";
import { generatePrivate } from "eccrypto";
import { useEffect, useState } from "react";
import swal from "sweetalert";
import { tKey } from "./tkey";
import { addFactorKeyMetadata, setupWeb3, copyExistingTSSShareForNewFactor, addNewTSSShareAndFactor, getEcCrypto } from "./utils";
import { fetchPostboxKeyAndSigs } from "./mockUtils";
import { utils } from "@toruslabs/tss-client";
import { OpenloginSessionManager } from "@toruslabs/openlogin-session-manager";
import { address, networks, payments, Psbt, Transaction } from "bitcoinjs-lib";
import ecc from "@bitcoinerlab/secp256k1";
import ECPairFactory from "ecpair";
import { testnet } from "bitcoinjs-lib/src/networks";
import { p2pkh } from "bitcoinjs-lib/src/payments";
import { sign } from "crypto";

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

const chainConfig = {
  chainId: "0x5",
  rpcTarget: "https://rpc.ankr.com/eth_goerli",
  displayName: "Goerli Testnet",
  blockExplorer: "https://goerli.etherscan.io",
  ticker: "ETH",
  tickerName: "Ethereum",
};

function App() {
  const [loginResponse, setLoginResponse] = useState<any>(null);
  const [user, setUser] = useState<any>(null);
  const [metadataKey, setMetadataKey] = useState<any>();
  const [localFactorKey, setLocalFactorKey] = useState<BN | null>(null);
  const [tssPubKey, setTssPubkey] = useState<any>(null);
  const [oAuthShare, setOAuthShare] = useState<any>(null);
  const [web3, setWeb3] = useState<any>(null);
  const [signingParams, setSigningParams] = useState<any>(null);
  const [mockVerifierId, setMockVerifierId] = useState<string | null>(null);
  const [sessionManager, setSessionManager] = useState<OpenloginSessionManager<typeof signingParams>>(new OpenloginSessionManager({}));

  // Init Service Provider inside the useEffect Method

  useEffect(() => {
    if (!localFactorKey) return;
    localStorage.setItem(
      `tKeyLocalStore\u001c${loginResponse.userInfo.verifier}\u001c${loginResponse.userInfo.verifierId}`,
      JSON.stringify({
        factorKey: localFactorKey.toString("hex"),
        verifier: loginResponse.userInfo.verifier,
        verifierId: loginResponse.userInfo.verifierId,
      })
    );
  }, [localFactorKey]);

  useEffect(() => {
    if (!mockVerifierId) return;
    localStorage.setItem(`mockVerifierId`, mockVerifierId);
  }, [mockVerifierId]);

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
          (tKey.serviceProvider as any).verifierName = signingParams.userInfo.verifier;
          (tKey.serviceProvider as any).verifierId = signingParams.userInfo.verifierId;

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
      const chainConfig = {
        chainId: "0x5",
        rpcTarget: "https://rpc.ankr.com/eth_goerli",
        displayName: "Goerli Testnet",
        blockExplorer: "https://goerli.etherscan.io",
        ticker: "ETH",
        tickerName: "Ethereum",
      };
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
    let verifierId: string;

    const localMockVerifierId = localStorage.getItem("mockVerifierId");
    if (localMockVerifierId) verifierId = localMockVerifierId;
    else verifierId = Math.round(Math.random() * 100000) + "@example.com";
    setMockVerifierId(verifierId);
  }, []);

  const triggerMockLogin = async () => {
    if (!tKey) {
      uiConsole("tKey not initialized yet");
      return;
    }
    try {
      const verifier = "torus-test-health";
      const verifierId = mockVerifierId;

      const { signatures, postboxkey } = await fetchPostboxKeyAndSigs({
        verifierName: verifier,
        verifierId,
      });
      tKey.serviceProvider.postboxKey = new BN(postboxkey, "hex");
      (tKey.serviceProvider as any).verifierName = verifier;
      (tKey.serviceProvider as any).verifierId = verifierId;
      const loginResponse = {
        userInfo: { verifierId, verifier },
        signatures,
        privateKey: postboxkey,
      };
      setLoginResponse(loginResponse);
      setUser(loginResponse.userInfo);
      return loginResponse;
    } catch (error) {
      uiConsole(error);
    }
  };

  const initializeNewKey = async (mockLogin: boolean) => {
    if (!tKey) {
      uiConsole("tKey not initialized yet");
      return;
    }
    try {
      let loginResponse;
      if (mockLogin) {
        loginResponse = await triggerMockLogin();
      } else {
        loginResponse = await triggerLogin(); // Calls the triggerLogin() function above
      }
      setOAuthShare(loginResponse.privateKey);

      const signatures = loginResponse.signatures.filter((sign: any) => sign !== null);

      const tKeyLocalStoreString = localStorage.getItem(
        `tKeyLocalStore\u001c${loginResponse.userInfo.verifier}\u001c${loginResponse.userInfo.verifierId}`
      );
      const tKeyLocalStore = JSON.parse(tKeyLocalStoreString || "{}");

      let factorKey: BN | null = null;

      const existingUser = await isMetadataPresent(loginResponse.privateKey);

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
        if (tKeyLocalStore.verifier === loginResponse.userInfo.verifier && tKeyLocalStore.verifierId === loginResponse.userInfo.verifierId) {
          factorKey = new BN(tKeyLocalStore.factorKey, "hex");
        } else {
          try {
            factorKey = await swal("Enter your backup share", {
              content: "input" as any,
            }).then(async (value) => {
              uiConsole(value);
              return await (tKey.modules.shareSerialization as any).deserialize(value, "mnemonic");
            });
          } catch (error) {
            uiConsole(error);
            throw new Error("Invalid backup share");
          }
        }
        if (factorKey === null) throw new Error("Backup share not found");
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
        !(tKeyLocalStore.verifier === loginResponse.userInfo.verifier && tKeyLocalStore.verifierId === loginResponse.userInfo.verifierId)
      ) {
        await addFactorKeyMetadata(tKey, factorKey, tssShare2, tssShare2Index, "local storage share");
      }
      await tKey.syncLocalMetadataTransitions();

      setLocalFactorKey(factorKey);

      const signingParams = {
        oAuthShare: loginResponse.privateKey,
        factorKey,
        btcAddress,
        ecPublicKey: ECPubKey.publicKey,
        tssNonce,
        tssShare2,
        tssShare2Index,
        compressedTSSPubKey,
        signatures,
        userInfo: loginResponse.userInfo,
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
      const serializedShare = await (tKey.modules.shareSerialization as any).serialize(backupFactorKey, "mnemonic");
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
      const serializedShare = await (tKey.modules.shareSerialization as any).serialize(backupFactorKey, "mnemonic");

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
    // const keyDetails = await tKey.getKeyDetails();

    uiConsole("TSS Public Key: ", tKey.getTSSPub(), "With Factors/Shares:", tKey.getMetadata().getShareDescription());
    // return keyDetails;
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

  const getMetadataKey = (): void => {
    uiConsole(metadataKey);
    return metadataKey;
  };

  const resetAccount = async () => {
    try {
      localStorage.removeItem(`tKeyLocalStore\u001c${loginResponse.userInfo.verifier}\u001c${loginResponse.userInfo.verifierId}`);
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
      uiConsole("web3 not initialized yet");
      return;
    }
    const chainId = await web3.eth.getChainId();
    uiConsole(chainId);
    return chainId;
  };

  const getAccounts = async () => {
    if (!web3) {
      uiConsole("web3 not initialized yet");
      return;
    }
    // const address = ECPair.fromPublicKey(web3.publicKey);
    uiConsole("Bitcoin address", signingParams.btcAddress);
    return address;
  };

  const privateKey = "30e90ecd99f8f9dd4009ee08833b7ff80336efe959bb7bdb74d71495a2599f27";

  const getAccountsBTC = async () => {
    const keyPair = ECPair.fromPrivateKey(Buffer.from(privateKey, "hex"));
    console.log("keyPair.publicKey", keyPair.publicKey.toString("hex"));

    const { address } = payments.p2pkh({ pubkey: keyPair.publicKey, network: networks.testnet });
    console.log("address", address);
    // mqtWdwCmPcgVcvwRrusALyXyQniVTq5gnu

    // WARNING: The code below will produce a different address!!!
    //
    let key2 = "045096027229bbea7aeb34a8c6658db7eba26c130bc0770a452f008ca745863d5c3455f2c14365e4695650f7b8967117fc38e00581ffe42e80b0cef0640e91de3f";
    // let compress = ecc.pointCompress(Buffer.from(key2, "hex"), true);
    const publicKeyECC = getPubKeyECC(new BN(privateKey, "hex"));
    const publicKey2 = ECPair.fromPublicKey(Buffer.from(key2, "hex"), { network: networks.testnet, compressed: true });
    const textpubkey = publicKey2.publicKey.toString("hex");
    console.log("publicKeyECC", textpubkey);
    // const { address: wrongAddress } = payments.p2pkh({ pubkey: publicKeyECC, network: networks.testnet });
    // console.log("wrongAddress", wrongAddress);
  };

  const bitcoinTx = async () => {
    // const keyPair = ECPair.fromPrivateKey(Buffer.from(privateKey, "hex"), { network: networks.testnet });

    // unspent transaction
    const txId = "f836024a6bc965c7a1e6ecb60e6e469d9538ca19f77aa6100fc449cad8caa74f";

    // fetch transaction from testnet
    const txHex = await (await fetch(`https://blockstream.info/testnet/api/tx/${txId}/hex`)).text();
    console.log("txHex", txHex);

    const outAddr = "mvu3DMxuHNsp58qKtiiT4rBUTmpJJRf3yx";
    const psbt = new Psbt({ network: networks.testnet })
      .addInput({
        hash: txId,
        index: 1,
        nonWitnessUtxo: Buffer.from(txHex, "hex"),
      })
      .addOutput({
        address: outAddr,
        value: 20,
      });

    // const validator = (pubkey: Buffer, msghash: Buffer, signature: Buffer): boolean => ECPair.fromPublicKey(pubkey).verify(msghash, signature);
    // encode to send tx to signer
    const hexTx = psbt.toBase64();

    // psbt.signInput(0, keyPair);
    // psbt.validateSignaturesOfInput(0, validator);
    // psbt.finalizeAllInputs();
  };

  const getBalance = async () => {
    if (!web3) {
      uiConsole("web3 not initialized yet");
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
      uiConsole("web3 not initialized yet");
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
      uiConsole("web3 not initialized yet");
      return;
    }
    // const { btcAddress } = signingParams;
    // unspent transaction
    const txId = "bb072aa6a43af31642b635e82bd94237774f8240b3e6d99a1b659482dce013c6";
    const total = 1423122; // 0.01423122
    const value = 20;
    const miner = 1000;

    // fetch transaction from testnet
    const txHex = await (await fetch(`https://blockstream.info/testnet/api/tx/${txId}/hex`)).text();
    console.log("txHex", txHex);

    const outAddr = "mvu3DMxuHNsp58qKtiiT4rBUTmpJJRf3yx";
    const psbt = new Psbt({ network: networks.testnet })
      .addInput({
        hash: txId,
        index: 0,
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

    uiConsole("Sending transaction...");

    await psbt.signInputAsync(0, web3);
    psbt.validateSignaturesOfInput(0, BTCValidator);
    const validation = psbt.validateSignaturesOfInput(0, BTCValidator);
    uiConsole(validation ? "Validated" : "failed");
    console.log(psbt.finalizeAllInputs().extractTransaction().toHex());

    // add broadcast transaction
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
        {/* <button onClick={getChainID} className="card">
          Get Chain ID
        </button> */}

        <button onClick={getAccounts} className="card">
          Get Accounts
        </button>

        {/* <button onClick={getBalance} className="card">
          Get Balance
        </button> */}

        {/* <button onClick={signMessage} className="card">
          Sign Message
        </button> */}

        <button onClick={sendTransaction} className="card">
          Send Transaction
        </button>
      </div>

      <div id="console" style={{ whiteSpace: "pre-line" }}>
        <p style={{ whiteSpace: "pre-line" }}></p>
      </div>
    </>
  );

  const unloggedInView = (
    <>
      <button onClick={() => initializeNewKey(false)} className="card">
        Login
      </button>
      <button onClick={() => initializeNewKey(true)} className="card">
        MockLogin
      </button>

      {/* <h2 className="subtitle">Bitcoin</h2> */}
      {/* <div className="flex-container">
        <button onClick={getAccountsBTC} className="card">
          Get Accounts
        </button>
      </div>

      <div className="flex-container">
        <button onClick={bitcoinTx} className="card">
          BTC tx
        </button>
      </div> */}

      <p>Mock Login Seed Email</p>
      <input value={mockVerifierId as string} onChange={(e) => setMockVerifierId(e.target.value)}></input>
    </>
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
          href="https://github.com/Web3Auth/web3auth-core-kit-examples/tree/main/tkey/tkey-mpc-beta-react-popup-example"
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
