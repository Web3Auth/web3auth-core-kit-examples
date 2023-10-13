const { Web3Auth } = require("@web3auth/node-sdk");
const { EthereumPrivateKeyProvider } = require("@web3auth/ethereum-provider");
const jwt = require('jsonwebtoken');
const fs = require('fs');

const web3auth = new Web3Auth({
  clientId: "BPi5PB_UiIZ-cPz1GtV5i1I2iOSOHuimiXBI0e-Oe_u6X3oVAbCiAZOTEBtTXw4tsluTITPqA8zMsfxIKMjiqNQ", // Get your Client ID from Web3Auth Dashboard
  web3AuthNetwork: "sapphire_mainnet", // Get your Network ID from Web3Auth Dashboard
});

const ethereumProvider = new EthereumPrivateKeyProvider({
  config: {
    chainConfig: {
      chainId: "0x1",
      rpcTarget: "https://rpc.ankr.com/eth"
    }
  }
});

web3auth.init({ provider: ethereumProvider });

var privateKey = fs.readFileSync('privateKey.pem');

var sub = Math.random().toString(36).substring(7);

var token = jwt.sign(
  {
    sub: sub,
    name: 'Mohammad Yashovardhan Mishra Jang',
    email: 'devrel@web3auth.io',
    aud: 'urn:api-web3auth-io',
    iss: 'https://web3auth.io',
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + 60 * 60,
  },
  privateKey,
  { algorithm: 'RS256', keyid: '2ma4enu1kdvw5bo9xsfpi3gcjzrt6q78yl0h' },
);

const connect = async () => {
  const provider = await web3auth.connect({
    verifier: "w3a-node-demo", // replace with your verifier name
    verifierId: sub, // replace with your verifier id's value, for example, sub value of JWT Token, or email address.
    idToken: token, // replace with your newly created unused JWT Token.
  });
  const eth_private_key = await provider.request({ method: "eth_private_key" });
  console.log("ETH Private Key: ", eth_private_key);
};
connect();
