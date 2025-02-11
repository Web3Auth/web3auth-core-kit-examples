import { Web3AuthMPCCoreKit } from "@web3auth/mpc-core-kit";
import { useEffect, useState } from "react";
import ecc from "@bitcoinerlab/secp256k1";
import { networks, Psbt, payments, SignerAsync } from "bitcoinjs-lib";
import * as bitcoinjs from "bitcoinjs-lib";
import { createBitcoinJsSignerBip340 } from "./BitcoinSigner";
import axios from "axios";
import { BlurredLoading } from "./Loading";

bitcoinjs.initEccLib(ecc);

const BTCValidator = (pubkey: Buffer, msghash: Buffer, signature: Buffer): boolean => {
  return ecc.verifySchnorr(Uint8Array.from(msghash), Uint8Array.from(pubkey), Uint8Array.from(signature));
};

const uiConsole = (...args: any): void => {
  const el = document.querySelector("#console>p");
  if (el) {
    el.innerHTML = JSON.stringify(args || {}, null, 2);
  }
  console.log(...args);
};

const getAddress = (bip340Signer: SignerAsync, network: networks.Network): string | undefined => {
  return payments.p2tr({ pubkey: bip340Signer.publicKey.subarray(1, 33), network }).address;
};

interface BitcoinComponentProps {
  coreKitInstance: Web3AuthMPCCoreKit;
}

const handleSendTransaction = async (signedTransaction: string) => {
  try {
    const response = await axios.post(`https://blockstream.info/testnet/api/tx`, signedTransaction);
    console.log("Transaction sent successfully:", response.data);
    uiConsole("Transaction sent successfully:", response.data);
    return response.data;
  } catch (error) {
    console.error("Error sending transaction:", error);
    uiConsole("Error sending transaction", error);
    throw error;
  }
};

