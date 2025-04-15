const {Web3Auth, SDK_MODE} = require('@web3auth/single-factor-auth');
const {CHAIN_NAMESPACES, WEB3AUTH_NETWORK} = require('@web3auth/base');
const { EthereumPrivateKeyProvider } = require("@web3auth/ethereum-provider");
const jwt = require("jsonwebtoken");
const fs = require("fs");
const express = require("express");
const cors = require("cors");
const axios = require("axios");
const dotenv = require("dotenv");
const jwksJson = require("./jwks.json");
const qs = require("qs");

//For END File
dotenv.config();

const app = express();
const port = process.env.PORT || 5005;

const privateKey = fs.readFileSync(process.env.PRIVATE_KEY_FILE_NAME);
const azureClientId = process.env.AZURE_CLIENT_ID || "";
const azureClientSecret = process.env.AZURE_CLIENT_SECRET || "";
const azureTenantId = process.env.AZURE_TENANT_ID || "";
const azurCodeChallenge = process.env.AZURE_CODE_CHALLENGE || "";
const azureCodeVerifier = process.env.AZURE_CODE_VERIFIER || "";
const azureRedirectUri = "http://localhost:" + port + "/ms/callback";

// ms links
const MICROSOFT_URL = "https://login.microsoftonline.com";
const MICROSOFT_API_URL = "https://graph.microsoft.com";

app.use(cors());

// IMP START - SDK Initialization
const clientId =
  'BPi5PB_UiIZ-cPz1GtV5i1I2iOSOHuimiXBI0e-Oe_u6X3oVAbCiAZOTEBtTXw4tsluTITPqA8zMsfxIKMjiqNQ'; // get from https://dashboard.web3auth.io

const chainConfig = {
    chainId: '0x1',
    displayName: 'Ethereum Mainnet',
    chainNamespace: CHAIN_NAMESPACES.EIP155,
    tickerName: 'Ethereum',
    ticker: 'ETH',
    decimals: 18,
    rpcTarget: `https://api.web3auth.io/infura-service/v1/1/${clientId}`,
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

const getPrivateKey = async (idToken: string, verifierId: string) => {
    await web3auth.init();
    await web3auth.connect({
        verifier: process.env.WEB3AUTH_VERIFIER,
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

// get the user details from Microsoft
const fetchMicrosoftUserDetails = async (accessToken: string) => {
    try {
        const { data } = await axios.get(MICROSOFT_API_URL + "/v1.0/me", {
            headers: {
                Authorization: `Bearer ${accessToken}`,
            },
        });
        return data;
    } catch (error) {
        throw new Error("Failed to fetch user details");
    }
};

// generate the JWT token for the user signed in with the private key
const generateJwtToken = (userData: any) => {
    const payload = {
        microsoft_id: userData.id,
        username: userData.userPrincipalName,
        sub: userData.id.toString(),
        name: userData.displayName,
        email: userData.email || null,
        aud: MICROSOFT_URL + "/" + azureTenantId + "/oauth2/v2.0/token",
        iss: MICROSOFT_URL, //+ "/" + azureTenantId + "/oauth2/v2.0/token",
        iat: Math.floor(Date.now() / 1000),
        exp: Math.floor(Date.now() / 1000) + 60 * 60,
    };

    return jwt.sign(payload, privateKey, { algorithm: "RS256", keyid: jwksJson?.kid });
};

// Exchange the code for the access token
const exchangeCodeForAccessToken = async (code: string) => {
    try {
        const postData = {
            client_secret: azureClientSecret,
            client_id: azureClientId,
            code_verifier: azureCodeVerifier,
            grant_type: "authorization_code",
            code: code,
            redirect_uri: azureRedirectUri,
        };

        let response = await axios({
            method: "POST",
            url: MICROSOFT_URL + "/" + azureTenantId + "/oauth2/v2.0/token",
            data: qs.stringify(postData),
            headers: { "Content-Type": "application/x-www-form-urlencoded" },
        });

        return response.data.access_token;
    } catch (error) {
        throw new Error("Error during Azure authentication");
    }
};

// First call (localhost:5005/ms/login)
app.get("/ms/login", async (req: any, res: any) => {
    // code_challege generator -> https://tonyxu-io.github.io/pkce-generator/
    const oauthUrl = `${MICROSOFT_URL}/${azureTenantId}/oauth2/v2.0/authorize?
        client_id=${azureClientId}
        &response_type=code
        &redirect_uri=${encodeURIComponent(azureRedirectUri)}
        &response_mode=query
        &scope=User.ReadBasic.All
        &state=w3a_microsoft
        &prompt=login
        &code_challenge=${azurCodeChallenge}
        &code_challenge_method=S256`;
    res.redirect(oauthUrl);
});

app.get("/ms/callback", async (req: any, res: any) => {
    const code = req.query.code;
    try {
        const accessToken = await exchangeCodeForAccessToken(code);
        const userData = await fetchMicrosoftUserDetails(accessToken);
        const jwtToken = generateJwtToken(userData);
        const ethData = await getPrivateKey(jwtToken, userData.id.toString());
        res.json({ userData, jwtToken, ethData });
    } catch (error) {
        res.status(500).send("Error during Microsoft authentication callback");
    }
});

// Start the server
app.listen(port, () => {
    console.log(`Server is Fire at http://localhost:${port}`);
});
