import { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Alert,
} from "react-native";
import { doc, getDoc, setDoc, serverTimestamp } from "firebase/firestore";
import { db } from "../../src/lib/firebase";
import { useAuth } from "../../src/context/AuthContext";
import { useLanguage } from "../../src/context/LanguageContext";

const CERTIFICATIONS = ["Bio", "Label local", "Commerce équitable", "Sans pesticides"];

export default function FarmProfileScreen() {
  const { user, userData } = useAuth();
  const { t } = useLanguage();

  const [form, setForm] = useState({
    nomFerme: "",
    adresse: "",
    description: "",
    certifications: [],
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const fetchProfile = async () => {
      if (!user) return;
      try {
        const snap = await getDoc(doc(db, "agriculteurs", user.uid));
        if (snap.exists()) {
          const data = snap.data();
          setForm({
            nomFerme: data.nomFerme || "",
            adresse: data.adresse || "",
            description: data.description || "",
            certifications: data.certifications || [],
          });
        }
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    fetchProfile();
  }, [user]);

  const toggleCertification = (cert) => {
    setForm((prev) => ({
      ...prev,
      certifications: prev.certifications.includes(cert)
        ? prev.certifications.filter((c) => c !== cert)
        : [...prev.certifications, cert],
    }));
  };

  const handleSave = async () => {
    if (!form.nomFerme.trim()) {
      Alert.alert("Erreur", "Le nom de la ferme est obligatoire");
      return;
    }
    setSaving(true);
    try {
      await setDoc(doc(db, "agriculteurs", user.uid), {
        nomFerme: form.nomFerme.trim(),
        adresse: form.adresse.trim(),
        description: form.description.trim(),
        certifications: form.certifications,
        updatedAt: serverTimestamp(),
      }, { merge: true });
      Alert.alert("✅", t.farmer.farmProfile.updateSuccess);
    } catch (e) {
      Alert.alert("Erreur", "Une erreur est survenue");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#16a34a" />
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.scroll}
      keyboardShouldPersistTaps="handled"
    >
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>{t.farmer.farmProfile.title}</Text>
        <Text style={styles.headerSub}>{userData?.nom}</Text>
      </View>

      {/* Nom de la ferme */}
      <View style={styles.formGroup}>
        <Text style={styles.formLabel}>{t.farmer.farmProfile.farmName}</Text>
        <TextInput
          style={styles.formInput}
          value={form.nomFerme}
          onChangeText={(v) => setForm((p) => ({ ...p, nomFerme: v }))}
          placeholder={t.farmer.farmProfile.farmNamePlaceholder}
          placeholderTextColor="#9ca3af"
        />
      </View>

      {/* Adresse */}
      <View style={styles.formGroup}>
        <Text style={styles.formLabel}>{t.farmer.farmProfile.address}</Text>
        <TextInput
          style={styles.formInput}
          value={form.adresse}
          onChangeText={(v) => setForm((p) => ({ ...p, adresse: v }))}
          placeholder={t.farmer.farmProfile.addressPlaceholder}
          placeholderTextColor="#9ca3af"
        />
      </View>

      {/* Description */}
      <View style={styles.formGroup}>
        <Text style={styles.formLabel}>{t.farmer.farmProfile.description}</Text>
        <TextInput
          style={[styles.formInput, styles.formTextarea]}
          value={form.description}
          onChangeText={(v) => setForm((p) => ({ ...p, description: v }))}
          placeholder={t.farmer.farmProfile.descriptionPlaceholder}
          placeholderTextColor="#9ca3af"
          multiline
          numberOfLines={4}
        />
      </View>

      {/* Certifications */}
      <View style={styles.formGroup}>
        <Text style={styles.formLabel}>{t.farmer.farmProfile.certifications}</Text>
        <View style={styles.certsGrid}>
          {CERTIFICATIONS.map((cert) => (
            <TouchableOpacity
              key={cert}
              style={[
                styles.certChip,
                form.certifications.includes(cert) && styles.certChipActive,
              ]}
              onPress={() => toggleCertification(cert)}
            >
              <Text style={[
                styles.certChipText,
                form.certifications.includes(cert) && styles.certChipTextActive,
              ]}>
                {form.certifications.includes(cert) ? "✓ " : ""}{cert}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Bouton save */}
      <TouchableOpacity
        style={[styles.saveBtn, saving && styles.saveBtnDisabled]}
        onPress={handleSave}
        disabled={saving}
      >
        <Text style={styles.saveBtnText}>
          {saving ? t.farmer.farmProfile.saving : t.farmer.farmProfile.save}
        </Text>
      </TouchableOpacity>

    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f9fafb" },
  scroll: { padding: 20, paddingBottom: 40 },
  loadingContainer: { flex: 1, justifyContent: "center", alignItems: "center" },
  header: { marginBottom: 24, paddingTop: 8 },
  headerTitle: { fontSize: 22, fontWeight: "700", color: "#111827" },
  headerSub: { fontSize: 14, color: "#6b7280", marginTop: 4 },
  formGroup: { marginBottom: 20 },
  formLabel: { fontSize: 13, fontWeight: "500", color: "#374151", marginBottom: 8 },
  formInput: {
    borderWidth: 1, borderColor: "#d1d5db",
    borderRadius: 10, paddingHorizontal: 14,
    paddingVertical: 12, fontSize: 15,
    color: "#111827", backgroundColor: "#fff",
  },
  formTextarea: { height: 110, textAlignVertical: "top" },
  certsGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  certChip: {
    paddingHorizontal: 14, paddingVertical: 8,
    borderRadius: 20, borderWidth: 1.5,
    borderColor: "#e5e7eb", backgroundColor: "#f9fafb",
  },
  certChipActive: { borderColor: "#16a34a", backgroundColor: "#f0fdf4" },
  certChipText: { fontSize: 13, color: "#6b7280", fontWeight: "500" },
  certChipTextActive: { color: "#16a34a" },
  saveBtn: {
    backgroundColor: "#16a34a",
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: "center",
    marginTop: 8,
  },
  saveBtnDisabled: { opacity: 0.6 },
  saveBtnText: { color: "#fff", fontSize: 16, fontWeight: "600" },
});