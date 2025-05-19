# Web3Auth Telegram Mini App (TON + SFA) Example

This is a complete example demonstrating how to build a **Telegram Mini App** using **Web3Auth Single Factor Authentication (SFA)** to log in users via Telegram and access their **TON blockchain address**.

It includes both:

- A **client-side React app** integrated with Web3Auth SFA
- A **Node.js Express backend** that validates Telegram login and issues a JWT

---

## 📄 Official Guides

This example follows a two-part guide published by Web3Auth:

- [Server-Side Setup (Part 1)](https://web3auth.io/guides/telegram-miniapp-server)  
  Set up a secure backend to validate Telegram `initData` and issue a JWT.

- [Client-Side Setup (Part 2)](https://web3auth.io/guides/telegram-miniapp-client)  
  Integrate Web3Auth in a Telegram Mini App to authenticate users and access TON wallet details.

You can also try it live:  
👉 [Launch Demo Mini App](https://t.me/w3a_tg_mini_app_bot)

---

## 🗂️ Folder Overview

Only important folders shown:

```

sfa-web-ton-telegram-example/
├── server/             # Express backend (JWT issuance, Telegram validation)
│   └── api/
│       ├── index.js
│       ├── telegram.js
│       ├── privateKey.pem / publicKey.pem
│       ├── jwks.json
│       └── .env.example
├── src/                # React frontend (Telegram + Web3Auth integration)
│   ├── App.tsx
│   ├── tonRpc.ts       # TON RPC logic
│   ├── hooks/          # Custom hooks for Telegram + Web3Auth
│   └── components/     # UI components like Loader and Theme Toggle
├── .env.example        # Client-side environment variables
├── package.json
└── vite.config.ts

````

---

## ✅ Features

- Telegram login via Web3Auth SFA (Single Factor Auth)
- Supports both mocked and real Telegram environments
- Connects to TON Testnet via `ton-access`
- Fetches and displays TON wallet address
- Supports signing a message with the derived private key
- Dark/light mode UI toggle

---

## 🛠️ Quick Start

### 1. Clone the repo

```bash
git clone https://github.com/Web3Auth/web3auth-core-kit-examples.git
cd web3auth-core-kit-examples/single-factor-auth-web/sfa-web-ton-telegram-example
````

### 2. Configure the Backend

```bash
cd server/api
cp .env.example .env
# Fill in TELEGRAM_BOT_TOKEN, JWT_KEY_ID, APP_URL, etc.
npm install
npm run dev
```

### 3. Configure the Frontend

```bash
cd ../../
cp .env.example .env.local
# Fill in VITE_W3A_CLIENT_ID, VITE_W3A_VERIFIER_NAME, VITE_SERVER_URL
npm install
npm run dev
```

Visit `http://localhost:5173` in **Telegram’s in-app browser** to test the full flow.

---

## 🔒 Note on Mocking

For local development without Telegram, mocking is supported via the `useMockTelegramInitData.ts` hook.
Just open the app in the browser and it will simulate a Telegram user session.

---

## 📚 Learn More

* [Web3Auth Docs](https://web3auth.io/docs)
* [Custom JWT Verifier Setup](https://web3auth.io/docs/auth-provider-setup/byo-jwt-provider)
* [TON Blockchain](https://ton.org/)
* [Telegram WebApps Overview](https://core.telegram.org/bots/webapps)

---

Maintained by [Web3Auth](https://web3auth.io/)
