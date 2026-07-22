import { Web3AuthMPCCoreKit } from "@web3auth/mpc-core-kit";
import BN from "bn.js";

export const criticalResetAccount = async (coreKitInstance: Web3AuthMPCCoreKit): Promise<void> => {
  // This is a critical function that should only be used for testing purposes
  // Resetting your account means clearing all the metadata associated with it from the metadata server
  // The key details will be deleted from our server and you will not be able to recover your account
  if (!coreKitInstance.state.postBoxKey) {
    throw new Error("missing PostboxKey, Please try login with social account first");
  }
  await coreKitInstance.tKey.storageLayer.setMetadata({
    privKey: new BN(coreKitInstance.state.postBoxKey, "hex"),
    input: { message: "KEY_NOT_FOUND" },
  });
};
