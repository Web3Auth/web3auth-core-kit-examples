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
import auth from '@react-native-firebase/auth';
// IMP END - Auth Provider Login

// IMP START - Quick Start
import {
  Web3AuthMPCCoreKit,
  WEB3AUTH_NETWORK,
  JWTLoginParams,
  TssShareType,
  parseToken,
  generateFactorKey,
  COREKIT_STATUS,
  keyToMnemonic,
  mnemonicToKey,
  makeEthereumSigner,
  Web3AuthOptions,
  // asyncStoreFactor,
} from '@web3auth/mpc-core-kit';
import {CHAIN_NAMESPACES} from '@web3auth/base';
import EncryptedStorage from 'react-native-encrypted-storage';
import {tssLib, Bridge} from '@toruslabs/react-native-tss-lib-bridge';
import {EthereumSigningProvider} from '@web3auth/ethereum-mpc-provider';
// Use for social factor (optional)
import Web3Auth from '@web3auth/single-factor-auth-react-native';
import {CommonPrivateKeyProvider} from '@web3auth/base-provider';
// IMP END - Quick Start
import {BN} from 'bn.js';
import {ethers} from 'ethers';

// IMP START - SDK Initialization
// IMP START - Dashboard Registration
const web3AuthClientId =
  'BPi5PB_UiIZ-cPz1GtV5i1I2iOSOHuimiXBI0e-Oe_u6X3oVAbCiAZOTEBtTXw4tsluTITPqA8zMsfxIKMjiqNQ'; // get from https://dashboard.web3auth.io
// IMP END - Dashboard Registration

// IMP START - Verifier Creation
const verifier = 'w3a-firebase-demo';
// IMP END - Verifier Creation

const chainConfig = {
  chainNamespace: CHAIN_NAMESPACES.EIP155,
  chainId: '0xaa36a7', // Please use 0x1 for Mainnet
  rpcTarget: 'https://rpc.ankr.com/eth_sepolia',
  displayName: 'Ethereum Sepolia Testnet',
  blockExplorerUrl: 'https://sepolia.etherscan.io/',
  ticker: 'ETH',
  tickerName: 'Ethereum',
};

// // setup async storage for react native
// const asyncStorageKey = {
//   getItem: async (key: string) => {
//     return EncryptedStorage.getItem(key);
//   },
//   setItem: async (key: string, value: string) => {
//     return EncryptedStorage.setItem(key, value);
//   },
// };

const coreKitInstance = new Web3AuthMPCCoreKit({
  web3AuthClientId,
  web3AuthNetwork: WEB3AUTH_NETWORK.MAINNET,
  uxMode: 'react-native',
  tssLib, // tss lib bridge for react native
  manualSync: true, // This is the recommended approach
} as Web3AuthOptions);

// Setup provider for EVM Chain
const evmProvider = new EthereumSigningProvider({config: {chainConfig}});
evmProvider.setupProvider(makeEthereumSigner(coreKitInstance));
// IMP END - SDK Initialization

