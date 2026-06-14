import { useState } from "react";
import { View, Text, TextInput, TouchableOpacity, StyleSheet, KeyboardAvoidingView, Platform } from "react-native";
import { useAuth } from "../lib/auth";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";

type Props = {
  navigation: NativeStackNavigationProp<Record<string, undefined>, "Login">;
};

export function LoginScreen({ navigation }: Props) {
  const { signIn } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    setError("");
    if (!email.trim() || !password.trim()) {
      setError("Enter your email and password");
      return;
    }
    setLoading(true);
    const err = await signIn(email.trim(), password);
    setLoading(false);
    if (err) setError(err);
  };

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === "ios" ? "padding" : "height"}>
      <View style={styles.inner}>
        <Text style={styles.title}>ORATIO</Text>
        <Text style={styles.subtitle}>Welcome back</Text>

        <TextInput
          style={styles.input}
          placeholder="Email"
          placeholderTextColor="#4e5573"
          value={email}
          onChangeText={(t) => { setEmail(t); setError(""); }}
          autoCapitalize="none"
          keyboardType="email-address"
        />
        <TextInput
          style={styles.input}
          placeholder="Password"
          placeholderTextColor="#4e5573"
          value={password}
          onChangeText={(t) => { setPassword(t); setError(""); }}
          secureTextEntry
        />

        {error ? <Text style={styles.error}>{error}</Text> : null}

        <TouchableOpacity
          onPress={handleLogin}
          disabled={loading}
          style={[styles.button, loading && { opacity: 0.5 }]}
        >
          <Text style={styles.buttonText}>{loading ? "Signing in..." : "Sign In"}</Text>
        </TouchableOpacity>

        <TouchableOpacity onPress={() => navigation.navigate("SignUp")} style={styles.link}>
          <Text style={styles.linkText}>Don't have an account? Sign up</Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#0A1A3A" },
  inner: { flex: 1, justifyContent: "center", padding: 24, maxWidth: 400, width: "100%", alignSelf: "center" },
  title: { fontSize: 36, fontWeight: "300", color: "#e2e4f0", letterSpacing: 4, textAlign: "center", marginBottom: 8 },
  subtitle: { fontSize: 14, color: "#8890b5", textAlign: "center", marginBottom: 32 },
  input: { backgroundColor: "rgba(15, 20, 50, 0.6)", borderRadius: 12, padding: 16, fontSize: 14, color: "#e2e4f0", borderWidth: 1, borderColor: "rgba(124,143,255,0.12)", marginBottom: 12, textAlign: "center" },
  error: { color: "#ff6b6b", fontSize: 12, textAlign: "center", marginBottom: 8 },
  button: { backgroundColor: "#7c8fff", borderRadius: 24, padding: 16, alignItems: "center", marginTop: 8 },
  buttonText: { color: "#ffffff", fontSize: 14, fontWeight: "500" },
  link: { marginTop: 16, alignItems: "center" },
  linkText: { color: "#7c8fff", fontSize: 13 },
});
