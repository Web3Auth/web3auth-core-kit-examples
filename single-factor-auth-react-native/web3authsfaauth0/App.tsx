/* eslint-disable @typescript-eslint/no-use-before-define */
/* eslint-disable @typescript-eslint/ban-ts-comment */
import { decode as atob } from "base-64";
// @ts-ignore
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
import RPC from './ethersRPC'; // for using ethers.js

import Web3Auth from '@web3auth/single-factor-auth-react-native';
import {EthereumPrivateKeyProvider} from '@web3auth/ethereum-provider';
import * as SecureStore from "expo-secure-store";
import { Auth0Provider, useAuth0 } from "react-native-auth0";

const Home = () => {
  const [privateKey, setPrivateKey] = useState<string | null>();
  const [loading, setLoading] = useState<boolean>(false);
  const [userInfo, setUserInfo] = useState<string>('');
  const [consoleUI, setConsoleUI] = useState<string>('');
  const [web3auth, setWeb3Auth] = useState<Web3Auth | null>(null);

  useEffect(() => {
    async function init() {
      try {
        const authProvider = new Web3Auth(SecureStore, {
          clientId:
            'BEglQSgt4cUWcj6SKRdu5QkOXTsePmMcusG5EAoyjyOYKlVRjIF1iCNnMOTfpzCiunHRrMui8TIwQPXdkQ8Yxuk', // Get your Client ID from Web3Auth Dashboard
          web3AuthNetwork: 'cyan',
          usePnPKey: false, // By default, this sdk returns CoreKitKey
        });

        const privateKeyProvider = new EthereumPrivateKeyProvider({
          config: {
            /*
              pass the chain config that you want to connect with
              all chainConfig fields are required.
              */
            chainConfig: {
              chainId: '0x1',
              rpcTarget: 'https://rpc.ankr.com/eth',
              displayName: 'mainnet',
              blockExplorer: 'https://etherscan.io/',
              ticker: 'ETH',
              tickerName: 'Ethereum',
            },
          },
        });
        setWeb3Auth(authProvider);
        await authProvider.init(privateKeyProvider);

        if (authProvider.connected) {
          const finalPrivateKey = await authProvider.provider!.request({
            method: 'eth_private_key',
          });

          setPrivateKey(finalPrivateKey as string);
          uiConsole('Private Key: ' + finalPrivateKey);
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
      console.log("parsedToken", parsedToken);

      const verifier = "web3auth-auth0-demo";
      const verifierId = parsedToken.sub;

      const provider = await web3auth!.connect({
        verifier, // e.g. `web3auth-sfa-verifier` replace with your verifier name, and it has to be on the same network passed in init().
        verifierId, // e.g. `Yux1873xnibdui` or `name@email.com` replace with your verifier id(sub or email)'s value.
        idToken,
      });
      const finalPrivateKey = await provider!.request({
        method: 'eth_private_key',
      });

      setPrivateKey(finalPrivateKey as string);
      uiConsole('Private Key: ' + finalPrivateKey);

      setLoading(false);
      uiConsole('Logged In');
    } catch (e) {
      uiConsole(e);
      setLoading(false);
    }
  };

  const getChainId = async () => {
    setConsoleUI('Getting chain id');
    const networkDetails = await RPC.getChainId();
    uiConsole(networkDetails);
  };

  const getAccounts = async () => {
    setConsoleUI('Getting account');
    const address = await RPC.getAccounts(privateKey as string);
    uiConsole(address);
  };
  const getBalance = async () => {
    setConsoleUI('Fetching balance');
    const balance = await RPC.getBalance(privateKey as string);
    uiConsole(balance);
  };
  const sendTransaction = async () => {
    setConsoleUI('Sending transaction');
    const tx = await RPC.sendTransaction(privateKey as string);
    uiConsole(tx);
  };
  const signMessage = async () => {
    setConsoleUI('Signing message');
    const message = await RPC.signMessage(privateKey as string);
    uiConsole(message);
  };
  const authenticateUser = async () => {
    setConsoleUI('Authenticating user');
    const data = await web3auth!
      .authenticateUser()
      .catch(error => console.log('error', error));
    uiConsole(data);
  };
  const logout = async () => {
    await clearSession({ customScheme: "auth0.com.web3authsfaauth0" });
    setPrivateKey(null);
    setUserInfo('');
  };

  const uiConsole = (...args: any) => {
    setConsoleUI(JSON.stringify(args || {}, null, 2) + '\n\n\n\n' + consoleUI);
    console.log(...args);
  };

  const loggedInView = (
    <View style={styles.buttonArea}>
      <Button title="Get User Info" onPress={() => uiConsole(userInfo)} />
      <Button title="Get Chain ID" onPress={() => getChainId()} />
      <Button title="Get Accounts" onPress={() => getAccounts()} />
      <Button title="Get Balance" onPress={() => getBalance()} />
      <Button title="Send Transaction" onPress={() => sendTransaction()} />
      <Button title="Sign Message" onPress={() => signMessage()} />
      <Button title="Get Private Key" onPress={() => uiConsole(privateKey)} />
      <Button title="Authenticate user" onPress={authenticateUser} />
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
      {privateKey ? loggedInView : unloggedInView}
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
    <Auth0Provider domain={"shahbaz-torus.us.auth0.com"} clientId={"294QRkchfq2YaXUbPri7D6PH7xzHgQMT"}>
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