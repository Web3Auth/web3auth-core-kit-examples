import { Button, Text, View } from "react-native";
import { Chain, createPublicClient, createWalletClient, custom, EIP1193Provider, http, SignTypedDataParameters } from "viem";

import { mpcViewStyles as styles } from "./styles";

export const ViemView = (params: { uiConsole: (...args: any) => void; signer: EIP1193Provider; chain: Chain }) => {
  const { uiConsole, signer } = params;
  const walletClient = createWalletClient({
    chain: params.chain,
    transport: custom(signer),
  });

  const publicClient = createPublicClient({
    chain: params.chain,
    transport: http(),
  });

  const getAccounts = async () => {
    try {
      const pubkey = await walletClient.getAddresses();
      uiConsole("get evm address", pubkey[0]);
    } catch (e) {
      console.log(e);
    }
  };
  const getBalance = async () => {
    const accounts = await walletClient.getAddresses();
    const balance = await publicClient.getBalance({ address: accounts[0] });
    uiConsole("getBalance", `${balance} lamports`);
  };
  const signMessage = async () => {
    const message = "Hello World";
    const account = await walletClient.getAddresses();
    const result = await walletClient.signMessage({ account: account[0], message });
    uiConsole("Viem sign", result);
  };

  const signTypedDataMessage = async () => {
    const accounts = await walletClient.getAddresses();
    const typeData: SignTypedDataParameters = {
      account: accounts[0],
      domain: {
        name: "noname",
      },
      types: {
        primary: [
          { name: "name", type: "string" },
          { name: "version", type: "string" },
          { name: "chainId", type: "uint256" },
          { name: "verifyingContract", type: "address" },
        ],
      },
      primaryType: "primary",
      message: {
        name: "noname",
        version: "1",
        chainId: "1",
        verifyingContract: "0x0000000000000000000000000000000000000000",
      },
    };
    const result = await walletClient.signTypedData(typeData);

    console.log("Viem typedData result", result);
    uiConsole("Viem typedData result", result);
  };

  const sendTransaction = async () => {
    const accounts = await walletClient.getAddresses();
    const result = await walletClient.sendTransaction({ account: accounts[0], to: accounts[0], value: 100n });
    uiConsole("signTransaction", result);
  };

  return (
    <View style={styles.compressedButtons}>
      <Text style={styles.heading}>Viem Interaction</Text>
      <Button title="Get Accounts" onPress={getAccounts} />
      <Button title="Get Balance" onPress={getBalance} />
      <Button title="Sign Message" onPress={signMessage} />
      <Button title="Sign TypeDataMessage" onPress={signTypedDataMessage} />
      <Button title="Send Transaction" onPress={sendTransaction} />
    </View>
  );
};
