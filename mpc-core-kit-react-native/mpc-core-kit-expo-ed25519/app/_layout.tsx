import "../global";

import { Bridge, COREKIT_STATUS } from "@web3auth/react-native-mpc-core-kit";
import { router, Stack, usePathname } from "expo-router";
import { useEffect } from "react";

import { useMPCCoreKitStore } from "@/hooks/useMPCCoreKit";

export default function RootLayout() {
  const { coreKitStatus, coreKitInit, coreKitEd25519Status, coreKitEd25519Init } = useMPCCoreKitStore();
  const pathname = usePathname();
  console.log(pathname);

  useEffect(() => {
    if (coreKitStatus === COREKIT_STATUS.NOT_INITIALIZED) {
      coreKitInit();
    }
  }, [coreKitStatus]);
  useEffect(() => {
    if (coreKitEd25519Status === COREKIT_STATUS.NOT_INITIALIZED) {
      coreKitEd25519Init();
    }
  }, [coreKitEd25519Status]);

  useEffect(() => {
    console.log(coreKitStatus);
    if (coreKitStatus === COREKIT_STATUS.LOGGED_IN) {
      router.navigate({ pathname: "/(mpc-demo)/evm" });
    } else if (coreKitStatus === COREKIT_STATUS.REQUIRED_SHARE) {
      router.navigate({ pathname: "/recovery" });
    } else if (coreKitEd25519Status === COREKIT_STATUS.LOGGED_IN) {
      router.navigate({ pathname: "/solana" });
    } else if (coreKitEd25519Status === COREKIT_STATUS.REQUIRED_SHARE) {
      router.navigate({ pathname: "/recovery" });
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
      <Bridge logLevel={"DEBUG"} />
    </>
  );
}
