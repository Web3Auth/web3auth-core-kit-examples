import {  Web3AuthMPCCoreKit } from "@web3auth/mpc-core-kit";
import { useEffect, useState } from "react";
import { uiConsole } from "./utils";
import ecc from "@bitcoinerlab/secp256k1";
import ECPairFactory from "ecpair";
import {networks, Psbt, payments, SignerAsync} from "bitcoinjs-lib";
import * as bitcoinjs from "bitcoinjs-lib";
import { createBitcoinJsSigner } from "./BitcoinSigner";


const ECPair = ECPairFactory(ecc);

export const BTCValidator = (pubkey: Buffer, msghash: Buffer, signature: Buffer): boolean => {
    return ECPair.fromPublicKey(pubkey).verify(msghash, signature)
};

function getAddress(signer: SignerAsync, mode: string, network: networks.Network) : string | undefined{
    let bufPubKey = signer.publicKey
    if (mode === "btc") {
        return payments.p2pkh({ pubkey: bufPubKey, network }).address;
    } else if (mode === 'segwit') {
        return payments.p2wpkh({ pubkey: bufPubKey, network }).address;
    // } else if (mode === 'tapRoot') {
    //     return payments.p2tr({ pubkey: bufPubKey, network: networks.testnet }).address!;
    } else {
        return undefined
    }
}

interface BitcoinComponentParams {
    coreKitInstance: Web3AuthMPCCoreKit,
}

