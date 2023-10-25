import '@ethersproject/shims';
import { decode as atob } from "base-64";
import React, {useEffect, useState} from 'react';
import {
  Button,
  ScrollView,
  StyleSheet,
  Text,
  View,
  Dimensions,
  ActivityIndicator,
} from 'react-native';
import {IProvider} from '@web3auth/base';

import Web3Auth from '@web3auth/single-factor-auth-react-native';
import {EthereumPrivateKeyProvider} from '@web3auth/ethereum-provider';
import * as SecureStore from "expo-secure-store";
import { Auth0Provider, useAuth0 } from "react-native-auth0";
import {ethers} from 'ethers';

const clientId =
  'BPi5PB_UiIZ-cPz1GtV5i1I2iOSOHuimiXBI0e-Oe_u6X3oVAbCiAZOTEBtTXw4tsluTITPqA8zMsfxIKMjiqNQ'; // get from https://dashboard.web3auth.io

const verifier = 'w3a-auth0-demo';

const chainConfig = {
  chainId: '0x1', // Please use 0x1 for Mainnet
  rpcTarget: 'https://rpc.ankr.com/eth',
  displayName: 'Ethereum Mainnet',
  blockExplorer: 'https://etherscan.io/',
  ticker: 'ETH',
  tickerName: 'Ethereum',
};

const web3auth = new Web3Auth(SecureStore, {
  clientId,
  web3AuthNetwork: 'sapphire_mainnet',
  usePnPKey: false, // By default, this sdk returns CoreKitKey
});

const privateKeyProvider = new EthereumPrivateKeyProvider({
  config: {chainConfig},
});

const Home = () => {
  const [provider, setProvider] = useState<IProvider | null>(null);
  const [loggedIn, setLoggedIn] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(false);
  const [userInfo, setUserInfo] = useState<string>('');
  const [consoleUI, setConsoleUI] = useState<string>('');

  useEffect(() => {
    async function init() {
      try {
        await web3auth.init(privateKeyProvider);

        if (web3auth.sessionId) {
          setProvider(web3auth.provider);
          setLoggedIn(true);
          uiConsole('Logged In', web3auth.sessionId);
        }
      } catch (error) {
        uiConsole(error, 'mounted caught');
      }
    }
    init();
  }, []);

  const { authorize, clearSession, getCredentials } = useAuth0();

  const signInWithAuth0 = async () => {
    try {
      //@ts-ignore
      await authorize({ scope: "openid profile email" }, { customScheme: "auth0.com.web3authsfaauth0" }, { responseType: "token id_token" });
      const credentials = await getCredentials();

      return credentials.idToken;
    } catch (error) {
      console.error(error);
    }
  };

  const parseToken = (token: any) => {
    try {
      const base64Url = token.split('.')[1];
      const base64 = base64Url.replace('-', '+').replace('_', '/');
      return JSON.parse(atob(base64 || ''));
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
      const provider = await web3auth!.connect({
        verifier, // e.g. `web3auth-sfa-verifier` replace with your verifier name, and it has to be on the same network passed in init().
        verifierId, // e.g. `Yux1873xnibdui` or `name@email.com` replace with your verifier id(sub or email)'s value.
        idToken,
      });

      setLoading(false);
      if (web3auth.connected) {
        setLoggedIn(true);
        uiConsole('Logged In');
      }
    } catch (e) {
      uiConsole(e);
      setLoading(false);
    }
  };

  const getAccounts = async () => {
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
    web3auth.logout();
    setProvider(null);
    setLoggedIn(false);
    setUserInfo('');
  };

  const uiConsole = (...args: any) => {
    setConsoleUI(JSON.stringify(args || {}, null, 2) + '\n\n\n\n' + consoleUI);
    console.log(...args);
  };

  const loggedInView = (
    <View style={styles.buttonArea}>
    <Button title="Get User Info" onPress={() => uiConsole(userInfo)} />
    <Button title="Get Accounts" onPress={() => getAccounts()} />
    <Button title="Get Balance" onPress={() => getBalance()} />
    <Button title="Sign Message" onPress={() => signMessage()} />
    <Button title="Log Out" onPress={logout} />
    </View>
  );

  const unloggedInView = (
    <View style={styles.buttonArea}>
      <Button title="Login with Web3Auth" onPress={login} />
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
}

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
});

export default App;