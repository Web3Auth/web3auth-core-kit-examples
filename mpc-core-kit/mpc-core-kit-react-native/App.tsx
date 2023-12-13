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
import EncryptedStorage from 'react-native-encrypted-storage';
import '@ethersproject/shims';
import {ethers} from 'ethers';
import {EthereumPrivateKeyProvider} from '@web3auth/ethereum-provider';
import {SafeEventEmitterProvider} from '@web3auth/base';
import 'react-native-url-polyfill/auto';

import {Input} from '@rneui/themed';
import {
  COREKIT_STATUS,
  TssShareType,
  WEB3AUTH_NETWORK,
  Web3AuthMPCCoreKit,
  asyncGetFactor,
  asyncStoreFactor,
  keyToMnemonic,
  parseToken,
} from '@web3auth/mpc-core-kit';
import {Bridge} from '@toruslabs/react-native-tss-lib-bridge';
import * as TssLibRN from '@toruslabs/react-native-tss-lib-bridge';
import {IAsyncStorage} from '@web3auth/mpc-core-kit';
import {BN} from 'bn.js';

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
  const [provider, setProvider] = useState<SafeEventEmitterProvider | null>(
    null,
  );
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
          setProvider(mpcCoreKitInstancelocal.provider);
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

  const login = async () => {
    try {
      setConsoleUI('Logging in');
      setLoading(true);

      if (!mpcCoreKitInstance) {
        uiConsole('coreKitInstance not initialized yet');
        return;
      }

      let mlogin = await mockLogin2('shahbaz123');
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

      var {requiredFactors} = mpcCoreKitInstance.getKeyDetails();

      uiConsole('requiredFactors', requiredFactors);

      if (requiredFactors > 0) {
        uiConsole(
          'Please enter your backup shares, requiredShares:',
          requiredFactors,
        );
      } else {
        setProvider(mpcCoreKitInstance.provider);
      }
    } catch (e) {
      uiConsole(e);
      setLoading(false);
    }
  };

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

  const createRecoveryFactor = async () => {
    if (!mpcCoreKitInstance) {
      uiConsole('MPC core kit not initialized yet');
      return;
    }
    try {
      const newFactor = await mpcCoreKitInstance?.createFactor({
        shareType: TssShareType.RECOVERY,
      });
      uiConsole('New Recovery Share Created');
      uiConsole(newFactor);
    } catch (error) {
      uiConsole('Error', (error as any)?.message.toString(), 'error');
    }
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
      uiConsole('Device Share Set');
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
        uiConsole('Device Share Found');
        uiConsole(result);
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
    if (!mpcCoreKitInstance) {
      uiConsole('MPC core kit not initialized yet');
      return;
    }
    try {
      const newFactor = await mpcCoreKitInstance?.createFactor({
        shareType: TssShareType.RECOVERY,
      });
      const mnemonic = keyToMnemonic(newFactor);
      uiConsole('Mnemonic Share Generated', mnemonic);
    } catch (error) {
      uiConsole('Error', (error as any)?.message.toString(), 'error');
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
    const address = await signer.getAddress();
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
    setUserInfo({});
    setCoreKitStatus(COREKIT_STATUS.NOT_INITIALIZED);
    await mpcCoreKitInstance?.logout();
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
      <TouchableOpacity onPress={createRecoveryFactor}>
        <Text>Create Recovery Factor</Text>
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
