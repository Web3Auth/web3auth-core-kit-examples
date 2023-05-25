import ThresholdKey from "@tkey/default";
import WebStorageModule from "@tkey/web-storage";
import SecurityQuestionsModule from "@tkey/security-questions";
import ShareSerializationModule, { SHARE_SERIALIZATION_MODULE_NAME } from "@tkey/share-serialization"

// Configuration of Service Provider
const customAuthArgs = {
  web3AuthClientId: "BEglQSgt4cUWcj6SKRdu5QkOXTsePmMcusG5EAoyjyOYKlVRjIF1iCNnMOTfpzCiunHRrMui8TIwQPXdkQ8Yxuk",
  baseUrl: `${window.location.origin}/serviceworker`,
  network: "cyan", // based on the verifier network.
};
// Configuration of Modules
const webStorageModule = new WebStorageModule();
const securityQuestionsModule = new SecurityQuestionsModule();

// Instantiation of tKey
export const tKey = new ThresholdKey({
  modules: {
    webStorage: webStorageModule,
    securityQuestions: securityQuestionsModule,
  },
  customAuthArgs: customAuthArgs as any,
});


export const mnemonicToShareStore = async ( mnemonic : string) => {
  const tkey2 = new ThresholdKey({
    customAuthArgs: customAuthArgs as any
  });
  const deserializeModule = new ShareSerializationModule()
  const share = await deserializeModule.deserialize(mnemonic, "mnemonic");
  const authMetadata = await tkey2.getAuthMetadata({ privKey: share})
  return authMetadata.shareToShareStore(share)
}