import { useState, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from "react-native";
import { signInWithEmailAndPassword } from "firebase/auth";
import { auth } from "../../src/lib/firebase";
import { useRouter } from "expo-router";
import { useAuth } from "../../src/context/AuthContext";
import { useLanguage } from "../../src/context/LanguageContext";

export default function LoginScreen() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const router = useRouter();
  const { user, userData, loading: authLoading } = useAuth();
  const { t, language, toggleLanguage } = useLanguage();

  // Rediriger si déjà connecté
  useEffect(() => {
    if (!authLoading && user) {
      if (userData?.role === "agriculteur") {
        router.replace("/(farmer)");
      } else {
        router.replace("/(consumer)");
      }
    }
  }, [user, userData, authLoading]);

  const getErrorMessage = (code) => {
    switch (code) {
      case "auth/invalid-email": return t.auth.errors.invalidEmail;
      case "auth/wrong-password": return t.auth.errors.wrongPassword;
      case "auth/user-not-found": return t.auth.errors.userNotFound;
      case "auth/invalid-credential": return t.auth.errors.wrongPassword;
      default: return t.auth.errors.generic;
    }
  };

  const handleLogin = async () => {
    if (!email || !password) {
      setError(t.auth.errors.generic);
      return;
    }
    setError("");
    setLoading(true);
    try {
      await signInWithEmailAndPassword(auth, email, password);
    } catch (e) {
      setError(getErrorMessage(e.code));
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <ScrollView
        contentContainerStyle={styles.scroll}
        keyboardShouldPersistTaps="handled"
      >
        {/* Bouton langue */}
        <TouchableOpacity
          style={styles.langBtn}
          onPress={toggleLanguage}
        >
          <Text style={styles.langText}>
            {language === "fr" ? "🇬🇧 EN" : "🇫🇷 FR"}
          </Text>
        </TouchableOpacity>

        {/* Logo */}
        <View style={styles.logoArea}>
          <View style={styles.logoIcon}>
            <Text style={styles.logoEmoji}>🌿</Text>
          </View>
          <Text style={styles.logoText}>GreenSense</Text>
          <Text style={styles.logoSub}>{t.auth.welcomeSub}</Text>
        </View>

        {/* Formulaire */}
        <View style={styles.form}>
          <Text style={styles.title}>{t.auth.login}</Text>

          {error ? (
            <View style={styles.errorBox}>
              <Text style={styles.errorText}>{error}</Text>
            </View>
          ) : null}

          <View style={styles.inputGroup}>
            <Text style={styles.label}>{t.auth.email}</Text>
            <TextInput
              style={styles.input}
              value={email}
              onChangeText={setEmail}
              placeholder={t.auth.emailPlaceholder}
              placeholderTextColor="#9ca3af"
              keyboardType="email-address"
              autoCapitalize="none"
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>{t.auth.password}</Text>
            <TextInput
              style={styles.input}
              value={password}
              onChangeText={setPassword}
              placeholder={t.auth.passwordPlaceholder}
              placeholderTextColor="#9ca3af"
              secureTextEntry
            />
          </View>

          <TouchableOpacity
            onPress={() => router.push("/(auth)/forgot-password")}
          >
            <Text style={styles.forgotText}>{t.auth.forgotPassword}</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.btn, loading && styles.btnDisabled]}
            onPress={handleLogin}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="white" />
            ) : (
              <Text style={styles.btnText}>{t.auth.login}</Text>
            )}
          </TouchableOpacity>

          <View style={styles.switchRow}>
            <Text style={styles.switchText}>{t.auth.noAccount} </Text>
            <TouchableOpacity onPress={() => router.push("/(auth)/register")}>
              <Text style={styles.switchLink}>{t.auth.register}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f9fafb",
  },
  scroll: {
    flexGrow: 1,
    padding: 24,
  },
  langBtn: {
    alignSelf: "flex-end",
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#e5e7eb",
    marginBottom: 24,
  },
  langText: {
    fontSize: 13,
    color: "#6b7280",
    fontWeight: "500",
  },
  logoArea: {
    alignItems: "center",
    marginBottom: 40,
  },
  logoIcon: {
    width: 72,
    height: 72,
    borderRadius: 20,
    backgroundColor: "#f0fdf4",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
  },
  logoEmoji: {
    fontSize: 36,
  },
  logoText: {
    fontSize: 28,
    fontWeight: "700",
    color: "#16a34a",
    marginBottom: 4,
  },
  logoSub: {
    fontSize: 14,
    color: "#6b7280",
    textAlign: "center",
  },
  form: {
    backgroundColor: "#fff",
    borderRadius: 20,
    padding: 24,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },
  title: {
    fontSize: 22,
    fontWeight: "700",
    color: "#111827",
    marginBottom: 20,
  },
  errorBox: {
    backgroundColor: "#fef2f2",
    borderRadius: 10,
    padding: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#fecaca",
  },
  errorText: {
    color: "#dc2626",
    fontSize: 13,
  },
  inputGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 13,
    fontWeight: "500",
    color: "#374151",
    marginBottom: 6,
  },
  input: {
    borderWidth: 1,
    borderColor: "#d1d5db",
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: "#111827",
    backgroundColor: "#fff",
  },
  forgotText: {
    fontSize: 13,
    color: "#16a34a",
    textAlign: "right",
    marginBottom: 20,
    fontWeight: "500",
  },
  btn: {
    backgroundColor: "#16a34a",
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: "center",
    marginBottom: 20,
  },
  btnDisabled: {
    opacity: 0.6,
  },
  btnText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
  switchRow: {
    flexDirection: "row",
    justifyContent: "center",
  },
  switchText: {
    fontSize: 14,
    color: "#6b7280",
  },
  switchLink: {
    fontSize: 14,
    color: "#16a34a",
    fontWeight: "600",
  },
});