export const BitcoinComponent: React.FC<BitcoinComponentProps> = ({ coreKitInstance }) => {
  const [bip340Signer, setBip340Signer] = useState<SignerAsync | null>(null);
  const [receiverAddr, setReceiverAddr] = useState<string>("");
  const [amount, setAmount] = useState<string>("");
  const [isLoading, setIsLoading] = useState<boolean>(false);

  const bitcoinNetwork = networks.testnet;

  useEffect(() => {
    if (coreKitInstance) {
      const localbip340Signer: SignerAsync = createBitcoinJsSignerBip340({ coreKitInstance, network: bitcoinNetwork });
      setBip340Signer(localbip340Signer);
    }
  }, []);

  const fetchUtxos = async (address: string) => {
    try {
      const response = await axios.get(`https://blockstream.info/testnet/api/address/${address}/utxo`);
      return response.data.filter((utxo: { status: { confirmed: boolean } }) => utxo.status.confirmed);
    } catch (error) {
      console.error("Error fetching UTXOs:", error);
      return [];
    }
  };

  const signAndSendTransaction = async (send: boolean = false) => {
    if (!bip340Signer) {
      uiConsole("BIP340 Signer not initialized yet");
      return;
    }

    setIsLoading(true);

    try {
      const account = payments.p2tr({ pubkey: bip340Signer.publicKey.subarray(1, 33), network: bitcoinNetwork });

      const utxos = await fetchUtxos(account.address!);

      if (!utxos.length) {
        throw new Error("No UTXOs found for this address");
      }

      const utxo = utxos[0];
      const feeResponse = await axios.get("https://blockstream.info/testnet/api/fee-estimates");
      const maxFee = Math.max(...Object.values(feeResponse.data as Record<string, number>));
      const fee = Math.ceil(maxFee * 1.2); // Adding 20% buffer to the fee

      if (utxo.value <= fee) {
        throw new Error(`Insufficient funds: ${utxo.value} satoshis <= ${fee} satoshis (estimated fee)`);
      }

      const sendAmount = amount ? parseInt(amount) : utxo.value - fee;

      const psbt = new Psbt({ network: bitcoinNetwork });

      psbt.addInput({
        hash: utxo.txid,
        index: utxo.vout,
        witnessUtxo: {
          script: account.output!,
          value: utxo.value,
        },
        tapInternalKey: bip340Signer.publicKey.subarray(1, 33),
      });

      console.log("psbt.txInputs[0]", psbt.data.inputs);

      psbt.addOutput({
        address: receiverAddr || account.address!,
        value: sendAmount,
      });

      uiConsole("Signing transaction...");

      await psbt.signInputAsync(0, bip340Signer);

      const isValid = psbt.validateSignaturesOfInput(0, BTCValidator);
      if (!isValid) {
        throw new Error("Transaction signature validation failed");
      }

      const signedTransaction = psbt.finalizeAllInputs().extractTransaction().toHex();

      uiConsole("Signed Transaction:", signedTransaction, "Copy the above into https://blockstream.info/testnet/tx/push");

      if (send) {
        const txid = await handleSendTransaction(signedTransaction);
        uiConsole("Transaction sent. TXID:", txid);
      }
    } catch (error) {
      console.error(`Error in signTaprootTransaction:`, error);
      uiConsole("Error:", (error as Error).message);
    } finally {
      setIsLoading(false);
    }
  };

  const showAddress = async () => {
    if (!bip340Signer) {
      uiConsole("Signer not initialized yet");
      return;
    }

    setIsLoading(true);

    try {
      const address = getAddress(bip340Signer, bitcoinNetwork);
      setReceiverAddr(address || "");
      if (address) {
        uiConsole(`Address:`, address);
      } else {
        uiConsole("Invalid address");
      }
    } finally {
      setIsLoading(false);
    }
  };

  const showBalance = async () => {
    if (!bip340Signer) {
      uiConsole("Signer not initialized yet");
      return;
    }

    setIsLoading(true);

    try {
      const address = getAddress(bip340Signer, bitcoinNetwork);
      if (!address) {
        uiConsole("Invalid address");
        return;
      }

      const utxos = await fetchUtxos(address);
      const balance = utxos.reduce((acc: any, utxo: { value: any }) => acc + utxo.value, 0);
      uiConsole(` Balance:`, balance, "satoshis");
    } catch (error) {
      console.error(`Error fetching balance for  address:`, error);
      uiConsole(`Error fetching balance for  address:`, (error as Error).message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div>
      <h1>Bitcoin Component</h1>

      <div className="flex-container">
        <input value={receiverAddr} onChange={(e) => setReceiverAddr(e.target.value)} placeholder="Receiver Address" className="input-field" />
        <input value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="Amount (satoshis)" className="input-field" />
      </div>

      <div className="flex-container">
        <button onClick={() => showAddress()} className="card taproot-color">
          Show Taproot Address
        </button>
      </div>

      <div className="flex-container">
        <button onClick={() => showBalance()} className="card taproot-color">
          Show Taproot Balance
        </button>
      </div>

      <div className="flex-container">
        <button onClick={() => signAndSendTransaction()} className="card taproot-color">
          Sign Taproot Transaction
        </button>
      </div>

      <div className="flex-container">
        <button onClick={() => signAndSendTransaction(true)} className="card taproot-color">
          Send Taproot Transaction
        </button>
      </div>

      <div className="warning-box">
        <p>
          <strong>⚠️ Warning: Demo Purpose Only</strong>
        </p>
        <p>
          Use a{" "}
          <a href="https://coinfaucet.eu/en/btc-testnet/" target="_blank" rel="noopener noreferrer">
            faucet
          </a>{" "}
          to get testnet BTC to Taproot Addresses.
        </p>
        <p>This implementation sends transactions via a centralized server (BlockStream).</p>
        <p>In a production environment, transactions should be relayed directly to Bitcoin nodes.</p>
      </div>

      {isLoading && <BlurredLoading />}
    </div>
  );
};
