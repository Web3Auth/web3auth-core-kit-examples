// Define required constants
// IMP START - Dashboard Registration
const web3AuthClientId = "BPi5PB_UiIZ-cPz1GtV5i1I2iOSOHuimiXBI0e-Oe_u6X3oVAbCiAZOTEBtTXw4tsluTITPqA8zMsfxIKMjiqNQ";
// IMP END - Dashboard Registration
// IMP START - Verifier Creation
const firebaseVerifier = "w3a-firebase-demo";
// IMP END - Verifier Creation

const firebaseConfig = {
  apiKey: "AIzaSyB0nd9YsPLu-tpdCrsXn8wgsWVAiYEpQ_E",
  authDomain: "web3auth-oauth-logins.firebaseapp.com",
  projectId: "web3auth-oauth-logins",
  storageBucket: "web3auth-oauth-logins.appspot.com",
  messagingSenderId: "461819774167",
  appId: "1:461819774167:web:e74addfb6cc88f3b5b9c92",
};

// Import required modules
// IMP START - Quick Start
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
// IMP END - Quick Start

const { sign } = require("jsonwebtoken");
const { BN } = require("bn.js");
const { tssLib } = require("@toruslabs/tss-dkls-lib");
const { CommonPrivateKeyProvider } = require("@web3auth/base-provider");
const Web3AuthSingleFactorAuth = require("@web3auth/single-factor-auth").default;
const { getAuth, signInWithEmailAndPassword } = require("firebase/auth");
const { initializeApp } = require("firebase/app");
const fs = require("fs").promises;
const path = require("path");
const Web3 = require("web3").default;

// Define the file path for storage
const storageFilePath = path.resolve(__dirname, "storage.json");

// Helper functions for file-based storage
async function readStorageFile() {
  try {
    const data = await fs.readFile(storageFilePath, "utf8");
    return JSON.parse(data);
  } catch (error) {
    if (error.code === "ENOENT") {
      return {}; // If file doesn't exist, return empty object
    }
    throw error;
  }
}

async function writeStorageFile(data) {
  await fs.writeFile(storageFilePath, JSON.stringify(data, null, 2), "utf8");
}

async function getItem(key) {
  const storage = await readStorageFile();
  return storage[key] || null;
}

async function setItem(key, value) {
  const storage = await readStorageFile();
  storage[key] = value;
  await writeStorageFile(storage);
}

async function removeItem(key) {
  const storage = await readStorageFile();
  delete storage[key];
  await writeStorageFile(storage);
}

// Declare evmProvider and coreKitInstance
let evmProvider;
let coreKitInstance;

// IMP START - SDK Initialization
// Chain configuration for Ethereum Mainnet
const chainConfig = {
  chainNamespace: CHAIN_NAMESPACES.EIP155,
  chainId: "0x1", // Ethereum Mainnet
  rpcTarget: "https://rpc.ankr.com/eth",
  displayName: "Ethereum Mainnet",
  blockExplorerUrl: "https://etherscan.io",
  ticker: "ETH",
  tickerName: "Ethereum",
};

// Initialize CoreKit
const initializeCoreKit = async () => {
  coreKitInstance = new Web3AuthMPCCoreKit({
    web3AuthClientId,
    web3AuthNetwork: WEB3AUTH_NETWORK.MAINNET,
    storage: {
      getItem: async (key) => getItem(key),
      setItem: async (key, value) => setItem(key, value),
      removeItem: async (key) => removeItem(key),
    },
    manualSync: true,
    tssLib,
    baseUrl: "http://localhost",
    uxMode: "nodejs",
  });

  evmProvider = new EthereumSigningProvider({ config: { chainConfig } });
  evmProvider.setupProvider(makeEthereumSigner(coreKitInstance));

  await coreKitInstance.init();
  console.log("Core Kit Initialized, Status:", coreKitInstance.status);
};
// IMP END - SDK Initialization

// IMP START - Auth Provider Login
const getSocialMFAFactorKey = async () => {
  try {
    const privateKeyProvider = new CommonPrivateKeyProvider({ config: { chainConfig } });
    const web3authSfa = new Web3AuthSingleFactorAuth({
      clientId: web3AuthClientId,
      web3AuthNetwork: WEB3AUTH_NETWORK.MAINNET,
      usePnPKey: false,
      privateKeyProvider,
    });
    await web3authSfa.init();

    const app = initializeApp(firebaseConfig);
    const auth = getAuth(app);
    const res = await signInWithEmailAndPassword(auth, "custom+jwt@firebase.login", "Testing@123");
    const idToken = await res.user.getIdToken(true);
    const userInfo = parseToken(idToken);

    const web3authProvider = await web3authSfa.connect({
      verifier: firebaseVerifier,
      verifierId: userInfo.sub,
      idToken,
    });

    const factorKey = await web3authProvider.request({
      method: "private_key",
    });

    return factorKey;
  } catch (err) {
    console.error(err);
    return "";
  }
};
// IMP END - Auth Provider Login

