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
import { signInWithEmailAndPassword, signOut } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { auth, db } from "../../src/lib/firebase";
import { useRouter } from "expo-router";
import { useLanguage } from "../../src/context/LanguageContext";
import Logo from "../../components/Logo";
import Entypo from '@expo/vector-icons/Entypo';

export default function LoginScreen() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const router = useRouter();
  const { t } = useLanguage();


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
      const cred = await signInWithEmailAndPassword(auth, email, password);

      // Vérification du rôle : les comptes admin sont réservés au dashboard web
      const userSnap = await getDoc(doc(db, "users", cred.user.uid));
      const role = userSnap.exists() ? userSnap.data().role : null;

      if (role === "admin") {
        await signOut(auth);
        setError(
          t.auth.errors.adminNotAllowed ||
            "Ce compte administrateur n'a pas accès à l'application mobile."
        );
        return;
      }

      router.replace("/(consumer)");
    } catch (e) {
      setError(getErrorMessage(e.code));
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      {/* En-tête dégradé organique */}
      <View style={styles.headerBg}>
        <View style={styles.blob1} />
        <View style={styles.blob2} />
      </View>

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Carte logo flottante */}
          <View style={styles.logoCard}>
            <Logo size={48} />
          </View>

          <Text style={styles.brand}>GreenSense</Text>
          <Text style={styles.tagline}>{t.auth.welcomeSub}</Text>

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
              <View style={styles.inputWrap}>
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
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>{t.auth.password}</Text>
              <View style={styles.inputWrap}>
                <TextInput
                  style={styles.input}
                  value={password}
                  onChangeText={setPassword}
                  placeholder={t.auth.passwordPlaceholder}
                  placeholderTextColor="#9ca3af"
                  secureTextEntry={!showPassword}
                />
                <TouchableOpacity
                  onPress={() => setShowPassword(!showPassword)}
                  style={styles.eyeBtn}
                >
                  <Text style={styles.eyeText}>{showPassword ? <Entypo name="eye-with-line" size={18} color="#424242" /> : <Entypo name="eye" size={18} color="#424242" />}</Text>
                </TouchableOpacity>
              </View>
            </View>

            <TouchableOpacity onPress={() => router.push("/(auth)/forgot-password")}>
              <Text style={styles.forgotText}>{t.auth.forgotPassword}</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.btn, loading && styles.btnDisabled]}
              onPress={handleLogin}
              disabled={loading}
              activeOpacity={0.85}
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
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f6f9f6" },
  flex: { flex: 1 },
  headerBg: {
    position: "absolute",
    top: 10,
    left: -2,
    right: -2,
    height: 240,
    backgroundColor: "#15803d",
    overflow: "hidden",
  },
  blob1: {
    position: "absolute",
    top: -60,
    right: -30,
    width: 160,
    height: 160,
    borderRadius: 80,
    backgroundColor: "#16a34a",
    opacity: 0.6,
  },
  blob2: {
    position: "absolute",
    top: 60,
    left: -50,
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: "#22c55e",
    opacity: 0.4,
  },
  scroll: {
    flexGrow: 1,
    paddingTop: 70,
    paddingHorizontal: 24,
    paddingBottom: 40,
    alignItems: "center",
  },
  logoCard: {
    width: 88,
    height: 88,
    borderRadius: 100,
    backgroundColor: "#fff",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#15803d",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.18,
    shadowRadius: 16,
    elevation: 8,
  },
  brand: {
    fontSize: 30,
    fontWeight: "800",
    color: "#fff",
    marginTop: 8,
    letterSpacing: -0.5,
  },
  tagline: {
    fontSize: 14,
    color: "#dcfce7",
    marginTop: 6,
    marginBottom: 80,
    textAlign: "center",
  },
  form: {
    width: "100%",
    backgroundColor: "#fff",
    borderRadius: 28,
    padding: 24,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 16,
    elevation: 4,
  },
  title: {
    fontSize: 20,
    fontWeight: "700",
    color: "#424242",
    marginBottom: 20,
    textAlign: "center"
  },
  errorBox: {
    backgroundColor: "#fef2f2",
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#fecaca",
  },
  errorText: { color: "#dc2626", fontSize: 13 },
  inputGroup: { marginBottom: 16 },
  label: {
    fontSize: 13,
    fontWeight: "500",
    color: "#374151",
    marginBottom: 8,
  },
  inputWrap: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1.5,
    borderColor: "#e5e7eb",
    borderRadius: 14,
    backgroundColor: "#f9fafb",
    paddingHorizontal: 14,
  },
  input: {
    flex: 1,
    paddingVertical: 14,
    fontSize: 15,
    color: "#111827",
  },
  eyeBtn: { padding: 4 },
  eyeText: { fontSize: 16 },
  forgotText: {
    fontSize: 13,
    color: "#16a34a",
    textAlign: "right",
    marginBottom: 20,
    fontWeight: "600",
  },
  btn: {
    backgroundColor: "#16a34a",
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: "center",
    marginBottom: 20,
    shadowColor: "#16a34a",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 6,
  },
  btnDisabled: { opacity: 0.6 },
  btnText: { color: "#fff", fontSize: 16, fontWeight: "700" },
  switchRow: { flexDirection: "row", justifyContent: "center" },
  switchText: { fontSize: 14, color: "#6b7280" },
  switchLink: { fontSize: 14, color: "#16a34a", fontWeight: "700" },
});