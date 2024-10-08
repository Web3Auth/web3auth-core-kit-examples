// IMP START - Quick Start
const { Web3Auth } = require("@web3auth/node-sdk");
const { EthereumPrivateKeyProvider } = require("@web3auth/ethereum-provider");
// IMP END - Quick Start
const jwt = require('jsonwebtoken');
const fs = require('fs');

// IMP START - Dashboard Registration
const clientId = "BPi5PB_UiIZ-cPz1GtV5i1I2iOSOHuimiXBI0e-Oe_u6X3oVAbCiAZOTEBtTXw4tsluTITPqA8zMsfxIKMjiqNQ"; // Get your Client ID from Web3Auth Dashboard
// IMP END - Dashboard Registration

// IMP START - Verifier Creation
const verifier = "w3a-node-demo";
// IMP END - Verifier Creation

// IMP START - SDK Initialization
const web3auth = new Web3Auth({
  clientId,
  web3AuthNetwork: "sapphire_mainnet", // Get your Network ID from Web3Auth Dashboard
});

const ethereumProvider = new EthereumPrivateKeyProvider({
  config: {
    chainConfig: {
      chainId: "0x13882",
      rpcTarget: "https://rpc-amoy.polygon.technology/"
    }
  }
});

web3auth.init({ provider: ethereumProvider });
// IMP END - SDK Initialization

// IMP START - Auth Provider Login
var privateKey = fs.readFileSync('privateKey.pem');

var sub = Math.random().toString(36).substring(7);

var token = jwt.sign(
  {
    sub: sub,
    name: 'Agrawal Alam Mishra Rawski Bherwani',
    email: 'devrel@web3auth.io',
    aud: 'urn:api-web3auth-io',
    iss: 'https://web3auth.io',
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + 60 * 60,
  },
  privateKey,
  { algorithm: 'RS256', keyid: '2ma4enu1kdvw5bo9xsfpi3gcjzrt6q78yl0h' },
);
// IMP END - Auth Provider Login

const connect = async () => {
  // IMP START - Login
  const provider = await web3auth.connect({
    verifier: "w3a-node-demo", // replace with your verifier name
    verifierId: sub, // replace with your verifier id's value, for example, sub value of JWT Token, or email address.
    idToken: token, // replace with your newly created unused JWT Token.
  });
  // IMP END - Login
  const eth_private_key = await provider.request({ method: "eth_private_key" });
  console.log("ETH PrivateKey: ", eth_private_key);
  const eth_address = await provider.request({ method: "eth_accounts" });
  console.log("ETH Address: ", eth_address[0]);
  process.exit(0);
};
connect();