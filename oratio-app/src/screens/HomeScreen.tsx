import { View, Text, StyleSheet } from "react-native";
import { useAuth } from "../lib/auth";

export function HomeScreen() {
  const { user } = useAuth();

  return (
    <View style={styles.container}>
      <Text style={styles.title}>ORATIO</Text>
      <Text style={styles.subtitle}>A Global Christian Prayer Platform</Text>
      {user && (
        <Text style={styles.email}>{user.email}</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#0A1A3A",
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },
  title: {
    fontSize: 36,
    fontWeight: "300",
    color: "#e2e4f0",
    letterSpacing: 4,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    color: "#8890b5",
    textAlign: "center",
  },
  email: {
    fontSize: 12,
    color: "#7c8fff",
    marginTop: 16,
  },
});
