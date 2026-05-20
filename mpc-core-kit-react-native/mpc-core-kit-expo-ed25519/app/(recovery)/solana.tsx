import { ScrollView } from "react-native";

import { RecoveryView } from "@/components/mpc/RecoveryView";
import { useMPCCoreKitStore } from "@/hooks/useMPCCoreKit";

export default function Index() {
  const { coreKitEd25519Instance, coreKitEd25519Status, setCoreKitEd25519Status } = useMPCCoreKitStore();
  return (
    <ScrollView>
      <RecoveryView coreKitInstance={coreKitEd25519Instance} coreKitStatus={coreKitEd25519Status} setCoreKitStatus={setCoreKitEd25519Status} />
    </ScrollView>
  );
}
