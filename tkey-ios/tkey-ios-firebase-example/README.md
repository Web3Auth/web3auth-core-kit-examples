# Web3Auth tKey iOS Example with Firebase verifier

[![Web3Auth](https://img.shields.io/badge/Web3Auth-SDK-blue)](https://web3auth.io/docs/sdk/tkey-ios)
[![Web3Auth](https://img.shields.io/badge/Web3Auth-Community-cyan)](https://community.web3auth.io)


[Join our Community Portal](https://community.web3auth.io/) to get support and stay up to date with the latest news and updates.

This example demonstrates how to use Web3Auth's tKey in iOS.

## How to Use

### Download Manually

```bash
npx degit Web3Auth/web3auth-core-kit-examples/tkey-ios/tkey-ios-firebase-example w3a-tkey-ios-firebase
```

Install & Run:

```bash
cd w3a-tkey-ios-firebase
# run project in Xcode
```

## Important Links

- [Website](https://web3auth.io)
- [Docs](https://web3auth.io/docs)
- [Guides](https://web3auth.io/docs/guides)
- [SDK / API References](https://web3auth.io/docs/sdk)
- [Pricing](https://web3auth.io/pricing.html)
- [Community Portal](https://community.web3auth.io)

#  Tkey ios example application document

This repository is an example application created by implementing the [tkey ios SDK](https://github.com/torusresearch/tkey-rust-ios) and [customAuth swift SDK](https://github.com/torusresearch/customauth-swift-sdk).
With this example app, you can test the various functions of the tkey SDK, and also google Social Login.

After complete building, you can login via your google account.
If you don't have tKey, you can make your own tkey account by clicking this button, using customAuth sdk.
If you already have your account, existing account can be used as well.

Once you're logged in, you can run a number of tkey-related functions.
Buttons allow you to test various modules and tkey built-in functions.

## dependency
- [tkey ios SDK](https://github.com/torusresearch/tkey-rust-ios) 
- [customAuth swift SDK](https://github.com/torusresearch/customauth-swift-sdk).

## Main Page
![mainPage](https://github.com/Web3Auth/web3auth-locales/assets/6962565/d3eb7adb-e6d7-4fc3-b36b-2772ccb20e1a)

### how to start

Once you have the final tkey from initialize and reconstruct tkey, you can test all the features.
The first time you run `Initialize and reconstruct tkey`, two shares will be created and the threshold will be set to two.
This means that both shares will be required for login. (2/2 setting)

On the other hand, if you log in with an existing account, you would need to have the saved shares for the reconstruction to succeed.

### testing on multiple device
If you want to test logging in with the same google account on different devices, you need to set up additional settings.
Create an additional security question share by pressing the `Add password` button in the security question module.

After that, try initialize on the second device. If you try it right away, you won't have the necessary shares and fail reconstruction. 
This is because the threshold required for reconstruct is 2, but the new device only has one existing social login share.

At this point, run `Enter SecurityQuestion password` button to retrieve the security question share which was set on the old device and save it locally to the new device.
After that, when logging in from that device, you can initialize it directly without entering the security question password.


### Reset Account (Critical)

If you are unable to recover your account, such as losing your recovery key, you can reset your account.
However, you will lose your existing private key, so please use this feature with extreme caution.