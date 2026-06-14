import { View, Text, TouchableOpacity, StyleSheet, Alert } from "react-native";
import { useAuth } from "../lib/auth";

export function ProfileScreen() {
  const { user, signOut } = useAuth();

  const handleSignOut = () => {
    Alert.alert("Sign Out", "Are you sure?", [
      { text: "Cancel", style: "cancel" },
      { text: "Sign Out", style: "destructive", onPress: () => signOut() },
    ]);
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Profile</Text>
      {user ? (
        <>
          <Text style={styles.email}>{user.email}</Text>
          <TouchableOpacity onPress={handleSignOut} style={styles.button}>
            <Text style={styles.buttonText}>Sign Out</Text>
          </TouchableOpacity>
        </>
      ) : (
        <Text style={styles.subtext}>Sign in to access your profile</Text>
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
    fontSize: 20,
    color: "#e2e4f0",
    fontWeight: "300",
    marginBottom: 16,
  },
  email: {
    fontSize: 14,
    color: "#8890b5",
    marginBottom: 24,
  },
  subtext: {
    fontSize: 14,
    color: "#6b7499",
  },
  button: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 24,
    backgroundColor: "rgba(124,143,255,0.12)",
    borderWidth: 1,
    borderColor: "rgba(124,143,255,0.2)",
  },
  buttonText: {
    color: "#7c8fff",
    fontSize: 14,
  },
});
