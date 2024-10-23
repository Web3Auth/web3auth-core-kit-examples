import { Text, View } from "react-native";
import '../global'
import MPCDemo from "./mpcDemo";

export default function Index() {
  return (
    <View
      style={{
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
      }}
    >
      <Text>Edit app/index.tsx to edit this screen test me here what happend.</Text>
      <MPCDemo />
    </View>
  );
}
