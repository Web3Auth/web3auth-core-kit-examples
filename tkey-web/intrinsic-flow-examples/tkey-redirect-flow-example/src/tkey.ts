import ThresholdKey from "@tkey/default";
import WebStorageModule from "@tkey/web-storage";
import SecurityQuestionsModule from "@tkey/security-questions";
import { TORUS_SAPPHIRE_NETWORK } from "@toruslabs/constants";

// Configuration of Modules
const webStorageModule = new WebStorageModule();
const securityQuestionsModule = new SecurityQuestionsModule();

// Instantiation of tKey
export const tKey = new ThresholdKey({
  modules: {
    webStorage: webStorageModule,
    securityQuestions: securityQuestionsModule,
  },
  customAuthArgs: {
    web3AuthClientId: "BPi5PB_UiIZ-cPz1GtV5i1I2iOSOHuimiXBI0e-Oe_u6X3oVAbCiAZOTEBtTXw4tsluTITPqA8zMsfxIKMjiqNQ",
    baseUrl: window.location.origin,
    redirectPathName: "auth",
    enableLogging: true,
    uxMode: "redirect",
    network: TORUS_SAPPHIRE_NETWORK.SAPPHIRE_MAINNET,
  },
  manualSync: true,
});

