// IMP START - Auth Provider Login
import { clusterApiUrl, Connection, PublicKey, SystemProgram, TransactionMessage, VersionedTransaction } from "@solana/web3.js";
import {
  COREKIT_STATUS,
  generateFactorKey,
  JWTLoginParams,
  keyToMnemonic,
  mnemonicToKey,
  parseToken,
  TssShareType,
  WEB3AUTH_NETWORK,
  Web3AuthOptions,
} from "@web3auth/mpc-core-kit";
import { Bridge, mpclib, TssFrostLib } from "@web3auth/react-native-mpc-core-kit";
import BN from "bn.js";
import * as SecureStore from "expo-secure-store";
import { useEffect, useState } from "react";
import { ActivityIndicator, Button, ScrollView, Text, TextInput, View } from "react-native";

// import EncryptedStorage from "react-native-encrypted-storage";
import { mpcViewStyles as styles } from "./styles";
// IMP END - Auth Provider Login

// IMP START - SDK Initialization
// IMP START - Dashboard Registration
const web3AuthClientId = "BPi5PB_UiIZ-cPz1GtV5i1I2iOSOHuimiXBI0e-Oe_u6X3oVAbCiAZOTEBtTXw4tsluTITPqA8zMsfxIKMjiqNQ"; // get from https://dashboard.web3auth.io
// IMP END - Dashboard Registration

// IMP START - Verifier Creation
const verifier = "torus-test-health";
// IMP END - Verifier Creation

// // setup async storage for react native
const asyncStorageKey = {
  getItem: async (key: string) => {
    return SecureStore.getItemAsync(key);
  },
  setItem: async (key: string, value: string) => {
    return SecureStore.setItemAsync(key, value);
  },
};

const coreKitInstance = new mpclib.Web3AuthMPCCoreKitRN({
  web3AuthClientId,
  web3AuthNetwork: WEB3AUTH_NETWORK.MAINNET,
  uxMode: "react-native",
  tssLib: TssFrostLib, // tss lib bridge for react native
  manualSync: false, // This is the recommended approach
  storage: asyncStorageKey, // Add the storage property
} as Web3AuthOptions);

