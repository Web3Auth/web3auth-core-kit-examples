// IMP START - Quick Start
import React, { useEffect, useState } from 'react';
import {
  Button,
  ScrollView,
  StyleSheet,
  Text,
  View,
  Dimensions,
  ActivityIndicator,
} from 'react-native';
// IMP END - Quick Start
import '@ethersproject/shims';
// IMP START - Auth Provider Login
import auth from '@react-native-firebase/auth';
// IMP END - Auth Provider Login
import EncryptedStorage from 'react-native-encrypted-storage';
import { decode as atob } from 'base-64';
import { IProvider } from '@web3auth/base';

import Web3Auth from '@web3auth/single-factor-auth-react-native';
import { EthereumPrivateKeyProvider } from '@web3auth/ethereum-provider';
import { ethers } from 'ethers';

// IMP START - Dashboard Registration
const clientId =
  'BPi5PB_UiIZ-cPz1GtV5i1I2iOSOHuimiXBI0e-Oe_u6X3oVAbCiAZOTEBtTXw4tsluTITPqA8zMsfxIKMjiqNQ'; // get from https://dashboard.web3auth.io
// IMP END - Dashboard Registration

// IMP START - Verifier Creation
const verifier = 'w3a-firebase-demo';
// IMP END - Verifier Creation

// IMP START - Auth Provider Login
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
// IMP END - Auth Provider Login

// IMP START - SDK Initialization
const chainConfig = {
  chainId: '0x1', // Please use 0x1 for Mainnet
  rpcTarget: 'https://rpc.ankr.com/eth',
  displayName: 'Ethereum Mainnet',
  blockExplorer: 'https://etherscan.io/',
  ticker: 'ETH',
  tickerName: 'Ethereum',
};

const web3auth = new Web3Auth(EncryptedStorage, {
  clientId, // Get your Client ID from Web3Auth Dashboard
  web3AuthNetwork: 'sapphire_mainnet',
});

const privateKeyProvider = new EthereumPrivateKeyProvider({
  config: { chainConfig },
});
// IMP END - SDK Initialization

export default function App() {
  const [provider, setProvider] = useState<IProvider | null>(null);
  const [loggedIn, setLoggedIn] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(false);
  const [userInfo, setUserInfo] = useState<string>('');
  const [consoleUI, setConsoleUI] = useState<string>('');

  useEffect(() => {
    const init = async () => {
      try {
        // IMP START - SDK Initialization
        await web3auth.init(privateKeyProvider);
        setProvider(web3auth.provider);
        // IMP END - SDK Initialization

        if (web3auth.connected) {
          setLoggedIn(true);
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
      // IMP START - Auth Provider Login
      const loginRes = await signInWithEmailPassword();
      // IMP END - Auth Provider Login
      uiConsole('Login success', loginRes);
      // IMP START - Login
      const idToken = await loginRes!.user.getIdToken(true);
      // IMP END - Login
      uiConsole('idToken', idToken);
      const parsedToken = parseToken(idToken);
      setUserInfo(parsedToken);

      // IMP START - Login
      const verifierId = parsedToken.sub;
      await web3auth!.connect({
        verifier, // e.g. `web3auth-sfa-verifier` replace with your verifier name, and it has to be on the same network passed in init().
        verifierId, // e.g. `Yux1873xnibdui` or `name@email.com` replace with your verifier id(sub or email)'s value.
        idToken,
      });
      // IMP END - Login
      setProvider(web3auth.provider);

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

  // IMP START - Blockchain Calls
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
  // IMP END - Blockchain Calls

  const logout = async () => {
    // IMP START - Logout
    web3auth.logout();
    // IMP END - Logout
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
