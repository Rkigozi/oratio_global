import { View, Text, StyleSheet } from "react-native";

export function SubmitScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.text}>Submit Prayer</Text>
      <Text style={styles.subtext}>Coming soon on native</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#0A1A3A",
    alignItems: "center",
    justifyContent: "center",
  },
  text: {
    fontSize: 20,
    color: "#e2e4f0",
    fontWeight: "300",
  },
  subtext: {
    fontSize: 12,
    color: "#6b7499",
    marginTop: 8,
  },
});
