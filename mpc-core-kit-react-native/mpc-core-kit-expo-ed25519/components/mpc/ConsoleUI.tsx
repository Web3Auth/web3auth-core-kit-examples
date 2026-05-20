import { ActivityIndicator, Text, View } from "react-native";
import { ScrollView } from "react-native-gesture-handler";

import { mpcViewStyles as styles } from "./styles";
export const ConsoleUI = ({ consoleUI, loading }: { consoleUI: string; loading: boolean }) => {
  return (
    <View style={styles.consoleArea}>
      <Text style={styles.consoleText}>Console:</Text>
      {loading && <ActivityIndicator />}
      <View style={styles.consoleUI}>
        <Text>{consoleUI}</Text>
      </View>
    </View>
  );
};
