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
  ScrollView,
} from "react-native";
import { createUserWithEmailAndPassword, signOut } from "firebase/auth";
import { doc, setDoc, serverTimestamp } from "firebase/firestore";
import { auth, db } from "../../src/lib/firebase";
import { useRouter } from "expo-router";
import { useLanguage } from "../../src/context/LanguageContext";
import { useAuth } from "../../src/context/AuthContext";
import { normalizePhone, isValidMalagasyPhone } from "../../src/lib/phoneUtils";

export default function RegisterScreen() {
  const [nom, setNom] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [role, setRole] = useState("consommateur");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [telephone, setTelephone] = useState("");

  const router = useRouter();
  const { t, language, toggleLanguage } = useLanguage();
  const { refreshUserData } = useAuth();

  const getErrorMessage = (code) => {
    switch (code) {
      case "auth/email-already-in-use": return t.auth.errors.emailInUse;
      case "auth/invalid-email": return t.auth.errors.invalidEmail;
      case "auth/weak-password": return t.auth.errors.weakPassword;
      default: return t.auth.errors.generic;
    }
  };

  const handleRegister = async () => {
  if (!nom || !password || !confirmPassword) {
    setError(t.auth.errors.generic);
    return;
  }
  if (password !== confirmPassword) {
    setError(t.auth.errors.passwordMismatch);
    return;
  }

  // Pour agriculteur : téléphone obligatoire, email optionnel
  let finalEmail = email;
  if (role === "agriculteur") {
    if (!telephone) {
      setError("Le numéro de téléphone est obligatoire pour les agriculteurs");
      return;
    }
    if (!isValidMalagasyPhone(telephone)) {
      setError("Numéro de téléphone invalide (ex: 0341234567)");
      return;
    }
    // Si pas d'email fourni, en générer un technique à partir du téléphone
    if (!email) {
      const normalizedPhone = normalizePhone(telephone).replace("+", "");
      finalEmail = `${normalizedPhone}@greensense.mg`;
    }
  } else {
    // Pour consommateur : email obligatoire
    if (!email) {
      setError(t.auth.errors.generic);
      return;
    }
  }

  setError("");
  setLoading(true);
  try {
    const { user } = await createUserWithEmailAndPassword(auth, finalEmail, password);

    await setDoc(doc(db, "users", user.uid), {
      nom,
      email: finalEmail,
      emailReel: email || null, // garder trace si un vrai email a été fourni
      role,
      telephone: role === "agriculteur" ? normalizePhone(telephone) : null,
      isActive: true,
      farmerStatus: role === "agriculteur" ? "pending" : null,
      createdAt: serverTimestamp(),
    });

    const freshData = await refreshUserData();

    if (freshData?.role === "agriculteur") {
      router.replace("/(farmer)");
    } else {
      router.replace("/(consumer)");
    }
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
        <TouchableOpacity style={styles.langBtn} onPress={toggleLanguage}>
          <Text style={styles.langText}>
            {language === "fr" ? "🇬🇧 EN" : "🇫🇷 FR"}
          </Text>
        </TouchableOpacity>

        {/* Bouton déconnexion temporaire pour tests */}
        <TouchableOpacity
          onPress={() => signOut(auth)}
          style={{ padding: 12, alignItems: "flex-end" }}
        >
          <Text style={{ color: "red", fontSize: 12 }}>Déconnexion (test)</Text>
        </TouchableOpacity>

        {/* Logo */}
        <View style={styles.logoArea}>
          <View style={styles.logoIcon}>
            <Text style={styles.logoEmoji}>🌿</Text>
          </View>
          <Text style={styles.logoText}>GreenSense</Text>
        </View>

        {/* Formulaire */}
        <View style={styles.form}>
          <Text style={styles.title}>{t.auth.register}</Text>

          {error ? (
            <View style={styles.errorBox}>
              <Text style={styles.errorText}>{error}</Text>
            </View>
          ) : null}

          {/* Nom */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Nom complet</Text>
            <TextInput
              style={styles.input}
              value={nom}
              onChangeText={setNom}
              placeholder="Rakoto Jean"
              placeholderTextColor="#9ca3af"
              autoCapitalize="words"
            />
          </View>

          {/* Email */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>
              {t.auth.email}
              {role === "agriculteur" && (
                <Text style={styles.optional}> (optionnel)</Text>
              )}
            </Text>
            <TextInput
              style={styles.input}
              value={email}
              onChangeText={setEmail}
              placeholder={role === "agriculteur" ? "Laissez vide si vous n'en avez pas" : t.auth.emailPlaceholder}
              placeholderTextColor="#9ca3af"
              keyboardType="email-address"
              autoCapitalize="none"
            />
          </View>

          {/* Mot de passe */}
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

          {/* Confirmer mot de passe */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>{t.auth.confirmPassword}</Text>
            <TextInput
              style={styles.input}
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              placeholder={t.auth.passwordPlaceholder}
              placeholderTextColor="#9ca3af"
              secureTextEntry
            />
          </View>

          {/* Rôle */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>{t.auth.role}</Text>
            <View style={styles.roleRow}>
              <TouchableOpacity
                style={[
                  styles.roleBtn,
                  role === "consommateur" && styles.roleBtnActive,
                ]}
                onPress={() => setRole("consommateur")}
              >
                <Text style={styles.roleEmoji}>🛒</Text>
                <Text
                  style={[
                    styles.roleText,
                    role === "consommateur" && styles.roleTextActive,
                  ]}
                >
                  {t.auth.consumer}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.roleBtn,
                  role === "agriculteur" && styles.roleBtnActive,
                ]}
                onPress={() => setRole("agriculteur")}
              >
                <Text style={styles.roleEmoji}>🌾</Text>
                <Text
                  style={[
                    styles.roleText,
                    role === "agriculteur" && styles.roleTextActive,
                  ]}
                >
                  {t.auth.farmer}
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Téléphone — uniquement pour agriculteurs */}
          {role === "agriculteur" && (
            <View style={styles.inputGroup}>
              <Text style={styles.label}>{t.auth.phone}</Text>
              <TextInput
                style={styles.input}
                value={telephone}
                onChangeText={setTelephone}
                placeholder="0341234567"
                placeholderTextColor="#9ca3af"
                keyboardType="phone-pad"
              />
              <Text style={styles.hint}>
                {t.auth.Phonedescription}
              </Text>
            </View>
          )}

          <TouchableOpacity
            style={[styles.btn, loading && styles.btnDisabled]}
            onPress={handleRegister}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="white" />
            ) : (
              <Text style={styles.btnText}>{t.auth.register}</Text>
            )}
          </TouchableOpacity>

          <View style={styles.switchRow}>
            <Text style={styles.switchText}>{t.auth.hasAccount} </Text>
            <TouchableOpacity onPress={() => router.push("/(auth)/login")}>
              <Text style={styles.switchLink}>{t.auth.login}</Text>
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
    marginBottom: 8,
  },
  langText: {
    fontSize: 13,
    color: "#6b7280",
    fontWeight: "500",
  },
  logoArea: {
    alignItems: "center",
    marginBottom: 32,
  },
  logoIcon: {
    width: 64,
    height: 64,
    borderRadius: 18,
    backgroundColor: "#f0fdf4",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 10,
  },
  logoEmoji: {
    fontSize: 32,
  },
  logoText: {
    fontSize: 24,
    fontWeight: "700",
    color: "#16a34a",
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
  roleRow: {
    flexDirection: "row",
    gap: 12,
  },
  roleBtn: {
    flex: 1,
    borderWidth: 1.5,
    borderColor: "#e5e7eb",
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: "center",
    backgroundColor: "#f9fafb",
  },
  roleBtnActive: {
    borderColor: "#16a34a",
    backgroundColor: "#f0fdf4",
  },
  roleEmoji: {
    fontSize: 24,
    marginBottom: 6,
  },
  roleText: {
    fontSize: 13,
    fontWeight: "500",
    color: "#6b7280",
    textAlign: "center",
  },
  roleTextActive: {
    color: "#16a34a",
  },

  hint: {
    fontSize: 11,
    color: "#9ca3af",
    marginTop: 4,
  },
  optional: {
  fontSize: 11,
  color: "#9ca3af",
  fontWeight: "400",
},

  btn: {
    backgroundColor: "#16a34a",
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: "center",
    marginBottom: 20,
    marginTop: 8,
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