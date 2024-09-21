import "../globals";

import { View } from "react-native";

import App from "./mpc/App";

export default function Index() {
  return (
    <View
      style={{
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
      }}
    >
      <App />
    </View>
  );
}
