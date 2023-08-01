import React, {useEffect, useState} from 'react';
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
import {tKeyInstance, ethereumPrivateKeyProvider} from './tkey';
import RPC from './ethersRPC'; // for using ethers.js
import auth from '@react-native-firebase/auth';
// @ts-ignore
import {decode as atob} from 'base-64';
import {Dialog, Input} from '@rneui/themed';
import EncryptedStorage from 'react-native-encrypted-storage';
import BN from 'bn.js';
import {ShareSerializationModule} from '@tkey/share-serialization';

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
  const [oAuthShare, setOAuthShare] = useState<any>(null);
  const [userInfo, setUserInfo] = useState<string>('');
  const [consoleUI, setConsoleUI] = useState<string>('');
  const [recoveryPassword, setRecoveryPassword] = useState<string>('');
  const [recoveryMnemonic, setRecoveryMnemonic] = useState<string>('');
  const [recoveryModalVisibility, setRecoveryModalVisibility] =
    useState<boolean>(false);
  const [passwordShareModalVisibility, setPasswordShareModalVisibility] =
    useState<boolean>(false);
  const [
    changePasswordShareModalVisibility,
    setChangePasswordShareModalVisibility,
  ] = useState<boolean>(false);

  useEffect(() => {
    const init = async () => {
      // Initialization of Service Provider
      try {
        await (tKeyInstance.serviceProvider as any).init(
          ethereumPrivateKeyProvider,
        );
      } catch (error) {
        console.error(error);
      }
    };
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

      const loginResponse = await (tKeyInstance.serviceProvider as any).connect(
        {
          verifier,
          verifierId,
          idToken,
        },
      );

      const OAuthShareKey = await loginResponse.request({
        method: 'eth_private_key',
      });
      uiConsole('OAuthShareKey', OAuthShareKey);
      setOAuthShare(OAuthShareKey);

      await tKeyInstance.initialize();

      var {requiredShares} = tKeyInstance.getKeyDetails();

      uiConsole('requiredShares', requiredShares);
      const deviceShare = await getDeviceShare();

      if (requiredShares > 0) {
        if (deviceShare) {
          try {
            await tKeyInstance.inputShare(deviceShare);
          } catch (error) {
            uiConsole(error);
          }
        }
        var {requiredShares} = tKeyInstance.getKeyDetails();
        if (requiredShares > 0) {
          await toggleRecoveryModalVisibility();
          setLoading(false);
          return;
        }
      }
      await reconstructKey();
      setLoading(false);
      uiConsole('Logged In');
    } catch (e) {
      uiConsole(e);
      setLoading(false);
    }
  };

  const reconstructKey = async () => {
    try {
      const reconstructedKey = await tKeyInstance.reconstructKey();
      const finalPrivateKey = reconstructedKey?.privKey.toString('hex');
      const deviceShare = await getDeviceShare();
      await setPrivateKey(finalPrivateKey);
      uiConsole(`Private Key: ${finalPrivateKey}`);
      if (!deviceShare) {
        setDeviceShare();
      }
    } catch (e) {
      uiConsole(e);
    }
  };

  const recoverPasswordShare = async (password: string) => {
    if (!tKeyInstance) {
      uiConsole('tKeyInstance not initialized yet');
      return;
    }

    if (password.length > 10) {
      try {
        setLoading(true);
        await (
          tKeyInstance.modules.securityQuestions as any
        ).inputShareFromSecurityQuestions(password); // 2/2 flow
        await reconstructKey();
        uiConsole('Successfully logged you in with the recovery password.');
      } catch (error) {
        uiConsole(error);
        setLoading(false);
      }
    } else {
      uiConsole('Error', 'Password must be >= 11 characters', 'error');
      setLoading(false);
    }
  };

  const recoverMnemonicShare = async (mnemonic: string) => {
    if (!tKeyInstance) {
      uiConsole('tKeyInstance not initialized yet');
      return;
    }
    try {
      setLoading(true);
      const share = await (
        tKeyInstance.modules.shareSerialization as ShareSerializationModule
      ).deserialize(mnemonic, 'mnemonic');
      await tKeyInstance.inputShare(share);
      await reconstructKey();
      uiConsole('Input Mnemonic Successful.');
    } catch (error) {
      uiConsole(error);
      setLoading(false);
    }
  };

  const setDeviceShare = async () => {
    try {
      const metadata = await tKeyInstance.getMetadata();
      const tKeyPubX = metadata.pubKey.x.toString(16, 64);
      const generateShareResult = await tKeyInstance.generateNewShare();
      const share = await tKeyInstance.outputShareStore(
        generateShareResult.newShareIndex,
      ).share.share;
      EncryptedStorage.setItem(
        `deviceShare${tKeyPubX}`,
        share.toString(16, 64),
      );
      uiConsole('Device Share Set', share.toString(16, 64));
    } catch (error) {
      uiConsole('Error', (error as any)?.message.toString(), 'error');
    }
  };

  const getDeviceShare = async () => {
    try {
      const metadata = await tKeyInstance.getMetadata();
      const tKeyPubX = metadata.pubKey.x.toString(16, 64);
      const shareHex = await EncryptedStorage.getItem(`deviceShare${tKeyPubX}`);
      if (shareHex && shareHex !== '0') {
        const shareBN = new BN(shareHex as any, 'hex');
        uiConsole(
          'Device Share Captured Successfully across',
          tKeyPubX,
          ':',
          shareBN,
        );
        return shareBN;
      }
      uiConsole('Device Share Not found');
      return null;
    } catch (error) {
      uiConsole('Error', (error as any)?.message.toString(), 'error');
    }
  };

  const deleteDeviceShare = async () => {
    try {
      const metadata = await tKeyInstance.getMetadata();
      const tKeyPubX = metadata.pubKey.x.toString(16, 64);
      await EncryptedStorage.removeItem(`deviceShare${tKeyPubX}`);
      uiConsole('Device Share Deleted');
    } catch (error) {
      uiConsole('Error', (error as any)?.message.toString(), 'error');
    }
  };

  const changeSecurityQuestionAndAnswer = async (password: string) => {
    if (!tKeyInstance) {
      uiConsole('tKeyInstance not initialized yet');
      return;
    }

    if (password.length > 10) {
      try {
        setLoading(true);
        await (
          tKeyInstance.modules.securityQuestions as any
        ).changeSecurityQuestionAndAnswer(password, 'whats your password?');
        uiConsole('Successfully changed new share with password.');
      } catch (error) {
        uiConsole('Error', (error as any)?.message.toString(), 'error');
        setLoading(false);
      }
    } else {
      uiConsole('Error', 'Password must be >= 11 characters', 'error');
      setLoading(false);
    }

    const keyDetails = await tKeyInstance.getKeyDetails();
    uiConsole(keyDetails);
  };

  const generateNewShareWithPassword = async (password: string) => {
    if (!tKeyInstance) {
      uiConsole('tKeyInstance not initialized yet');
      return;
    }
    if (password.length > 10) {
      try {
        setLoading(true);
        await (
          tKeyInstance.modules.securityQuestions as any
        ).generateNewShareWithSecurityQuestions(
          password,
          'whats your password?',
        );
        uiConsole('Successfully generated new share with password.');
      } catch (error) {
        uiConsole('Error', (error as any)?.message.toString(), 'error');
        setLoading(false);
      }
    } else {
      uiConsole('Error', 'Password must be >= 11 characters', 'error');
      setLoading(false);
    }
  };

  const exportMnemonic = async () => {
    if (!tKeyInstance) {
      uiConsole('tKeyInstance not initialized yet');
      return;
    }
    try {
      const generateShareResult = await tKeyInstance.generateNewShare();
      const share = await tKeyInstance.outputShareStore(
        generateShareResult.newShareIndex,
      ).share.share;
      const mnemonic = await (
        tKeyInstance.modules.shareSerialization as ShareSerializationModule
      ).serialize(share, 'mnemonic');
      uiConsole(mnemonic);
    } catch (error) {
      uiConsole(error);
    }
  };

  const getKeyDetails = async () => {
    if (!tKeyInstance) {
      uiConsole('tKeyInstance not initialized yet');
      return;
    }

    setConsoleUI('Getting Key Details');
    uiConsole(await tKeyInstance.getKeyDetails());
  };

  const resetAccount = async () => {
    if (!tKeyInstance) {
      uiConsole('tKeyInstance not initialized yet');
      return;
    }
    try {
      uiConsole(oAuthShare);
      await tKeyInstance.storageLayer.setMetadata({
        privKey: oAuthShare as any,
        input: {message: 'KEY_NOT_FOUND'},
      });
      uiConsole('Reset Account Successful.');
    } catch (e) {
      uiConsole(e);
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
  const logout = async () => {
    setPrivateKey(null);
    setOAuthShare(null);
    setUserInfo('');
  };

  const uiConsole = (...args: any) => {
    setConsoleUI(JSON.stringify(args || {}, null, 2) + '\n\n\n\n' + consoleUI);
    console.log(...args);
  };

  const toggleRecoveryModalVisibility = async () => {
    setRecoveryModalVisibility(!recoveryModalVisibility);
  };

  const recoveryModal = (
    <Dialog
      isVisible={recoveryModalVisibility}
      onBackdropPress={toggleRecoveryModalVisibility}>
      <Dialog.Title title="Enter Recovery Share" />
      <Input
        placeholder="Recovery Password"
        onChangeText={value => setRecoveryPassword(value)}
      />
      {loading && <ActivityIndicator />}
      <Button
        title="Submit"
        onPress={async () => {
          await recoverPasswordShare(recoveryPassword);
          toggleRecoveryModalVisibility();
          setLoading(false);
        }}
      />
      <Input
        placeholder="Recovery Mnemonic"
        onChangeText={value => setRecoveryMnemonic(value)}
      />
      <Button
        title="Submit"
        onPress={async () => {
          await recoverMnemonicShare(recoveryMnemonic);
          toggleRecoveryModalVisibility();
          setLoading(false);
        }}
      />
    </Dialog>
  );

  const togglePasswordShareModalVisibility = async () => {
    setPasswordShareModalVisibility(!passwordShareModalVisibility);
  };

  const setPasswordShareModal = (
    <Dialog
      isVisible={passwordShareModalVisibility}
      onBackdropPress={togglePasswordShareModalVisibility}>
      <Dialog.Title title="Enter Recovery Share" />
      <Input
        placeholder="Recovery Password"
        onChangeText={value => setRecoveryPassword(value)}
      />
      {loading && <ActivityIndicator />}
      <Button
        title="Submit"
        onPress={async () => {
          await generateNewShareWithPassword(recoveryPassword);
          togglePasswordShareModalVisibility();
          setLoading(false);
        }}
      />
    </Dialog>
  );

  const toggleChangePasswordShareModalVisibility = async () => {
    setChangePasswordShareModalVisibility(!changePasswordShareModalVisibility);
  };

  const changePasswordShareModal = (
    <Dialog
      isVisible={changePasswordShareModalVisibility}
      onBackdropPress={toggleChangePasswordShareModalVisibility}>
      <Dialog.Title title="Enter Recovery Share" />
      <Input
        placeholder="Recovery Password"
        onChangeText={value => setRecoveryPassword(value)}
      />
      {loading && <ActivityIndicator />}
      <Button
        title="Submit"
        onPress={async () => {
          await changeSecurityQuestionAndAnswer(recoveryPassword);
          toggleChangePasswordShareModalVisibility();
          setLoading(false);
        }}
      />
    </Dialog>
  );

  const loggedInView = (
    <View style={styles.buttonArea}>
      {setPasswordShareModal}
      {changePasswordShareModal}
      <TouchableOpacity onPress={() => uiConsole(userInfo)}>
        <Text>Get User Info</Text>
      </TouchableOpacity>
      <TouchableOpacity onPress={getKeyDetails}>
        <Text>Get Key Details</Text>
      </TouchableOpacity>
      <TouchableOpacity onPress={getChainId}>
        <Text>Get Chain ID</Text>
      </TouchableOpacity>
      <TouchableOpacity onPress={togglePasswordShareModalVisibility}>
        <Text>Set Password Share</Text>
      </TouchableOpacity>
      <TouchableOpacity onPress={toggleChangePasswordShareModalVisibility}>
        <Text>Change Password Share</Text>
      </TouchableOpacity>
      <TouchableOpacity onPress={getAccounts}>
        <Text>Get Accounts</Text>
      </TouchableOpacity>
      <TouchableOpacity onPress={getBalance}>
        <Text>Get Balance</Text>
      </TouchableOpacity>
      <TouchableOpacity onPress={sendTransaction}>
        <Text>Send Transaction</Text>
      </TouchableOpacity>
      <TouchableOpacity onPress={signMessage}>
        <Text>Sign Message</Text>
      </TouchableOpacity>
      <TouchableOpacity onPress={() => uiConsole(privateKey)}>
        <Text>Get Private Key</Text>
      </TouchableOpacity>
      <TouchableOpacity onPress={setDeviceShare}>
        <Text>Set Device Share</Text>
      </TouchableOpacity>
      <TouchableOpacity onPress={getDeviceShare}>
        <Text>Get Device Share</Text>
      </TouchableOpacity>
      <TouchableOpacity onPress={deleteDeviceShare}>
        <Text>Delete Device Share</Text>
      </TouchableOpacity>
      <TouchableOpacity onPress={exportMnemonic}>
        <Text>Export Mnemonic Share</Text>
      </TouchableOpacity>
      <TouchableOpacity onPress={resetAccount}>
        <Text>Reset Account</Text>
      </TouchableOpacity>
      <TouchableOpacity onPress={logout}>
        <Text>Log Out</Text>
      </TouchableOpacity>
    </View>
  );

  const unloggedInView = (
    <View style={styles.buttonArea}>
      {recoveryModal}
      <Button title="Login with Web3Auth" onPress={login} />
      {loading && <ActivityIndicator />}
      <Button title="Reset Account" onPress={resetAccount} />
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
