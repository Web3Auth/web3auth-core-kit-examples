/* eslint-disable @typescript-eslint/no-use-before-define */
/* eslint-disable @typescript-eslint/ban-ts-comment */
import { Dialog, Input } from "@rneui/themed";
import { EthereumPrivateKeyProvider } from "@web3auth/ethereum-provider";
import Web3Auth from "@web3auth/node-sdk";
import { decode as atob } from "base-64";
// @ts-ignore
import React, { useEffect, useState } from "react";
import { ActivityIndicator, Button, Dimensions, ScrollView, StyleSheet, Text, View } from "react-native";
import { Auth0Provider, useAuth0 } from "react-native-auth0";

import RPC from "./ethersRPC"; // for using ethers.js
import { getNewTKeyInstance, tKeyInstance } from "./tkey";

const Home = () => {
  const [tKey, setTKey] = useState<typeof tKeyInstance>(tKeyInstance);
  const [privateKey, setPrivateKey] = useState<string | null>();
  const [loading, setLoading] = useState<boolean>(false);
  const [oAuthShare, setOAuthShare] = useState<any>(null);
  const [userInfo, setUserInfo] = useState<string>("");
  const [consoleUI, setConsoleUI] = useState<string>("");
  const [recoveryPassword, setRecoveryPassword] = useState<string>("");
  const [recoveryModalVisibility, setRecoveryModalVisibility] = useState<boolean>(false);
  const [passwordShareModalVisibility, setPasswordShareModalVisibility] = useState<boolean>(false);
  const [changePasswordShareModalVisibility, setChangePasswordShareModalVisibility] = useState<boolean>(false);

  const web3auth = new Web3Auth({
    clientId: "BEglQSgt4cUWcj6SKRdu5QkOXTsePmMcusG5EAoyjyOYKlVRjIF1iCNnMOTfpzCiunHRrMui8TIwQPXdkQ8Yxuk", // Get your Client ID from Web3Auth Dashboard
    web3AuthNetwork: "cyan",
    usePnPKey: false, // By default, this sdk returns CoreKitKey
  });

  const privateKeyProvider = new EthereumPrivateKeyProvider({
    config: {
      /*
        pass the chain config that you want to connect with
        all chainConfig fields are required.
        */
      chainConfig: {
        chainId: "0x1",
        rpcTarget: "https://rpc.ankr.com/eth",
        displayName: "mainnet",
        blockExplorer: "https://etherscan.io/",
        ticker: "ETH",
        tickerName: "Ethereum",
      },
    },
  });

  useEffect(() => {
    try {
      web3auth.init({ provider: privateKeyProvider });
    } catch (error) {
      uiConsole(error, "mounted caught");
    }
  });

  const { authorize, clearSession, getCredentials } = useAuth0();

  const signInWithAuth0 = async () => {
    try {
      await authorize({ scope: "openid profile email" }, { customScheme: "auth0.com.tkeyrnauth0" }, { responseType: "token id_token" });
      const credentials = await getCredentials();

      return credentials.idToken;
    } catch (error) {
      console.error(error);
    }
  };

  const parseToken = (token: any) => {
    try {
      const base64Url = token.split(".")[1];
      const base64 = base64Url.replace("-", "+").replace("_", "/");
      return JSON.parse(atob(base64 || ""));
    } catch (err) {
      uiConsole(err);
      return null;
    }
  };

  const login = async () => {
    try {
      setConsoleUI("Logging in");
      setLoading(true);
      const idToken = await signInWithAuth0();
      uiConsole("idToken", idToken);

      const parsedToken = parseToken(idToken);
      setUserInfo(parsedToken);

      const verifier = "web3auth-auth0-demo";
      const verifierId = parsedToken.sub;

      const OAuthShareProvider = await web3auth.connect({
        verifier, // e.g. `web3auth-sfa-verifier` replace with your verifier name, and it has to be on the same network passed in init().
        verifierId, // e.g. `Yux1873xnibdui` or `name@email.com` replace with your verifier id(sub or email)'s value.
        idToken,
      });
      const OAuthShareKey = await OAuthShareProvider?.request({
        method: "eth_private_key",
      });

      tKey.serviceProvider.postboxKey = OAuthShareKey as any;
      setOAuthShare(OAuthShareKey);
      (tKey.serviceProvider as any).verifierName = verifier;
      (tKey.serviceProvider as any).verifierId = verifierId;

      await tKey.initialize();

      const { requiredShares } = tKey.getKeyDetails();

      uiConsole("requiredShares", requiredShares);

      if (requiredShares <= 0) {
        const reconstructedKey = await tKey.reconstructKey();
        const finalPrivateKey = reconstructedKey?.privKey.toString("hex");
        await setPrivateKey(finalPrivateKey);
        uiConsole(`Private Key: ${finalPrivateKey}`);
      } else {
        toggleRecoveryModalVisibility();
      }

      setLoading(false);
      uiConsole("Logged In");
    } catch (e) {
      uiConsole(e);
      setLoading(false);
    }
  };

  const recoverShare = async (password: string) => {
    if (!tKey) {
      uiConsole("tKey not initialized yet");
      return;
    }

    if (password.length > 10) {
      try {
        setLoading(true);
        await (tKey.modules.securityQuestions as any).inputShareFromSecurityQuestions(password); // 2/2 flow
        const { requiredShares } = tKey.getKeyDetails();
        if (requiredShares <= 0) {
          const reconstructedKey = await tKey.reconstructKey();
          const finalPrivateKey = reconstructedKey?.privKey.toString("hex");
          await setPrivateKey(finalPrivateKey);
          uiConsole(`Private Key: ${finalPrivateKey}`);
        }
        const newShare = await tKey.generateNewShare();
        const shareStore = await tKey.outputShareStore(newShare.newShareIndex);
        await (tKey.modules.webStorage as any).storeDeviceShare(shareStore);
        uiConsole("Successfully logged you in with the recovery password.");
      } catch (error) {
        uiConsole(error);
        setLoading(false);
      }
    } else {
      uiConsole("Error", "Password must be >= 11 characters", "error");
      setLoading(false);
    }
  };

  const changeSecurityQuestionAndAnswer = async (password: string) => {
    if (!tKey) {
      uiConsole("tKey not initialized yet");
      return;
    }

    if (password.length > 10) {
      try {
        setLoading(true);
        await (tKey.modules.securityQuestions as any).changeSecurityQuestionAndAnswer(password, "whats your password?");
        uiConsole("Successfully changed new share with password.");
      } catch (error) {
        uiConsole("Error", (error as any)?.message.toString(), "error");
        setLoading(false);
      }
    } else {
      uiConsole("Error", "Password must be >= 11 characters", "error");
      setLoading(false);
    }

    const keyDetails = await tKey.getKeyDetails();
    uiConsole(keyDetails);
  };

  const generateNewShareWithPassword = async (password: string) => {
    if (!tKey) {
      uiConsole("tKey not initialized yet");
      return;
    }
    if (password.length > 10) {
      try {
        setLoading(true);
        await (tKey.modules.securityQuestions as any).generateNewShareWithSecurityQuestions(password, "whats your password?");
        uiConsole("Successfully generated new share with password.");
      } catch (error) {
        uiConsole("Error", (error as any)?.message.toString(), "error");
        setLoading(false);
      }
    } else {
      uiConsole("Error", "Password must be >= 11 characters", "error");
      setLoading(false);
    }
  };

  const getKeyDetails = async () => {
    if (!tKey) {
      uiConsole("tKey not initialized yet");
      return;
    }

    setConsoleUI("Getting Key Details");
    uiConsole(await tKey.getKeyDetails());
  };

  const resetAccount = async () => {
    if (!tKey) {
      uiConsole("tKey not initialized yet");
      return;
    }
    try {
      uiConsole(oAuthShare);
      await tKey.storageLayer.setMetadata({
        privKey: oAuthShare as any,
        input: { message: "KEY_NOT_FOUND" },
      });
      uiConsole("Reset Account Successful.");
    } catch (e) {
      uiConsole(e);
    }
  };

  const getChainId = async () => {
    setConsoleUI("Getting chain id");
    const networkDetails = await RPC.getChainId();
    uiConsole(networkDetails);
  };

  const getAccounts = async () => {
    setConsoleUI("Getting account");
    const address = await RPC.getAccounts(privateKey as string);
    uiConsole(address);
  };
  const getBalance = async () => {
    setConsoleUI("Fetching balance");
    const balance = await RPC.getBalance(privateKey as string);
    uiConsole(balance);
  };
  const sendTransaction = async () => {
    setConsoleUI("Sending transaction");
    const tx = await RPC.sendTransaction(privateKey as string);
    uiConsole(tx);
  };
  const signMessage = async () => {
    setConsoleUI("Signing message");
    const message = await RPC.signMessage(privateKey as string);
    uiConsole(message);
  };
  const logout = async () => {
    try {
      setPrivateKey(null);
      setOAuthShare(null);
      setUserInfo("");
      const newTkey = getNewTKeyInstance();
      setTKey(newTkey);
      await clearSession({ customScheme: "{YOUR_CUSTOM_SCHEME}" });
    } catch (e) {
      console.log(e);
    }
  };

  const uiConsole = (...args: any) => {
    setConsoleUI(`${JSON.stringify(args || {}, null, 2)}\n\n\n\n${consoleUI}`);
    console.log(...args);
  };

  const toggleRecoveryModalVisibility = async () => {
    setRecoveryModalVisibility(!recoveryModalVisibility);
  };

  const recoveryModal = (
    <Dialog isVisible={recoveryModalVisibility} onBackdropPress={toggleRecoveryModalVisibility}>
      <Dialog.Title title="Enter Recovery Share" />
      <Input placeholder="Recovery Password" onChangeText={(value) => setRecoveryPassword(value)} />
      {loading && <ActivityIndicator />}
      <Button
        title="Submit"
        onPress={async () => {
          await recoverShare(recoveryPassword);
          toggleRecoveryModalVisibility();
          setLoading(false);
        }}
      />
    </Dialog>
  );

  const togglePasswordShareModalVisibility = async () => {
    setPasswordShareModalVisibility(!passwordShareModalVisibility);
  };

  const setPasswordShareModal = (
    <Dialog isVisible={passwordShareModalVisibility} onBackdropPress={togglePasswordShareModalVisibility}>
      <Dialog.Title title="Enter Recovery Share" />
      <Input placeholder="Recovery Password" onChangeText={(value) => setRecoveryPassword(value)} />
      {loading && <ActivityIndicator />}
      <Button
        title="Submit"
        onPress={async () => {
          await generateNewShareWithPassword(recoveryPassword);
          togglePasswordShareModalVisibility();
          setLoading(false);
        }}
      />
    </Dialog>
  );

  const toggleChangePasswordShareModalVisibility = async () => {
    setChangePasswordShareModalVisibility(!changePasswordShareModalVisibility);
  };

  const changePasswordShareModal = (
    <Dialog isVisible={changePasswordShareModalVisibility} onBackdropPress={toggleChangePasswordShareModalVisibility}>
      <Dialog.Title title="Enter Recovery Share" />
      <Input placeholder="Recovery Password" onChangeText={(value) => setRecoveryPassword(value)} />
      {loading && <ActivityIndicator />}
      <Button
        title="Submit"
        onPress={async () => {
          await changeSecurityQuestionAndAnswer(recoveryPassword);
          toggleChangePasswordShareModalVisibility();
          setLoading(false);
        }}
      />
    </Dialog>
  );

  const loggedInView = (
    <View style={styles.buttonArea}>
      {setPasswordShareModal}
      {changePasswordShareModal}
      <Button title="Get User Info" onPress={() => uiConsole(userInfo)} />
      <Button title="Get Key Details" onPress={() => getKeyDetails()} />
      <Button title="Get Chain ID" onPress={() => getChainId()} />
      <Button title="Set Password Share" onPress={() => togglePasswordShareModalVisibility()} />
      <Button title="Change Password Share" onPress={() => toggleChangePasswordShareModalVisibility()} />
      <Button title="Get Accounts" onPress={() => getAccounts()} />
      <Button title="Get Balance" onPress={() => getBalance()} />
      <Button title="Send Transaction" onPress={() => sendTransaction()} />
      <Button title="Sign Message" onPress={() => signMessage()} />
      <Button title="Get Private Key" onPress={() => uiConsole(privateKey)} />
      <Button title="Reset Account" onPress={resetAccount} />
      <Button title="Log Out" onPress={logout} />
    </View>
  );

  const unloggedInView = (
    <View style={styles.buttonArea}>
      {recoveryModal}
      <Button title="Login with Web3Auth" onPress={login} />
      {loading && <ActivityIndicator />}
      <Button title="Reset Account" onPress={resetAccount} />
    </View>
  );

  return (
    <View style={styles.container}>
      {privateKey ? loggedInView : unloggedInView}
      <View style={styles.consoleArea}>
        <Text style={styles.consoleText}>Console:</Text>
        <ScrollView style={styles.consoleUI}>
          <Text>{consoleUI}</Text>
        </ScrollView>
      </View>
    </View>
  );
};

const App = () => {
  return (
    <Auth0Provider domain={"shahbaz-torus.us.auth0.com"} clientId={"294QRkchfq2YaXUbPri7D6PH7xzHgQMT"}>
      <Home />
    </Auth0Provider>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
    alignItems: "center",
    justifyContent: "center",
    paddingTop: 50,
    paddingBottom: 30,
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
  buttonArea: {
    flex: 2,
    alignItems: "center",
    justifyContent: "space-around",
    paddingBottom: 30,
  },
});

export default App;
