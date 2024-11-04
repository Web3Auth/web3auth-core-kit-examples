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
  FactorKeyTypeShareDescription,
} = require("@web3auth/mpc-core-kit");
const { CHAIN_NAMESPACES } = require("@web3auth/base");
const { Point, secp256k1 } = require("@tkey/common-types");
// IMP END - Quick Start

const { sign } = require("jsonwebtoken");
const { BN } = require("bn.js");
const { tssLib } = require("@toruslabs/tss-dkls-lib");
const { getAuth, signInWithEmailAndPassword } = require("firebase/auth");
const { initializeApp } = require("firebase/app");
const fs = require("fs").promises;
const path = require("path");
const Web3 = require("web3").default;

// IMP START - Dashboard Registration
const web3AuthClientId = "BPi5PB_UiIZ-cPz1GtV5i1I2iOSOHuimiXBI0e-Oe_u6X3oVAbCiAZOTEBtTXw4tsluTITPqA8zMsfxIKMjiqNQ";
// IMP END - Dashboard Registration

// IMP START - Verifier Creation
const verifier = "w3a-node-demo";
// IMP END - Verifier Creation

// IMP START - Define Local Storage for MPC Core Kit
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

// IMP END - Define Local Storage for MPC Core Kit

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

const coreKitInstance = new Web3AuthMPCCoreKit({
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

const evmProvider = new EthereumSigningProvider({ config: { chainConfig } });

evmProvider.setupProvider(makeEthereumSigner(coreKitInstance));

// Initialize CoreKit
const initializeCoreKit = async () => {
  await coreKitInstance.init();
  console.log("Core Kit Initialized, Status:", coreKitInstance.status);
};
// IMP END - SDK Initialization

// Get Key Details
const keyDetails = async () => {
  if (!coreKitInstance) {
    throw new Error("coreKitInstance not found");
  }
  console.log(coreKitInstance.getKeyDetails());
};

// IMP START - Export Mnemonic Factor
const createMnemonicFactor = async () => {
  const recoveryFactorKey = generateFactorKey();
  await coreKitInstance.createFactor({
    shareType: TssShareType.RECOVERY,
    factorKey: recoveryFactorKey.private,
    shareDescription: FactorKeyTypeShareDescription.SeedPhrase,
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

// IMP START - Export Social Account Factor
const getSocialMFAFactorKey = async () => {
  try {
    // Create a temporary instance of the MPC Core Kit, used to create an encryption key for the Social Factor
    const tempCoreKitInstance = new Web3AuthMPCCoreKit({
      web3AuthClientId,
      web3AuthNetwork: WEB3AUTH_NETWORK.MAINNET,
      storage: {
        getItem: async (key) => getItem(key),
        setItem: async (key, value) => setItem(key, value),
        removeItem: async (key) => removeItem(key),
      },
      tssLib,
      baseUrl: "http://localhost",
      uxMode: "nodejs",
    });

    await tempCoreKitInstance.init();

    const app = initializeApp({
      apiKey: "AIzaSyB0nd9YsPLu-tpdCrsXn8wgsWVAiYEpQ_E",
      authDomain: "web3auth-oauth-logins.firebaseapp.com",
      projectId: "web3auth-oauth-logins",
      storageBucket: "web3auth-oauth-logins.appspot.com",
      messagingSenderId: "461819774167",
      appId: "1:461819774167:web:e74addfb6cc88f3b5b9c92",
    });

      // Login using Firebase Email Password
      const auth = getAuth(app);
      const res = await signInWithEmailAndPassword(auth, "custom+jwt@firebase.login", "Testing@123");
      console.log(res);
      const idToken = await res.user.getIdToken(true);
      const userInfo = parseToken(idToken);

      // Use the Web3Auth SFA SDK to generate an account using the Social Factor
      await tempCoreKitInstance.loginWithJWT({
        verifier: "w3a-firebase-demo",
        verifierId: userInfo.sub,
        idToken,
      });
    

    // Get the private key using the Social Factor, which can be used as a factor key for the MPC Core Kit
    const factorKey = await tempCoreKitInstance.state.postBoxKey;
    console.log("Social Factor Key: ", factorKey);
    tempCoreKitInstance.logout();
    return factorKey;
  } catch (err) {
    console.log(err);
    return "";
  }
};
// IMP END - Export Social Account Factor

// IMP START - Delete Factor
const deleteFactor = async () => {
  let factorPub;
  for (const [key, value] of Object.entries(coreKitInstance.getKeyDetails().shareDescriptions)) {
    if (value.length > 0) {
      const parsedData = JSON.parse(value[0]);
      if (parsedData.module === FactorKeyTypeShareDescription.SocialShare) {
        factorPub = key;
      }
    }
  }
  console.log("Factor Pub:", factorPub);
  const pub = Point.fromSEC1(secp256k1, factorPub);
  await coreKitInstance.deleteFactor(pub);
  await coreKitInstance.commitChanges();
};
// IMP END - Delete Factor

// Perform JWT Login and MFA Setup
const initAndLogin = async () => {
  await initializeCoreKit();

  if (coreKitInstance.status === COREKIT_STATUS.LOGGED_IN) {
    console.log("\x1b[33m%s\x1b[0m", "Already logged in. Logging out and retrying...");
    await coreKitInstance.logout();
    await coreKitInstance.init();
    console.log("\x1b[33m%s\x1b[0m", "Core Kit reinitialized after logout, Status:", coreKitInstance.status);
  }

  if (coreKitInstance.status !== COREKIT_STATUS.INITIALIZED) {
    throw new Error("Failed to initialize Web3AuthMPCCoreKit");
  }
  // IMP START - Auth Provider Login
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

  console.log("\x1b[33m%s\x1b[0m", "JWT Token:", token);
  // IMP END - Auth Provider Login

  // IMP START - Login
  await coreKitInstance.loginWithJWT({
    verifier,
    verifierId: sub,
    idToken: token,
  });
  // IMP END - Login

  console.log("\x1b[33m%s\x1b[0m", "Login initiated, Status:", coreKitInstance.status);

  if (coreKitInstance.status === COREKIT_STATUS.LOGGED_IN) {
    await coreKitInstance.commitChanges();

    console.log("\x1b[33m%s\x1b[0m", "Login successful, Status:", coreKitInstance.status);

    // Log the results of various methods after login
    await getUserInfo(); // Get User Info
    await keyDetails(); // Get Key Details

    console.log(
      "\x1b[33m%s\x1b[0m",
      "Account Created, it contains a hashed share for one click login for user. Enabling MFA in the next step using a social mfa factor."
    );

    const factorKey = new BN(await getSocialMFAFactorKey(), "hex");

    console.log("\x1b[33m%s\x1b[0m", "Social Factor Key:", factorKey.toString("hex"));

    await coreKitInstance.enableMFA({factorKey, shareDescription: FactorKeyTypeShareDescription.SocialShare });
    await coreKitInstance.commitChanges();
    await keyDetails(); // Get Key Details

    console.log("\x1b[33m%s\x1b[0m", "MFA Enabled. Hashed key is deleted, device and social factor are enabled.");

    await getDeviceFactor(); // Get Device Factor

    console.log("\x1b[33m%s\x1b[0m", "Exporting a new Mnemonic Factor for recovery.");

    await createMnemonicFactor(); // Export Mnemonic for recovery
    await keyDetails(); // Get Key Details

    console.log("\x1b[33m%s\x1b[0m", "Doing some blockchain interactions...");

    // Blockchain interaction
    await getAccounts(); // Get Ethereum Accounts
    await getBalance(); // Get Ethereum Balance
    await signMessage("Hello Web3Auth!"); // Sign a Message

    console.log("\x1b[33m%s\x1b[0m", "Blockchain interactions done.");
    console.log("\x1b[33m%s\x1b[0m", "Deleting Social MFA Factor and getting key details.");

    await deleteFactor(); // Delete Social MFA Factor
    await keyDetails(); // Get Key Details

    console.log(
      "\x1b[33m%s\x1b[0m",
      "Social MFA Factor deleted. Note the pubs details related to hashed and social factor are empty in the share descriptions."
    );
  }
};

// Call the initialization and login function
initAndLogin();
