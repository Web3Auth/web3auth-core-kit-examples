import ThresholdKey from "@tkey/default";
import WebStorageModule from "@tkey/web-storage";
import SecurityQuestionsModule from "@tkey/security-questions";
import ShareSerializationModule, { SHARE_SERIALIZATION_MODULE_NAME } from "@tkey/share-serialization"
import { getPubKeyPoint, decrypt, toPrivKeyECC, ShareStore, EncryptedMessage } from "@tkey/common-types"


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

    [SHARE_SERIALIZATION_MODULE_NAME]: new ShareSerializationModule(),
  },
  customAuthArgs: customAuthArgs as any,
});


export const mnemonicToShareStore = async ( mnemonic : string) => {
  const tkey2 = new ThresholdKey({
    customAuthArgs: customAuthArgs as any
  });
  console.log(mnemonic)
  const deserializeModule = new ShareSerializationModule()
  const share = await deserializeModule.deserialize(mnemonic, "mnemonic");
  console.log(share)
  const point = getPubKeyPoint(share);
  const index = point.x.toString("hex")
   
  const authMetadata = await tkey2.getAuthMetadata({ privKey: share})

  const encryptedShareStore = authMetadata.scopedStore.encryptedShares as Record<string, EncryptedMessage>;
  if (!encryptedShareStore) {
    throw new Error (`share not available ${share}`);
  }
  const encryptedShare = encryptedShareStore[index];
  if (!encryptedShare) {
    throw new Error (`share not available ${share}`);
  }
  const rawDecrypted = await decrypt(toPrivKeyECC(share), encryptedShare as EncryptedMessage);
  
  const shareStore = ShareStore.fromJSON(JSON.parse(rawDecrypted.toString()));
  
  return shareStore
}