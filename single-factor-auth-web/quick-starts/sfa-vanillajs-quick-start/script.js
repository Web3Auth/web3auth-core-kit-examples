import { initializeApp } from "https://www.gstatic.com/firebasejs/9.6.10/firebase-app.js";
import { getAuth, signInWithEmailAndPassword } from "https://www.gstatic.com/firebasejs/9.6.10/firebase-auth.js";

// IMP START - Auth Provider Login
const firebaseConfig = {
  apiKey: "AIzaSyB0nd9YsPLu-tpdCrsXn8wgsWVAiYEpQ_E",
  authDomain: "web3auth-oauth-logins.firebaseapp.com",
  projectId: "web3auth-oauth-logins",
  storageBucket: "web3auth-oauth-logins.appspot.com",
  messagingSenderId: "461819774167",
  appId: "1:461819774167:web:e74addfb6cc88f3b5b9c92",
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
// IMP END - Auth Provider Login

const loginButton = document.getElementById("login");

let email, password, idToken, response;

let web3auth = null;

(async function init() {
  $(".btn-logged-in").hide();
  $("#sign-tx").hide();

  // IMP START - Dashboard Registration
  const clientId = "BPi5PB_UiIZ-cPz1GtV5i1I2iOSOHuimiXBI0e-Oe_u6X3oVAbCiAZOTEBtTXw4tsluTITPqA8zMsfxIKMjiqNQ"; // get your clientId from https://dashboard.web3auth.io
  // IMP END - Dashboard Registration

  // IMP START - Chain Config
  const chainConfig = {
    chainNamespace: "eip155",
    chainId: "0xaa36a7",
    rpcTarget: "https://rpc.ankr.com/eth_sepolia",
    // Avoid using public rpcTarget in production.
    // Use services like Infura, Quicknode etc
    displayName: "Ethereum Sepolia Testnet",
    blockExplorerUrl: "https://sepolia.etherscan.io",
    ticker: "ETH",
    tickerName: "Ethereum",
    logo: "https://cryptologos.cc/logos/ethereum-eth-logo.png",
  };
  // IMP END - Chain Config

  // IMP START - SDK Initialization
  const ethereumPrivateKeyProvider = new window.EthereumProvider.EthereumPrivateKeyProvider({
    config: { chainConfig },
  });

  uiConsole(window.SingleFactorAuth.Web3Auth);
  web3auth = new window.SingleFactorAuth.Web3Auth({
    clientId,
    web3AuthNetwork: "sapphire_mainnet", // Get your Network from Web3Auth Dashboard
    privateKeyProvider: ethereumPrivateKeyProvider,
  });

  await web3auth.init();
  // IMP END - SDK Initialization

  if (web3auth.status === "connected") {
    $(".btn-logged-in").show();
    $(".btn-logged-out").hide();
  } else {
    $(".btn-logged-out").show();
    $(".btn-logged-in").hide();
  }
})();

loginButton.addEventListener("click", async function () {
  // IMP START - Verifier Creation
  const verifier = "w3a-firebase-demo";
  // IMP END - Verifier Creation
  // IMP START - Auth Provider Login
  email = "custom+jwt@firebase.login";
  password = "Testing@123";
  try {
    uiConsole("Signing in with email and password in firebase");
    response = await signInWithEmailAndPassword(auth, email, password);
    uiConsole(response.user);
    idToken = await response.user.getIdToken(true);
    uiConsole(idToken);
    // IMP END - Auth Provider Login
    // IMP START - Login

    await web3auth.connect({
      verifier,
      verifierId: response.user.uid,
      idToken,
    });
    // IMP END - Login

    if (web3auth.status === "connected") {
      uiConsole("Connected to Web3Auth");
      $(".btn-logged-out").hide();
      $(".btn-logged-in").show();
    }
  } catch (error) {
    uiConsole(error);
  }
});

$("#get-user-info").click(async function (event) {
  try {
    uiConsole(response);
    // IMP START - Get User Information
    const user = await web3auth.getUserInfo();
    // IMP END - Get User Information
    uiConsole(user);
  } catch (error) {
    console.error(error.message);
  }
});

// IMP START - Blockchain Calls
$("#get-accounts").click(async function (event) {
  try {
    const web3 = new Web3(web3auth.provider);

    // Get user's Ethereum public address
    const address = await web3.eth.getAccounts();
    uiConsole(address);
  } catch (error) {
    console.error(error.message);
  }
});

$("#get-balance").click(async function (event) {
  try {
    const web3 = new Web3(web3auth.provider);

    // Get user's Ethereum public address
    const address = (await web3.eth.getAccounts())[0];

    // Get user's balance in ether
    const balance = web3.utils.fromWei(
      await web3.eth.getBalance(address), // Balance is in wei
      "ether"
    );
    uiConsole(balance);
  } catch (error) {
    console.error(error.message);
  }
});

$("#sign-message").click(async function (event) {
  try {
    const web3 = new Web3(web3auth.provider);
    // Get user's Ethereum public address
    const fromAddress = (await web3.eth.getAccounts())[0];

    const originalMessage = "YOUR_MESSAGE";

    // Sign the message
    const signedMessage = await web3.eth.personal.sign(
      originalMessage,
      fromAddress,
      "test password!" // configure your own password here.
    );
    uiConsole(signedMessage);
  } catch (error) {
    console.error(error.message);
  }
});
// IMP END - Blockchain Calls

$("#logout").click(async function (event) {
  try {
    // IMP START - Logout
    await web3auth.logout();
    // IMP END - Logout
    $(".btn-logged-in").hide();
    $(".btn-logged-out").show();
  } catch (error) {
    console.error(error.message);
  }
});

function uiConsole(...args) {
  const el = document.querySelector("#console>p");
  if (el) {
    el.innerHTML = JSON.stringify(args || {}, null, 2);
  }
  console.log(...args);
}
