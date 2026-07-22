import { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { sendPasswordResetEmail } from "firebase/auth";
import { auth } from "../../src/lib/firebase";
import { useRouter } from "expo-router";

export default function ForgotPasswordScreen() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");

  const handleSend = async () => {
    const value = email.trim();
    if (!value) {
      setError("Veuillez saisir votre adresse email");
      return;
    }
    setError("");
    setLoading(true);
    try {
      await sendPasswordResetEmail(auth, value);
      setSent(true);
    } catch (e) {
      if (e.code === "auth/invalid-email") {
        setError("Adresse email invalide");
      } else if (e.code === "auth/too-many-requests") {
        setError("Trop de tentatives, réessayez dans quelques minutes");
      } else {
        setError("Une erreur est survenue, réessayez");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      {/* En-tête */}
      <View style={styles.headerBg}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Text style={styles.backText}>‹</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Mot de passe oublié</Text>
        <View style={{ width: 40 }} />
      </View>

      <View style={styles.content}>
        {sent ? (
          <View style={styles.card}>
            <Text style={styles.emoji}>📬</Text>
            <Text style={styles.title}>Email envoyé</Text>
            <Text style={styles.text}>
              Un lien de réinitialisation vient d'être envoyé à {email.trim()}.
              Vérifiez votre boîte de réception, ainsi que vos courriers indésirables.
            </Text>
            <TouchableOpacity style={styles.btn} onPress={() => router.back()}>
              <Text style={styles.btnText}>Retour à la connexion</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.linkBtn}
              onPress={() => { setSent(false); setEmail(""); }}
            >
              <Text style={styles.linkText}>Envoyer à une autre adresse</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.card}>
            <Text style={styles.emoji}>🔑</Text>
            <Text style={styles.title}>Réinitialiser le mot de passe</Text>
            <Text style={styles.text}>
              Saisissez l'adresse email de votre compte. Nous vous enverrons un lien
              pour choisir un nouveau mot de passe.
            </Text>

            <TextInput
              style={[styles.input, error && styles.inputError]}
              value={email}
              onChangeText={(v) => { setEmail(v); setError(""); }}
              placeholder="votre@email.com"
              placeholderTextColor="#9ca3af"
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
            />

            {error ? <Text style={styles.errorText}>{error}</Text> : null}

            <TouchableOpacity
              style={[styles.btn, loading && styles.btnDisabled]}
              onPress={handleSend}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.btnText}>Envoyer le lien</Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity style={styles.linkBtn} onPress={() => router.back()}>
              <Text style={styles.linkText}>Retour à la connexion</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f6f9f6" },
  headerBg: {
    backgroundColor: "#15803d",
    paddingTop: 52,
    paddingBottom: 16,
    paddingHorizontal: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  backBtn: {
    width: 40, height: 40, borderRadius: 12,
    backgroundColor: "rgba(255,255,255,0.2)",
    alignItems: "center", justifyContent: "center",
  },
  backText: { fontSize: 26, color: "#fff", lineHeight: 30 },
  headerTitle: { fontSize: 17, fontWeight: "700", color: "#fff" },
  content: { flex: 1, padding: 20, justifyContent: "center" },
  card: {
    backgroundColor: "#fff",
    borderRadius: 20,
    padding: 24,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 10,
    elevation: 3,
  },
  emoji: { fontSize: 40, marginBottom: 12 },
  title: { fontSize: 18, fontWeight: "700", color: "#111827", marginBottom: 8, textAlign: "center" },
  text: { fontSize: 14, color: "#6b7280", textAlign: "center", lineHeight: 20, marginBottom: 20 },
  input: {
    width: "100%",
    borderWidth: 1,
    borderColor: "#d1d5db",
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 13,
    fontSize: 15,
    color: "#111827",
    backgroundColor: "#f9fafb",
  },
  inputError: { borderColor: "#dc2626" },
  errorText: { fontSize: 13, color: "#dc2626", marginTop: 8, alignSelf: "flex-start" },
  btn: {
    width: "100%",
    backgroundColor: "#16a34a",
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: "center",
    marginTop: 16,
  },
  btnDisabled: { opacity: 0.6 },
  btnText: { color: "#fff", fontSize: 15, fontWeight: "600" },
  linkBtn: { paddingVertical: 12, marginTop: 4 },
  linkText: { fontSize: 14, color: "#16a34a", fontWeight: "600" },
});