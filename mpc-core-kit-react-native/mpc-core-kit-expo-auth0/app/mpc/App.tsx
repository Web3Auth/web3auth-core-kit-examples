/* eslint-disable @typescript-eslint/ban-ts-comment */
import { Bridge, tssLib } from "@toruslabs/react-native-tss-lib-bridge";
import { CHAIN_NAMESPACES } from "@web3auth/base";
import { EthereumSigningProvider } from "@web3auth/ethereum-mpc-provider";
// IMP START - Quick Start
import {
  COREKIT_STATUS,
  generateFactorKey,
  JWTLoginParams,
  keyToMnemonic,
  makeEthereumSigner,
  mnemonicToKey,
  parseToken,
  TssShareType,
  WEB3AUTH_NETWORK,
  Web3AuthMPCCoreKit,
} from "@web3auth/mpc-core-kit";
// IMP END - Quick Start
import { BN } from "bn.js";
// IMP END - Auth Provider Login
import * as SecureStore from "expo-secure-store";
import React, { useEffect, useState } from "react";
import { ActivityIndicator, Button, ScrollView, Text, TextInput, View } from "react-native";
// IMP START - Auth Provider Login
import { Auth0Provider, useAuth0 } from "react-native-auth0";
import { createPublicClient, createWalletClient, custom, http, parseEther } from "viem";
import { sepolia } from "viem/chains";

import { styles } from "./style";

// IMP START - SDK Initialization
// IMP START - Dashboard Registration
const web3AuthClientId = "BPi5PB_UiIZ-cPz1GtV5i1I2iOSOHuimiXBI0e-Oe_u6X3oVAbCiAZOTEBtTXw4tsluTITPqA8zMsfxIKMjiqNQ"; // get from https://dashboard.web3auth.io
// IMP END - Dashboard Registration

// IMP START - Verifier Creation
const verifier = "w3a-auth0-demo";
// IMP END - Verifier Creation

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

const tsslibInstance = tssLib;
// setup async storage for react native
const asyncStorageKey = {
  getItem: async (key: string) => {
    return SecureStore.getItemAsync(key);
  },
  setItem: async (key: string, value: string) => {
    return SecureStore.setItemAsync(key, value);
  },
};

const coreKitInstance = new Web3AuthMPCCoreKit({
  web3AuthClientId,
  web3AuthNetwork: WEB3AUTH_NETWORK.MAINNET,
  // setupProviderOnInit: false, // needed to skip the provider setup
  uxMode: "react-native",
  tssLib: tsslibInstance, // tss lib bridge for react native
  manualSync: true, // This is the recommended approach
  storage: asyncStorageKey, // Add the storage property
});

// Setup provider for EVM Chain
const evmProvider = new EthereumSigningProvider({ config: { chainConfig } });
evmProvider.setupProvider(makeEthereumSigner(coreKitInstance));
// IMP END - SDK Initialization

