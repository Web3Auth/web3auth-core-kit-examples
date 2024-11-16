# Telegram OAuth Server for Web3Auth SFA Node

### Download Manually

```bash
npx degit Web3Auth/web3auth-core-kit-examples/single-factor-auth-node/sfa-telegram-oauth-server w3a-sfa-telegram-oauth-server
```

### Setup

1. Generate jwks and add in dashboard

- run `node generate.js` to create `jwka.jaon` file.
- Go to [Wallet connect dashboard]('https://dashboard.web3auth.io/')
- Create Project > Custom Auth > Create Verifier > Choose custom Provider > Add your raw `jwks` file generated above > Select Verifier Id(we are using sub in example) > Create verifier

2. Create a `.env` file in the project root and set the following variables:

```bash
TELEGRAM_BOT_NAME="" # e.g. @your_bot_name
TELEGRAM_BOT_TOKEN="" # e.g. 1234567890:ABCDEF
SERVER_URL="" # e.g. http://localhost:3000
CLIENT_URL="" # e.g. http://localhost:5173
JWT_KEY_ID="" # e.g. your_key_id
W3A_VERIFIER_NAME="" # e.g. your_verifier_name
```

1. Run the following commands:

```bash
npm install
npm start
# it will start the server at http://localhost:3000

# use ngrok to expose the server to the internet
# ngrok http 3000
# copy the ngrok url and update the SERVER_URL in the .env file
# also update the telegram bot domain to the ngrok url
```

4. Open your browser and navigate to `http://<URL>/login` to initiate the Telegram OAuth flow.
