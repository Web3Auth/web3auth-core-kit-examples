import { Web3AuthMPCCoreKit } from "@web3auth/mpc-core-kit";
import { useEffect, useState } from "react";
import ecc from "@bitcoinerlab/secp256k1";
import ECPairFactory from "ecpair";
import { networks, Psbt, payments, SignerAsync } from "bitcoinjs-lib";
import * as bitcoinjs from "bitcoinjs-lib";
import { createBitcoinJsSigner } from "./BitcoinSigner";
import axios from "axios";
import { BlurredLoading } from "./Loading";

const ECPair = ECPairFactory(ecc);
bitcoinjs.initEccLib(ecc);

const BTCValidator = (pubkey: Buffer, msghash: Buffer, signature: Buffer): boolean => {
  return ECPair.fromPublicKey(pubkey).verify(msghash, signature);
};

const uiConsole = (...args: any): void => {
  const el = document.querySelector("#console>p");
  if (el) {
    el.innerHTML = JSON.stringify(args || {}, null, 2);
  }
  console.log(...args);
};

type AddressType = "PSBT" | "Segwit" | "Taproot";

const getAddress = (signer: SignerAsync, type: AddressType, network: networks.Network): string | undefined => {
  const bufPubKey = signer.publicKey;
  const xOnlyPubKey = bufPubKey.subarray(1, 33);
  const keyPair = ECPair.fromPublicKey(bufPubKey);
  const tweakedChildNode = keyPair.tweak(bitcoinjs.crypto.taggedHash("TapTweak", xOnlyPubKey));

  switch (type) {
    case "PSBT":
      return payments.p2pkh({ pubkey: bufPubKey, network }).address;
    case "Segwit":
      return payments.p2wpkh({ pubkey: bufPubKey, network }).address;
    case "Taproot":
      return payments.p2tr({ pubkey: Buffer.from(tweakedChildNode.publicKey.subarray(1, 33)), network }).address;
    default:
      return undefined;
  }
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
  const [signer, setSigner] = useState<SignerAsync | null>(null);
  const [receiverAddr, setReceiverAddr] = useState<string>("");
  const [amount, setAmount] = useState<string>("");
  const [isLoading, setIsLoading] = useState<boolean>(false);

  const bitcoinNetwork = networks.testnet;

  useEffect(() => {
    if (coreKitInstance) {
      const localSigner: SignerAsync = createBitcoinJsSigner({ coreKitInstance, network: bitcoinNetwork });
      setSigner(localSigner);
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

  const fetchTransactionHex = async (txId: string): Promise<string> => {
    const response = await fetch(`https://blockstream.info/testnet/api/tx/${txId}/hex`);
    if (!response.ok) {
      throw new Error(`Failed to fetch transaction hex for ${txId}`);
    }
    return await response.text();
  };

  const signAndSendTransaction = async (transactionType: "PSBT" | "Segwit" | "Taproot", send: boolean = false) => {
    if (!signer) {
      uiConsole("Signer not initialized yet");
      return;
    }

    setIsLoading(true);

    try {
      const bufPubKey = signer.publicKey;
      const xOnlyPubKey = bufPubKey.subarray(1, 33);
      const keyPair = ECPair.fromPublicKey(bufPubKey);
      const tweakedChildNode = keyPair.tweak(bitcoinjs.crypto.taggedHash("TapTweak", xOnlyPubKey));

      const account =
        transactionType === "PSBT"
          ? payments.p2pkh({ pubkey: signer.publicKey, network: bitcoinNetwork })
          : transactionType === "Segwit"
          ? payments.p2wpkh({ pubkey: signer.publicKey, network: bitcoinNetwork })
          : payments.p2tr({ pubkey: Buffer.from(tweakedChildNode.publicKey.subarray(1, 33)), network: bitcoinNetwork });

      console.log("account.address", account.address);
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

      if (transactionType === "PSBT") {
        const txHex = await fetchTransactionHex(utxo.txid);
        psbt.addInput({
          hash: utxo.txid,
          index: utxo.vout,
          nonWitnessUtxo: Buffer.from(txHex, "hex"),
        });
      } else if (transactionType === "Segwit") {
        psbt.addInput({
          hash: utxo.txid,
          index: utxo.vout,
          witnessUtxo: {
            script: account.output!,
            value: utxo.value,
          },
        });
      } else if (transactionType === "Taproot") {
        psbt.addInput({
          hash: utxo.txid,
          index: utxo.vout,
          witnessUtxo: {
            script: account.output!,
            value: utxo.value,
          },
          tapInternalKey: xOnlyPubKey,
        });
      }

      psbt.addOutput({
        address: receiverAddr || account.address!,
        value: sendAmount,
      });

      uiConsole("Signing transaction...");

      if (transactionType === "PSBT") {
        await psbt.signInputAsync(0, signer);
      } else if (transactionType === "Segwit") {
        await psbt.signAllInputsAsync(signer);
      } else if (transactionType === "Taproot") {
        await psbt.signInputAsync(0, signer);
      }

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
      console.error(`Error in sign${transactionType}Transaction:`, error);
      uiConsole("Error:", (error as Error).message);
    } finally {
      setIsLoading(false);
    }
  };

  const showAddress = async (type: AddressType) => {
    if (!signer) {
      uiConsole("Signer not initialized yet");
      return;
    }

    setIsLoading(true);

    try {
      const address = getAddress(signer, type, bitcoinNetwork);
      if (address) {
        uiConsole(`${type} Address:`, address);
      } else {
        uiConsole("Invalid address");
      }
    } finally {
      setIsLoading(false);
    }
  };

  const showBalance = async (type: AddressType) => {
    if (!signer) {
      uiConsole("Signer not initialized yet");
      return;
    }

    setIsLoading(true);

    try {
      const address = getAddress(signer, type, bitcoinNetwork);
      if (!address) {
        uiConsole("Invalid address");
        return;
      }

      const utxos = await fetchUtxos(address);
      const balance = utxos.reduce((acc: any, utxo: { value: any }) => acc + utxo.value, 0);
      uiConsole(`${type} Balance:`, balance, "satoshis");
    } catch (error) {
      console.error(`Error fetching balance for ${type} address:`, error);
      uiConsole(`Error fetching balance for ${type} address:`, (error as Error).message);
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
        <button onClick={() => showAddress("PSBT")} className="card psbt-color">
          Show PSBT Address
        </button>
        <button onClick={() => showAddress("Segwit")} className="card segwit-color">
          Show Segwit Address
        </button>
        <button onClick={() => showAddress("Taproot")} className="card taproot-color">
          Show Taproot Address
        </button>
      </div>

      <div className="flex-container">
        <button onClick={() => showBalance("PSBT")} className="card psbt-color">
          Show PSBT Balance
        </button>
        <button onClick={() => showBalance("Segwit")} className="card segwit-color">
          Show Segwit Balance
        </button>
        <button onClick={() => showBalance("Taproot")} className="card taproot-color">
          Show Taproot Balance
        </button>
      </div>

      <div className="flex-container">
        <button onClick={() => signAndSendTransaction("PSBT")} className="card psbt-color">
          Sign PSBT Transaction
        </button>
        <button onClick={() => signAndSendTransaction("Segwit")} className="card segwit-color">
          Sign Segwit Transaction
        </button>
        <button onClick={() => signAndSendTransaction("Taproot")} className="card taproot-color">
          Sign Taproot Transaction
        </button>
      </div>

      <div className="flex-container">
        <button onClick={() => signAndSendTransaction("PSBT", true)} className="card psbt-color">
          Send PSBT Transaction
        </button>
        <button onClick={() => signAndSendTransaction("Segwit", true)} className="card segwit-color">
          Send Segwit Transaction
        </button>
        <button onClick={() => signAndSendTransaction("Taproot", true)} className="card taproot-color">
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
          to get testnet BTC to PSBT and Segwit Addresses.
        </p>
        <p>This implementation sends transactions via a centralized server (BlockStream).</p>
        <p>In a production environment, transactions should be relayed directly to Bitcoin nodes.</p>
      </div>

      {isLoading && <BlurredLoading />}
    </div>
  );
};
