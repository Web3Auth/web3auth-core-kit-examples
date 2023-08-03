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
import auth from '@react-native-firebase/auth';
import EncryptedStorage from 'react-native-encrypted-storage';
// @ts-ignore
import {decode as atob} from 'base-64';

import Web3Auth from '@web3auth/single-factor-auth-react-native';
import {EthereumPrivateKeyProvider} from '@web3auth/ethereum-provider';

async function signInWithEmailPassword() {
  try {
    const res = await auth().signInWithEmailAndPassword(
      'custom+jwt@firebase.login',
      'Testing@123',
    );
    return res;
  } catch (error) {
    console.error(error);
  }
}

export default function App() {
  const [privateKey, setPrivateKey] = useState<string | null>();
  const [loading, setLoading] = useState<boolean>(false);
  const [userInfo, setUserInfo] = useState<string>('');
  const [consoleUI, setConsoleUI] = useState<string>('');
  const [web3auth, setWeb3Auth] = useState<Web3Auth | null>(null);

  useEffect(() => {
    async function init() {
      try {
        const authProvider = new Web3Auth(EncryptedStorage, {
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
      setConsoleUI('Logging in');
      setLoading(true);
      const loginRes = await signInWithEmailPassword();
      uiConsole('Login success', loginRes);
      const idToken = await loginRes!.user.getIdToken(true);
      uiConsole('idToken', idToken);
      const parsedToken = parseToken(idToken);
      setUserInfo(parsedToken);

      const verifier = 'web3auth-firebase-examples';
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
