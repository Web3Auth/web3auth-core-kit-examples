import { browserSupportsWebAuthn, startAuthentication, startRegistration } from "@simplewebauthn/browser";
import { getPublicCompressed } from "@toruslabs/eccrypto";
import { get, post } from "@toruslabs/http-helpers";
import { CustomChainConfig, IProvider } from "@web3auth/base";
import { EthereumPrivateKeyProvider } from "@web3auth/ethereum-provider";
import { Web3Auth } from "@web3auth/single-factor-auth";
import * as jose from "jose";
import React, { createContext, ReactNode, useCallback, useContext, useEffect, useState } from "react";

import { chain } from "../config/chainConfig";
import { PASSKEYS_BACKEND_URL, verifier } from "../config/consts";
import { getWalletProvider, IWalletProvider } from "./walletProvider";

export interface IWeb3AuthContext {
  web3Auth: Web3Auth | null;
  connected: boolean;
  provider: IWalletProvider | null;
  isLoading: boolean;
  user: any;
  web3AuthIdToken: string;
  playgroundConsole: string;
  address: string;
  balance: string;
  chainId: string;
  email: string;
  connectedChain: CustomChainConfig;
  isWebAuthnLoginEnabled: boolean;
  isWebAuthnRegistrationEnabled: boolean;
  login: () => Promise<void>;
  logout: () => Promise<void>;
  getUserInfo: () => Promise<any>;
  getAddress: () => Promise<string>;
  getBalance: () => Promise<string>;
  getSignature: (message: string) => Promise<string>;
  sendTransaction: (amount: string, destination: string) => Promise<string>;
  getPrivateKey: () => Promise<string>;
  getChainId: () => Promise<string>;
  deployContract: (abi: any, bytecode: string, initValue: string) => Promise<any>;
  readContract: (contractAddress: string, contractABI: any) => Promise<string>;
  writeContract: (contractAddress: string, contractABI: any, updatedNumber: string) => Promise<string>;
  verifyServerSide: (idToken: string) => Promise<any>;
  switchChain: (network: string) => Promise<void>;
  updateConnectedChain: (network: string) => void;
  updateEmail: (email: string) => void;
  triggerPassKeyRegistration: () => Promise<void>;
}

export const Web3AuthContext = createContext<IWeb3AuthContext>({
  web3Auth: null,
  connected: false,
  provider: null,
  isLoading: false,
  user: null,
  web3AuthIdToken: "",
  address: "",
  balance: "",
  chainId: "",
  email: "",
  playgroundConsole: "",
  isWebAuthnLoginEnabled: false,
  isWebAuthnRegistrationEnabled: false,
  connectedChain: chain["Goerli Testnet"],
  login: async () => {},
  logout: async () => {},
  getUserInfo: async () => null,
  getAddress: async () => "",
  getBalance: async () => "",
  getSignature: async () => "",
  sendTransaction: async () => "",
  getPrivateKey: async () => "",
  getChainId: async () => "",
  deployContract: async () => {},
  readContract: async () => "",
  writeContract: async () => "",
  verifyServerSide: async () => {},
  switchChain: async () => {},
  updateConnectedChain: () => {},
  updateEmail: () => {},
  triggerPassKeyRegistration: async () => {},
});

export function useWeb3Auth(): IWeb3AuthContext {
  return useContext(Web3AuthContext);
}

interface IWeb3AuthProps {
  children?: ReactNode;
}

