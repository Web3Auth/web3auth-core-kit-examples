import { COREKIT_STATUS, JWTLoginParams, makeEthereumSigner, parseToken } from "@web3auth/mpc-core-kit";
import { router } from "expo-router";
import { useState } from "react";
import { Button, Text, TextInput, View } from "react-native";

import { useConsoleUI } from "@/hooks/useConsoleUI";
import { mockLogin2, useMPCCoreKitStore, Verifier } from "@/hooks/useMPCCoreKit";

import { ConsoleUI } from "./ConsoleUI";
import { mpcViewStyles as styles } from "./styles";
export const LoginView = () => {
  const { consoleUI, loading, uiConsole, setLoading } = useConsoleUI();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const { coreKitInstance, coreKitStatus, evmProvider, coreKitEd25519Instance, setCoreKitStatus, setCoreKitEd25519Status } = useMPCCoreKitStore();

  const login = async () => {
    if (coreKitStatus !== COREKIT_STATUS.INITIALIZED) {
      throw new Error(`Corekit not initialized - status:${coreKitStatus}`);
    }
    try {
      uiConsole("Logging in...");
      setLoading(true);
      // IMP START - Auth Provider Login
      const loginRes = await mockLogin2(email);
      // IMP END - Auth Provider Login
      uiConsole("Login success", loginRes);

      // IMP START - Login
      const idToken = await loginRes.idToken;

      uiConsole("idToken", idToken);
      const parsedToken = parseToken(idToken);

      const LoginParams = {
        verifier: Verifier,
        verifierId: parsedToken.email,
        idToken,
      } as JWTLoginParams;

      uiConsole(parsedToken);

      await coreKitInstance.loginWithJWT(LoginParams);

      if (coreKitInstance.status === COREKIT_STATUS.LOGGED_IN) {
        await evmProvider.setupProvider(makeEthereumSigner(coreKitInstance));
      }
      // IMP END - Login

      // IMP START - Recover MFA Enabled Account
      if (coreKitInstance.status === COREKIT_STATUS.REQUIRED_SHARE) {
        uiConsole(
          "required more shares, please enter your backup/ device factor key, or reset account [unrecoverable once reset, please use it with caution]"
        );
      }
      // IMP END - Recover MFA Enabled Account

      setCoreKitStatus(coreKitInstance.status);
    } catch (err) {
      uiConsole(err);
    } finally {
      setLoading(false);
    }
  };

  const loginEd25519 = async () => {
    if (coreKitStatus !== COREKIT_STATUS.INITIALIZED) {
      throw new Error("Corekit not initialized");
    }
    try {
      uiConsole("Logging in...");
      setLoading(true);
      // IMP START - Auth Provider Login
      const loginRes = await mockLogin2(email);
      // IMP END - Auth Provider Login
      uiConsole("Login success", loginRes);

      // IMP START - Login
      const idToken = await loginRes.idToken;
      uiConsole("idToken", idToken);
      const parsedToken = parseToken(idToken);

      const LoginParams = {
        verifier: Verifier,
        verifierId: parsedToken.email,
        idToken,
      } as JWTLoginParams;
      uiConsole(parsedToken);

      await coreKitEd25519Instance.loginWithJWT(LoginParams);

      // IMP START - Recover MFA Enabled Account
      if (coreKitEd25519Instance.status === COREKIT_STATUS.REQUIRED_SHARE) {
        uiConsole(
          "required more shares, please enter your backup/ device factor key, or reset account [unrecoverable once reset, please use it with caution]"
        );
      }
      // IMP END - Recover MFA Enabled Account
      setCoreKitEd25519Status(coreKitEd25519Instance.status);
    } catch (err) {
      uiConsole(err);
    } finally {
      setLoading(false);
    }
  };
  return (
    <View>
      <View style={styles.buttonArea}>
        <Text style={styles.heading}>MPC Core Kit RN Quick Start</Text>
        <Text style={styles.subHeading}>This is a test example, you can enter a random email & password to create a new account</Text>
        <View style={styles.section}>
          <Text>Enter your Email</Text>
          <TextInput style={styles.input} onChangeText={setEmail} value={email} secureTextEntry={false} autoCapitalize="none" />
        </View>
        <View style={styles.section}>
          <Text>Enter your Password</Text>
          <TextInput style={styles.input} onChangeText={setPassword} value={password} secureTextEntry={true} autoCapitalize="none" />
        </View>
        <Button title="Register/Login with Web3Auth" onPress={login} />
        <Button title="Register/Login with ED25519 Web3Auth" onPress={loginEd25519} />
        <View>
          <Button title="Off Network Recovery Secp256k1" onPress={() => router.replace({ pathname: "/(off-network-recovery)/evm" })} />
          <Button title="Off Network Recovery ED25519" onPress={() => router.replace({ pathname: "/(off-network-recovery)/solana" })} />
        </View>
      </View>
      <ConsoleUI consoleUI={consoleUI} loading={loading} />
    </View>
  );
};
