// App.tsx (in the project root, next to package.json, etc.)
import { Bridge } from "@web3auth/react-native-mpc-core-kit";
import { Slot } from "expo-router";

import { useBridgeReady } from "./hooks/useBridgeReady";
export default function App() {
  const { setBridgeReady } = useBridgeReady();
  console.log("App.tsx");
  return (
    <>
      {/* Renders at the absolute top of the entire app */}
      <Bridge
        logLevel={"DEBUG"}
        resolveReady={(ready) => {
          setBridgeReady(ready);
        }}
      />
      {/* The router content (equivalent to `_layout.tsx` root) */}
      <Slot />
    </>
  );
}
