import { StatusBar } from "expo-status-bar";
import { StyleSheet, Text, View } from "react-native";
import { timeAgo } from "@oratio/shared/prayer-data";

export default function App() {
  return (
    <View style={styles.container}>
      <Text style={styles.brand}>ORATIO</Text>
      <Text style={styles.tagline}>Pray together. Anywhere.</Text>
      <Text style={styles.note}>
        Shared package connected: {timeAgo(new Date(Date.now() - 1000 * 60 * 5).toISOString())}
      </Text>
      <StatusBar style="light" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#0A1A3A",
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
  },
  brand: {
    color: "#E6ECFF",
    fontSize: 32,
    fontWeight: "300",
    letterSpacing: 8,
  },
  tagline: {
    color: "#8E9BC4",
    fontSize: 14,
  },
  note: {
    color: "#7c8fff",
    fontSize: 12,
    marginTop: 24,
  },
});
