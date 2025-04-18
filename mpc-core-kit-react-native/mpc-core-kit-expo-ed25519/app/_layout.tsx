import "../global";

import { COREKIT_STATUS } from "@web3auth/mpc-core-kit";
import { Bridge } from "@web3auth/react-native-mpc-core-kit";
import { router, Stack, usePathname } from "expo-router";
import { useEffect } from "react";

import { useMPCCoreKitStore } from "@/hooks/useMPCCoreKit";

export default function RootLayout() {
  const { coreKitInstance, coreKitStatus, coreKitInit, coreKitEd25519Status, coreKitEd25519Init, bridgeReady, setBridgeReady } = useMPCCoreKitStore();
  const pathname = usePathname();

  useEffect(() => {
    if (coreKitStatus === COREKIT_STATUS.NOT_INITIALIZED && bridgeReady) {
      coreKitInit();
      coreKitInstance.init();
    }
  }, [coreKitStatus, bridgeReady]);

  useEffect(() => {
    if (coreKitEd25519Status === COREKIT_STATUS.NOT_INITIALIZED && bridgeReady) {
      coreKitEd25519Init();
    }
  }, [coreKitEd25519Status, bridgeReady]);

  useEffect(() => {
    console.log(coreKitStatus);
    if (coreKitStatus === COREKIT_STATUS.LOGGED_IN) {
      router.replace({ pathname: "/(mpc-demo)/evm" });
    } else if (coreKitStatus === COREKIT_STATUS.REQUIRED_SHARE) {
      router.replace({ pathname: "/(recovery)/evm" });
    } else if (coreKitEd25519Status === COREKIT_STATUS.LOGGED_IN) {
      router.replace({ pathname: "/solana" });
    } else if (coreKitEd25519Status === COREKIT_STATUS.REQUIRED_SHARE) {
      router.replace({ pathname: "/(recovery)/solana" });
    } else if (router.canDismiss()) {
      router.dismissAll();
    } else if (pathname !== "/") {
      router.replace({ pathname: "/" });
    }
  }, [coreKitStatus, coreKitEd25519Status]);

  return (
    <>
      <Stack>
        <Stack.Screen
          name="(mpc-demo)"
          options={{
            title: "DEMO",
          }}
        />
        <Stack.Screen name="index" />
      </Stack>
      <Bridge logLevel={"DEBUG"} resolveReady={setBridgeReady} />
    </>
  );
}
