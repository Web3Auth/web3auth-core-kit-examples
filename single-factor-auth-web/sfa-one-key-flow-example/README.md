# Web3Auth (`@web3auth/single-factor-auth`) x Web3Auth NoModal Example

## Using Web3Auth without MFA with future compatibility Single Page Example

[![Web3Auth](https://img.shields.io/badge/Web3Auth-SDK-blue)](https://web3auth.io/docs/sdk/single-factor-auth/)
[![Web3Auth](https://img.shields.io/badge/Web3Auth-Community-cyan)](https://community.web3auth.io)

[Join our Community Portal](https://community.web3auth.io/) to get support and stay up to date with the latest news and updates.

This example demonstrates how to use Web3Auth's Single Factor Authentication in a React environment.

## How to Use

### Download Manually

```bash
npx degit Web3Auth/web3auth-core-kit-examples/single-factor-auth/react-evm-sfa-example w3a-sfa-one-key-example
```

Install & Run:

```bash
cd w3a-sfa-one-key-example
npm install
npm run start
# or
cd w3a-sfa-one-key-example
yarn
yarn start
```

## Configure

Adding Web3Auth Plug and Play SDKs to your application is a great way to authenticate users and reconstruct their private key, and to reconstruct the key, Web3Auth SDK redirects users to a Web3Auth hosted screen (i.e. http://app.openlogin.com). This flow is great for most use cases. Still, sometimes you may want to customize the authentication flow such that you can have more control over the UI and UX of the authentication process (i.e. to avoid the redirection to openlogin hosted screens). This guide will show you how to use one such flow to authenticate users without redirecting to a Web3Auth-hosted screen.

[Read the full guide to configure.](https://web3auth.io/docs/content-hub/guides/single-factor-auth)

## Important Links

- [Website](https://web3auth.io)
- [Docs](https://web3auth.io/docs)
- [Guides](https://web3auth.io/docs/guides)
- [SDK / API References](https://web3auth.io/docs/sdk)
- [Pricing](https://web3auth.io/pricing.html)
- [Community Portal](https://community.web3auth.io)