function Home() {
  const [loading, setLoading] = useState<boolean>(false);
  const [consoleUI, setConsoleUI] = useState<string>("");
  const [coreKitStatus, setCoreKitStatus] = useState<COREKIT_STATUS>(COREKIT_STATUS.NOT_INITIALIZED);
  const [backupFactorKey, setBackupFactorKey] = useState<string>("");
  const [mnemonicFactor, setMnemonicFactor] = useState<string>("");

  const uiConsole = (...args: any) => {
    setConsoleUI(`${JSON.stringify(args || {}, null, 2)}\n\n\n\n${consoleUI}`);
    console.log(...args);
  };

  useEffect(() => {
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
  }, []);

  const { authorize, clearSession, getCredentials } = useAuth0();

  const signInWithAuth0 = async () => {
    try {
      // @ts-ignore
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

      // IMP START - Login
      uiConsole("idToken", idToken);
      const parsedToken = parseToken(idToken!);

      const idTokenLoginParams: JWTLoginParams = {
        verifier,
        verifierId: parsedToken.sub,
        idToken: idToken!,
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

      const factorKey = await coreKitInstance.enableMFA({});
      const factorKeyMnemonic = keyToMnemonic(factorKey);

      uiConsole("MFA enabled, device factor stored in local store, deleted hashed cloud key, your backup factor key: ", factorKeyMnemonic);
    } catch (error: any) {
      uiConsole(error.message);
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
    uiConsole(coreKitInstance.getKeyDetails());
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

  const exportMnemonicFactor = async (): Promise<void> => {
    if (!coreKitInstance) {
      throw new Error("coreKitInstance is not set");
    }
    setLoading(true);
    uiConsole("export share type: ", TssShareType.RECOVERY);
    const factorKey = generateFactorKey();
    await coreKitInstance.createFactor({
      shareType: TssShareType.RECOVERY,
      factorKey: factorKey.private,
    });
    const factorKeyMnemonic = await keyToMnemonic(factorKey.private.toString("hex"));
    setLoading(false);

    uiConsole("Export factor key mnemonic: ", factorKeyMnemonic);
    if (coreKitInstance.status === COREKIT_STATUS.LOGGED_IN) {
      await coreKitInstance.commitChanges();
    }
  };

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
    try {
      await clearSession();
      uiConsole("logged out from auth0");
    } catch (error: any) {
      uiConsole(error.message);
    }
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

    const client = createWalletClient({
      transport: custom(evmProvider),
    });
    const address = await client.getAddresses();
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

    const client = createWalletClient({
      transport: custom(evmProvider),
    });
    const address = (await client.getAddresses())[0];

    // Get user's balance in ether
    // For ethers v5
    // const balance = ethers.utils.formatEther(
    // await ethersProvider.getBalance(address) // Balance is in wei
    // );
    const publicClient = createPublicClient({
      chain: sepolia,
      transport: http(),
    });
    const balance = publicClient.getBalance({ address }); // Balance is in wei
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

    const client = createWalletClient({
      transport: custom(evmProvider),
    });

    const address = (await client.getAddresses())[0];

    const originalMessage = "YOUR_MESSAGE";
    const signedMessage = await client.signMessage({
      account: address,
      message: originalMessage,
    });

    setLoading(false);
    uiConsole(signedMessage);
  };
  // IMP END - Blockchain Calls

  const sendTransaction = async () => {
    if (!coreKitInstance) {
      uiConsole("provider not initialized yet");
      return;
    }
    setLoading(true);
    setConsoleUI("Sending transaction");

    // For ethers v5
    // const ethersProvider = new ethers.providers.Web3Provider(this.provider);
    // const ethersProvider = new ethers.BrowserProvider(evmProvider);

    // const signer = await ethersProvider.getSigner();

    const destination = "0xeaA8Af602b2eDE45922818AE5f9f7FdE50cFa1A8";
    const amount = parseEther("0.005"); // Convert 1 ether to wei

    // // Submit transaction to the blockchain
    // const tx = await signer.sendTransaction({
    //   to: destination,
    //   value: amount,
    // });

    // // Wait for the transaction to be mined
    // const receipt = await tx.wait();

    const client = createWalletClient({
      transport: custom(evmProvider),
    });
    const address = (await client.getAddresses())[0];

    const receipt = await client.sendTransaction({
      chain: sepolia,
      account: address,
      to: destination,
      value: amount,
    });

    // const publicClient = createPublicClient({
    //   chain: sepolia,
    //   transport: http(),
    // });

    setLoading(false);
    uiConsole(receipt);
  };

  const criticalResetAccount = async (): Promise<void> => {
    // This is a critical function that should only be used for testing purposes
    // Resetting your account means clearing all the metadata associated with it from the metadata server
    // The key details will be deleted from our server and you will not be able to recover your account
    if (!coreKitInstance) {
      throw new Error("coreKitInstance is not set");
    }
    setLoading(true);
    // @ts-ignore
    // if (selectedNetwork === WEB3AUTH_NETWORK.MAINNET) {
    //   throw new Error("reset account is not recommended on mainnet");
    // }
    await coreKitInstance.tKey.storageLayer.setMetadata({
      privKey: new BN(coreKitInstance.state.postBoxKey!, "hex"),
      input: { message: "KEY_NOT_FOUND" },
    });
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
      <Button title="Generate Backup (Mnemonic) - CreateFactor" onPress={exportMnemonicFactor} />
      <Button title="Get Device Factor" onPress={() => getDeviceFactor()} />
      <Button title="Store Device Factor" onPress={() => storeDeviceFactor()} />
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
    </View>
  );
}

export default function App() {
  return (
    <>
      <Auth0Provider domain={"https://web3auth.au.auth0.com"} clientId={"hUVVf4SEsZT7syOiL0gLU9hFEtm2gQ6O"}>
        <>
          <Home />
          <Bridge logLevel={"debug"} />
        </>
      </Auth0Provider>
    </>
  );
}