export default function App() {
  const [loading, setLoading] = useState<boolean>(false);
  const [consoleUI, setConsoleUI] = useState<string>('');
  const [coreKitStatus, setCoreKitStatus] = useState<COREKIT_STATUS>(
    COREKIT_STATUS.NOT_INITIALIZED,
  );
  const [backupFactorKey, setBackupFactorKey] = useState<string>('');
  const [mnemonicFactor, setMnemonicFactor] = useState<string>('');
  const [email, setEmail] = useState<string>('');
  const [password, setPassword] = useState<string>('');

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

  // IMP START - Auth Provider Login
  const firebaseSignIn = async () => {
    try {
      const res = await auth().signInWithEmailAndPassword(email, password);
      return res;
    } catch (e: any) {
      try {
        uiConsole(e.message);
        const res = await auth().createUserWithEmailAndPassword(
          email,
          password,
        );
        return res;
      } catch (error: any) {
        uiConsole(error.message);
        return 'Error in login';
      }
    }
  };
  // IMP END - Auth Provider Login

  const login = async () => {
    try {
      if (!coreKitInstance) {
        throw new Error('initiated to login');
      }
      uiConsole('Logging in');
      setLoading(true);
      // IMP START - Auth Provider Login
      const loginRes = await firebaseSignIn();
      // IMP END - Auth Provider Login
      uiConsole('Login success', loginRes);

      if (loginRes === 'Error in login') {
        throw new Error('Error in login');
      }

      // IMP START - Login
      const idToken = await loginRes!.user.getIdToken(true);
      uiConsole('idToken', idToken);
      const parsedToken = parseToken(idToken);

      const LoginParams = {
        verifier,
        verifierId: parsedToken.sub,
        idToken,
      } as JWTLoginParams;

      await coreKitInstance.loginWithJWT(LoginParams);
      if (coreKitInstance.status === COREKIT_STATUS.LOGGED_IN) {
        await coreKitInstance.commitChanges(); // Needed for new accounts
      }
      // IMP END - Login

      // IMP START - Recover MFA Enabled Account
      if (coreKitInstance.status === COREKIT_STATUS.REQUIRED_SHARE) {
        uiConsole(
          'required more shares, please enter your backup/ device factor key, or reset account [unrecoverable once reset, please use it with caution]',
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
  const inputBackupFactorKey = async () => {
    if (!coreKitInstance) {
      throw new Error('coreKitInstance not found');
    }
    if (!backupFactorKey) {
      throw new Error('backupFactorKey not found');
    }
    setLoading(true);
    const factorKey = new BN(backupFactorKey, 'hex');
    await coreKitInstance.inputFactorKey(factorKey);

    setCoreKitStatus(coreKitInstance.status);
    setLoading(false);
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
    setLoading(true);
    try {
      uiConsole('Enabling MFA, please wait');

      const factorKey = new BN(await getSocialMFAFactorKey(), 'hex');
      await coreKitInstance.enableMFA({factorKey});

      uiConsole(
        'MFA enabled, device factor stored in local store, deleted hashed cloud key, your firebase email password login (hardcoded in this example) is used as the social backup factor',
      );
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
      throw new Error('coreKitInstance not found');
    }
    uiConsole(coreKitInstance.getKeyDetails());
  };

  const getDeviceFactor = async () => {
    try {
      const factorKey = await coreKitInstance.getDeviceFactor();
      setBackupFactorKey(factorKey!);
      uiConsole('Device share: ', factorKey);
    } catch (e) {
      uiConsole(e);
    }
  };

  // const storeDeviceFactor = async () => {
  //   try {
  //     const factorKey = await generateFactorKey();
  //     await asyncStoreFactor(
  //       factorKey.private,
  //       coreKitInstance!,
  //       asyncStorageKey,
  //     );
  //     uiConsole('Stored factor: ', factorKey);
  //   } catch (error: any) {
  //     uiConsole(error.message);
  //   }
  // };

  // IMP START - Export Social Account Factor
  const getSocialMFAFactorKey = async (): Promise<string> => {
    try {
      // Initialise the Web3Auth SFA SDK
      // You can do this on the constructor as well for faster experience
      const web3authSfa = new Web3Auth(EncryptedStorage, {
        clientId: web3AuthClientId, // Get your Client ID from Web3Auth Dashboard
        web3AuthNetwork: WEB3AUTH_NETWORK.MAINNET,
        usePnPKey: false, // Setting this to true returns the same key as PnP Web SDK, By default, this SDK returns CoreKitKey.
      });
      const privateKeyProvider = new CommonPrivateKeyProvider({
        config: {chainConfig},
      });
      await web3authSfa.init(privateKeyProvider);

      // Login using Firebase Email Password
      const res = await auth().signInWithEmailAndPassword(
        'custom+jwt@firebase.login',
        'Testing@123',
      );
      console.log(res);
      const idToken = await res.user.getIdToken(true);
      const userInfo = parseToken(idToken);

      // Use the Web3Auth SFA SDK to generate an account using the Social Factor
      const web3authProvider = await web3authSfa.connect({
        verifier,
        verifierId: userInfo.sub,
        idToken,
      });

      // Get the private key using the Social Factor, which can be used as a factor key for the MPC Core Kit
      const factorKey = await web3authProvider!.request({
        method: 'private_key',
      });
      uiConsole('Social Factor Key: ', factorKey);
      setBackupFactorKey(factorKey as string);
      return factorKey as string;
    } catch (err) {
      uiConsole(err);
      return '';
    }
  };
  // IMP END - Export Social Account Factor

  const createMnemonicFactor = async (): Promise<void> => {
    if (!coreKitInstance) {
      throw new Error('coreKitInstance is not set');
    }
    setLoading(true);
    uiConsole('export share type: ', TssShareType.RECOVERY);
    const factorKey = generateFactorKey();
    await coreKitInstance.createFactor({
      shareType: TssShareType.RECOVERY,
      factorKey: factorKey.private,
    });
    const factorKeyMnemonic = await keyToMnemonic(
      factorKey.private.toString('hex'),
    );
    setLoading(false);

    uiConsole('Export factor key mnemonic: ', factorKeyMnemonic);
    if (coreKitInstance.status === COREKIT_STATUS.LOGGED_IN) {
      await coreKitInstance.commitChanges();
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
      uiConsole('logged out from auth0');
    } catch (error: any) {
      uiConsole(error.message);
    }
    uiConsole('logged out from web3auth');
  };

  // IMP START - Blockchain Calls
  const getAccounts = async () => {
    if (!coreKitInstance) {
      uiConsole('provider not initialized yet');
      return;
    }
    setLoading(true);
    uiConsole('Getting account');

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
      uiConsole('provider not initialized yet');
      return;
    }
    setLoading(true);
    uiConsole('Fetching balance');

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
      await ethersProvider.getBalance(address), // Balance is in wei
    );
    setLoading(false);

    uiConsole(balance);
  };

  const signMessage = async () => {
    if (!coreKitInstance) {
      uiConsole('provider not initialized yet');
      return;
    }
    setLoading(true);
    uiConsole('Signing message');

    // For ethers v5
    // const ethersProvider = new ethers.providers.Web3Provider(this.provider);
    const ethersProvider = new ethers.BrowserProvider(evmProvider);

    // For ethers v5
    // const signer = ethersProvider.getSigner();
    const signer = await ethersProvider.getSigner();
    const originalMessage = 'YOUR_MESSAGE';

    // Sign the message
    const signedMessage = await signer.signMessage(originalMessage);
    setLoading(false);
    uiConsole(signedMessage);
  };
  // IMP END - Blockchain Calls

  const criticalResetAccount = async (): Promise<void> => {
    // This is a critical function that should only be used for testing purposes
    // Resetting your account means clearing all the metadata associated with it from the metadata server
    // The key details will be deleted from our server and you will not be able to recover your account
    if (!coreKitInstance) {
      throw new Error('coreKitInstance is not set');
    }
    setLoading(true);
    //@ts-ignore
    // if (selectedNetwork === WEB3AUTH_NETWORK.MAINNET) {
    //   throw new Error("reset account is not recommended on mainnet");
    // }
    await coreKitInstance.tKey.storageLayer.setMetadata({
      privKey: new BN(coreKitInstance.state.postBoxKey!, 'hex'),
      input: {message: 'KEY_NOT_FOUND'},
    });
    uiConsole('reset');
    if (coreKitInstance.status === COREKIT_STATUS.LOGGED_IN) {
      await coreKitInstance.commitChanges();
    }
    setLoading(false);
    logout();
  };

  const uiConsole = (...args: any) => {
    setConsoleUI('[LOG]' + JSON.stringify(args) + '\n' + consoleUI);
    console.log(...args);
  };

  const loginScreen = (
    <View style={styles.buttonArea}>
      <Text style={styles.heading}>MPC Core Kit RN Quick Start</Text>
      <View style={styles.section}>
        <Text>Enter your Email</Text>
        <TextInput
          style={styles.input}
          onChangeText={setEmail}
          value={email}
          autoCapitalize="none"
        />
      </View>
      <View style={styles.section}>
        <Text>Enter your Password</Text>
        <TextInput
          style={styles.input}
          onChangeText={setPassword}
          value={password}
          secureTextEntry={true}
          autoCapitalize="none"
        />
      </View>
      <Button title="Register/Login with Web3Auth" onPress={login} />
    </View>
  );
  const recoveryScreen = (
    <View>
      <View style={styles.section}>
        <Button
          disabled={coreKitStatus !== COREKIT_STATUS.REQUIRED_SHARE}
          title="Get Device Factor"
          onPress={() => getDeviceFactor()}
        />
        <Button
          disabled={coreKitStatus !== COREKIT_STATUS.REQUIRED_SHARE}
          title="Get Social Backup Factor"
          onPress={() => getSocialMFAFactorKey()}
        />
      </View>
      <View style={styles.section}>
        <Text>Recover Using Mnemonic Factor Key:</Text>
        <TextInput
          style={styles.input}
          onChangeText={setMnemonicFactor}
          value={mnemonicFactor}
        />
        <Button
          disabled={coreKitStatus !== COREKIT_STATUS.REQUIRED_SHARE}
          title="Get Recovery Factor Key using Mnemonic"
          onPress={() => MnemonicToFactorKeyHex(mnemonicFactor)}
        />
      </View>
      <View style={styles.section}>
        <Text>Backup/ Device Factor: {backupFactorKey}</Text>
        <Button
          disabled={coreKitStatus !== COREKIT_STATUS.REQUIRED_SHARE}
          title="Input Backup Factor Key"
          onPress={() => inputBackupFactorKey()}
        />
      </View>
      <Button title="[CRITICAL] Reset Account" onPress={criticalResetAccount} />
    </View>
  );

  const loggedInView = (
    <View style={styles.buttonArea}>
      <Text style={styles.heading}>MPC Core Kit RN Quick Start</Text>
      <Button title="Get User Info" onPress={getUserInfo} />
      <Button title="Key Details" onPress={keyDetails} />
      <Button title="Get Accounts" onPress={getAccounts} />
      <Button title="Get Balance" onPress={getBalance} />
      <Button title="Sign Message" onPress={signMessage} />

      <Button title="Enable MFA" onPress={enableMFA} />
      <Button
        title="Generate Backup (Mnemonic) - CreateFactor"
        onPress={createMnemonicFactor}
      />
      <Button title="Get Device Factor" onPress={() => getDeviceFactor()} />
      {/* <Button title="Store Device Factor" onPress={() => storeDeviceFactor()} /> */}
      <Button title="Log Out" onPress={logout} />
      <Button title="[CRITICAL] Reset Account" onPress={criticalResetAccount} />
    </View>
  );

  const unloggedInView = (
    <View style={styles.buttonArea}>
      {coreKitStatus !== COREKIT_STATUS.REQUIRED_SHARE
        ? loginScreen
        : recoveryScreen}
    </View>
  );

  return (
    <View style={styles.container}>
      {coreKitStatus === COREKIT_STATUS.LOGGED_IN
        ? loggedInView
        : unloggedInView}
      <View style={styles.consoleArea}>
        <Text style={styles.consoleText}>Console:</Text>
        {loading && <ActivityIndicator />}
        <ScrollView style={styles.consoleUI}>
          <Text>{consoleUI}</Text>
        </ScrollView>
      </View>
      <Bridge />
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
    gap: 10,
  },
  heading: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  subHeading: {
    fontSize: 15,
    fontWeight: 'bold',
    marginBottom: 10,
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
  input: {
    padding: 10,
    width: Dimensions.get('window').width - 60,
    borderColor: 'gray',
    borderWidth: 1,
    borderRadius: 10,
    margin: 5,
  },
  buttonArea: {
    flex: 2,
    alignItems: 'center',
    justifyContent: 'space-around',
    margin: 20,
    gap: 40,
  },
  disabledSection: {
    opacity: 0.5,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#EEEEEE',
    padding: 20,
    borderRadius: 10,
  },
  section: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#EEEEEE',
    padding: 10,
    margin: 5,
    borderRadius: 10,
  },
});
