import { clusterApiUrl, Connection, PublicKey, SystemProgram, TransactionMessage, VersionedTransaction } from "@solana/web3.js";
import { mpclib } from "@web3auth/react-native-mpc-core-kit";
import { Button, Text, View } from "react-native";

import { mpcViewStyles as styles } from "./styles";

export const SolanaView = (params: { uiConsole: (...args: any) => void; coreKitInstance: mpclib.Web3AuthMPCCoreKitRN }) => {
  const { uiConsole, coreKitInstance } = params;
  // recovery
  //   const getSocialMFAFactorKey = () => {};

  // logIn

  const getUserInfo = async () => {};
  const keyDetails = async () => {
    uiConsole(await coreKitInstance.getKeyDetails());
  };
  const getAccounts = async () => {
    const result = await coreKitInstance.getPubKeyEd25519();
    try {
      const pubkey = new PublicKey(result);
      uiConsole("getPubKeyEd25519", pubkey);
    } catch (e) {
      console.log(e);
    }
  };
  const getBalance = async () => {
    const devnet = clusterApiUrl("devnet");
    const conn = new Connection(devnet);
    const balance = await conn.getBalance(new PublicKey(await coreKitInstance.getPubKeyEd25519()));
    uiConsole("getBalance", `${balance} lamports`);
  };
  const signMessage = async () => {
    const message = "Hello World";

    const result = await coreKitInstance.sign(Buffer.from(message, "utf8"), false);
    uiConsole("sign", result);
  };

  const sendTransaction = async () => {
    const corekitPubKey = new PublicKey(await coreKitInstance.getPubKeyEd25519());

    const devnet = clusterApiUrl("devnet");
    const conn = new Connection(devnet);
    const blockhash = await conn.getLatestBlockhash();
    const inst = SystemProgram.transfer({
      fromPubkey: corekitPubKey,
      toPubkey: corekitPubKey,
      lamports: 100,
    });
    const txMessage = new TransactionMessage({
      payerKey: corekitPubKey,
      recentBlockhash: blockhash.blockhash,
      instructions: [inst],
    });
    const vtx = new VersionedTransaction(txMessage.compileToV0Message());
    const msg = vtx.message.serialize();
    const signature = await coreKitInstance.sign(Buffer.from(msg));

    vtx.addSignature(corekitPubKey, Buffer.from(signature));

    const result = await conn.sendTransaction(vtx);

    uiConsole("signTransaction", result);
  };

  return (
    <View style={styles.compressedButtons}>
      <Text style={styles.heading}>MPC Core Kit RN Quick Start</Text>
      <Button title="Get User Info" onPress={getUserInfo} />
      <Button title="Key Details" onPress={keyDetails} />
      <Button title="Get Accounts" onPress={getAccounts} />
      <Button title="Get Balance" onPress={getBalance} />
      <Button title="Sign Message" onPress={signMessage} />
      <Button title="Send Transaction" onPress={sendTransaction} />
    </View>
  );
};
