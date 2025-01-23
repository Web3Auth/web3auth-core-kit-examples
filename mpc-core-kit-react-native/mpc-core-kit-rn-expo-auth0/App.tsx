import "./globals";
import "@ethersproject/shims";

import { Point, secp256k1 } from "@tkey/common-types";
import { CHAIN_NAMESPACES } from "@web3auth/base";
import { EthereumSigningProvider } from "@web3auth/ethereum-mpc-provider";
// IMP START - Quick Start
import {
  Bridge,
  COREKIT_STATUS,
  FactorKeyTypeShareDescription,
  generateFactorKey,
  keyToMnemonic,
  makeEthereumSigner,
  mnemonicToKey,
  mpclib,
  parseToken,
  TssDklsLib,
  TssShareType,
  WEB3AUTH_NETWORK,
} from "@web3auth/react-native-mpc-core-kit";
// IMP END - Quick Start
import { BN } from "bn.js";
import { ethers } from "ethers";
import * as SecureStore from "expo-secure-store";
import React, { useEffect, useState } from "react";
import { ActivityIndicator, Button, Dimensions, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
// IMP START - Auth Provider Login
import { Auth0Provider, useAuth0 } from "react-native-auth0";
// IMP END - Auth Provider Login

// IMP START - Dashboard Registration
const web3AuthClientId = "BPi5PB_UiIZ-cPz1GtV5i1I2iOSOHuimiXBI0e-Oe_u6X3oVAbCiAZOTEBtTXw4tsluTITPqA8zMsfxIKMjiqNQ"; // get from https://dashboard.web3auth.io
// IMP END - Dashboard Registration

// IMP START - Verifier Creation
const verifier = "w3a-auth0-demo";
// IMP END - Verifier Creation

// IMP START - Chain Config
const chainConfig = {
  chainNamespace: CHAIN_NAMESPACES.EIP155,
  chainId: "0xaa36a7", // Please use 0x1 for Mainnet
  rpcTarget: "https://rpc.ankr.com/eth_sepolia",
  displayName: "Ethereum Sepolia Testnet",
  blockExplorerUrl: "https://sepolia.etherscan.io/",
  blockExplorer: "https://sepolia.etherscan.io/",
  ticker: "ETH",
  tickerName: "Ethereum",
};
// IMP END - Chain Config

// IMP START - SDK Initialization
// setup async storage for react native
const asyncStorageKey = {
  getItem: async (key: string) => {
    return SecureStore.getItem(key);
  },
  setItem: async (key: string, value: string) => {
    return SecureStore.setItem(key, value);
  },
};

const coreKitInstance = new mpclib.Web3AuthMPCCoreKitRN({
  web3AuthClientId,
  web3AuthNetwork: WEB3AUTH_NETWORK.MAINNET,
  // setupProviderOnInit: false, // needed to skip the provider setup
  uxMode: "react-native",
  tssLib: TssDklsLib, // tss lib bridge for react native
  manualSync: true, // This is the recommended approach
  storage: asyncStorageKey, // Add the storage property
});

// Setup provider for EVM Chain
const evmProvider = new EthereumSigningProvider({ config: { chainConfig } });
evmProvider.setupProvider(makeEthereumSigner(coreKitInstance));
// IMP END - SDK Initialization

function Home() {
  const [loading, setLoading] = useState<boolean>(false);
  const [bridgeReady, setBridgeReady] = useState<boolean>(false);
  const [consoleUI, setConsoleUI] = useState<string>("");
  const [coreKitStatus, setCoreKitStatus] = useState<COREKIT_STATUS>(COREKIT_STATUS.NOT_INITIALIZED);
  const [backupFactorKey, setBackupFactorKey] = useState<string>("");
  const [mnemonicFactor, setMnemonicFactor] = useState<string>("");

  const uiConsole = (...args: any) => {
    setConsoleUI(`${JSON.stringify(args || {}, null, 2)}\n\n\n\n${consoleUI}`);
    console.log(...args);
  };

  useEffect(() => {
    if (bridgeReady) {
      const init = async () => {
        try {
          // IMP START - SDK Initialization
          await coreKitInstance.init();
          // IMP END - SDK Initialization
        } catch (error: any) {
          uiConsole(error.message, "mounted caught");
        }
        setCoreKitStatus(coreKitInstance.status);
      };
      init();
    }
  }, [bridgeReady]);

  const { authorize, getCredentials } = useAuth0();

  // IMP START - Auth Provider Login
  const signInWithAuth0 = async () => {
    try {
      await authorize(
        {
          scope: "openid profile email",
          // connection: 'google-oauth2',
        }
        // {
        //   customScheme: 'com.mpccorekitrnauth0',
        // },
        // {
        //   responseType: 'token id_token',
        // },
        // com.mpccorekitrnauth0.auth0://web3auth.au.auth0.com/android/com.mpccorekitrnauth0/callback
      );
      const credentials = await getCredentials();

      return credentials?.idToken;
    } catch (error) {
      console.error(error);
    }
  };
  // IMP END - Auth Provider Login

  const login = async () => {
    try {
      if (!coreKitInstance) {
        throw new Error("initiated to login");
      }
      setConsoleUI("Logging in");
      setLoading(true);
      // IMP START - Auth Provider Login
      const idToken = await signInWithAuth0();
      // IMP END - Auth Provider Login
      uiConsole("idToken", idToken);

      uiConsole("idToken", idToken);

      if (!idToken) {
        throw new Error("idToken is null or undefined");
      }

      const parsedToken = parseToken(idToken);

      // IMP START - Login
      const idTokenLoginParams = {
        verifier,
        verifierId: parsedToken.sub,
        idToken,
      };

      await coreKitInstance.loginWithJWT(idTokenLoginParams);
      if (coreKitInstance.status === COREKIT_STATUS.LOGGED_IN) {
        await coreKitInstance.commitChanges(); // Needed for new accounts
      }
      // IMP END - Login

      // IMP START - Recover MFA Enabled Account
      if (coreKitInstance.status === COREKIT_STATUS.REQUIRED_SHARE) {
        uiConsole(
          "required more shares, please enter your backup/ device factor key, or reset account [unrecoverable once reset, please use it with caution]"
        );
      }
      // IMP END - Recover MFA Enabled Account
      setLoading(false);

      setCoreKitStatus(coreKitInstance.status);
    } catch (err) {
      uiConsole(err);
    }
  };
  // IMP START - Recover MFA Enabled Account
  const inputBackupFactorKey = async () => {
    if (!coreKitInstance) {
      throw new Error("coreKitInstance not found");
    }
    if (!backupFactorKey) {
      throw new Error("backupFactorKey not found");
    }
    setLoading(true);
    const factorKey = new BN(backupFactorKey, "hex");
    await coreKitInstance.inputFactorKey(factorKey);

    setCoreKitStatus(coreKitInstance.status);
    setLoading(false);
    if (coreKitInstance.status === COREKIT_STATUS.REQUIRED_SHARE) {
      uiConsole(
        "required more shares even after inputing backup factor key, please enter your backup/ device factor key, or reset account [unrecoverable once reset, please use it with caution]"
      );
    }
  };
  // IMP END - Recover MFA Enabled Account

  // IMP START - Enable Multi Factor Authentication
  const enableMFA = async () => {
    if (!coreKitInstance) {
      throw new Error("coreKitInstance is not set");
    }
    setLoading(true);
    try {
      setConsoleUI("Enabling MFA, please wait");

      const factorKey = generateFactorKey();

      await coreKitInstance.enableMFA({ factorKey: factorKey.private, shareDescription: FactorKeyTypeShareDescription.SeedPhrase });
      const factorKeyMnemonic = keyToMnemonic(factorKey.private.toString("hex"));

      uiConsole("MFA enabled, device factor stored in local store, deleted hashed cloud key, your backup factor key: ", factorKeyMnemonic);
    } catch (error: any) {
      uiConsole("Error", error);
    }
    setLoading(false);

    if (coreKitInstance.status === COREKIT_STATUS.LOGGED_IN) {
      await coreKitInstance.commitChanges();
    }
  };
  // IMP END - Enable Multi Factor Authentication

  const keyDetails = async () => {
    if (!coreKitInstance) {
      throw new Error("coreKitInstance not found");
    }
    uiConsole(await coreKitInstance.getKeyDetails());
  };

  const getDeviceFactor = async () => {
    try {
      const factorKey = await coreKitInstance.getDeviceFactor();
      setBackupFactorKey(factorKey!);
      uiConsole("Device factor: ", factorKey);
    } catch (error: any) {
      uiConsole(error.message);
    }
  };

  // IMP START - Store Device Factor
  const storeDeviceFactor = async () => {
    try {
      if (!coreKitInstance) {
        throw new Error("coreKitInstance is not set");
      }
      setLoading(true);
      uiConsole("export share type: ", TssShareType.DEVICE);
      const factorKey = generateFactorKey();
      await coreKitInstance.createFactor({
        shareType: TssShareType.DEVICE,
        factorKey: factorKey.private,
      });
      uiConsole("Stored factor: ", factorKey);
    } catch (error: any) {
      uiConsole(error.message);
    }
  };
  // IMP END - Store Device Factor

  // IMP START - Export Mnemonic Factor
  const createMnemonicFactor = async (): Promise<void> => {
    if (!coreKitInstance) {
      throw new Error("coreKitInstance is not set");
    }
    setLoading(true);
    uiConsole("share type: ", TssShareType.RECOVERY);
    const factorKey = generateFactorKey();
    await coreKitInstance.createFactor({
      shareType: TssShareType.RECOVERY,
      factorKey: factorKey.private,
      shareDescription: FactorKeyTypeShareDescription.SeedPhrase,
    });
    const factorKeyMnemonic = await keyToMnemonic(factorKey.private.toString("hex"));
    setLoading(false);

    uiConsole("New factor key mnemonic: ", factorKeyMnemonic);
    if (coreKitInstance.status === COREKIT_STATUS.LOGGED_IN) {
      await coreKitInstance.commitChanges();
    }
  };
  // IMP END - Export Mnemonic Factor

  const MnemonicToFactorKeyHex = async (mnemonic: string) => {
    if (!coreKitInstance) {
      throw new Error("coreKitInstance is not set");
    }
    try {
      const factorKey = await mnemonicToKey(mnemonic);
      setBackupFactorKey(factorKey);
      return factorKey;
    } catch (error: any) {
      uiConsole(error.message);
    }
  };

  // IMP START - Delete Factor
  const deleteFactor = async () => {
    let factorPub: string | undefined;
    for (const [key, value] of Object.entries((await coreKitInstance.getKeyDetails()).shareDescriptions)) {
      if (value.length > 0) {
        const parsedData = JSON.parse(value[0]);
        if (parsedData.module === FactorKeyTypeShareDescription.SeedPhrase) {
          factorPub = key;
        }
      }
    }
    if (factorPub) {
      uiConsole("Deleting Mnemonic Factor, please wait...", "Factor Pub:", factorPub);
      const pub = Point.fromSEC1(secp256k1, factorPub);
      await coreKitInstance.deleteFactor(pub);
      await coreKitInstance.commitChanges();
      uiConsole("Mnemonic Factor deleted");
    } else {
      uiConsole("No Mnemonic factor found to delete");
    }
  };
  // IMP END - Delete Factor

  const getUserInfo = async () => {
    // IMP START - Get User Information
    const user = coreKitInstance.getUserInfo();
    // IMP END - Get User Information
    uiConsole(user);
  };

  const logout = async () => {
    setLoading(true);
    // IMP START - Logout
    await coreKitInstance.logout();
    // IMP END - Logout
    setCoreKitStatus(coreKitInstance.status);
    // Log out from Auth0
    setLoading(false);
    uiConsole("logged out from web3auth");
  };

  // IMP START - Blockchain Calls
  const getAccounts = async () => {
    if (!coreKitInstance) {
      uiConsole("provider not initialized yet");
      return;
    }
    setLoading(true);
    setConsoleUI("Getting account");

    // For ethers v5
    // const ethersProvider = new ethers.providers.Web3Provider(this.provider);
    const ethersProvider = new ethers.BrowserProvider(evmProvider);

    // For ethers v5
    // const signer = ethersProvider.getSigner();
    const signer = await ethersProvider.getSigner();

    // Get user's Ethereum public address
    const address = signer.getAddress();
    setLoading(false);
    uiConsole(address);
  };

  const getBalance = async () => {
    if (!coreKitInstance) {
      uiConsole("provider not initialized yet");
      return;
    }
    setLoading(true);
    setConsoleUI("Fetching balance");

    // For ethers v5
    // const ethersProvider = new ethers.providers.Web3Provider(this.provider);
    const ethersProvider = new ethers.BrowserProvider(evmProvider);

    // For ethers v5
    // const signer = ethersProvider.getSigner();
    const signer = await ethersProvider.getSigner();

    // Get user's Ethereum public address
    const address = signer.getAddress();

    // Get user's balance in ether
    // For ethers v5
    // const balance = ethers.utils.formatEther(
    // await ethersProvider.getBalance(address) // Balance is in wei
    // );
    const balance = ethers.formatEther(
      await ethersProvider.getBalance(address) // Balance is in wei
    );
    setLoading(false);

    uiConsole(balance);
  };

  const signMessage = async () => {
    if (!coreKitInstance) {
      uiConsole("provider not initialized yet");
      return;
    }
    setLoading(true);
    setConsoleUI("Signing message");

    // For ethers v5
    // const ethersProvider = new ethers.providers.Web3Provider(this.provider);
    const ethersProvider = new ethers.BrowserProvider(evmProvider);

    // For ethers v5
    // const signer = ethersProvider.getSigner();
    const signer = await ethersProvider.getSigner();
    const originalMessage = "YOUR_MESSAGE";

    // Sign the message
    const signedMessage = await signer.signMessage(originalMessage);
    setLoading(false);
    uiConsole(signedMessage);
  };

  const sendTransaction = async () => {
    if (!coreKitInstance) {
      uiConsole("provider not initialized yet");
      return;
    }
    setLoading(true);
    setConsoleUI("Sending transaction");

    // For ethers v5
    // const ethersProvider = new ethers.providers.Web3Provider(this.provider);
    const ethersProvider = new ethers.BrowserProvider(evmProvider);

    const signer = await ethersProvider.getSigner();

    const destination = "0xeaA8Af602b2eDE45922818AE5f9f7FdE50cFa1A8";
    const amount = ethers.parseEther("0.005"); // Convert 1 ether to wei

    // Submit transaction to the blockchain
    const tx = await signer.sendTransaction({
      to: destination,
      value: amount,
    });

    // Wait for the transaction to be mined
    const receipt = await tx.wait();
    setLoading(false);
    uiConsole(receipt);
  };
  // IMP END - Blockchain Calls

  const criticalResetAccount = async (): Promise<void> => {
    // This is a critical function that should only be used for testing purposes
    // Resetting your account means clearing all the metadata associated with it from the metadata server
    // The key details will be deleted from our server and you will not be able to recover your account
    if (!coreKitInstance) {
      throw new Error("coreKitInstance is not set");
    }
    setLoading(true);

    await coreKitInstance._UNSAFE_resetAccount();
    uiConsole("reset");
    if (coreKitInstance.status === COREKIT_STATUS.LOGGED_IN) {
      await coreKitInstance.commitChanges();
    }
    setLoading(false);
    logout();
  };

  const loggedInView = (
    <View style={styles.buttonArea}>
      <Text style={styles.heading}>MPC Core Kit RN Auth0 Example</Text>

      <Button title="Get User Info" onPress={getUserInfo} />
      <Button title="Key Details" onPress={keyDetails} />
      <Button title="Get Accounts" onPress={getAccounts} />
      <Button title="Get Balance" onPress={getBalance} />
      <Button title="Sign Message" onPress={signMessage} />
      <Button title="Send Transaction" onPress={sendTransaction} />
      <Button title="Log Out" onPress={logout} />
      <Button title="Enable MFA" onPress={enableMFA} />
      <Button title="Generate Backup (Mnemonic) - CreateFactor" onPress={createMnemonicFactor} />
      <Button title="Get Device Factor" onPress={() => getDeviceFactor()} />
      <Button title="Store Device Factor" onPress={() => storeDeviceFactor()} />
      <Button title="Delete Mnemonic Factor" onPress={() => deleteFactor()} />
      <Button title="[CRITICAL] Reset Account" onPress={criticalResetAccount} />
    </View>
  );

  const unloggedInView = (
    <View style={styles.buttonArea}>
      <Text style={styles.heading}>MPC Core Kit RN Auth0 Example</Text>

      <Button title="Login with Web3Auth" onPress={login} />

      <View style={coreKitStatus !== COREKIT_STATUS.REQUIRED_SHARE ? styles.disabledSection : styles.section}>
        <Text style={styles.heading}>Account Recovery</Text>
        <Button disabled={coreKitStatus !== COREKIT_STATUS.REQUIRED_SHARE} title="Get Device Factor" onPress={() => getDeviceFactor()} />
        <Text>Recover Using Mnemonic Factor Key:</Text>
        <TextInput style={styles.input} onChangeText={setMnemonicFactor} value={mnemonicFactor} />
        <Button
          disabled={coreKitStatus !== COREKIT_STATUS.REQUIRED_SHARE}
          title="Get Recovery Factor Key using Mnemonic"
          onPress={() => MnemonicToFactorKeyHex(mnemonicFactor)}
        />
        <Text>Backup/ Device Factor: {backupFactorKey}</Text>
        <Button disabled={coreKitStatus !== COREKIT_STATUS.REQUIRED_SHARE} title="Input Backup Factor Key" onPress={() => inputBackupFactorKey()} />
      </View>
      <Button title="[CRITICAL] Reset Account" onPress={criticalResetAccount} />
    </View>
  );

  return (
    <View style={styles.container}>
      {coreKitStatus === COREKIT_STATUS.LOGGED_IN ? loggedInView : unloggedInView}
      {loading && <ActivityIndicator />}
      <View style={styles.consoleArea}>
        <Text style={styles.consoleText}>Console:</Text>
        <ScrollView style={styles.consoleUI}>
          <Text>{consoleUI}</Text>
        </ScrollView>
      </View>
      <Bridge
        logLevel={"DEBUG"}
        resolveReady={(ready) => {
          setBridgeReady(ready);
        }}
      />
    </View>
  );
}

export default function App() {
  return (
    <>
      <Auth0Provider domain={"https://web3auth.au.auth0.com"} clientId={"hUVVf4SEsZT7syOiL0gLU9hFEtm2gQ6O"}>
        <Home />
      </Auth0Provider>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
    alignItems: "center",
    justifyContent: "center",
    paddingTop: 50,
    paddingBottom: 30,
    gap: 10,
  },
  heading: {
    fontSize: 20,
    fontWeight: "bold",
    marginBottom: 10,
  },
  consoleArea: {
    margin: 20,
    alignItems: "center",
    justifyContent: "center",
    flex: 1,
  },
  consoleUI: {
    flex: 1,
    backgroundColor: "#CCCCCC",
    color: "#ffffff",
    padding: 10,
    width: Dimensions.get("window").width - 60,
  },
  consoleText: {
    padding: 10,
  },
  input: {
    padding: 10,
    width: Dimensions.get("window").width - 60,
    borderColor: "gray",
    borderWidth: 1,
  },
  buttonArea: {
    flex: 2,
    alignItems: "center",
    justifyContent: "space-around",
    margin: 20,
    gap: 40,
  },
  disabledSection: {
    opacity: 0.5,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#EEEEEE",
    padding: 20,
    borderRadius: 10,
  },
  section: {
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#EEEEEE",
    padding: 20,
    borderRadius: 10,
  },
});