export default function MPCDemo() {
  const [bridgeReady, setBridgeReady] = useState<boolean>(false);
  const [consoleUI, setConsoleUI] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(false);

  const [coreKitStatus, setCoreKitStatus] = useState<COREKIT_STATUS>(COREKIT_STATUS.NOT_INITIALIZED);

  const [email, setEmail] = useState<string>("");
  const [password, setPassword] = useState<string>("");
  const [mnemonicFactor, setMnemonicFactor] = useState<string>("");
  const [backupFactorKey, setBackupFactorKey] = useState<string>("");

  // const [coreKitInstance] = useState(coreKitInstanceGlobal);

  useEffect(() => {
    if (bridgeReady) {
      const init = async () => {
        try {
          // IMP START - SDK Initialization
          await coreKitInstance.init();
          // IMP END - SDK Initialization
        } catch (error) {
          //   uiConsole(error, 'mounted caught');
        }
        setCoreKitStatus(coreKitInstance.status);
        uiConsole(coreKitInstance.state);
      };
      init();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bridgeReady]);

  const uiConsole = (...args: any) => {
    setConsoleUI(`[LOG]${JSON.stringify(args)}\n${consoleUI}`);
    console.log(...args);
  };

  // IMP START - Auth Provider Login
  const mockLogin2 = async (emailID: string) => {
    const req = new Request("https://li6lnimoyrwgn2iuqtgdwlrwvq0upwtr.lambda-url.eu-west-1.on.aws/", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ verifier: "torus-key-test", scope: "email", extraPayload: { email: emailID }, alg: "ES256" }),
    });

    const resp = await fetch(req);
    const bodyJson = (await resp.json()) as { token: string };
    const idToken = bodyJson.token;
    const parsedToken = parseToken(idToken);
    return { idToken, parsedToken };
  }; // IMP END - Auth Provider Login

  // IMP END - Auth Provider Login

  const login = async () => {
    try {
      if (!coreKitInstance) {
        throw new Error("initiated to login");
      }
      uiConsole("Logging in");
      setLoading(true);
      // IMP START - Auth Provider Login
      const loginRes = await mockLogin2(email);
      // IMP END - Auth Provider Login
      uiConsole("Login success", loginRes);

      // IMP START - Login
      const idToken = await loginRes.idToken;

      uiConsole("idToken", idToken);
      const parsedToken = parseToken(idToken);

      const LoginParams = {
        verifier,
        verifierId: parsedToken.email,
        idToken,
      } as JWTLoginParams;

      uiConsole(parsedToken);

      await coreKitInstance.loginWithJWT(LoginParams);
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
      setLoading(false);
      uiConsole(err);
    }
  };

  // IMP START - Recover MFA Enabled Account
  const inputBackupFactorKey = async (factorkey: string) => {
    if (!coreKitInstance) {
      throw new Error("coreKitInstance not found");
    }
    if (!factorkey) {
      throw new Error("backupFactorKey not found");
    }
    setLoading(true);
    const factorKey = new BN(factorkey, "hex");
    await coreKitInstance.inputFactorKey(factorKey);

    setCoreKitStatus(coreKitInstance.status);
    setLoading(false);
    if (coreKitInstance.status === COREKIT_STATUS.REQUIRED_SHARE) {
      uiConsole(
        "required more shares even after inputing backup factor key, please enter your backup/ device factor key, or reset account [unrecoverable once reset, please use it with caution]"
      );
    }
  };

  // recovery
  const getSocialMFAFactorKey = () => {};

  // logIn

  const getUserInfo = async () => {};
  const keyDetails = async () => {
    if (!coreKitInstance) {
      throw new Error("coreKitInstance not found");
    }
    uiConsole(await coreKitInstance.getKeyDetails());
  };
  const getAccounts = async () => {
    const result = await coreKitInstance.getPubKeyEd25519();
    try {
      const pubkey = new PublicKey(result);
      uiConsole("getPubKeyEd25519", pubkey);
    } catch (e) {
      console.log(e);
    }
  };
  const getBalance = async () => {
    const devnet = clusterApiUrl("devnet");
    const conn = new Connection(devnet);
    const balance = await conn.getBalance(new PublicKey(await coreKitInstance.getPubKeyEd25519()));
    uiConsole("getBalance", `${balance} lamports`);
  };
  const signMessage = async () => {
    const message = "Hello World";

    const result = await coreKitInstance.sign(Buffer.from(message, "utf8"));
    uiConsole("sign", result);
  };

  const sendTransaction = async () => {
    const corekitPubKey = new PublicKey(await coreKitInstance.getPubKeyEd25519());

    const devnet = clusterApiUrl("devnet");
    const conn = new Connection(devnet);
    const blockhash = await conn.getLatestBlockhash();
    const inst = SystemProgram.transfer({
      fromPubkey: corekitPubKey,
      toPubkey: corekitPubKey,
      lamports: 100,
    });
    const txMessage = new TransactionMessage({
      payerKey: corekitPubKey,
      recentBlockhash: blockhash.blockhash,
      instructions: [inst],
    });
    const vtx = new VersionedTransaction(txMessage.compileToV0Message());
    const msg = vtx.message.serialize();
    const signature = await coreKitInstance.sign(Buffer.from(msg));

    vtx.addSignature(corekitPubKey, Buffer.from(signature));

    const result = await conn.sendTransaction(vtx);

    uiConsole("signTransaction", result);
  };

  const enableMFA = async () => {
    if (!coreKitInstance) {
      throw new Error("coreKitInstance is not set");
    }
    setLoading(true);
    try {
      uiConsole("Enabling MFA, please wait");
      // const factorKey = new BN(await getSocialMFAFactorKey(), "hex");
      await coreKitInstance.enableMFA({}, false);

      uiConsole(
        "MFA enabled, device factor stored in local store, deleted hashed cloud key, your firebase email password login (hardcoded in this example) is used as the social backup factor"
      );
    } catch (error: any) {
      uiConsole(error.message);
    }
    setLoading(false);
  };

  const exportMnemonicFactor = async () => {
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
    // if (coreKitInstance.status === COREKIT_STATUS.LOGGED_IN) {
    //   await coreKitInstance.commitChanges();
    // }
  };

  const getDeviceFactor = async () => {
    try {
      const factorKey = await coreKitInstance.getDeviceFactor();
      setBackupFactorKey(factorKey);
      uiConsole("Device share: ", factorKey);
    } catch (e) {
      console.log("catch error");
      uiConsole(e);
    }
  };

  const getNodeSignatures = async () => {
    const { signatures } = coreKitInstance;
    uiConsole("Node signatures: ", signatures);
  };

  const storeDeviceFactor = async () => {
    try {
      console.log(1000000n);
      const currentFactor = coreKitInstance.getCurrentFactorKey();
      uiConsole("current factor: ", currentFactor);
      await coreKitInstance.setDeviceFactor(currentFactor.factorKey, true);
      uiConsole("stored factor");
    } catch (error: any) {
      uiConsole(error.message);
    }
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
      uiConsole("logged out from auth0");
    } catch (error: any) {
      uiConsole(error.message);
    }
    uiConsole("logged out from web3auth");
  };

  const criticalResetAccount = async () => {
    // This is a critical function that should only be used for testing purposes
    // Resetting your account means clearing all the metadata associated with it from the metadata server
    // The key details will be deleted from our server and you will not be able to recover your account
    if (!coreKitInstance) {
      throw new Error("coreKitInstance is not set");
    }
    setLoading(true);
    await coreKitInstance._UNSAFE_resetAccount();
    setLoading(false);
    logout();
  };

  const getMnemonicToFactorKeyHex = (mnemonic: string) => {
    if (!coreKitInstance) {
      throw new Error("coreKitInstance is not set");
    }
    setLoading(true);
    uiConsole("mnemonic: ", mnemonicToKey(mnemonic));
    const factorKey = new BN(mnemonicToKey(mnemonic), "hex");
    setBackupFactorKey(factorKey.toString("hex"));
    uiConsole("Factor key: ", factorKey);
    setLoading(false);
  };

  const loginScreen = (
    <View style={styles.buttonArea}>
      <Text style={styles.heading}>MPC Core Kit RN Quick Start</Text>
      <Text style={styles.subHeading}>This is a test example, you can enter a random email & password to create a new account</Text>
      <View style={styles.section}>
        <Text>Enter your Email</Text>
        <TextInput style={styles.input} onChangeText={setEmail} value={email} secureTextEntry={false} autoCapitalize="none" />
      </View>
      <View style={styles.section}>
        <Text>Enter your Password</Text>
        <TextInput style={styles.input} onChangeText={setPassword} value={password} secureTextEntry={true} autoCapitalize="none" />
      </View>
      <Button title="Register/Login with Web3Auth" onPress={login} />
    </View>
  );
  const recoveryScreen = (
    <View>
      <View style={styles.section}>
        <Button disabled={coreKitStatus !== COREKIT_STATUS.REQUIRED_SHARE} title="Get Device Factor" onPress={() => getDeviceFactor()} />
        <Button disabled={coreKitStatus !== COREKIT_STATUS.REQUIRED_SHARE} title="Get Social Backup Factor" onPress={() => getSocialMFAFactorKey()} />
      </View>
      <View style={styles.section}>
        <Text>Recover Using Mnemonic Factor Key:</Text>
        <TextInput style={styles.input} onChangeText={setMnemonicFactor} value={mnemonicFactor} />
        <Button
          disabled={coreKitStatus !== COREKIT_STATUS.REQUIRED_SHARE}
          title="Get Recovery Factor Key using Mnemonic"
          onPress={() => getMnemonicToFactorKeyHex(mnemonicFactor)}
        />
      </View>
      <View style={styles.section}>
        <Text>Backup/ Device Factor: {backupFactorKey}</Text>
        <Button
          disabled={coreKitStatus !== COREKIT_STATUS.REQUIRED_SHARE}
          title="Input Backup Factor Key"
          onPress={() => inputBackupFactorKey(backupFactorKey)}
        />
      </View>
      <Button title="[CRITICAL] Reset Account" onPress={criticalResetAccount} />
    </View>
  );

  const loggedInView = (
    <View style={styles.compressedButtons}>
      <Text style={styles.heading}>MPC Core Kit RN Quick Start</Text>
      <Button title="Get User Info" onPress={getUserInfo} />
      <Button title="Key Details" onPress={keyDetails} />
      <Button title="Get Accounts" onPress={getAccounts} />
      <Button title="Get Balance" onPress={getBalance} />
      <Button title="Sign Message" onPress={signMessage} />
      <Button title="Send Transaction" onPress={sendTransaction} />

      <Button title="Enable MFA" onPress={enableMFA} />
      <Button title="Generate Backup (Mnemonic) - CreateFactor" onPress={exportMnemonicFactor} />

      <Button title="Get node Signatures" onPress={() => getNodeSignatures()} />
      <Button title="Get Device Factor" onPress={() => getDeviceFactor()} />
      <Button title="store Device Factor" onPress={() => storeDeviceFactor()} />
      {/* <Button title="Store Device Factor" onPress={() => storeDeviceFactor()} /> */}
      <Button title="Log Out" onPress={logout} />
      <Button title="[CRITICAL] Reset Account" onPress={criticalResetAccount} />
    </View>
  );

  const unloggedInView = <View style={styles.buttonArea}>{coreKitStatus !== COREKIT_STATUS.REQUIRED_SHARE ? loginScreen : recoveryScreen}</View>;

  return (
    <View style={styles.container}>
      {coreKitStatus === COREKIT_STATUS.LOGGED_IN ? loggedInView : unloggedInView}
      <View style={styles.consoleArea}>
        <Text style={styles.consoleText}>Console:</Text>
        {loading && <ActivityIndicator />}
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
