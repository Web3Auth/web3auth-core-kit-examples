# Web3Auth MPC CoreKit Web [`@web3auth/mpc-core-kit`](https://web3auth.io/docs/sdk/core-kit/mpc-core-kit) Aptos Example

[![Web3Auth](https://img.shields.io/badge/Web3Auth-SDK-blue)](https://web3auth.io/docs/sdk/core-kit/mpc-core-kit)
[![Web3Auth](https://img.shields.io/badge/Web3Auth-Community-cyan)](https://community.web3auth.io)

[Join our Community Portal](https://community.web3auth.io/) to get support and stay up to date with the latest news and updates.

This example demonstrates how to use Web3Auth's MPC CoreKit Web SDK with Aptos (devnet).

## How it works

The MPC Core Kit derives an Ed25519 public key for the logged-in user via FROST. The example
uses that public key to derive a legacy Aptos `AccountAddress` (sha3_256(pk || 0x00)), builds a
`RawTransaction` with `@aptos-labs/ts-sdk`, and signs the transaction's signing message through
the MPC `sign()` API. An `AccountAuthenticatorEd25519` (public key + signature) is then submitted
through `aptos.transaction.submit.simple`.

## How to Use

### Download Manually

```bash
npx degit Web3Auth/mpc-core-kit-examples/mpc-core-kit-web/mpc-core-kit-aptos w3a-mpc-core-kit-aptos
```

Install & Run:

```bash
cd w3a-mpc-core-kit-aptos
npm install
npm run dev
```

## Important Links

- [Website](https://web3auth.io)
- [Docs](https://web3auth.io/docs)
- [Guides](https://web3auth.io/docs/guides)
- [SDK / API References](https://web3auth.io/docs/sdk)
- [Pricing](https://web3auth.io/pricing.html)
- [Community Portal](https://community.web3auth.io)
