import React, {useEffect, useState} from 'react';
import {
  ScrollView,
  StyleSheet,
  Text,
  View,
  Dimensions,
  ActivityIndicator,
  TextInput,
  TouchableOpacity,
} from 'react-native';
// IMP START - Auth Provider Login
import auth from '@react-native-firebase/auth';
// IMP END - Auth Provider Login

// IMP START - Quick Start
import {
  Bridge,
  COREKIT_STATUS,
  FactorKeyTypeShareDescription,
  generateFactorKey,
  keyToMnemonic,
  makeEthereumSigner,
  mnemonicToKey,
  mpclib,
  parseToken,
  TssDklsLib,
  TssShareType,
  WEB3AUTH_NETWORK,
} from '@web3auth/react-native-mpc-core-kit';
import {CHAIN_NAMESPACES} from '@web3auth/base';
import EncryptedStorage from 'react-native-encrypted-storage';
import {EthereumSigningProvider} from '@web3auth/ethereum-mpc-provider';
import { Point, secp256k1 } from '@tkey/common-types';
// IMP END - Quick Start
import {BN} from 'bn.js';
import {ethers} from 'ethers';

// IMP START - Dashboard Registration
const web3AuthClientId =
  'BPi5PB_UiIZ-cPz1GtV5i1I2iOSOHuimiXBI0e-Oe_u6X3oVAbCiAZOTEBtTXw4tsluTITPqA8zMsfxIKMjiqNQ'; // get from https://dashboard.web3auth.io
// IMP END - Dashboard Registration

// IMP START - Verifier Creation
const verifier = 'w3a-firebase-demo';
// IMP END - Verifier Creation

// IMP START - Chain Config
const chainConfig = {
  chainNamespace: CHAIN_NAMESPACES.EIP155,
  chainId: '0xaa36a7', // Please use 0x1 for Mainnet
  rpcTarget: 'https://rpc.ankr.com/eth_sepolia',
  displayName: 'Ethereum Sepolia Testnet',
  blockExplorerUrl: 'https://sepolia.etherscan.io/',
  ticker: 'ETH',
  tickerName: 'Ethereum',
};
// IMP END - Chain Config

// IMP START - SDK Initialization
// setup async storage for react native
const asyncStorageKey = {
  getItem: async (key: string) => {
    return EncryptedStorage.getItem(key);
  },
  setItem: async (key: string, value: string) => {
    return EncryptedStorage.setItem(key, value);
  },
};

const coreKitInstance = new mpclib.Web3AuthMPCCoreKitRN({
  web3AuthClientId,
  web3AuthNetwork: WEB3AUTH_NETWORK.MAINNET,
  // setupProviderOnInit: false, // needed to skip the provider setup
  uxMode: 'react-native',
  tssLib: TssDklsLib, // tss lib bridge for react native
  manualSync: true, // This is the recommended approach
  storage: asyncStorageKey, // Add the storage property
});

// Setup provider for EVM Chain
const evmProvider = new EthereumSigningProvider({config: {chainConfig}});
evmProvider.setupProvider(makeEthereumSigner(coreKitInstance));
// IMP END - SDK Initialization

const password = 'Testing@123';

