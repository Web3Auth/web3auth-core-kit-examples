// IMP START - Quick Start
const {Web3Auth, SDK_MODE} = require('@web3auth/single-factor-auth');
const {CHAIN_NAMESPACES, WEB3AUTH_NETWORK} = require('@web3auth/base');
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

// IMP START - Chain Config
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
// IMP END - Chain Config

// IMP START - SDK Initialization
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

// IMP START - Auth Provider Login
var privateKey = fs.readFileSync('privateKey.pem');

var sub = Math.random().toString(36).substring(7);

var token = jwt.sign(
  {
    sub: sub,
    name: 'Web3Auth DevRel Team',
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
  await web3auth.init();
  await web3auth.connect({
    verifier, // replace with your verifier name
    verifierId: sub, // replace with your verifier id's value, for example, sub value of JWT Token, or email address.
    idToken: token, // replace with your newly created unused JWT Token.
  });
  // IMP END - Login
  const eth_private_key = await web3auth.provider.request({ method: "eth_private_key" });
  console.log("ETH PrivateKey: ", eth_private_key);
  const eth_address = await web3auth.provider.request({ method: "eth_accounts" });
  console.log("ETH Address: ", eth_address[0]);
  process.exit(0);
};
connect();