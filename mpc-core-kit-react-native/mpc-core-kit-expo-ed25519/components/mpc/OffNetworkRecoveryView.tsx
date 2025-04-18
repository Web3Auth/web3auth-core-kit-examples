import { COREKIT_STATUS, mnemonicToKey } from "@web3auth/react-native-mpc-core-kit";
import { Web3AuthMPCCoreKitRN } from "@web3auth/react-native-mpc-core-kit/dist/mpclib";
import BN from "bn.js";
import { useState } from "react";
import { Button, Text, TextInput, View } from "react-native";

import { useConsoleUI } from "@/hooks/useConsoleUI";

import { ConsoleUI } from "./ConsoleUI";
import { mpcViewStyles as styles } from "./styles";

export const OffNetworkRecoveryView = (props: {
  coreKitInstance: Web3AuthMPCCoreKitRN;
  coreKitStatus: COREKIT_STATUS;
  setCoreKitStatus: (status: COREKIT_STATUS) => void;
}) => {
  const { consoleUI, loading, setLoading, uiConsole } = useConsoleUI();
  const { coreKitInstance, coreKitStatus } = props;

  const [deviceFactor, setDeviceFactor] = useState("");
  const [recoveryFactor, setRecoveryFactor] = useState("");

  const recoverTss = async () => {
    uiConsole("Recovering TSS...");
    if (!coreKitInstance) {
      throw new Error("coreKitInstance is not set");
    }
    if (!deviceFactor || !recoveryFactor) {
      throw new Error("deviceFactor or recoveryFactor is not set");
    }
    console.log(deviceFactor, recoveryFactor);
    try {
      const factorKey = mnemonicToKey(deviceFactor.trim());
      const factorKey2 = mnemonicToKey(recoveryFactor.trim());
      // console.log("factorKey2: ", factorKey2);
      setLoading(true);
      const result = await coreKitInstance._UNSAFE_recoverTssKey([factorKey, factorKey2]);
      uiConsole("Recovery Result: ", result);
    } catch (e) {
      console.log(e);
      console.log("error");
    }
    setLoading(false);
  };

  return (
    <>
      <View>
        <View style={styles.section}>
          <Text>Key In Device Factor</Text>
          <TextInput style={styles.input} onChangeText={setDeviceFactor} value={deviceFactor} />
          <Text>Key In Recovery Factor</Text>
          <TextInput style={styles.input} onChangeText={setRecoveryFactor} value={recoveryFactor} />
          {coreKitStatus !== COREKIT_STATUS.INITIALIZED && <Text>Corekit is not initialized</Text>}
          <Button disabled={coreKitStatus !== COREKIT_STATUS.INITIALIZED} title="Recover TSS" onPress={() => recoverTss()} />
        </View>
      </View>
      <ConsoleUI consoleUI={consoleUI} loading={loading} />
    </>
  );
};