export default function App() {
  const [loading, setLoading] = useState<boolean>(false);
  const [bridgeReady, setBridgeReady] = useState<boolean>(false);
  const [consoleUI, setConsoleUI] = useState<string>('');
  const [coreKitStatus, setCoreKitStatus] = useState<COREKIT_STATUS>(
    COREKIT_STATUS.NOT_INITIALIZED,
  );
  const [backupFactorKey, setBackupFactorKey] = useState<string>('');
  const [mnemonicFactor, setMnemonicFactor] = useState<string>('');
  const [email, setEmail] = useState<string>(`user${Math.floor(Math.random() * 10000)}@example.com`);

  useEffect(() => {
    if (bridgeReady) {
      const init = async () => {
        try {
          // IMP START - SDK Initialization
          await coreKitInstance.init();
          // IMP END - SDK Initialization
        } catch (error: any) {
          uiConsole(error.message, 'mounted caught');
        }
        setCoreKitStatus(coreKitInstance.status);
      };
      init();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bridgeReady]);

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

      const idToken = await loginRes!.user.getIdToken(true);
      uiConsole('idToken', idToken);
      const parsedToken = parseToken(idToken);

      // IMP START - Login
      const idTokenLoginParams = {
        verifier,
        verifierId: parsedToken.sub,
        idToken,
      };

      await coreKitInstance.loginWithJWT(idTokenLoginParams);
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
      await coreKitInstance.enableMFA({ factorKey });

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

  // IMP START - Store Device Factor
  const storeDeviceFactor = async () => {
    try {
      const factorKey = await generateFactorKey();
      await coreKitInstance.createFactor({
        shareType: TssShareType.DEVICE,
        factorKey: factorKey.private,
      });
      await coreKitInstance.setDeviceFactor(
        factorKey.private,
        true,
      );
      uiConsole('Stored factor: ', factorKey);
    } catch (error: any) {
      uiConsole(error.message);
    }
  };
  // IMP END - Store Device Factor

  // IMP START - Export Social Account Factor
  const getSocialMFAFactorKey = async (): Promise<string> => {
    try {
      // Create a temporary instance of the MPC Core Kit, used to create an encryption key for the Social Factor
      const tempCoreKitInstance = new mpclib.Web3AuthMPCCoreKitRN({
        web3AuthClientId,
        web3AuthNetwork: WEB3AUTH_NETWORK.MAINNET,
        // setupProviderOnInit: false, // needed to skip the provider setup
        uxMode: 'react-native',
        tssLib: TssDklsLib, // tss lib bridge for react native
        manualSync: true, // This is the recommended approach
        storage: asyncStorageKey, // Add the storage property
      });

      await tempCoreKitInstance.init();

      // Login using Firebase Email Password
      const res = await auth().signInWithEmailAndPassword(
        'custom+jwt@firebase.login',
        'Testing@123',
      );
      console.log(res);
      const idToken = await res.user.getIdToken(true);
      const userInfo = parseToken(idToken);
        // Use the Web3Auth SFA SDK to generate an account using the Social Factor
        await tempCoreKitInstance.loginWithJWT({
          verifier,
          verifierId: userInfo.sub,
          idToken,
        });

      // Get the private key using the Social Factor, which can be used as a factor key for the MPC Core Kit
      const factorKey = await tempCoreKitInstance.state.postBoxKey;
      uiConsole('Social Factor Key: ', factorKey);
      setBackupFactorKey(factorKey as string);
      tempCoreKitInstance.logout();
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


  // IMP START - Delete Factor
  const deleteFactor = async () => {
    let factorPub: string | undefined;
    for (const [key, value] of Object.entries((await coreKitInstance.getKeyDetails()).shareDescriptions)) {
      if (value.length > 0) {
        const parsedData = JSON.parse(value[0]);
        if (parsedData.module === FactorKeyTypeShareDescription.SocialShare) {
          factorPub = key;
        }
      }
    }
    if (factorPub) {
      uiConsole('Deleting Social Factor, please wait...', 'Factor Pub:', factorPub);
      const pub = Point.fromSEC1(secp256k1, factorPub);
      await coreKitInstance.deleteFactor(pub);
      await coreKitInstance.commitChanges();
      uiConsole('Social Factor deleted');
    } else {
      uiConsole('No social factor found to delete');
    }
  };
  // IMP END - Delete Factor

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
    setLoading(false);
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
    await coreKitInstance._UNSAFE_resetAccount();
    uiConsole('reset');
    if (coreKitInstance.status === COREKIT_STATUS.LOGGED_IN) {
      await coreKitInstance.commitChanges();
    }
    setLoading(false);
    logout();
  };

  const uiConsole = (...args: any) => {
    setConsoleUI(`${JSON.stringify(args || {}, null, 2)}\n\n\n\n${consoleUI}`);
    console.log(...args);
  };

  const loginScreen = (
    <View style={styles.buttonArea}>
      <Text style={styles.subHeading}>This is a test example, you can enter a random email to create a new account, the constant password is "Testing@123"</Text>
      <View style={styles.section}>
        <Text style={styles.subHeading}>Enter your Email</Text>
        <TextInput
          style={styles.input}
          onChangeText={setEmail}
          value={email}
          secureTextEntry={false}
          autoCapitalize="none"
        />
      </View>
      <TouchableOpacity onPress={login} style={styles.button}>
        <Text style={styles.buttonText}>Register/Login with Web3Auth</Text>
      </TouchableOpacity>
    </View>
  );
  const recoveryScreen = (
    <View style={styles.buttonArea}>
      <View style={styles.compressedButtons}>
        <View style={styles.buttonRow}>
        <TouchableOpacity
          disabled={coreKitStatus !== COREKIT_STATUS.REQUIRED_SHARE}
          onPress={() => getDeviceFactor()}
          style={styles.button}
        >
          <Text style={styles.buttonText}>Get Device Factor</Text>
        </TouchableOpacity>
        <TouchableOpacity
          disabled={coreKitStatus !== COREKIT_STATUS.REQUIRED_SHARE}
          onPress={() => getSocialMFAFactorKey()}
          style={styles.button}
        >
          <Text style={styles.buttonText}>Get Social Backup Factor</Text>
        </TouchableOpacity>
        </View>
        <View style={styles.buttonRow}>
        <Text style={styles.subHeading}>Recover Using Mnemonic Factor Key:</Text>
        <TextInput
          style={styles.input}
          onChangeText={setMnemonicFactor}
          value={mnemonicFactor}
        />
        <TouchableOpacity
          disabled={coreKitStatus !== COREKIT_STATUS.REQUIRED_SHARE}
          onPress={() => MnemonicToFactorKeyHex(mnemonicFactor)}
          style={styles.button}
        >
          <Text style={styles.buttonText}>Get Mnemonic Factor Key </Text>
        </TouchableOpacity>
        </View>
      </View>
      <View style={backupFactorKey ?  styles.section : styles.disabledSection}>
      {backupFactorKey && <Text style={styles.subHeading}>Factor Key: {backupFactorKey}</Text>}
        <TouchableOpacity
          disabled={coreKitStatus !== COREKIT_STATUS.REQUIRED_SHARE}
          onPress={() => inputBackupFactorKey()}
          style={styles.button}
        >
          <Text style={styles.buttonText}>Input Backup Factor Key</Text>
        </TouchableOpacity>
      </View>


      <TouchableOpacity onPress={criticalResetAccount} style={styles.button}>
        <Text style={styles.buttonText}>[CRITICAL] Reset Account</Text>
      </TouchableOpacity>
    </View>
  );

  const loggedInView = (
    <View style={styles.compressedButtons}>
      <View style={styles.buttonRow}>
        <TouchableOpacity onPress={getUserInfo} style={styles.button}>
          <Text style={styles.buttonText} >Get User Info</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={keyDetails} style={styles.button}>
          <Text style={styles.buttonText}>Key Details</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={getAccounts} style={styles.button}>
          <Text style={styles.buttonText}>Get Accounts</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={getBalance} style={styles.button}>
          <Text style={styles.buttonText}>Get Balance</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={signMessage} style={styles.button}>
            <Text style={styles.buttonText}>Sign Message</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={logout} style={styles.button}>
          <Text style={styles.buttonText}>Log Out</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={criticalResetAccount} style={styles.button}>
          <Text style={styles.buttonText}>[CRITICAL] Reset Account</Text>
        </TouchableOpacity>
      </View>
      <View style={styles.buttonRow}>
        <TouchableOpacity onPress={enableMFA} style={styles.button}>
          <Text style={styles.buttonText}>Enable MFA</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={createMnemonicFactor} style={styles.button}>
          <Text style={styles.buttonText}>Generate Backup (Mnemonic) - CreateFactor</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => getDeviceFactor()} style={styles.button}>
          <Text style={styles.buttonText}>Get Device Factor</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => storeDeviceFactor()} style={styles.button}>
          <Text style={styles.buttonText}>Store New Device Factor</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => deleteFactor()} style={styles.button}>
          <Text style={styles.buttonText}>Delete Social Factor</Text>
        </TouchableOpacity>
      </View>
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
      <View style={styles.headingArea}>
          <Text style={styles.heading}>MPC Core Kit RN Quick Start</Text>
          {loading && <ActivityIndicator />}
      </View>
      <View style={styles.buttonArea}>
      {coreKitStatus === COREKIT_STATUS.LOGGED_IN
        ? loggedInView
          : unloggedInView}
      </View>
      <View style={styles.consoleArea}>
        <Text style={styles.consoleText}>Console:</Text>
        <ScrollView style={styles.consoleUI}>
          <Text>{consoleUI}</Text>
        </ScrollView>
      </View>
      <Bridge
        logLevel={'DEBUG'}
        resolveReady={(ready) => {
          setBridgeReady(ready);
        }}
      />
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
    paddingHorizontal: 10,
  },
  heading: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  subHeading: {
    fontSize: 14,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  consoleArea: {
    alignItems: 'center',
    justifyContent: 'center',
    flex: 3,
  },
  consoleUI: {
    flex: 1,
    backgroundColor: '#CCCCCC',
    color: '#ffffff',
    padding: 10,
    width: Dimensions.get('window').width - 60,
  },
  consoleText: {
    fontSize: 14,
    fontWeight: 'bold',
    textAlign: 'center',
    padding: 10,
  },
  input: {
    padding: 10,
    width: '100%',
    borderColor: 'gray',
    borderWidth: 1,
    borderRadius: 10,
    margin: 5,
  },
  headingArea: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    width: '100%',
  },
  buttonArea: {
    flex: 7,
    alignItems: 'center',
    justifyContent: 'flex-start',
    gap: 10,
    overflow: 'hidden',
    width: '100%',
  },
  compressedButtons: {
    alignItems: 'stretch',
    justifyContent: 'space-between',
    flexDirection: 'row',
    width: '100%',
  },
  disabledSection: {
    opacity: 0.5,
    alignItems: 'center',
    justifyContent: 'flex-start',
    backgroundColor: '#EEEEEE',
    margin: 5,
    padding: 5,
    borderRadius: 10,
    width:' 100%',
  },
  section: {
    alignItems: 'center',
    justifyContent: 'flex-start',
    backgroundColor: '#EEEEEE',
    margin: 5,
    padding: 5,
    borderRadius: 10,
    width: '100%',
    gap: 1,
  },
  buttonRow: {
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'flex-start',
    gap: 10,
    flex: 1,
    backgroundColor: '#EEEEEE',
    margin: 5,
    padding: 5,
    borderRadius: 10,
  },
  button: {
    width: '100%',
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 10,
    backgroundColor: '#007bff',
  },
  buttonText: {
    fontSize: 15,
    color: '#fff',
    textAlign: 'center',
  },
});