// Get Key Details
const keyDetails = async () => {
  if (!coreKitInstance) {
    throw new Error("coreKitInstance not found");
  }
  console.log(coreKitInstance.getKeyDetails());
};

// IMP START - Export Mnemonic Factor
const exportMnemonicFactor = async () => {
  const recoveryFactorKey = generateFactorKey();
  await coreKitInstance.createFactor({
    shareType: TssShareType.RECOVERY,
    factorKey: recoveryFactorKey.private,
  });
  const factorKeyMnemonic = keyToMnemonic(recoveryFactorKey.private.toString("hex"));
  console.log("Mnemonic:", factorKeyMnemonic);

  if (coreKitInstance.status === COREKIT_STATUS.LOGGED_IN) {
    await coreKitInstance.commitChanges();
  }
};
// IMP END - Export Mnemonic Factor

// Get Device Factor
const getDeviceFactor = async () => {
  const deviceFactor = await coreKitInstance.getDeviceFactor();
  console.log("Device Factor:", deviceFactor);
};

// Get User Info
// IMP START - Get User Information
const getUserInfo = async () => {
  const user = coreKitInstance.getUserInfo();
  console.log("User Info:", user);
};
// IMP END - Get User Information

// Blockchain Calls
// IMP START - Blockchain Calls
// Get Ethereum Accounts
const getAccounts = async () => {
  const web3 = new Web3(evmProvider);

  try {
    const accounts = await web3.eth.getAccounts();
    console.log("Accounts:", accounts);
  } catch (error) {
    console.error("Error fetching accounts:", error);
  }
};

// Get Ethereum Balance
const getBalance = async () => {
  const web3 = new Web3(evmProvider);

  try {
    const accounts = await web3.eth.getAccounts();
    const balance = await web3.eth.getBalance(accounts[0]);
    console.log("Balance (ETH):", web3.utils.fromWei(balance, "ether"));
  } catch (error) {
    console.error("Error fetching balance:", error);
  }
};

// Sign Ethereum Message
const signMessage = async (message) => {
  const web3 = new Web3(evmProvider);

  try {
    const accounts = await web3.eth.getAccounts();
    const signature = await web3.eth.personal.sign(message, accounts[0], "password");
    console.log("Signed Message:", signature);
  } catch (error) {
    console.error("Error signing message:", error);
  }
};
// IMP END - Blockchain Calls

// Perform JWT Login and MFA Setup
const initAndLogin = async () => {
  await initializeCoreKit();

  if (coreKitInstance.status === COREKIT_STATUS.LOGGED_IN) {
    console.log("Already logged in. Logging out and retrying...");
    await coreKitInstance.logout();
    await coreKitInstance.init();
    console.log("Core Kit reinitialized after logout, Status:", coreKitInstance.status);
  }

  if (coreKitInstance.status !== COREKIT_STATUS.INITIALIZED) {
    throw new Error("Failed to initialize Web3AuthMPCCoreKit");
  }

  const privateKey = await fs.readFile("privateKey.pem", "utf8");
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

  console.log("JWT Token:", token);

  await coreKitInstance.loginWithJWT({
    verifier: "w3a-node-demo",
    verifierId: sub,
    idToken: token,
  });

  console.log("Login initiated, Status:", coreKitInstance.status);

  if (coreKitInstance.status === COREKIT_STATUS.LOGGED_IN) {
    await coreKitInstance.commitChanges();
    console.log("Login successful, Status:", coreKitInstance.status);

    // Log the results of various methods after login
    await getUserInfo(); // Get User Info
    const socialFactorKey = new BN(await getSocialMFAFactorKey(), "hex");
    console.log("Social Factor Key:", socialFactorKey.toString("hex"));
    await coreKitInstance.enableMFA({ socialFactorKey });
    await coreKitInstance.commitChanges();
    console.log("MFA Enabled");

    await getDeviceFactor(); // Get Device Factor
    await exportMnemonicFactor(); // Export Mnemonic for recovery
    await keyDetails(); // Get Key Details

    // Blockchain interaction
    await getAccounts(); // Get Ethereum Accounts
    await getBalance(); // Get Ethereum Balance
    await signMessage("Hello Web3Auth!"); // Sign a Message
  }
};

// Call the initialization and login function
initAndLogin();
