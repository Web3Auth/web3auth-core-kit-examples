# Web3Auth (`@web3auth/single-factor-auth`) Telegram React-Vite Express Example

[![Web3Auth](https://img.shields.io/badge/Web3Auth-SDK-blue)](https://web3auth.io/docs/sdk/core-kit/sfa-web)
[![Web3Auth](https://img.shields.io/badge/Web3Auth-Community-cyan)](https://community.web3auth.io)

This example demonstrates how to use Web3Auth with Telegram Login in a React-Vite frontend with an Express backend. The server handles Telegram OAuth and issues JWT tokens for the Web3Auth SDK.

Check out our detailed guides to help you build and integrate Web3Auth into your Telegram Mini App:
- [Server-Side Setup Guide](https://web3auth.io/docs/guides/telegram-miniapp-server) - Learn to set up authentication, JWT tokens, and user sessions
- [Client-Side Development Guide](https://web3auth.io/docs/guides/telegram-miniapp-client) - Implement frontend integration with Telegram UI and Web3Auth

## Quick Start Guide

### Download the Example

```bash
npx degit Web3Auth/web3auth-core-kit-examples/single-factor-auth-web/sfa-web-ton-telegram-example w3a-sfa-web-ton-telegram-example
```

### Server Configuration

1. Create a `.env` file in the `server/api` directory:
```bash
TELEGRAM_BOT_TOKEN=""  # Token provided by BotFather upon bot creation
JWT_KEY_ID=""         # Create one using https://web3auth.io/docs/auth-provider-setup/byo-jwt-provider#generate-jwt
APP_URL=""           # Your frontend URL (e.g., http://localhost:5173)
```

### Client Configuration

1. Create a `.env.local` file in the root directory:
```bash
VITE_SERVER_URL=""   # Your server URL (e.g., http://localhost:3000)
```

### Installation & Running

Start the server:
```bash
cd w3a-example/server
npm install
npm run start    # Server runs on localhost:3000
```

Start the client:
```bash
cd ..
npm install
npm run start    # Client runs on localhost:5173
```

## Resources

- [Documentation](https://web3auth.io/docs)
- [Community Portal](https://community.web3auth.io)

[Join our Community Portal](https://community.web3auth.io/) to get support and stay up to date with the latest news and updates.