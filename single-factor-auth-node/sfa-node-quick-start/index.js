// IMP START - Required Imports
const { EthereumSigningProvider } = require("@web3auth/ethereum-mpc-provider");
const {
  COREKIT_STATUS,
  makeEthereumSigner,
  WEB3AUTH_NETWORK,
  Web3AuthMPCCoreKit,
  parseToken,
  TssShareType,
  generateFactorKey,
  keyToMnemonic,
} = require("@web3auth/mpc-core-kit");
const { CHAIN_NAMESPACES } = require("@web3auth/base");
const { readFileSync } = require("fs");
const { sign } = require("jsonwebtoken");
const { BN } = require("bn.js");
const { tssLib } = require("@toruslabs/tss-dkls-lib"); // Import tssLib from your React app
const Web3AuthSingleFactorAuth = require("@web3auth/single-factor-auth").default;
const { CommonPrivateKeyProvider } = require("@web3auth/base-provider");
const { getAuth, signInWithEmailAndPassword } = require("firebase/auth");
const { initializeApp } = require("firebase/app");
// IMP END - Required Imports

const firebaseVerifier = "w3a-firebase-demo";

const firebaseConfig = {
  apiKey: "AIzaSyB0nd9YsPLu-tpdCrsXn8wgsWVAiYEpQ_E",
  authDomain: "web3auth-oauth-logins.firebaseapp.com",
  projectId: "web3auth-oauth-logins",
  storageBucket: "web3auth-oauth-logins.appspot.com",
  messagingSenderId: "461819774167",
  appId: "1:461819774167:web:e74addfb6cc88f3b5b9c92",
};

// Mock the `window` object for Node.js environment
if (typeof global.window === "undefined") {
  global.window = {
    localStorage: {
      getItem: () => null,
      setItem: () => null,
      removeItem: () => null,
    },
    location: {
      hash: "", // Initialize as an empty string
      origin: "http://localhost",
    },
  };
}

// IMP START - Dashboard Registration
const web3AuthClientId = "BPi5PB_UiIZ-cPz1GtV5i1I2iOSOHuimiXBI0e-Oe_u6X3oVAbCiAZOTEBtTXw4tsluTITPqA8zMsfxIKMjiqNQ"; // Get your Client ID from Web3Auth Dashboard
// IMP END - Dashboard Registration

// IMP START - Verifier Creation
const verifier = "w3a-node-demo"; // Replace with your verifier name
// IMP END - Verifier Creation

// IMP START - Chain Configuration
const chainConfig = {
  chainNamespace: CHAIN_NAMESPACES.EIP155,
  chainId: "0x1",
  rpcTarget: "https://rpc.ankr.com/eth",
  displayName: "Ethereum Mainnet",
  blockExplorerUrl: "https://etherscan.io",
  ticker: "ETH",
  tickerName: "Ethereum",
  logo: "https://cryptologos.cc/logos/ethereum-eth-logo.png",
};
// IMP END - Chain Configuration

let coreKitInstance;
let evmProvider;

// IMP START - MPC Core Kit Initialization
const initializeCoreKit = async () => {
  coreKitInstance = new Web3AuthMPCCoreKit({
    web3AuthClientId,
    web3AuthNetwork: WEB3AUTH_NETWORK.MAINNET,
    storage: global.window.localStorage, // Adjust for your environment
    manualSync: true,
    tssLib, // Add tssLib here
  });

  evmProvider = new EthereumSigningProvider({ config: { chainConfig } });
  evmProvider.setupProvider(makeEthereumSigner(coreKitInstance));

  await coreKitInstance.init();
  console.log("Core Kit Initialized, Status: ", coreKitInstance.status);

  if (coreKitInstance.status === COREKIT_STATUS.INITIALIZED) {
    console.log("Core Kit is initialized but not loggedin. Checking for required shares...");

    if (coreKitInstance.status === COREKIT_STATUS.LOGGED_IN) {
      console.log("Core Kit is already logged in.");
    }
  }
};
// IMP END - MPC Core Kit Initialization

// const MnemonicToFactorKeyHex = async (mnemonic) => {
//   if (!coreKitInstance) {
//     throw new Error("coreKitInstance is not set");
//   }
//   try {
//     const factorKey = await mnemonicToKey(mnemonic);
//     return factorKey;
//   } catch (error) {
//     console.log(error);
//   }
// };

