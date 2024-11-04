const jwt = require("jsonwebtoken");
const fs = require("fs");
const express = require("express");
const dotenv = require("dotenv");
const path = require("path");
const { AuthDataValidator } = require("@telegram-auth/server");
const { objectToAuthDataMap } = require("@telegram-auth/server/utils");
// IMP START - Quick Start
const {Web3Auth, SDK_MODE} = require('@web3auth/single-factor-auth');
const {CHAIN_NAMESPACES, WEB3AUTH_NETWORK} = require('@web3auth/base');
const { EthereumPrivateKeyProvider } = require("@web3auth/ethereum-provider");
// IMP END - Quick Start

dotenv.config();

const app = express();

const { TELEGRAM_BOT_NAME, TELEGRAM_BOT_TOKEN, SERVER_URL, CLIENT_URL, JWT_KEY_ID, W3A_VERIFIER_NAME } = process.env;
const TELEGRAM_BOT_CALLBACK = `${SERVER_URL}/callback`;
const privateKey = fs.readFileSync(path.resolve(__dirname, "privateKey.pem"), "utf8");

// IMP START - Dashboard Registration
const clientId = "BPi5PB_UiIZ-cPz1GtV5i1I2iOSOHuimiXBI0e-Oe_u6X3oVAbCiAZOTEBtTXw4tsluTITPqA8zMsfxIKMjiqNQ"; // Get your Client ID from Web3Auth Dashboard
// IMP END - Dashboard Registration

// IMP START - SDK Initialization
const chainConfig = {
  chainId: '0x1',
  displayName: 'Ethereum Mainnet',
  chainNamespace: CHAIN_NAMESPACES.EIP155,
  tickerName: 'Ethereum',
  ticker: 'ETH',
  decimals: 18,
  rpcTarget: 'https://rpc.ankr.com/eth',
  blockExplorerUrl: 'https://etherscan.io',
  logo: 'https://cryptologos.cc/logos/ethereum-eth-logo.png',
};

const privateKeyProvider = new EthereumPrivateKeyProvider({
  config: {chainConfig},
});

const web3auth = new Web3Auth({
  clientId, // Get your Client ID from Web3Auth Dashboard
  web3AuthNetwork: WEB3AUTH_NETWORK.SAPPHIRE_MAINNET,
  privateKeyProvider,
  mode: SDK_MODE.NODE,
});
// IMP END - SDK Initialization

const getPrivateKey = async (idToken, verifierId) => {
  await web3auth.init();
  await web3auth.connect({
        verifier: W3A_VERIFIER_NAME || "w3a-telegram-demo",
        verifierId,
        idToken,
    });

    // The private key returned here is the CoreKitKey
    const ethPrivateKey = await web3auth.provider.request({ method: "eth_private_key" });
    const ethPublicAddress = await web3auth.provider.request({ method: "eth_accounts" });
    const ethData = {
        ethPrivateKey,
        ethPublicAddress,
    };
    return ethData;
};

// A helper function to generate JWT token using the Telegram user data
const generateJwtToken = (userData) => {
    const payload = {
        telegram_id: userData.id,
        username: userData.username,
        avatar_url: userData.photo_url,
        sub: userData.id.toString(),
        name: userData.first_name,
        iss: "https://api.telegram.org",
        iat: Math.floor(Date.now() / 1000),
        exp: Math.floor(Date.now() / 1000) + 60 * 60, // 1 hour expiration
    };

    return jwt.sign(payload, privateKey, { algorithm: "RS256", keyid: JWT_KEY_ID });
};

app.get("/", (req, res) => res.send("Express on Vercel for Telegram Login to be used with Web3Auth"));

app.get("/.well-known/jwks.json", (req, res) => {
    const jwks = fs.readFileSync(path.resolve(__dirname, "jwks.json"), "utf8");
    res.send(JSON.parse(jwks));
});

// Endpoint to serve the login page
app.get("/login", (req, res) => {
    let htmlContent = `
  <!DOCTYPE html>
  <html lang="en">
    <head>
      <title>Telegram OAuth App with Web3Auth</title>
      <style>
        body {
          display: flex;
          justify-content: center;
          align-items: center;
          height: 100vh;
          margin: 0;
        }
      </style>
    </head>
    <body>
      <script>
        const script = document.createElement("script");
        script.async = true;
        script.src = "https://telegram.org/js/telegram-widget.js?22";
        script.setAttribute("data-telegram-login", "${TELEGRAM_BOT_NAME}");
        script.setAttribute("data-size", "large");
        script.setAttribute("data-userpic", "false");
        script.setAttribute("data-auth-url", "${SERVER_URL}/callback");

        document.body.appendChild(script);
      </script>
      <noscript>You need to enable JavaScript to run this app.</noscript>
    </body>
  </html>
  `;

    res.send(htmlContent);
});

// Endpoint to handle the Telegram callback
app.get("/callback", async (req, res) => {
    const validator = new AuthDataValidator({ botToken: TELEGRAM_BOT_TOKEN });
    const data = objectToAuthDataMap(req.query || {});

    try {
        const user = await validator.validate(data);
        const JWTtoken = generateJwtToken(user);

        const ethData = await getPrivateKey(JWTtoken, user.id.toString());
        console.log("ETH Data:", ethData);
    } catch (error) {
        console.error("Error validating Telegram data:", error);
        res.status(400).send("Invalid Telegram data");
    }
});

app.listen(3000, () => console.log("Server ready on port 3000."));

module.exports = app;