export const Web3AuthProvider = ({ children }: IWeb3AuthProps) => {
  const [web3Auth, setWeb3Auth] = useState<Web3Auth | null>(null);
  const [provider, setProvider] = useState<IWalletProvider | null>(null);
  const [address, setAddress] = useState<string>("");
  const [playgroundConsole, setPlaygroundConsole] = useState<string>("");
  const [balance, setBalance] = useState<string>("");
  const [user, setUser] = useState<any>(null);
  const [web3AuthIdToken, setWeb3AuthIdToken] = useState<string>("");
  const [isLoading, setIsLoading] = useState(false);
  const [chainId, setChainId] = useState<any>(null);
  const [connected, setConnected] = useState<boolean>(false);

  const [email, setEmail] = useState<string>("");
  const isWebAuthnSupported = browserSupportsWebAuthn();
  const [isWebAuthnLoginEnabled, setIsWebAuthnLoginEnabled] = useState(false);
  const [isWebAuthnRegistrationEnabled, setIsWebAuthnRegistrationEnabled] = useState(false);

  const [connectedChain, setConnectedChain] = useState<CustomChainConfig>(chain["Goerli Testnet"]);

  const uiConsole = (...args: unknown[]) => {
    setPlaygroundConsole(`${JSON.stringify(args || {}, null, 2)}\n\n\n\n${playgroundConsole}`);
    console.log(...args);
  };

  const setWalletProvider = useCallback(async (web3authProvider: IProvider | null) => {
    const walletProvider = getWalletProvider(web3authProvider, uiConsole);
    setProvider(walletProvider);
    setAddress(await walletProvider.getAddress());
    setBalance(await walletProvider.getBalance());
    setChainId(await walletProvider.getChainId());
  }, []);

  useEffect(() => {
    async function init() {
      try {
        setIsLoading(true);
        const clientId = "BPi5PB_UiIZ-cPz1GtV5i1I2iOSOHuimiXBI0e-Oe_u6X3oVAbCiAZOTEBtTXw4tsluTITPqA8zMsfxIKMjiqNQ";
        const web3AuthInstance = new Web3Auth({
          clientId,
          web3AuthNetwork: "sapphire_mainnet",
        });

        const ethereumPrivateKeyProvider = new EthereumPrivateKeyProvider({
          config: { chainConfig: chain["Goerli Testnet"] },
        });

        await web3AuthInstance.init(ethereumPrivateKeyProvider);
        if (web3AuthInstance.status === "connected") {
          setWalletProvider(web3AuthInstance.provider);
          setWeb3AuthIdToken((await web3AuthInstance.authenticateUser()).idToken);
          setUser(await web3AuthInstance.getUserInfo());
          setConnected(true);
        }
        setWeb3Auth(web3AuthInstance);
      } catch (error) {
        uiConsole(error);
      } finally {
        setIsLoading(false);
      }
    }
    async function getEmailFromLocal() {
      const localEmail = localStorage.getItem("emailForWeb3AuthPassKeysPlayground");
      if (localEmail) {
        setEmail(localEmail);
      } else {
        const chars = "abcdefghijklmnopqrstuvwxyz1234567890";
        let string = "";
        for (let ii = 0; ii < 15; ii++) {
          string += chars[Math.floor(Math.random() * chars.length)];
        }
        setEmail(`${string}@web3auth.com`);
      }
    }
    getEmailFromLocal();
    init();
  }, []);

  useEffect(() => {
    async function emailCheck() {
      try {
        if (isWebAuthnSupported && email!.match(/^([\w.%+-]+)@([\w-]+\.)+([\w]{2,})$/i)) {
          try {
            console.log("fetching webauthn status");
            const url = new URL(`${PASSKEYS_BACKEND_URL}/api/v2/webauthn`);
            url.searchParams.append("email", email!);
            const response = await get<{ success: boolean; data: { webauthn_enabled: boolean; cred_id: string; public_key: string } }>(url.href);
            if (response.success) {
              setIsWebAuthnLoginEnabled(true);
              setIsWebAuthnRegistrationEnabled(false);
            } else {
              setIsWebAuthnRegistrationEnabled(true);
              setIsWebAuthnLoginEnabled(false);
            }
          } catch (error) {
            console.error(error);
          }
        }
      } catch (error) {
        uiConsole(error);
      }
    }
    async function saveEmailLocally() {
      try {
        const localStorageEmail = localStorage.getItem("emailForWeb3AuthPassKeysExample");
        if (email !== "" && email !== localStorageEmail) {
          localStorage.setItem("emailForWeb3AuthPassKeysPlayground", email);
        }
      } catch (error) {
        console.error(error);
      }
    }
    emailCheck();
    saveEmailLocally();
  }, [email]);

  const triggerPassKeyLogin = async () => {
    try {
      const url = new URL(`${PASSKEYS_BACKEND_URL}/api/v2/webauthn-generate-authentication-options`);
      url.searchParams.append("email", email);
      const resp = await get(url.href);
      const attestationResponse = await startAuthentication(resp as any);
      const url2 = new URL(`${PASSKEYS_BACKEND_URL}/api/v2/webauthn-verify-authentication`);
      const resp2 = await post<{ verified: boolean; id_token: string }>(url2.href, { attestationResponse, email });
      if (resp2.verified) {
        return resp2.id_token;
      }
      throw new Error("Login failed");
    } catch (error) {
      console.error(error);
    }
  };

  const triggerPassKeyRegistration = async () => {
    try {
      const url = new URL(`${PASSKEYS_BACKEND_URL}/api/v2/webauthn-generate-registration-options`);
      url.searchParams.append("email", email);
      const resp = await get(url.href);
      const attestationResponse = await startRegistration(resp as any);
      const url2 = new URL(`${PASSKEYS_BACKEND_URL}/api/v2/webauthn-verify-registration`);
      const resp2 = await post<{ verified: boolean }>(url2.href, { attestationResponse, email });
      if (resp2.verified) {
        setIsWebAuthnRegistrationEnabled(false);
        setIsWebAuthnLoginEnabled(true);
        uiConsole("Registration successful, Proceed to Login");
      } else {
        throw new Error("Registration failed");
      }
    } catch (error) {
      console.error(error);
    }
  };

  const login = async () => {
    if (!web3Auth) {
      uiConsole("web3auth not initialized yet");
      return;
    }

    if (isWebAuthnLoginEnabled) {
      const idToken = await triggerPassKeyLogin();
      await web3Auth.connect({
        verifier,
        idToken: idToken!,
        verifierId: email!,
      });
      if (web3Auth.status === "connected") {
        setWeb3AuthIdToken((await web3Auth.authenticateUser()).idToken);
        setWalletProvider(web3Auth.provider);
        setUser(await web3Auth.getUserInfo());
        setConnected(true);
      }
    } else {
      uiConsole("Please register first");
    }
  };

  const logout = async () => {
    uiConsole("Logging out");
    if (!web3Auth) {
      uiConsole("web3auth not initialized yet");
      return;
    }
    await web3Auth.logout();
    setProvider(null);
    setConnected(false);
  };

  const getUserInfo = async () => {
    if (!web3Auth) {
      uiConsole("web3auth not initialized yet");
      return;
    }
    const userInfo = await web3Auth.getUserInfo();
    setUser(userInfo);
    uiConsole(userInfo);
    return userInfo;
  };

  const updateEmail = (newEmail: string) => {
    setEmail(newEmail);
  };

  const getAddress = async () => {
    if (!provider) {
      uiConsole("provider not initialized yet");
      return "";
    }
    const updatedAddress = await provider.getAddress();
    setAddress(updatedAddress);
    uiConsole(updatedAddress);
    return address;
  };

  const getBalance = async () => {
    if (!web3Auth) {
      uiConsole("web3auth not initialized yet");
      return "";
    }
    const updatedBalance = await provider!.getBalance();

    setBalance(updatedBalance);
    uiConsole(updatedBalance);
    return balance;
  };

  const getSignature = async (message: string) => {
    if (!web3Auth) {
      uiConsole("web3auth not initialized yet");
      return "";
    }
    const signature = await provider!.getSignature(message);
    uiConsole(signature);
    return signature;
  };

  const sendTransaction = async (amount: string, destination: string) => {
    if (!web3Auth) {
      uiConsole("web3auth not initialized yet");
      return "";
    }
    const receipt = await provider!.sendTransaction(amount, destination);
    uiConsole(receipt);
    return receipt;
  };

  const getPrivateKey = async () => {
    if (!web3Auth) {
      uiConsole("web3auth not initialized yet");
      return "";
    }
    const privateKey = await provider!.getPrivateKey();
    uiConsole("Private Key: ", privateKey);
    return privateKey;
  };

  const getChainId = async () => {
    if (!web3Auth) {
      uiConsole("web3auth not initialized yet");
      return "";
    }

    const CurrentChainId = await provider!.getChainId();
    return CurrentChainId;
  };

  const deployContract = async (abi: any, bytecode: string, initValue: string): Promise<void> => {
    if (!web3Auth) {
      uiConsole("web3auth not initialized yet");
      return;
    }
    await provider!.deployContract(abi, bytecode, initValue);
  };

  const readContract = async (contractAddress: string, contractABI: any): Promise<string> => {
    if (!provider) {
      uiConsole("provider not initialized yet");
      return "";
    }
    const message = await provider.readContract(contractAddress, contractABI);
    uiConsole(message);
  };

  const writeContract = async (contractAddress: string, contractABI: any, updatedNumber: string): Promise<string> => {
    if (!provider) {
      uiConsole("provider not initialized yet");
      return "";
    }
    const receipt = await provider.writeContract(contractAddress, contractABI, updatedNumber);
    uiConsole(receipt);

    if (receipt) {
      setTimeout(async () => {
        await readContract(contractAddress, contractABI);
      }, 2000);
    }
  };

  const parseToken = (token: any) => {
    try {
      const base64Url = token.split(".")[1];
      const base64 = base64Url.replace("-", "+").replace("_", "/");
      return JSON.parse(window.atob(base64 || ""));
    } catch (err) {
      console.error(err);
      return null;
    }
  };

  const verifyServerSide = async (idTokenInFrontend: string) => {
    try {
      if (!provider) {
        uiConsole("provider not initialized yet");
        return;
      }
      const privKey: string = await web3Auth.provider?.request({
        method: "eth_private_key",
      });
      const pubkey = getPublicCompressed(Buffer.from(privKey, "hex")).toString("hex");

      const jwks = jose.createRemoteJWKSet(new URL("https://authjs.web3auth.io/jwks"));
      const jwtDecoded = await jose.jwtVerify(idTokenInFrontend, jwks, {
        algorithms: ["ES256"],
      });
      if ((jwtDecoded.payload as any).wallets[0].public_key === pubkey) {
        uiConsole(
          "Validation Success!",
          "Public Key from Provider: ",
          pubkey,
          "Public Key from decoded JWT: ",
          (jwtDecoded.payload as any).wallets[0].public_key,
          "Parsed Id Token: ",
          await parseToken(idTokenInFrontend)
        );
      } else {
        uiConsole("Validation Failed", "Wallet from decoded JWT: ", (jwtDecoded.payload as any).wallets[0]);
      }
    } catch (e) {
      uiConsole(e);
    }
  };

  const switchChain = async (network: string) => {
    if (!provider) {
      uiConsole("provider not initialized yet");
      return;
    }

    await web3Auth!.addChain(chain[network]);
    await web3Auth!.switchChain(chain[network]);
    setChainId(await provider.getChainId());
    setAddress(await provider.getAddress());
    setBalance(await provider.getBalance());

    uiConsole("Chain Switched");
  };

  const updateConnectedChain = (network: string) => {
    setConnectedChain(chain[network]);
  };

  const contextProvider = {
    web3Auth,
    connected,
    provider,
    user,
    isLoading,
    address,
    balance,
    chainId,
    connectedChain,
    playgroundConsole,
    email,
    web3AuthIdToken,
    isWebAuthnLoginEnabled,
    isWebAuthnRegistrationEnabled,
    login,
    logout,
    getUserInfo,
    getAddress,
    getBalance,
    getSignature,
    sendTransaction,
    getPrivateKey,
    getChainId,
    deployContract,
    readContract,
    writeContract,
    verifyServerSide,
    switchChain,
    updateConnectedChain,
    updateEmail,
    triggerPassKeyRegistration,
  };
  return <Web3AuthContext.Provider value={contextProvider}>{children}</Web3AuthContext.Provider>;
};
