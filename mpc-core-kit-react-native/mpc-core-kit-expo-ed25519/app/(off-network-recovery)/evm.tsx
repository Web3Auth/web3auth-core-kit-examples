import { ScrollView } from "react-native";

import { OffNetworkRecoveryView } from "@/components/mpc/OffNetworkRecoveryView";
import { useMPCCoreKitStore } from "@/hooks/useMPCCoreKit";

export default function Index() {
  const { coreKitInstance, coreKitStatus, setCoreKitStatus } = useMPCCoreKitStore();
  return (
    <ScrollView>
      <OffNetworkRecoveryView coreKitInstance={coreKitInstance} coreKitStatus={coreKitStatus} setCoreKitStatus={setCoreKitStatus} />
    </ScrollView>
  );
}
