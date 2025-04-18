import { ScrollView } from "react-native";
import { EIP1193Provider } from "viem";
import { sepolia } from "viem/chains";

import { ConsoleUI } from "@/components/mpc/ConsoleUI";
import MPCAccoutFunction from "@/components/mpc/MpcAccountFunction";
import { ViemView } from "@/components/mpc/ViemView";
import { ZeroComponent } from "@/components/mpc/Zerosdk";
import { useConsoleUI } from "@/hooks/useConsoleUI";
import { useMPCCoreKitStore } from "@/hooks/useMPCCoreKit";

export default function Index() {
  const { evmProvider, coreKitInstance, setCoreKitStatus } = useMPCCoreKitStore();
  const { consoleUI, loading, uiConsole, setLoading } = useConsoleUI();
  return (
    <ScrollView>
      <ViemView signer={evmProvider as EIP1193Provider} chain={sepolia} uiConsole={uiConsole} />
      <ZeroComponent uiConsole={uiConsole} signer={evmProvider as EIP1193Provider} />

      <MPCAccoutFunction uiConsole={uiConsole} setLoading={setLoading} coreKitInstance={coreKitInstance} setCoreKitStatus={setCoreKitStatus} />
      <ConsoleUI consoleUI={consoleUI} loading={loading} />
    </ScrollView>
  );
}
