import { initializeApp } from "https://www.gstatic.com/firebasejs/9.6.10/firebase-app.js";
import { getAnalytics } from "https://www.gstatic.com/firebasejs/9.6.10/firebase-analytics.js";
import { getAuth, signInWithEmailAndPassword } from "https://www.gstatic.com/firebasejs/9.6.10/firebase-auth.js";

const firebaseConfig = {
  apiKey: "AIzaSyB0nd9YsPLu-tpdCrsXn8wgsWVAiYEpQ_E",
  authDomain: "web3auth-oauth-logins.firebaseapp.com",
  projectId: "web3auth-oauth-logins",
  storageBucket: "web3auth-oauth-logins.appspot.com",
  messagingSenderId: "461819774167",
  appId: "1:461819774167:web:e74addfb6cc88f3b5b9c92",
};

const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);
const auth = getAuth(app);

const loginButton = document.getElementById("login");

let email, password, idToken, response;

let web3auth = null;

(async function init() {
  $('.btn-logged-in').hide();
  $('#sign-tx').hide();

  const clientId =
        "BPi5PB_UiIZ-cPz1GtV5i1I2iOSOHuimiXBI0e-Oe_u6X3oVAbCiAZOTEBtTXw4tsluTITPqA8zMsfxIKMjiqNQ"; // get your clientId from https://dashboard.web3auth.io

      
  const chainConfig = {
    chainNamespace: "eip155",
    chainId: "0x1", // Please use 0x1 for Mainnet
    rpcTarget: "https://rpc.ankr.com/eth",
    displayName: "Ethereum Mainnet",
    blockExplorer: "https://etherscan.io/",
    ticker: "ETH",
    tickerName: "Ethereum",
  };

  console.log(window.SingleFactorAuth.Web3Auth);
  web3auth = new window.SingleFactorAuth.Web3Auth({
    clientId,
    web3AuthNetwork: "sapphire_mainnet", // Get your Network from Web3Auth Dashboard
  });

  const ethereumPrivateKeyProvider = new window.EthereumProvider.EthereumPrivateKeyProvider({
    config: { chainConfig },
  });

  await web3auth.init(ethereumPrivateKeyProvider);

  if (web3auth?.connected) {
    $('.btn-logged-in').show();
    $('.btn-logged-out').hide();
    if (web3auth.connected === "openlogin") {
      $('#sign-tx').show();
    }
  } else {
    $('.btn-logged-out').show();
    $('.btn-logged-in').hide();
  }
})();

loginButton.addEventListener("click", async function() {
  email = 'custom+jwt@firebase.login';
  console.log(email);
  password = 'Testing@123';
  console.log(password);
  try{
    response = await signInWithEmailAndPassword(auth, email , password);
    console.log(response.user);
    idToken = await response.user.getIdToken(true);
    console.log(idToken);
    await web3auth.connect({
      verifier: "w3a-firebase-demo",
      verifierId: response.user.uid,
      idToken: idToken,
    });
    $(".btn-logged-out").hide();
    $(".btn-logged-in").show();
  }
  catch(error){
    console.log(error);
  }
});

$("#get-user-info").click(async function (event) {
  try {
    console.log(response);
    const userInfo = await response.user.getIdTokenResult();
    uiConsole(userInfo);
  } catch (error) {
    console.error(error.message);
  }
});

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

$("#logout").click(async function (event) {
  try {
    await web3auth.logout();
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
    console.log(...args);
  }
}


