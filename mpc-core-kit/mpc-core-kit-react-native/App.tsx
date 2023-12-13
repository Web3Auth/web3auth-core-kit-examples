import {
  Button,
  ScrollView,
  StyleSheet,
  Text,
  View,
  Dimensions,
  ActivityIndicator,
  TouchableOpacity,
} from 'react-native';
import React, {useEffect, useState} from 'react';
import {tKey, chainConfig} from './tkey';
import {ShareSerializationModule} from '@tkey/share-serialization';
import {SfaServiceProvider} from '@tkey/service-provider-sfa';
import EncryptedStorage from 'react-native-encrypted-storage';
import '@ethersproject/shims';
import {ethers, keccak256} from 'ethers';
import {EthereumPrivateKeyProvider} from '@web3auth/ethereum-provider';
import {IProvider} from '@web3auth/base';
import 'react-native-url-polyfill/auto';
// import * as TssLibNode from '@toruslabs/tss-lib-rn';

import {Input} from '@rneui/themed';
import {
  COREKIT_STATUS,
  TssShareType,
  WEB3AUTH_NETWORK,
  Web3AuthMPCCoreKit,
  asyncGetFactor,
  asyncStoreFactor,
  parseToken,
} from '@web3auth/mpc-core-kit';
import * as jwt from 'jsonwebtoken';
// import {Bridge} from './Bridge/Bridge';
import {Bridge} from '@toruslabs/react-native-tss-lib-bridge';
import * as TssLibRN from '@toruslabs/react-native-tss-lib-bridge';
import {IAsyncStorage} from '@web3auth/mpc-core-kit';
import {BN} from 'bn.js';

const verifier = 'torus-test-health';

const privateKey1 =
  'MEECAQAwEwYHKoZIzj0CAQYIKoZIzj0DAQcEJzAlAgEBBCCD7oLrcKae+jVZPGx52Cb/lKhdKxpXjl9eGNa1MlY57A==';
const jwtPrivateKey = `-----BEGIN PRIVATE KEY-----\n${privateKey1}\n-----END PRIVATE KEY-----`;
const alg: jwt.Algorithm = 'ES256';

const mockLogin2 = async (email: string) => {
  const req = new Request(
    'https://li6lnimoyrwgn2iuqtgdwlrwvq0upwtr.lambda-url.eu-west-1.on.aws/',
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        verifier: 'torus-key-test',
        scope: 'email',
        extraPayload: {email},
        alg: 'ES256',
      }),
    },
  );

  const resp = await fetch(req);
  const bodyJson = (await resp.json()) as {token: string};
  const idToken = bodyJson.token;
  const parsedToken = parseToken(idToken);
  return {idToken, parsedToken};
};

export const mockLogin = async (email: string) => {
  const iat = Math.floor(Date.now() / 1000);
  const payload = {
    iss: 'torus-key-test',
    aud: 'torus-key-test',
    name: email,
    email,
    scope: 'email',
    iat,
    eat: iat + 120,
  };

  const algo = {
    expiresIn: 120,
    algorithm: alg,
  };

  const token = jwt.sign(payload, jwtPrivateKey, algo);
  // const idToken = token;
  // const parsedToken = parseToken(idToken);
  // return {idToken, parsedToken, testing: 'testing'};
  return {testing: 'testing', token};
};

const ethereumPrivateKeyProvider = new EthereumPrivateKeyProvider({
  config: {
    chainConfig,
  },
});

class ReactStorage implements IAsyncStorage {
  async getItem(key: string): Promise<string | null> {
    return EncryptedStorage.getItem(key);
  }

  async setItem(key: string, value: string): Promise<void> {
    return EncryptedStorage.setItem(key, value);
  }
}

