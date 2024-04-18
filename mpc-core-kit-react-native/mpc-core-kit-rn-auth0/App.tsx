import React, {useEffect, useState} from 'react';
import {
  Button,
  ScrollView,
  StyleSheet,
  Text,
  View,
  Dimensions,
  ActivityIndicator,
  TextInput,
} from 'react-native';
import '@ethersproject/shims';
// IMP START - Auth Provider Login
import {useAuth0, Auth0Provider} from 'react-native-auth0';
// IMP END - Auth Provider Login
import EncryptedStorage from 'react-native-encrypted-storage';
import * as TssLibRN from '@toruslabs/react-native-tss-lib-bridge';
import {Bridge} from '@toruslabs/react-native-tss-lib-bridge';
import {EthereumSigningProvider} from '@web3auth/ethereum-mpc-provider';
// IMP START - Quick Start
import {
  Web3AuthMPCCoreKit,
  WEB3AUTH_NETWORK,
  IdTokenLoginParams,
  TssShareType,
  parseToken,
  getWebBrowserFactor,
  generateFactorKey,
  COREKIT_STATUS,
  keyToMnemonic,
  mnemonicToKey,
} from '@web3auth/mpc-core-kit';
import {CHAIN_NAMESPACES} from '@web3auth/base';
// IMP END - Quick Start
import {BN} from 'bn.js';
import {ethers} from 'ethers';

// IMP START - SDK Initialization
// IMP START - Dashboard Registration
const web3AuthClientId =
  'BPi5PB_UiIZ-cPz1GtV5i1I2iOSOHuimiXBI0e-Oe_u6X3oVAbCiAZOTEBtTXw4tsluTITPqA8zMsfxIKMjiqNQ'; // get from https://dashboard.web3auth.io
// IMP END - Dashboard Registration

// IMP START - Verifier Creation
const verifier = 'w3a-auth0-demo';
// IMP END - Verifier Creation

const chainConfig = {
  chainNamespace: CHAIN_NAMESPACES.EIP155,
  chainId: '0xaa36a7', // Please use 0x1 for Mainnet
  rpcTarget: 'https://rpc.ankr.com/eth_sepolia',
  displayName: 'Ethereum Sepolia Testnet',
  blockExplorerUrl: 'https://sepolia.etherscan.io/',
  blockExplorer: 'https://sepolia.etherscan.io/',
  ticker: 'ETH',
  tickerName: 'Ethereum',
};

const coreKitInstance = new Web3AuthMPCCoreKit({
  web3AuthClientId,
  web3AuthNetwork: WEB3AUTH_NETWORK.MAINNET,
  chainConfig,
  uxMode: 'react-native',
  asyncStorageKey: {
    getItem: async (key: string) => {
      return EncryptedStorage.getItem(key);
    },
    setItem: async (key: string, value: string) => {
      return EncryptedStorage.setItem(key, value);
    },
  },
  tssLib: TssLibRN,
  setupProviderOnInit: false,
  // This is the recommended approach
  manualSync: true,
});
// IMP END - SDK Initialization

