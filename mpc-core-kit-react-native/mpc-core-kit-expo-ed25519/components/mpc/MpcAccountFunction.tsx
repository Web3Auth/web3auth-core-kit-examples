// IMP START - Auth Provider Login
import { COREKIT_STATUS, generateFactorKey, keyToMnemonic, TssShareType } from "@web3auth/mpc-core-kit";
import mpclib from "@web3auth/react-native-mpc-core-kit";
import { Button, Text, View } from "react-native";

// import EncryptedStorage from "react-native-encrypted-storage";
import { mpcViewStyles as styles } from "./styles";

export default function MPCAccoutFunction(props: {
  uiConsole: (...args: any) => void;
  setLoading: (loading: boolean) => void;
  coreKitInstance: mpclib.Web3AuthMPCCoreKitRN;
  setCoreKitStatus: (status: COREKIT_STATUS) => void;
}) {
  const { uiConsole, setLoading, coreKitInstance, setCoreKitStatus } = props;
  // const { coreKitInstance, setCoreKitStatus } = useMPCCoreKitStore();

  // IMP END - Auth Provider Login
  const getUserInfo = async () => {};
  const keyDetails = async () => {
    uiConsole(await coreKitInstance.getKeyDetails());
  };

  const enableMFA = async () => {
    setLoading(true);
    try {
      uiConsole("Enabling MFA, please wait");
      // const factorKey = new BN(await getSocialMFAFactorKey(), "hex");
      await coreKitInstance.enableMFA({}, false);

      uiConsole(
        "MFA enabled, device factor stored in local store, deleted hashed cloud key, your firebase email password login (hardcoded in this example) is used as the social backup factor"
      );
    } catch (error: any) {
      uiConsole(error.message);
    }
    setLoading(false);
  };

  const exportMnemonicFactor = async () => {
    setLoading(true);
    uiConsole("export share type: ", TssShareType.RECOVERY);
    const factorKey = generateFactorKey();
    await coreKitInstance.createFactor({
      shareType: TssShareType.RECOVERY,
      factorKey: factorKey.private,
    });
    const factorKeyMnemonic = await keyToMnemonic(factorKey.private.toString("hex"));
    setLoading(false);

    uiConsole("Export factor key mnemonic: ", factorKeyMnemonic);
    // if (coreKitInstance.status === COREKIT_STATUS.LOGGED_IN) {
    //   await coreKitInstance.commitChanges();
    // }
  };

  const getDeviceFactor = async () => {
    try {
      const factorKey = await coreKitInstance.getDeviceFactor();
      uiConsole("Device share: ", factorKey);
    } catch (e) {
      console.log("catch error");
      uiConsole(e);
    }
  };

  const getNodeSignatures = async () => {
    const { signatures } = coreKitInstance;
    uiConsole("Node signatures: ", signatures);
  };

  const storeDeviceFactor = async () => {
    try {
      console.log(1000000n);
      const currentFactor = coreKitInstance.getCurrentFactorKey();
      uiConsole("current factor: ", currentFactor);
      await coreKitInstance.setDeviceFactor(currentFactor.factorKey, true);
      uiConsole("stored factor");
    } catch (error: any) {
      uiConsole(error.message);
    }
  };

  const logout = async () => {
    setLoading(true);
    try {
      // IMP START - Logout
      await coreKitInstance.logout();
    } catch (error: any) {
      uiConsole(error.message);
    }
    // IMP END - Logout
    // Log out from Auth0
    setLoading(false);
    uiConsole("logged out from web3auth");
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
    logout();
  };

  const recoverKey = async () => {
    try {
      const fac1 = coreKitInstance.getCurrentFactorKey().factorKey.toString("hex");
      uiConsole("current factor: ", fac1);
      const fac2 = await coreKitInstance.createFactor({
        shareType: TssShareType.RECOVERY,
      });
      const finalKey = await coreKitInstance._UNSAFE_recoverTssKey([fac1, fac2]);
      uiConsole("final key: ", finalKey);
      // uiConsole("key recovered");
    } catch (error: any) {
      uiConsole(error.message);
    }
  };

  const loggedInView = (
    <View style={styles.compressedButtons}>
      <Text style={styles.heading}>MPC Core Kit RN Account Function</Text>
      <Button title="Get User Info" onPress={getUserInfo} />
      <Button title="Key Details" onPress={keyDetails} />

      <Button title="Enable MFA" onPress={enableMFA} />
      <Button title="Generate Backup (Mnemonic) - CreateFactor" onPress={exportMnemonicFactor} />
      <Button title="Get node Signatures" onPress={() => getNodeSignatures()} />
      <Button title="Get Device Factor" onPress={() => getDeviceFactor()} />
      <Button title="store Device Factor" onPress={() => storeDeviceFactor()} />
      {/* <Button title="Store Device Factor" onPress={() => storeDeviceFactor()} /> */}
      <Button title="Recover Tss Key" onPress={recoverKey} />
      <Button title="Log Out" onPress={logout} />
      <Button title="[CRITICAL] Reset Account" onPress={criticalResetAccount} />
    </View>
  );

  return loggedInView;
}