export default function App() {
  const [provider, setProvider] = useState<IProvider | null>(null);
  const [loggedIn, setLoggedIn] = useState(false);
  const [userInfo, setUserInfo] = useState({});
  const [recoveryShare, setRecoveryShare] = useState<string>('');
  const [mnemonicShare, setMnemonicShare] = useState<string>('');
  const [consoleUI, setConsoleUI] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [mpcCoreKitInstance, setMpcCoreKitInstance] =
    useState<Web3AuthMPCCoreKit | null>(null);
  const [coreKitStatus, setCoreKitStatus] = useState<COREKIT_STATUS>(
    COREKIT_STATUS.NOT_INITIALIZED,
  );

  useEffect(() => {
    const init = async () => {
      // Initialization of Service Provider
      try {
        await (tKey.serviceProvider as any).init(ethereumPrivateKeyProvider);
        const mpcCoreKitInstancelocal = new Web3AuthMPCCoreKit({
          web3AuthClientId: 'torus-key-test',
          web3AuthNetwork: WEB3AUTH_NETWORK.DEVNET,
          uxMode: 'react-native',
          asyncStorageKey: new ReactStorage(),
          tssLib: TssLibRN,
        });
        await mpcCoreKitInstancelocal.init();
        setMpcCoreKitInstance(mpcCoreKitInstancelocal);

        if (mpcCoreKitInstancelocal.provider) {
          // setProvider(coreKitInstancelocal.provider);
        }
        if (mpcCoreKitInstancelocal.status === COREKIT_STATUS.REQUIRED_SHARE) {
          uiConsole(
            'required more shares, please enter your backup/ device factor key, or reset account unrecoverable once reset, please use it with caution]',
          );
        }

        setCoreKitStatus(mpcCoreKitInstancelocal.status);
        console.log(coreKitStatus);
      } catch (error) {
        console.error(error);
      }
    };
    init();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // const parseToken = (token: any) => {
  //   try {
  //     const base64Url = token.split('.')[1];
  //     const base64 = base64Url.replace('-', '+').replace('_', '/');
  //     return JSON.parse(atob(base64 || ''));
  //   } catch (err) {
  //     uiConsole(err);
  //     return null;
  //   }
  // };

  const login = async () => {
    // uiConsole('Logging in');
    // let me = new URL('https://www.google.com');
    // uiConsole(me);
    // if (me) {
    //   return;
    // }
    try {
      setConsoleUI('Logging in');
      setLoading(true);
      const loginRes = await mockLogin2('emaileample2');
      uiConsole('Login success', loginRes);
      const idToken = await loginRes.idToken;
      uiConsole('idToken', idToken);
      const parsedToken = parseToken(idToken);
      setUserInfo(parsedToken);

      if (!mpcCoreKitInstance) {
        uiConsole('coreKitInstance not initialized yet');
        return;
      }

      let mlogin = await mockLogin2('testing0001');
      uiConsole('mlogin');
      await mpcCoreKitInstance.loginWithJWT({
        verifier: 'torus-test-health',
        verifierId: mlogin.parsedToken.email,
        idToken: mlogin.idToken,
      });

      mpcCoreKitInstance.getKeyDetails();
      setCoreKitStatus(mpcCoreKitInstance.status);

      console.log('publickey', (await mpcCoreKitInstance.getPublic()).length);
      console.log('publickey', await mpcCoreKitInstance.getPublic());
      console.log(
        'publickey',
        Buffer.from(await mpcCoreKitInstance.getPublic()).toString('base64'),
      );
      console.log(
        'publickey',
        (await mpcCoreKitInstance.getPublic()).toString('hex'),
      );

      let msg = 'hello world';
      let msgHash = keccak256(Buffer.from(msg));
      uiConsole('msgHash', msgHash);
      let signature = await mpcCoreKitInstance.sign(
        Buffer.from(msgHash.substring(2), 'hex'),
      );
      console.log(signature);

      const factor = await mpcCoreKitInstance.createFactor({
        shareType: TssShareType.RECOVERY,
      });
      console.log(factor);
      // if (coreKitInstance.provider) {
      //   setProvider(coreKitInstance.provider);
      // }
      var {requiredFactors} = mpcCoreKitInstance.getKeyDetails();

      uiConsole('requiredFactors', requiredFactors);

      if (requiredFactors > 0) {
        uiConsole(
          'Please enter your backup shares, requiredShares:',
          requiredFactors,
        );
      }
      // else {
      // await reconstructKey();
      // }
    } catch (e) {
      uiConsole(e);
      setLoading(false);
    }
  };

  // const reconstructKey = async () => {
  //   try {
  //     const reconstructedKey = await tKey.reconstructKey();
  //     const privateKey = reconstructedKey?.privKey.toString('hex');

  //     await ethereumPrivateKeyProvider.setupProvider(privateKey);
  //     setProvider(ethereumPrivateKeyProvider);
  //     setLoggedIn(true);
  //     setDeviceShare();
  //   } catch (e) {
  //     uiConsole(e);
  //   }
  // };

  const inputRecoveryShare = async (factorKey: string) => {
    try {
      await mpcCoreKitInstance?.inputFactorKey(new BN(factorKey, 'hex'));
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
    const keyDetail = await mpcCoreKitInstance?.getKeyDetails();
    uiConsole(keyDetail);
  };

  const setDeviceShare = async () => {
    if (!mpcCoreKitInstance) {
      uiConsole('MPC core kit not initialized yet');
      return;
    }
    try {
      const newFactor = await mpcCoreKitInstance?.createFactor({
        shareType: TssShareType.DEVICE,
      });
      await asyncStoreFactor(
        new BN(newFactor, 'hex'),
        mpcCoreKitInstance,
        new ReactStorage(),
      );
    } catch (error) {
      uiConsole('Error', (error as any)?.message.toString(), 'error');
    }
  };

  const getDeviceShare = async () => {
    if (!mpcCoreKitInstance) {
      uiConsole('MPC core kit not initialized yet');
      return;
    }
    try {
      const result = await asyncGetFactor(
        mpcCoreKitInstance,
        new ReactStorage(),
      );
      if (result) {
        return result;
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
      await EncryptedStorage.removeItem(metadata.pubKey.x.toString('hex'));
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
    if (!mpcCoreKitInstance) {
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
    setConsoleUI(JSON.stringify(args || {}, null, 2) + '\n\n\n\n' + consoleUI);
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
        disabled={!mpcCoreKitInstance}
      />
      <Input
        value={recoveryShare}
        placeholder="Recovery Share"
        onChangeText={value => setRecoveryShare(value)}
        disabled={!mpcCoreKitInstance}
        inputContainerStyle={styles.inputField}
      />
      <Button
        title="Input Recovery Share"
        onPress={async () => {
          await inputRecoveryShare(recoveryShare);
          setLoading(false);
        }}
        disabled={!mpcCoreKitInstance}
      />
      <Button
        title="Reset Account"
        onPress={criticalResetAccount}
        disabled={!mpcCoreKitInstance}
      />
      <Input
        value={mnemonicShare}
        placeholder="Enter Mnemonic Share"
        onChangeText={value => setMnemonicShare(value)}
        disabled={!mpcCoreKitInstance}
        inputContainerStyle={styles.inputField}
      />
      <Button
        title="Get Recovery Share using Mnemonic"
        onPress={async () => {
          await MnemonicToShareHex(mnemonicShare);
          setLoading(false);
        }}
        disabled={!mpcCoreKitInstance}
      />
      {loading && <ActivityIndicator />}
    </View>
  );

  return (
    <View style={styles.container}>
      <Bridge />
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
  inputField: {
    width: Dimensions.get('window').width - 90,
  },
});
