import "../../global";

import { KernelValidator, signerToEcdsaValidator } from "@zerodev/ecdsa-validator";
import { prepareAndSignUserOperations, toMultiChainECDSAValidator } from "@zerodev/multi-chain-ecdsa-validator";
import { getEntryPoint, KERNEL_V3_1 } from "@zerodev/sdk/constants";
import { useEffect, useState } from "react";
import { Button, Text, View } from "react-native";
import { createPublicClient, EIP1193Provider, http, SignTypedDataParameters } from "viem";
import { sepolia } from "viem/chains";

import { mpcViewStyles as styles } from "./styles";

export function ZeroComponent(params: { signer: EIP1193Provider; uiConsole: (...args: any) => void }) {
  const { signer, uiConsole } = params;

  const entryPoint = getEntryPoint("0.7");
  const kernelVersion = KERNEL_V3_1;
  const [ecdsaValidator, setEcdsaValidator] = useState<KernelValidator<"ECDSAValidator">>();

  const init = async () => {
    if (!signer) return;
    const publicClient = createPublicClient({
      chain: sepolia,
      transport: http(),
    });
    // Construct a validator
    const localEcdsaValidator = await signerToEcdsaValidator(publicClient, {
      signer,
      entryPoint,
      kernelVersion,
    });
    console.log(localEcdsaValidator);
    setEcdsaValidator(localEcdsaValidator);
  };

  useEffect(() => {
    init();
  }, [signer]);

  const signMessage = async () => {
    const result = await ecdsaValidator?.signMessage({ message: "Hello World" });
    console.log("zerosdk result", result);
    // uiConsole("zerosdk result", result);
  };

  const signTypedData = async () => {
    if (!ecdsaValidator) throw new Error("ecdsaValidator not found");
    const typeData: SignTypedDataParameters = {
      account: ecdsaValidator.address,
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
    const result = await ecdsaValidator?.signTypedData(typeData);

    console.log("zerosdk typedData result", result);
    uiConsole("zerosdk typedData result", result);
  };

  const multiChainEcdsaSign = async () => {
    if (!signer) return;
    const publicClient = createPublicClient({
      chain: sepolia,
      transport: http(),
    });
    const validator = await toMultiChainECDSAValidator(publicClient, {
      signer,
      entryPoint,
      kernelVersion,
    });

    const typeData: SignTypedDataParameters = {
      account: validator.address,
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

    const result = await validator.signTypedData(typeData);
    console.log("zerosdk multichain typedData result", result);
    uiConsole("zerosdk multichain typedData result", result);
  };
  return (
    <View style={styles.compressedButtons}>
      <Text style={styles.heading}> ZeroSDK Signing</Text>
      <Button title="Sign zerosdk message" onPress={signMessage} />
      <Button title="Sign zerosdk typedData" onPress={signTypedData} />
      <Button title="Sign zerosdk multichain typedData" onPress={multiChainEcdsaSign} />
    </View>
  );
}
