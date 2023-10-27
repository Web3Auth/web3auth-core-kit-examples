/* eslint-disable @typescript-eslint/no-use-before-define */
/* eslint-disable @typescript-eslint/ban-ts-comment */
import { Dialog, Input } from "@rneui/themed";
import { decode as atob } from "base-64";
// @ts-ignore
import React, { useEffect, useState } from "react";
import { ActivityIndicator, Button, TouchableOpacity, Dimensions, ScrollView, StyleSheet, Text, View } from "react-native";
import { Auth0Provider, useAuth0 } from "react-native-auth0";
import * as SecureStore from "expo-secure-store";
import { tKey, chainConfig } from "./tkey";
import { ShareSerializationModule } from "@tkey/share-serialization";
import SfaServiceProvider from "@tkey/service-provider-sfa";
import ReactNativeStorageModule from "@tkey/react-native-storage";
import '@ethersproject/shims';
import {ethers} from 'ethers';
import {EthereumPrivateKeyProvider} from '@web3auth/ethereum-provider';
import {IProvider} from '@web3auth/base';

const verifier = 'w3a-auth0-demo';

const ethereumPrivateKeyProvider = new EthereumPrivateKeyProvider({
  config: {
    chainConfig,
  },
});

const Home = () => {
  const [tKeyInitialised, setTKeyInitialised] = useState(false);
  const [provider, setProvider] = useState<IProvider | null>(null);
  const [loggedIn, setLoggedIn] = useState(false);
  const [userInfo, setUserInfo] = useState({});
  const [recoveryShare, setRecoveryShare] = useState<string>('');
  const [mnemonicShare, setMnemonicShare] = useState<string>('');
  const [consoleUI, setConsoleUI] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);

  useEffect(() => {
    const init = async () => {
      // Initialization of Service Provider
      try {
        await (tKey.serviceProvider as any).init(
          ethereumPrivateKeyProvider,
        );
      } catch (error) {
        console.error(error);
      }
    };
    init();
  }, []);

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

      const verifierId = parsedToken.sub;

      const OAuthShareKey = await (
        tKey.serviceProvider as SfaServiceProvider
      ).connect({
        verifier,
        verifierId,
        idToken,
      });

      await tKey.initialize();

      setTKeyInitialised(true);

      var {requiredShares} = tKey.getKeyDetails();


      uiConsole('requiredShares', requiredShares);

      if (requiredShares > 0) {
        uiConsole(
          'Please enter your backup shares, requiredShares:',
          requiredShares,
        );
      } else {
        await reconstructKey();
      }
    } catch (e) {
      uiConsole(e);
      setLoading(false);
    }
  };

  const reconstructKey = async () => {
    try {
      const reconstructedKey = await tKey.reconstructKey();
      const privateKey = reconstructedKey?.privKey.toString('hex');

      await ethereumPrivateKeyProvider.setupProvider(privateKey);
      setProvider(ethereumPrivateKeyProvider);
      setLoggedIn(true);
      setDeviceShare();
    } catch (e) {
      uiConsole(e);
    }
  };

  const inputRecoveryShare = async (share: string) => {
    try {
      await tKey.inputShare(share);
      await reconstructKey();
      uiConsole('Recovery Share Input Successfully');
      return;
    } catch (error) {
      uiConsole('Input Recovery Share Error:', error);
    }
  };

  const keyDetails = async () => {
    if (!tKey) {
      uiConsole('tKey not initialized yet');
      return;
    }
    const keyDetail = await tKey.getKeyDetails();
    uiConsole(keyDetail);
  };

  const setDeviceShare = async () => {
    try {
      const generateShareResult = await tKey.generateNewShare();
      const share = await tKey.outputShareStore(
        generateShareResult.newShareIndex,
      );
      await (
        tKey.modules.reactNativeStorage as ReactNativeStorageModule
      ).storeDeviceShare(share);
      uiConsole('Device Share Set', JSON.stringify(share));
    } catch (error) {
      uiConsole('Error', (error as any)?.message.toString(), 'error');
    }
  };

  const getDeviceShare = async () => {
    try {
      const share = await (
        tKey.modules.reactNativeStorage as ReactNativeStorageModule
      ).getStoreFromReactNativeStorage();

      if (share) {
        uiConsole(
          'Device Share Captured Successfully across',
          JSON.stringify(share),
        );
        setRecoveryShare(share.share.share.toString('hex'));
        return share;
      }
      uiConsole('Device Share Not found');
      return null;
    } catch (error) {
      uiConsole('Error', (error as any)?.message.toString(), 'error');
    }
  };

  const deleteDeviceShare = async () => {
    try {
      const metadata = await tKey.getMetadata();
      await SecureStore.deleteItemAsync(metadata.pubKey.x.toString('hex'));
      uiConsole('Device Share Deleted');
    } catch (error) {
      uiConsole('Error', (error as any)?.message.toString(), 'error');
    }
  };

  const exportMnemonicShare = async () => {
    try {
      const generateShareResult = await tKey.generateNewShare();
      const share = await tKey.outputShareStore(
        generateShareResult.newShareIndex,
      ).share.share;
      const mnemonic = await (
        tKey.modules.shareSerialization as ShareSerializationModule
      ).serialize(share, 'mnemonic');
      uiConsole(mnemonic);
      return mnemonic;
    } catch (error) {
      uiConsole(error);
    }
  };

  const MnemonicToShareHex = async (mnemonic: string) => {
    if (!tKey) {
      uiConsole('tKey not initialized yet');
      return;
    }
    try {
      const share = await (
        tKey.modules.shareSerialization as ShareSerializationModule
      ).deserialize(mnemonic, 'mnemonic');
      setRecoveryShare(share.toString('hex'));
      return share;
    } catch (error) {
      uiConsole(error);
    }
  };


  const getUserInfo = async () => {
    uiConsole(userInfo);
  };

  const getAccounts = async () => {
    if (!provider) {
      uiConsole('provider not set');
      return;
    }
    setConsoleUI('Getting account');
    // For ethers v5
    // const ethersProvider = new ethers.providers.Web3Provider(this.provider);
    const ethersProvider = new ethers.BrowserProvider(provider!);

    // For ethers v5
    // const signer = ethersProvider.getSigner();
    const signer = await ethersProvider.getSigner();

    // Get user's Ethereum public address
    const address = signer.getAddress();
    uiConsole(address);
  };

  const getBalance = async () => {
    if (!provider) {
      uiConsole('provider not set');
      return;
    }
    setConsoleUI('Fetching balance');
    // For ethers v5
    // const ethersProvider = new ethers.providers.Web3Provider(this.provider);
    const ethersProvider = new ethers.BrowserProvider(provider!);

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
      await ethersProvider.getBalance(address), // Balance is in wei
    );
    uiConsole(balance);
  };

  const signMessage = async () => {
    if (!provider) {
      uiConsole('provider not set');
      return;
    }
    setConsoleUI('Signing message');
    // For ethers v5
    // const ethersProvider = new ethers.providers.Web3Provider(this.provider);
    const ethersProvider = new ethers.BrowserProvider(provider!);

    // For ethers v5
    // const signer = ethersProvider.getSigner();
    const signer = await ethersProvider.getSigner();
    const originalMessage = 'YOUR_MESSAGE';

    // Sign the message
    const signedMessage = await signer.signMessage(originalMessage);
    uiConsole(signedMessage);
  };

  const logout = async () => {
    setProvider(null);
    setLoggedIn(false);
    setUserInfo({});
    uiConsole('logged out');
  };

  const criticalResetAccount = async (): Promise<void> => {
    // This is a critical function that should only be used for testing purposes
    // Resetting your account means clearing all the metadata associated with it from the metadata server
    // The key details will be deleted from our server and you will not be able to recover your account
    if (!tKeyInitialised) {
      throw new Error('tKeyInitialised is initialised yet');
    }
    await tKey.storageLayer.setMetadata({
      privKey: tKey.serviceProvider.postboxKey,
      input: {message: 'KEY_NOT_FOUND'},
    });
    uiConsole('reset');
    logout();
  };

  const uiConsole = (...args: any) => {
    setConsoleUI(`${JSON.stringify(args || {}, null, 2)}\n\n\n\n${consoleUI}`);
    console.log(...args);
  };


  const loggedInView = (
    <View style={styles.buttonArea}>
      <TouchableOpacity onPress={getUserInfo}>
        <Text>Get User Info</Text>
      </TouchableOpacity>
      <TouchableOpacity onPress={keyDetails}>
        <Text>Get Key Details</Text>
      </TouchableOpacity>
      <TouchableOpacity onPress={exportMnemonicShare}>
        <Text>Generate Backup (Mnemonic)</Text>
      </TouchableOpacity>
      <TouchableOpacity onPress={getAccounts}>
        <Text>Get Accounts</Text>
      </TouchableOpacity>
      <TouchableOpacity onPress={getBalance}>
        <Text>Get Balance</Text>
      </TouchableOpacity>
      <TouchableOpacity onPress={signMessage}>
        <Text>Sign Message</Text>
      </TouchableOpacity>
      <TouchableOpacity onPress={getDeviceShare}>
        <Text>Get Device Share</Text>
      </TouchableOpacity>
      <TouchableOpacity onPress={setDeviceShare}>
        <Text>Set Device Share</Text>
      </TouchableOpacity>
      <TouchableOpacity onPress={deleteDeviceShare}>
        <Text>Delete Device Share</Text>
      </TouchableOpacity>
      <TouchableOpacity onPress={logout}>
        <Text>Log Out</Text>
      </TouchableOpacity>
      <TouchableOpacity onPress={criticalResetAccount}>
        <Text>[CRITICAL] Reset Account</Text>
      </TouchableOpacity>
    </View>
  );

  const unloggedInView = (
    <View style={styles.buttonArea}>
      <Button title="Login with Web3Auth" onPress={login} />
      <Button
        title="Get Device Share"
        onPress={async () => {
          await getDeviceShare();
          setLoading(false);
        }}
        disabled={!tKeyInitialised}
      />
      <Input
        value={recoveryShare}
        placeholder="Recovery Share"
        onChangeText={value => setRecoveryShare(value)}
        disabled={!tKeyInitialised}
        inputContainerStyle={styles.inputField}
      />
      <Button
        title="Input Recovery Share"
        onPress={async () => {
          await inputRecoveryShare(recoveryShare);
          setLoading(false);
        }}
        disabled={!tKeyInitialised}
      />
      <Button
        title="Reset Account"
        onPress={criticalResetAccount}
        disabled={!tKeyInitialised}
      />
      <Input
        value={mnemonicShare}
        placeholder="Enter Mnemonic Share"
        onChangeText={value => setMnemonicShare(value)}
        disabled={!tKeyInitialised}
        inputContainerStyle={styles.inputField}
      />
      <Button
        title="Get Recovery Share using Mnemonic"
        onPress={async () => {
          await MnemonicToShareHex(mnemonicShare);
          setLoading(false);
        }}
        disabled={!tKeyInitialised}
      />
      {loading && <ActivityIndicator />}
    </View>
  );


  return (
    <View style={styles.container}>
      {loggedIn ? loggedInView : unloggedInView}
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
    <Auth0Provider domain={"https://web3auth.au.auth0.com"} clientId={"hUVVf4SEsZT7syOiL0gLU9hFEtm2gQ6O"}>
      <Home />
    </Auth0Provider>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 50,
    paddingBottom: 30,
  },
  consoleArea: {
    margin: 20,
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
  },
  consoleUI: {
    flex: 1,
    backgroundColor: '#CCCCCC',
    color: '#ffffff',
    padding: 10,
    width: Dimensions.get('window').width - 60,
  },
  consoleText: {
    padding: 10,
  },
  buttonArea: {
    flex: 2,
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingBottom: 30,
  },
  inputField: {
    width: Dimensions.get('window').width - 90,
  },
});

export default App;
