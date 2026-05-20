import { COREKIT_STATUS, mnemonicToKey } from "@web3auth/react-native-mpc-core-kit";
import { Web3AuthMPCCoreKitRN } from "@web3auth/react-native-mpc-core-kit/dist/mpclib";
import BN from "bn.js";
import { useState } from "react";
import { Button, Text, TextInput, View } from "react-native";

import { useConsoleUI } from "@/hooks/useConsoleUI";

import { ConsoleUI } from "./ConsoleUI";
import { mpcViewStyles as styles } from "./styles";

export const RecoveryView = (props: {
  coreKitInstance: Web3AuthMPCCoreKitRN;
  coreKitStatus: COREKIT_STATUS;
  setCoreKitStatus: (status: COREKIT_STATUS) => void;
}) => {
  const { consoleUI, loading, setLoading, uiConsole } = useConsoleUI();
  const { coreKitInstance, coreKitStatus, setCoreKitStatus } = props;

  const [mnemonicFactor, setMnemonicFactor] = useState("");
  const [backupFactorKey, setBackupFactorKey] = useState("");

  const getMnemonicToFactorKeyHex = (mnemonic: string) => {
    if (!coreKitInstance) {
      throw new Error("coreKitInstance is not set");
    }
    setLoading(true);
    uiConsole("mnemonic: ", mnemonicToKey(mnemonic));
    const factorKey = new BN(mnemonicToKey(mnemonic), "hex");
    setBackupFactorKey(factorKey.toString("hex"));
    uiConsole("Factor key: ", factorKey);
    setLoading(false);
  };
  const getDeviceFactor = async () => {
    try {
      const factorKey = await coreKitInstance.getDeviceFactor();
      setBackupFactorKey(factorKey);
      uiConsole("Device share: ", factorKey);
    } catch (e) {
      console.log("catch error");
      uiConsole(e);
    }
  };
  // recovery
  const getSocialMFAFactorKey = () => {};

  const inputBackupFactorKey = async (factorkey: string) => {
    if (!coreKitInstance) {
      throw new Error("coreKitInstance not found");
    }
    if (!factorkey) {
      throw new Error("backupFactorKey not found");
    }
    setLoading(true);
    const factorKey = new BN(factorkey, "hex");
    await coreKitInstance.inputFactorKey(factorKey);

    setLoading(false);
    if (coreKitInstance.status === COREKIT_STATUS.REQUIRED_SHARE) {
      uiConsole(
        "required more shares even after inputing backup factor key, please enter your backup/ device factor key, or reset account [unrecoverable once reset, please use it with caution]"
      );
    }
    setCoreKitStatus(coreKitInstance.status);
  };

  const criticalResetAccount = async () => {
    // This is a critical function that should only be used for testing purposes
    // Resetting your account means clearing all the metadata associated with it from the metadata server
    // The key details will be deleted from our server and you will not be able to recover your account
    if (!coreKitInstance) {
      throw new Error("coreKitInstance is not set");
    }
    setLoading(true);
    await coreKitInstance._UNSAFE_resetAccount();
    setLoading(false);

    setCoreKitStatus(coreKitInstance.status);
  };

  return (
    <>
      <View>
        <View style={styles.section}>
          <Button disabled={coreKitStatus !== COREKIT_STATUS.REQUIRED_SHARE} title="Get Device Factor" onPress={() => getDeviceFactor()} />
          <Button
            disabled={coreKitStatus !== COREKIT_STATUS.REQUIRED_SHARE}
            title="Get Social Backup Factor"
            onPress={() => getSocialMFAFactorKey()}
          />
        </View>
        <View style={styles.section}>
          <Text>Recover Using Mnemonic Factor Key:</Text>
          <TextInput style={styles.input} onChangeText={setMnemonicFactor} value={mnemonicFactor} />
          <Button
            disabled={coreKitStatus !== COREKIT_STATUS.REQUIRED_SHARE}
            title="Get Recovery Factor Key using Mnemonic"
            onPress={() => getMnemonicToFactorKeyHex(mnemonicFactor)}
          />
        </View>
        <View style={styles.section}>
          <Text>Backup/ Device Factor: {backupFactorKey}</Text>
          <Button
            disabled={coreKitStatus !== COREKIT_STATUS.REQUIRED_SHARE}
            title="Input Backup Factor Key"
            onPress={() => inputBackupFactorKey(backupFactorKey)}
          />
        </View>
        <Button title="[CRITICAL] Reset Account" onPress={criticalResetAccount} />
      </View>
      <ConsoleUI consoleUI={consoleUI} loading={loading} />
    </>
  );
};