async function handleSendTransaction (signedTransaction: string) {
    const response = await fetch('https://blockstream.info/testnet/api/tx', {
        method: 'POST',
        headers: {
        'Content-Type': 'text/plain',
        },
        body: signedTransaction,
    });
    const respText = await response.text();
    console.log(respText);
    uiConsole(respText)
}
export const BitcoinComponent = ( props : BitcoinComponentParams ) => {

    const [signer, setSigner ] = useState<SignerAsync| null>(null);
    const [receiverAddr, setReceiverAddr] = useState<string | null>(null);
    const [amount, setAmount] = useState<string | null>(null);
    const [minerFee, setMinerFee] = useState<string | null>(null);
    const [latestBalance, setLatestBalance] = useState<string | null>(null);
    const [bitcoinUTXID, setBitcoinUTXID] = useState<string | null>(null);
    const [fundingTxIndex, setFundingTxIndex] = useState<string | null>(null);

    const bitcoinNetwork = networks.testnet;
    
    // set Bitcoin Signer
    useEffect(() => {
        if (props.coreKitInstance) {
            const localSigner : SignerAsync = createBitcoinJsSigner({coreKitInstance: props.coreKitInstance, network: bitcoinNetwork})
            setSigner(localSigner);
        }
    }, [props.coreKitInstance, bitcoinNetwork]);

    const signTransaction = async (send?:boolean) => {
        if (!signer) {
          uiConsole("signer not initialized yet");
          return;
        }
        if (bitcoinUTXID?.length !== 64) {
          uiConsole("invalid bitcoin utxid");
          return;
        }
       
        try {
          parseInt(fundingTxIndex as string);
        } catch (e) { 
          uiConsole("invalid funding tx index");
          return }
        
        // unspent transaction
        const txId = bitcoinUTXID; // looks like this "bb072aa6a43af31642b635e82bd94237774f8240b3e6d99a1b659482dce013c6"
        const total = Number(latestBalance); // 1321953; // 0.0000017
    
        const value = amount ? Number(amount) : 20;
        const miner = Number(minerFee);
    
        // fetch transaction from testnet
        const txHex = await (await fetch(`https://blockstream.info/testnet/api/tx/${txId}/hex`)).text();
        console.log("txHex", txHex);
    
        console.log("receiverAddr", receiverAddr)
    
        const selfAddr = getAddress(signer, "btc", bitcoinNetwork);
        if (!selfAddr) {
            uiConsole("invalid address");
            return;
        }
        
        console.log(selfAddr, typeof selfAddr)
        const psbt = new Psbt({ network: bitcoinNetwork })
          .addInput({
            hash: txId,
            index: parseInt(fundingTxIndex as string),
            nonWitnessUtxo: Buffer.from(txHex, "hex"),
          })
          .addOutput({
            address: receiverAddr? receiverAddr : selfAddr!,
            value: value,
          })
          .addOutput({
            address: selfAddr,
            value: total - value - miner,
          });
    
        uiConsole("Signing transaction...");
    
        await psbt.signInputAsync(0,signer);
        
        psbt.validateSignaturesOfInput(0, BTCValidator);
        const validation = psbt.validateSignaturesOfInput(0, BTCValidator);
        const signedTransaction = psbt.finalizeAllInputs().extractTransaction().toHex()
        uiConsole("Signed Transaction: ", signedTransaction, "Copy the above into https://blockstream.info/testnet/tx/push");
        console.log(validation ? "Validated" : "failed");
        console.log("signedTransaction: ", signedTransaction );
      };
    
    
    
      const signTransactionSegwit = async (send?:boolean) => {
        if (!signer) {
          uiConsole("web3 not initialized yet");
          return;
        }
    
        let account = payments.p2wpkh({ pubkey: signer.publicKey, network: bitcoinNetwork });
    
        if (bitcoinUTXID?.length !== 64) {
          uiConsole("invalid bitcoin utxid");
          return;
        }
        try {
          parseInt(fundingTxIndex as string);
        } catch (e) { 
          uiConsole("invalid funding tx index");
          return }
        
        // unspent transaction
        const txId = bitcoinUTXID; // looks like this "bb072aa6a43af31642b635e82bd94237774f8240b3e6d99a1b659482dce013c6"
        const total = Number(latestBalance); // 1321953; // 0.0000017
    
        const value = amount ? Number(amount) : 20;
        const miner = Number(minerFee);
    
        const selfAddr = await getAddress(signer, 'segwitAddress', bitcoinNetwork);
        console.log(selfAddr, typeof selfAddr)
        console.log("receiverAddr", receiverAddr)
        const psbt = new Psbt({ network: bitcoinNetwork })
          .addInput({
            hash: txId,
            index: parseInt(fundingTxIndex as string),
            witnessUtxo: {
              script: Buffer.from('0014' + account.hash?.toString("hex"), 'hex'),
              value: total, 
            },
          })
          .addOutput({
            address: receiverAddr? receiverAddr :  account.address!,
            value: value,
          })
          .addOutput({
            address: account.address!,
            value: total - value - miner,
          });
    
        uiConsole("Signing transaction...");
    
        await psbt.signAllInputsAsync(signer);
        // await psbt.signInputAsync(0,web3);
       
        
        psbt.validateSignaturesOfInput(0, BTCValidator);
        const validation = psbt.validateSignaturesOfInput(0, BTCValidator);
        const signedTransaction = psbt.finalizeAllInputs().extractTransaction().toHex()
       
        console.log("psbt")
        console.log("psbt" ,psbt.extractTransaction())  
    
        
        uiConsole("Signed Transaction: ", signedTransaction, "Copy the above into https://blockstream.info/testnet/tx/push");
        if (!validation)  uiConsole("validation failed");
        console.log(validation ? "Validated" : "failed");
        console.log("signedTransaction: ", signedTransaction );
        
        if (send) await handleSendTransaction(signedTransaction);
        
    };
    
    
      const signTransactionSegwitMultipleSigs = async (send?:boolean) => {
        if (!signer) {
          uiConsole("web3 not initialized yet");
          return;
        }
        let network = bitcoinNetwork; 
    
        let BobPrivateKey = Buffer.from('c3f0d6e2e0b2f2d5e4f1f2e2e0b2f2d5e4f1f2e2e0b2f2d5e4f1f2e2e0b2f2d5', 'hex');
        let DavePrivateKey = Buffer.from('c3f0d6e2e0b2f2d5e4f1f2e2e0b2f2d5e4f1f2e2e0b2f2d5e4f1f2e2e0b2ffd5', 'hex');
    
        let BobKeypair = ECPair.fromPrivateKey(BobPrivateKey!, { network, compressed: true });
        let DaveKeypair = ECPair.fromPrivateKey(DavePrivateKey!, { network, compressed: true });
        
        const p2ms = payments.p2ms({ m: 2, pubkeys: [signer.publicKey, BobKeypair.publicKey, DaveKeypair.publicKey], network });
        console.log('Witness script:')
        if (p2ms.output) {
          console.log(p2ms.output.toString('hex'))
          console.log()
    
          console.log('Witness script SHA256:')
          console.log(bitcoinjs.crypto.sha256(p2ms.output).toString('hex'));
        }
    
    
        const account = payments.p2wsh({redeem: p2ms, network})
        console.log('P2WSH address')
        console.log(account.address)
    
        // let account = payments.p2wpkh({ pubkey: web3.publicKey, network });
    
        if (bitcoinUTXID?.length !== 64) {
          uiConsole("invalid bitcoin utxid");
          return;
        }
        
        try {
          parseInt(fundingTxIndex as string);
        } catch (e) { 
          uiConsole("invalid funding tx index");
          return }
        
        // unspent transaction
        const txId = bitcoinUTXID; // looks like this "bb072aa6a43af31642b635e82bd94237774f8240b3e6d99a1b659482dce013c6"
        const total = Number(latestBalance); // 1321953; // 0.0000017
    
        const value = amount ? Number(amount) : 20;
        const miner = Number(minerFee);
    
        const outAddr = account.address!;
        console.log(outAddr, typeof outAddr)
    
        if (!p2ms.output) { throw new Error("p2ms.output is undefined")}
    
        const psbt = new Psbt({ network: bitcoinNetwork})
          .addInput({
            hash: txId,
            index: parseInt(fundingTxIndex as string),
           
            witnessScript: account.redeem?.output,
            witnessUtxo: {
              script: Buffer.from('0020' + bitcoinjs.crypto.sha256(p2ms.output).toString('hex'), 'hex'), 
              value: total,
            }
          })
          .addOutput({
            address: receiverAddr ? receiverAddr : account.address!,
            value: value,
          })
          .addOutput({
            address: account.address!,
            value: total - value - miner,
          });
    
        uiConsole("Signing transaction...");
    
        await psbt.signInput(0, BobKeypair).signInputAsync(0, signer)
    
        
        psbt.validateSignaturesOfInput(0, BTCValidator);
        const validation = psbt.validateSignaturesOfInput(0, BTCValidator);
    
        const signedTransaction = psbt.finalizeAllInputs().extractTransaction().toHex()


        uiConsole("Signed Transaction: ", signedTransaction, "Copy the above into https://blockstream.info/testnet/tx/push");
        if (!validation)  uiConsole("validation failed");
        console.log(validation ? "Validated" : "failed");
        console.log("signedTransaction: ", signedTransaction );
        
        if (send) await handleSendTransaction(signedTransaction);
      };

    const showAddress = async () => {
        if (!signer) {
          uiConsole("signer not initialized yet");
          return;
        }

        const address = getAddress(signer, "btc", bitcoinNetwork);
        const segwitAddress = getAddress(signer, "segwit", bitcoinNetwork);
        if (address) {
          uiConsole("Address: ", address , "Segwit Address: ", segwitAddress);

        } else {
          uiConsole("Invalid address");
        }
    }
    

    return (
        <div>
        <h1>BitcoinComponent Signing</h1>

        <button onClick={showAddress} className="card" >
            Show Address
        </button>
        <div className="flex-container">

            <input value={receiverAddr as string} onChange={(e) => setReceiverAddr(e.target.value)} placeholder="set Receiver Address"></input>
            <input value={amount as string} onChange={(e) => setAmount(e.target.value)} placeholder="set Receiver Amount  "></input>
            <input value={minerFee as string} onChange={(e) => setMinerFee(e.target.value)} placeholder="set Miner Fee"></input>
            <input value={latestBalance as string} onChange={(e) => setLatestBalance(e.target.value)} placeholder="set latest balance"></input>
            <input value={bitcoinUTXID as string} onChange={(e) => setBitcoinUTXID(e.target.value)} placeholder="set UTXID here"></input>
            <input value={fundingTxIndex as string} onChange={(e) => setFundingTxIndex(e.target.value)} placeholder="FundingTxIndex (often 0)"></input>
        </div>
        <div className="flex-container">
            <button onClick={()=>signTransaction()} className="card">
            Sign PSBT Transaction
            </button>

            <button onClick={()=>signTransactionSegwit()} className="card">
            Sign Segwit Transaction
            </button>

            <button onClick={()=>signTransactionSegwitMultipleSigs()} className="card">
            MultiSign Segwit Transaction
            </button>
        </div>

        <div>This For Demo Purpose only</div>
        <div>Send via Centralized Server - BlockStream </div>
        <span>Production should relay transaction to bitcoin nodes</span>
        
        <div className="flex-container">
            <button onClick={()=>signTransaction(true)} className="card">
            Send PSBT Transaction
            </button>

            <button onClick={()=>signTransactionSegwit(true)} className="card">
            Send Segwit Transaction
            </button>

            <button onClick={()=>signTransactionSegwitMultipleSigs(true)} className="card">
            Send MultiSign Segwit Transaction
            </button>
        </div>
      
        </div>
    );
}