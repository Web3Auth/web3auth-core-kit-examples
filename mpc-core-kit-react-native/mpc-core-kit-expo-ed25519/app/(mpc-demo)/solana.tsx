import { ScrollView } from "react-native";

import { ConsoleUI } from "@/components/mpc/ConsoleUI";
import MPCAccoutFunction from "@/components/mpc/MpcAccountFunction";
import { SolanaView } from "@/components/mpc/SolanaView";
import { useConsoleUI } from "@/hooks/useConsoleUI";
import { useMPCCoreKitStore } from "@/hooks/useMPCCoreKit";

export default function Index() {
  const { coreKitEd25519Instance, setCoreKitEd25519Status } = useMPCCoreKitStore();
  const { consoleUI, loading, uiConsole, setLoading } = useConsoleUI();
  return (
    <ScrollView>
      <SolanaView coreKitInstance={coreKitEd25519Instance} uiConsole={uiConsole} />
      <MPCAccoutFunction
        uiConsole={uiConsole}
        setLoading={setLoading}
        coreKitInstance={coreKitEd25519Instance}
        setCoreKitStatus={setCoreKitEd25519Status}
      />
      <ConsoleUI consoleUI={consoleUI} loading={loading} />
    </ScrollView>
  );
}
