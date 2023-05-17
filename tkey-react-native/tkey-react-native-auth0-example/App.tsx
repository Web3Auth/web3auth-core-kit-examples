import React, {useEffect, useState} from 'react';
import {
  Button,
  ScrollView,
  StyleSheet,
  Text,
  View,
  Dimensions,
  ActivityIndicator,
  Platform,
} from 'react-native';
import BN from 'bn.js';
// import AsyncStorage from '@react-native-async-storage/async-storage';
import {tKeyInstance, getNewTKeyInstance} from './tkey';
// @ts-ignore
import CustomAuth from '@toruslabs/customauth-react-native-sdk';
import RPC from './ethersRPC'; // for using ethers.js
// @ts-ignore
import {Dialog, Input} from '@rneui/themed';

const resolvedRedirectUrl =
  Platform.OS === 'ios'
    ? 'tdsdk://tdsdk/oauthCallback'
    : 'torusapp://org.torusresearch.customauthexample/redirect';

export default function App() {
  const [tKey, setTKey] = useState<typeof tKeyInstance>(tKeyInstance);
  const [privateKey, setPrivateKey] = useState<string | null>();
  const [loading, setLoading] = useState<boolean>(false);
  const [oAuthShare, setOAuthShare] = useState<BN | null>(null);
  const [userInfo, setUserInfo] = useState<string>('');
  const [consoleUI, setConsoleUI] = useState<string>('');
  const [recoveryPassword, setRecoveryPassword] = useState<string>('');
  const [recoveryModalVisibility, setRecoveryModalVisibility] =
    useState<boolean>(false);
  const [passwordShareModalVisibility, setPasswordShareModalVisibility] =
    useState<boolean>(false);
  const [
    changePasswordShareModalVisibility,
    setChangePasswordShareModalVisibility,
  ] = useState<boolean>(false);

  useEffect(() => {
    try {
      CustomAuth.init({
        browserRedirectUri: 'https://scripts.toruswallet.io/redirect.html',
        redirectUri: resolvedRedirectUrl,
        network: 'testnet', // details for test net
      });
    } catch (error) {
      uiConsole(error, 'mounted caught');
    }
  });

  const login = async () => {
    try {
      setConsoleUI('Logging in');
      setLoading(true);

      const verifier = 'web3auth-auth0-demo';

      const loginDetails = await CustomAuth.triggerLogin({
        typeOfLogin: 'jwt',
        verifier,
        clientId: '294QRkchfq2YaXUbPri7D6PH7xzHgQMT',
        jwtParams: {
          domain: 'shahbaz-torus.us.auth0.com',
          verifierIdField: 'sub',
        },
      });

      uiConsole('loginDetails', loginDetails);

      setUserInfo(loginDetails);
      tKey.serviceProvider.postboxKey = loginDetails.privateKey;
      setOAuthShare(loginDetails.privateKey);
      (tKey.serviceProvider as any).verifierName = verifier;
      (tKey.serviceProvider as any).verifierId =
        loginDetails.userInfo.name || 'something'; // need to fix this

      await tKey.initialize();

      const {requiredShares} = tKey.getKeyDetails();

      uiConsole('requiredShares', requiredShares);

      if (requiredShares <= 0) {
        const reconstructedKey = await tKey.reconstructKey();
        const finalPrivateKey = reconstructedKey?.privKey.toString('hex');
        await setPrivateKey(finalPrivateKey);
        uiConsole('Private Key: ' + finalPrivateKey);
      } else {
        toggleRecoveryModalVisibility();
      }

      setLoading(false);
      uiConsole('Logged In');
    } catch (e) {
      uiConsole(e);
      setLoading(false);
    }
  };

  const recoverShare = async (password: string) => {
    if (!tKey) {
      uiConsole('tKey not initialized yet');
      return;
    }

    if (password.length > 10) {
      try {
        setLoading(true);
        await (
          tKey.modules.securityQuestions as any
        ).inputShareFromSecurityQuestions(password); // 2/2 flow
        const {requiredShares} = tKey.getKeyDetails();
        if (requiredShares <= 0) {
          const reconstructedKey = await tKey.reconstructKey();
          const finalPrivateKey = reconstructedKey?.privKey.toString('hex');
          await setPrivateKey(finalPrivateKey);
          uiConsole('Private Key: ' + finalPrivateKey);
        }
        const newShare = await tKey.generateNewShare();
        const shareStore = await tKey.outputShareStore(newShare.newShareIndex);
        await (tKey.modules.webStorage as any).storeDeviceShare(shareStore);
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

  const changeSecurityQuestionAndAnswer = async (password: string) => {
    if (!tKey) {
      uiConsole('tKey not initialized yet');
      return;
    }

    if (password.length > 10) {
      try {
        setLoading(true);
        await (
          tKey.modules.securityQuestions as any
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

    const keyDetails = await tKey.getKeyDetails();
    uiConsole(keyDetails);
  };

  const generateNewShareWithPassword = async (password: string) => {
    if (!tKey) {
      uiConsole('tKey not initialized yet');
      return;
    }
    if (password.length > 10) {
      try {
        setLoading(true);
        await (
          tKey.modules.securityQuestions as any
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

  const getKeyDetails = async () => {
    if (!tKey) {
      uiConsole('tKey not initialized yet');
      return;
    }

    setConsoleUI('Getting Key Details');
    uiConsole(await tKey.getKeyDetails());
  };

  const resetAccount = async () => {
    if (!tKey) {
      uiConsole('tKey not initialized yet');
      return;
    }
    try {
      uiConsole(oAuthShare);
      await tKey.storageLayer.setMetadata({
        privKey: oAuthShare as BN,
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
    const newTkey = getNewTKeyInstance();
    setTKey(newTkey);
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
          await recoverShare(recoveryPassword);
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
      <Button title="Get User Info" onPress={() => uiConsole(userInfo)} />
      <Button title="Get Key Details" onPress={() => getKeyDetails()} />
      <Button title="Get Chain ID" onPress={() => getChainId()} />
      <Button
        title="Set Password Share"
        onPress={() => togglePasswordShareModalVisibility()}
      />
      <Button
        title="Change Password Share"
        onPress={() => toggleChangePasswordShareModalVisibility()}
      />
      <Button title="Get Accounts" onPress={() => getAccounts()} />
      <Button title="Get Balance" onPress={() => getBalance()} />
      <Button title="Send Transaction" onPress={() => sendTransaction()} />
      <Button title="Sign Message" onPress={() => signMessage()} />
      <Button title="Get Private Key" onPress={() => uiConsole(privateKey)} />
      <Button title="Reset Account" onPress={resetAccount} />
      <Button title="Log Out" onPress={logout} />
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
