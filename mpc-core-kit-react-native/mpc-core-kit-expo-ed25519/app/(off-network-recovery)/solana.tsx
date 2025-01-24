import { ScrollView } from "react-native";

import { OffNetworkRecoveryView } from "@/components/mpc/OffNetworkRecoveryView";
import { useMPCCoreKitStore } from "@/hooks/useMPCCoreKit";

export default function Index() {
  const { coreKitEd25519Instance, coreKitEd25519Status, setCoreKitEd25519Status } = useMPCCoreKitStore();
  return (
    <ScrollView>
      <OffNetworkRecoveryView
        coreKitInstance={coreKitEd25519Instance}
        coreKitStatus={coreKitEd25519Status}
        setCoreKitStatus={setCoreKitEd25519Status}
      />
    </ScrollView>
  );
}
