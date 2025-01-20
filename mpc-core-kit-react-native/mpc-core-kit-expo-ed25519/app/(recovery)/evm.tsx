import { ScrollView } from "react-native";

import { RecoveryView } from "@/components/mpc/RecoveryView";
import { useMPCCoreKitStore } from "@/hooks/useMPCCoreKit";

export default function Index() {
  const { coreKitInstance, coreKitStatus, setCoreKitStatus } = useMPCCoreKitStore();
  return (
    <ScrollView>
      <RecoveryView coreKitInstance={coreKitInstance} coreKitStatus={coreKitStatus} setCoreKitStatus={setCoreKitStatus} />
    </ScrollView>
  );
}
