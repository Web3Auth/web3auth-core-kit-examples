import { Dimensions, StyleSheet } from "react-native";

export const mpcViewStyles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
    alignItems: "center",
    justifyContent: "center",
    paddingTop: 50,
    paddingBottom: 30,
    gap: 10,
  },
  heading: {
    fontSize: 20,
    fontWeight: "bold",
    marginBottom: 10,
  },
  subHeading: {
    fontSize: 10,
    fontWeight: "bold",
    marginBottom: 10,
    textAlign: "center",
  },
  consoleArea: {
    margin: 20,
    alignItems: "center",
    justifyContent: "center",
    flex: 1,
  },
  consoleUI: {
    flex: 1,
    backgroundColor: "#CCCCCC",
    color: "#ffffff",
    padding: 10,
    width: Dimensions.get("window").width - 60,
    maxHeight: 200,
    minHeight: 200,
  },
  consoleText: {
    padding: 10,
  },
  input: {
    padding: 10,
    width: Dimensions.get("window").width - 60,
    borderColor: "gray",
    borderWidth: 1,
    borderRadius: 10,
    margin: 5,
  },
  buttonArea: {
    flex: 2,
    alignItems: "center",
    justifyContent: "space-around",
    margin: 20,
  },
  compressedButtons: {
    flex: 3,
    alignItems: "center",
    justifyContent: "center",
    margin: 20,
  },
  disabledSection: {
    opacity: 0.5,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#EEEEEE",
    padding: 20,
    borderRadius: 10,
  },
  section: {
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#EEEEEE",
    padding: 10,
    margin: 5,
    borderRadius: 10,
  },
});