function Home() {
  const [loading, setLoading] = useState<boolean>(false);
  const [consoleUI, setConsoleUI] = useState<string>('');
  const [coreKitStatus, setCoreKitStatus] = useState<COREKIT_STATUS>(
    COREKIT_STATUS.NOT_INITIALIZED,
  );
  const [backupFactorKey, setBackupFactorKey] = useState<string>('');
  const [mnemonicFactor, setMnemonicFactor] = useState<string>('');

  useEffect(() => {
    const init = async () => {
      try {
        // IMP START - SDK Initialization
        await coreKitInstance.init();
        // IMP END - SDK Initialization
      } catch (error) {
        uiConsole(error, 'mounted caught');
      }
      setCoreKitStatus(coreKitInstance.status);
    };
    init();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const {authorize, clearSession, getCredentials} = useAuth0();

  const signInWithAuth0 = async () => {
    try {
      //@ts-ignore
      await authorize(
        {
          scope: 'openid profile email',
          // connection: 'google-oauth2',
        },
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
        throw new Error('initiated to login');
      }
      setConsoleUI('Logging in');
      setLoading(true);
      // IMP START - Auth Provider Login
      const idToken = await signInWithAuth0();
      // IMP END - Auth Provider Login
      uiConsole('idToken', idToken);

      // IMP START - Login
      uiConsole('idToken', idToken);
      const parsedToken = parseToken(idToken!);

      const idTokenLoginParams = {
        verifier,
        verifierId: parsedToken.email,
        idToken,
      } as IdTokenLoginParams;

      await coreKitInstance.loginWithJWT(idTokenLoginParams);
      // IMP END - Login

      // IMP START - Recover MFA Enabled Account
      if (coreKitInstance.status === COREKIT_STATUS.REQUIRED_SHARE) {
        uiConsole(
          'required more shares, please enter your backup/ device factor key, or reset account [unrecoverable once reset, please use it with caution]',
        );
      }
      // IMP END - Recover MFA Enabled Account
      setLoading(false);

      if (coreKitInstance.status === COREKIT_STATUS.LOGGED_IN) {
        await commitChanges();
      }

      setCoreKitStatus(coreKitInstance.status);
    } catch (err) {
      uiConsole(err);
    }
  };
  // IMP START - Recover MFA Enabled Account
  const inputBackupFactorKey = async () => {
    if (!coreKitInstance) {
      throw new Error('coreKitInstance not found');
    }
    if (!backupFactorKey) {
      throw new Error('backupFactorKey not found');
    }
    const factorKey = new BN(backupFactorKey, 'hex');
    await coreKitInstance.inputFactorKey(factorKey);

    setCoreKitStatus(coreKitInstance.status);

    if (coreKitInstance.status === COREKIT_STATUS.REQUIRED_SHARE) {
      uiConsole(
        'required more shares even after inputing backup factor key, please enter your backup/ device factor key, or reset account [unrecoverable once reset, please use it with caution]',
      );
    }
  };
  // IMP END - Recover MFA Enabled Account

  // IMP START - Enable Multi Factor Authentication
  const enableMFA = async () => {
    if (!coreKitInstance) {
      throw new Error('coreKitInstance is not set');
    }
    const factorKey = await coreKitInstance.enableMFA({});
    const factorKeyMnemonic = keyToMnemonic(factorKey);

    uiConsole(
      'MFA enabled, device factor stored in local store, deleted hashed cloud key, your backup factor key: ',
      factorKeyMnemonic,
    );

    if (coreKitInstance.status === COREKIT_STATUS.LOGGED_IN) {
      await commitChanges();
    }
  };
  // IMP END - Enable Multi Factor Authentication

  const keyDetails = async () => {
    if (!coreKitInstance) {
      throw new Error('coreKitInstance not found');
    }
    uiConsole(coreKitInstance.getKeyDetails());
  };

  const commitChanges = async () => {
    if (!coreKitInstance) {
      throw new Error('coreKitInstance not found');
    }
    // uiConsole('commitChanges');
    await coreKitInstance.commitChanges();
  };

  const getDeviceFactor = async () => {
    try {
      const factorKey = await getWebBrowserFactor(coreKitInstance!);
      setBackupFactorKey(factorKey!);
      uiConsole('Device share: ', factorKey);
    } catch (e) {
      uiConsole(e);
    }
  };

  const exportMnemonicFactor = async (): Promise<void> => {
    if (!coreKitInstance) {
      throw new Error('coreKitInstance is not set');
    }
    uiConsole('export share type: ', TssShareType.RECOVERY);
    const factorKey = generateFactorKey();
    await coreKitInstance.createFactor({
      shareType: TssShareType.RECOVERY,
      factorKey: factorKey.private,
    });
    const factorKeyMnemonic = await keyToMnemonic(
      factorKey.private.toString('hex'),
    );
    uiConsole('Export factor key mnemonic: ', factorKeyMnemonic);
    if (coreKitInstance.status === COREKIT_STATUS.LOGGED_IN) {
      await commitChanges();
    }
  };

  const MnemonicToFactorKeyHex = async (mnemonic: string) => {
    if (!coreKitInstance) {
      throw new Error('coreKitInstance is not set');
    }
    try {
      const factorKey = await mnemonicToKey(mnemonic);
      setBackupFactorKey(factorKey);
      return factorKey;
    } catch (error) {
      uiConsole(error);
    }
  };

  const getUserInfo = async () => {
    // IMP START - Get User Information
    const user = coreKitInstance.getUserInfo();
    // IMP END - Get User Information
    uiConsole(user);
  };

  const logout = async () => {
    // IMP START - Logout
    await coreKitInstance.logout();
    // IMP END - Logout
    setCoreKitStatus(coreKitInstance.status);
    // Log out from Auth0

    try {
      await clearSession();
      uiConsole('logged out from auth0');
    } catch (e) {
      console.log(e);
    }
    uiConsole('logged out from web3auth');
  };

  // IMP START - Blockchain Calls
  const getAccounts = async () => {
    if (!coreKitInstance) {
      uiConsole('provider not initialized yet');
      return;
    }
    setConsoleUI('Getting account');

    // For ethers v5
    // const ethersProvider = new ethers.providers.Web3Provider(this.provider);
    const ethersProvider = new ethers.BrowserProvider(
      coreKitInstance.provider as any,
    );

    // For ethers v5
    // const signer = ethersProvider.getSigner();
    const signer = await ethersProvider.getSigner();

    // Get user's Ethereum public address
    const address = signer.getAddress();
    uiConsole(address);
  };

  const getBalance = async () => {
    if (!coreKitInstance) {
      uiConsole('provider not initialized yet');
      return;
    }
    setConsoleUI('Fetching balance');

    // For ethers v5
    // const ethersProvider = new ethers.providers.Web3Provider(this.provider);
    const ethersProvider = new ethers.BrowserProvider(
      coreKitInstance.provider as any,
    );

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
    if (!coreKitInstance) {
      uiConsole('provider not initialized yet');
      return;
    }
    setConsoleUI('Signing message');

    // For ethers v5
    // const ethersProvider = new ethers.providers.Web3Provider(this.provider);
    const evmProvider = new EthereumSigningProvider({config: {chainConfig}});
    evmProvider.setupProvider(coreKitInstance)
    const ethersProvider = new ethers.BrowserProvider(
      evmProvider
    );

    // For ethers v5
    // const signer = ethersProvider.getSigner();
    const signer = await ethersProvider.getSigner();
    const originalMessage = 'YOUR_MESSAGE';

    // Sign the message
    const signedMessage = await signer.signMessage(originalMessage);
    uiConsole(signedMessage);
  };
  // IMP END - Blockchain Calls

  const sendTransaction = async () => {
    if (!coreKitInstance) {
      uiConsole('provider not initialized yet');
      return;
    }
    setConsoleUI('Sending transaction');

    const ethersProvider = new ethers.BrowserProvider(
      coreKitInstance.provider as any,
    );

    const signer = await ethersProvider.getSigner();

    const destination = '0xeaA8Af602b2eDE45922818AE5f9f7FdE50cFa1A8';
    const amount = ethers.parseEther('0.005'); // Convert 1 ether to wei

    // Submit transaction to the blockchain
    const tx = await signer.sendTransaction({
      to: destination,
      value: amount,
    });

    // Wait for the transaction to be mined
    const receipt = await tx.wait();
    uiConsole(receipt);
  };

  const criticalResetAccount = async (): Promise<void> => {
    // This is a critical function that should only be used for testing purposes
    // Resetting your account means clearing all the metadata associated with it from the metadata server
    // The key details will be deleted from our server and you will not be able to recover your account
    if (!coreKitInstance) {
      throw new Error('coreKitInstance is not set');
    }
    //@ts-ignore
    // if (selectedNetwork === WEB3AUTH_NETWORK.MAINNET) {
    //   throw new Error("reset account is not recommended on mainnet");
    // }
    await coreKitInstance.tKey.CRITICAL_deleteTkey();
    // await coreKitInstance.tKey.storageLayer.setMetadata({
    //   privKey: new BN(coreKitInstance.state.oAuthKey!, 'hex'),
    //   input: {message: 'KEY_NOT_FOUND'},
    // });
    uiConsole('reset');
    if (coreKitInstance.status === COREKIT_STATUS.LOGGED_IN) {
      await commitChanges();
    }
    logout();
  };

  // TODO
  // DeleteFactor

  const uiConsole = (...args: any) => {
    setConsoleUI(JSON.stringify(args || {}, null, 2) + '\n\n\n\n' + consoleUI);
    console.log(...args);
  };

  const loggedInView = (
    <View style={styles.buttonArea}>
      <Button title="Get User Info" onPress={getUserInfo} />
      <Button title="Key Details" onPress={keyDetails} />
      <Button title="Get Accounts" onPress={getAccounts} />
      <Button title="Get Balance" onPress={getBalance} />
      <Button title="Sign Message" onPress={signMessage} />
      <Button title="Send Transaction" onPress={sendTransaction} />
      <Button title="Log Out" onPress={logout} />
      <Button title="[CRITICAL] Reset Account" onPress={criticalResetAccount} />
      {/* <Button title="Commit Changes" onPress={commitChanges} /> */}
      {/* <Text>CommitChanges after performing the following actions:</Text> */}
      <Button title="Enable MFA" onPress={enableMFA} />
      <Button
        title="Generate Backup (Mnemonic) - CreateFactor"
        onPress={exportMnemonicFactor}
      />
    </View>
  );

  const unloggedInView = (
    <View style={styles.buttonArea}>
      <Button title="Login with Web3Auth" onPress={login} />
      <View
        style={
          coreKitStatus !== COREKIT_STATUS.REQUIRED_SHARE
            ? styles.disabled
            : null
        }>
        <Button
          disabled={coreKitStatus !== COREKIT_STATUS.REQUIRED_SHARE}
          title="Get Device Factor"
          onPress={() => getDeviceFactor()}
        />
        <Text>Backup/ Device Factor:</Text>
        <TextInput onChangeText={setBackupFactorKey} value={backupFactorKey} />
        <Button
          disabled={coreKitStatus !== COREKIT_STATUS.REQUIRED_SHARE}
          title="Input Backup Factor Key"
          onPress={() => inputBackupFactorKey()}
        />
        <Text>Recover Using Mnemonic Factor Key:</Text>
        <TextInput onChangeText={setMnemonicFactor} value={mnemonicFactor} />
        <Button
          disabled={coreKitStatus !== COREKIT_STATUS.REQUIRED_SHARE}
          title="Get Recovery Factor Key using Mnemonic"
          onPress={() => MnemonicToFactorKeyHex(mnemonicFactor)}
        />
      </View>
      {loading && <ActivityIndicator />}
      <Button title="[CRITICAL] Reset Account" onPress={criticalResetAccount} />
    </View>
  );

  return (
    <View style={styles.container}>
      {coreKitStatus === COREKIT_STATUS.LOGGED_IN
        ? loggedInView
        : unloggedInView}
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
      <Auth0Provider
        domain={'https://web3auth.au.auth0.com'}
        clientId={'hUVVf4SEsZT7syOiL0gLU9hFEtm2gQ6O'}>
        <Home />
      </Auth0Provider>
      <Bridge />
    </>
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
  disabled: {
    opacity: 0.5,
  },
});