const getSocialMFAFactorKey = async () => {
  try {
    // Initialise the Web3Auth SFA SDK
    // You can do this on the constructor as well for faster experience
    const privateKeyProvider = new CommonPrivateKeyProvider({ config: { chainConfig } });
    const web3authSfa = new Web3AuthSingleFactorAuth({
      clientId: web3AuthClientId, // Get your Client ID from Web3Auth Dashboard
      web3AuthNetwork: WEB3AUTH_NETWORK.MAINNET,
      usePnPKey: false, // Setting this to true returns the same key as PnP Web SDK, By default, this SDK returns CoreKitKey.
      privateKeyProvider,
    });
    await web3authSfa.init();
    const app = initializeApp(firebaseConfig);

    // Login using Firebase Email Password
    const auth = getAuth(app);
    const res = await signInWithEmailAndPassword(auth, "custom+jwt@firebase.login", "Testing@123");
    console.log(res);
    const idToken = await res.user.getIdToken(true);
    const userInfo = parseToken(idToken);

    // Use the Web3Auth SFA SDK to generate an account using the Social Factor
    const web3authProvider = await web3authSfa.connect({
      verifier: firebaseVerifier,
      verifierId: userInfo.sub,
      idToken,
    });

    // Get the private key using the Social Factor, which can be used as a factor key for the MPC Core Kit
    const factorKey = await web3authProvider.request({
      method: "private_key",
    });

    return factorKey;
  } catch (err) {
    console.log(err);
    return "";
  }
};

// IMP START - Auth Provider Login
const initAndLogin = async () => {
  await initializeCoreKit();
  if (coreKitInstance.status !== COREKIT_STATUS.INITIALIZED) {
    throw new Error("Failed to initialize Web3AuthMPCCoreKit");
  }

  const privateKey = readFileSync("privateKey.pem");

  const sub = Math.random().toString(36).substring(7);

  const token = sign(
    {
      sub,
      name: "Your Name",
      email: "your-email@example.com",
      aud: "urn:api-web3auth-io",
      iss: "https://web3auth.io",
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + 60 * 60,
    },
    privateKey,
    { algorithm: "RS256", keyid: "2ma4enu1kdvw5bo9xsfpi3gcjzrt6q78yl0h" }
  );

  console.log("JWT Token: ", token);

  if (coreKitInstance) {
    const idTokenLoginParams = {
      verifier,
      verifierId: sub,
      idToken: token,
    };

    await coreKitInstance.loginWithJWT(idTokenLoginParams);
    console.log("Login initiated, Status: ", coreKitInstance.status);

    if (coreKitInstance.status === COREKIT_STATUS.LOGGED_IN) {
      await coreKitInstance.commitChanges();
    }

    console.log("Login successful, Status: ", coreKitInstance.status);

    const socialFactorKey = new BN(await getSocialMFAFactorKey(), "hex");
    console.log("Factor key: ", socialFactorKey.toString("hex"));
    await coreKitInstance.enableMFA({ socialFactorKey });

    if (coreKitInstance.status === COREKIT_STATUS.LOGGED_IN) {
      await coreKitInstance.commitChanges();
    }
    console.log(
      "MFA enabled, device factor stored in local store, deleted hashed cloud key, your backup factor key is associated with the firebase email password account in the app"
    );
    console.log("MFA enabled, Status: ", coreKitInstance.status);

    console.log("export share type: ", TssShareType.RECOVERY);
    const recoveryFactorKey = generateFactorKey();
    await coreKitInstance.createFactor({
      shareType: TssShareType.RECOVERY,
      factorKey: recoveryFactorKey.private,
    });
    const factorKeyMnemonic = keyToMnemonic(recoveryFactorKey.private.toString("hex"));
    if (coreKitInstance.status === COREKIT_STATUS.LOGGED_IN) {
      await coreKitInstance.commitChanges();
    }
    
    console.log("Mnemonic: ", factorKeyMnemonic);
    console.log("Device factor: ", await coreKitInstance.getDeviceFactor(), global.window.localStorage);
    console.log("Key details: ", coreKitInstance.keyDetails);
  } else {
    console.log("coreKitInstance is not initialized.");
  }
};

initAndLogin();
// IMP END - Auth Provider Login
