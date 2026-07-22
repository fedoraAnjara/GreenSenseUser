import { useState, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Alert,
} from "react-native";
import { doc, setDoc, updateDoc, getDoc, serverTimestamp } from "firebase/firestore";
import { db } from "../../src/lib/firebase";
import { useAuth } from "../../src/context/AuthContext";
import { useLanguage } from "../../src/context/LanguageContext";
import { useRouter, useLocalSearchParams } from "expo-router";

// Listes prédéfinies (sans « Autre », géré séparément comme saisie libre)
const PATHOLOGIES = [
  "Diabète", "Hypertension", "Anémie", "Obésité",
  "Cholestérol", "Insuffisance rénale",
];

const OBJECTIFS = [
  "Perte de poids", "Prise de masse", "Équilibre alimentaire",
  "Gestion du diabète", "Réduction du cholestérol",
];

const ALLERGIES = [
  "Gluten", "Lactose", "Arachides", "Fruits de mer",
  "Œufs", "Soja",
];

/**
 * Sélecteur d'étiquettes avec saisie libre via « Autre ».
 * Les valeurs personnalisées sont stockées directement dans la liste.
 */
function TagSelector({
  title,
  subtitle,
  options,
  selected,
  setSelected,
  tagActiveStyle,
  tagTextActiveStyle,
  accentColor,
  placeholder,
}) {
  const [otherOpen, setOtherOpen] = useState(false);
  const [draft, setDraft] = useState("");

  const customs = selected.filter((s) => !options.includes(s));

  // Ouvrir automatiquement la saisie si des valeurs personnalisées existent déjà
  useEffect(() => {
    if (customs.length > 0) setOtherOpen(true);
  }, [customs.length]);

  const toggle = (item) => {
    setSelected(
      selected.includes(item)
        ? selected.filter((i) => i !== item)
        : [...selected, item]
    );
  };

  const toggleOther = () => {
    if (otherOpen) {
      // Fermer : on retire les valeurs personnalisées
      setSelected(selected.filter((s) => options.includes(s)));
      setDraft("");
      setOtherOpen(false);
    } else {
      setOtherOpen(true);
    }
  };

  const addCustom = () => {
    const value = draft.trim();
    if (!value) return;
    const exists = selected.some(
      (s) => s.toLowerCase() === value.toLowerCase()
    );
    if (!exists) setSelected([...selected, value]);
    setDraft("");
  };

  const removeCustom = (value) => {
    setSelected(selected.filter((s) => s !== value));
  };

  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      <Text style={styles.sectionSub}>{subtitle}</Text>

      <View style={styles.tags}>
        {options.map((item) => (
          <TouchableOpacity
            key={item}
            style={[styles.tag, selected.includes(item) && tagActiveStyle]}
            onPress={() => toggle(item)}
          >
            <Text
              style={[
                styles.tagText,
                selected.includes(item) && tagTextActiveStyle,
              ]}
            >
              {item}
            </Text>
          </TouchableOpacity>
        ))}

        {/* Étiquette « Autre » : ouvre la saisie libre */}
        <TouchableOpacity
          style={[styles.tag, otherOpen && tagActiveStyle]}
          onPress={toggleOther}
        >
          <Text style={[styles.tagText, otherOpen && tagTextActiveStyle]}>
            {otherOpen ? "Autre ✕" : "Autre +"}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Saisie libre */}
      {otherOpen && (
        <View style={styles.otherBlock}>
          <View style={styles.otherRow}>
            <TextInput
              style={styles.otherInput}
              value={draft}
              onChangeText={setDraft}
              placeholder={placeholder}
              placeholderTextColor="#9ca3af"
              onSubmitEditing={addCustom}
              returnKeyType="done"
            />
            <TouchableOpacity
              style={[styles.addBtn, { backgroundColor: accentColor }]}
              onPress={addCustom}
            >
              <Text style={styles.addBtnText}>Ajouter</Text>
            </TouchableOpacity>
          </View>

          {customs.length > 0 && (
            <View style={styles.customsRow}>
              {customs.map((value) => (
                <TouchableOpacity
                  key={value}
                  style={[styles.customChip, { borderColor: accentColor }]}
                  onPress={() => removeCustom(value)}
                >
                  <Text style={[styles.customChipText, { color: accentColor }]}>
                    {value}  ✕
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          )}

          <Text style={styles.otherHint}>
            Appuyez sur une étiquette personnalisée pour la retirer.
          </Text>
        </View>
      )}
    </View>
  );
}

export default function HealthProfileScreen() {
  const { user } = useAuth();
  const { t } = useLanguage();
  const router = useRouter();
  const { mode } = useLocalSearchParams();
  const isEditMode = mode === "edit";

  const [poids, setPoids] = useState("");
  const [taille, setTaille] = useState("");
  const [selectedPathologies, setSelectedPathologies] = useState([]);
  const [selectedObjectifs, setSelectedObjectifs] = useState([]);
  const [selectedAllergies, setSelectedAllergies] = useState([]);
  const [loading, setLoading] = useState(false);
  const [loadingData, setLoadingData] = useState(true);

  // Charger le profil existant pour pré-remplir
  useEffect(() => {
    const loadExisting = async () => {
      if (!user) return;
      try {
        const snap = await getDoc(doc(db, "users", user.uid, "profilSante", "data"));
        if (snap.exists()) {
          const data = snap.data();
          setPoids(data.poids ? String(data.poids) : "");
          setTaille(data.taille ? String(data.taille) : "");
          setSelectedPathologies(data.pathologies || []);
          setSelectedObjectifs(data.objectifs || []);
          setSelectedAllergies(data.allergies || []);
        }
      } catch (e) {
        console.error(e);
      } finally {
        setLoadingData(false);
      }
    };
    loadExisting();
  }, [user]);

  const calcIMC = () => {
    const p = parseFloat(poids);
    const ta = parseFloat(taille) / 100;
    if (!p || !ta) return null;
    return (p / (ta * ta)).toFixed(1);
  };

  const handleSave = async () => {
    if (!poids || !taille) {
      Alert.alert("Erreur", "Veuillez renseigner votre poids et votre taille");
      return;
    }
    setLoading(true);
    try {
      const imc = calcIMC();
      await setDoc(
        doc(db, "users", user.uid, "profilSante", "data"),
        {
          poids: parseFloat(poids),
          taille: parseFloat(taille),
          imc: parseFloat(imc),
          pathologies: selectedPathologies,
          objectifs: selectedObjectifs,
          allergies: selectedAllergies,
          updatedAt: serverTimestamp(),
        }
      );
      if (isEditMode) {
        router.back();
      } else {
        router.replace("/(consumer)");
      }
    } catch (e) {
      Alert.alert("Erreur", "Une erreur est survenue");
    } finally {
      setLoading(false);
    }
  };

  const imc = calcIMC();

  if (loadingData) {
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
        {isEditMode && (
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Text style={styles.backText}>‹</Text>
          </TouchableOpacity>
        )}
        <Text style={styles.title}>Mon profil de santé</Text>
        <Text style={styles.subtitle}>
          Ces informations nous permettent de personnaliser vos recommandations nutritionnelles
        </Text>
      </View>

      {/* Poids & Taille */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>📏 Mensurations</Text>
        <View style={styles.row}>
          <View style={styles.halfInput}>
            <Text style={styles.label}>Poids (kg)</Text>
            <TextInput
              style={styles.input}
              value={poids}
              onChangeText={setPoids}
              placeholder="70"
              placeholderTextColor="#9ca3af"
              keyboardType="numeric"
            />
          </View>
          <View style={styles.halfInput}>
            <Text style={styles.label}>Taille (cm)</Text>
            <TextInput
              style={styles.input}
              value={taille}
              onChangeText={setTaille}
              placeholder="170"
              placeholderTextColor="#9ca3af"
              keyboardType="numeric"
            />
          </View>
        </View>

        {/* IMC calculé */}
        {imc && (
          <View style={styles.imcBox}>
            <Text style={styles.imcLabel}>IMC calculé</Text>
            <Text style={styles.imcValue}>{imc}</Text>
            <Text style={styles.imcInfo}>
              {parseFloat(imc) < 18.5 ? "Insuffisance pondérale" :
               parseFloat(imc) < 25 ? "Poids normal ✓" :
               parseFloat(imc) < 30 ? "Surpoids" : "Obésité"}
            </Text>
          </View>
        )}
      </View>

      {/* Pathologies */}
      <TagSelector
        title="🏥 Pathologies"
        subtitle="Sélectionnez vos conditions médicales (optionnel)"
        options={PATHOLOGIES}
        selected={selectedPathologies}
        setSelected={setSelectedPathologies}
        tagActiveStyle={styles.tagActive}
        tagTextActiveStyle={styles.tagTextActive}
        accentColor="#16a34a"
        placeholder="Ex : Asthme, Arthrose..."
      />

      {/* Objectifs */}
      <TagSelector
        title="🎯 Objectifs nutritionnels"
        subtitle="Que souhaitez-vous accomplir ?"
        options={OBJECTIFS}
        selected={selectedObjectifs}
        setSelected={setSelectedObjectifs}
        tagActiveStyle={styles.tagActiveBlue}
        tagTextActiveStyle={styles.tagTextActiveBlue}
        accentColor="#2563eb"
        placeholder="Ex : Améliorer la digestion..."
      />

      {/* Allergies */}
      <TagSelector
        title="⚠️ Allergies alimentaires"
        subtitle="Aliments à exclure de vos recommandations"
        options={ALLERGIES}
        selected={selectedAllergies}
        setSelected={setSelectedAllergies}
        tagActiveStyle={styles.tagActiveRed}
        tagTextActiveStyle={styles.tagTextActiveRed}
        accentColor="#dc2626"
        placeholder="Ex : Sésame, Fraise..."
      />

      {/* Bouton enregistrer */}
      <TouchableOpacity
        style={[styles.btn, loading && styles.btnDisabled]}
        onPress={handleSave}
        disabled={loading}
      >
        {loading ? (
          <ActivityIndicator color="white" />
        ) : (
          <Text style={styles.btnText}>{t.common.save}</Text>
        )}
      </TouchableOpacity>

      {/* Bouton passer — uniquement en onboarding */}
      {!isEditMode && (
        <TouchableOpacity
          style={styles.skipBtn}
          onPress={async () => {
            try {
              await updateDoc(doc(db, "users", user.uid), {
                healthProfilePrompted: true,
              });
            } catch (e) {}
            router.replace("/(consumer)/home");
          }}
        >
          <Text style={styles.skipText}>{t.common.skip}</Text>
        </TouchableOpacity>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f9fafb",
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#f9fafb",
  },
  scroll: {
    padding: 24,
    paddingBottom: 40,
  },
  header: {
    marginBottom: 24,
    paddingTop: 28,
  },
  backBtn: {
    width: 36,
    height: 36,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 10,
    backgroundColor: "#f3f4f6",
    marginBottom: 12,
  },
  backText: {
    fontSize: 24,
    color: "#374151",
    lineHeight: 28,
  },
  title: {
    fontSize: 24,
    fontWeight: "700",
    color: "#111827",
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    color: "#6b7280",
    lineHeight: 20,
  },
  section: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#111827",
    marginBottom: 4,
  },
  sectionSub: {
    fontSize: 12,
    color: "#9ca3af",
    marginBottom: 12,
  },
  row: {
    flexDirection: "row",
    gap: 12,
  },
  halfInput: {
    flex: 1,
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
  imcBox: {
    marginTop: 12,
    backgroundColor: "#f0fdf4",
    borderRadius: 10,
    padding: 12,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#bbf7d0",
  },
  imcLabel: {
    fontSize: 12,
    color: "#6b7280",
  },
  imcValue: {
    fontSize: 28,
    fontWeight: "700",
    color: "#16a34a",
  },
  imcInfo: {
    fontSize: 12,
    color: "#16a34a",
    fontWeight: "500",
  },
  tags: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  tag: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: "#e5e7eb",
    backgroundColor: "#f9fafb",
  },
  tagActive: {
    borderColor: "#16a34a",
    backgroundColor: "#f0fdf4",
  },
  tagActiveBlue: {
    borderColor: "#2563eb",
    backgroundColor: "#eff6ff",
  },
  tagActiveRed: {
    borderColor: "#dc2626",
    backgroundColor: "#fef2f2",
  },
  tagText: {
    fontSize: 13,
    color: "#6b7280",
    fontWeight: "500",
  },
  tagTextActive: {
    color: "#16a34a",
  },
  tagTextActiveBlue: {
    color: "#2563eb",
  },
  tagTextActiveRed: {
    color: "#dc2626",
  },

  // Saisie libre « Autre »
  otherBlock: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: "#f3f4f6",
  },
  otherRow: {
    flexDirection: "row",
    gap: 8,
    alignItems: "center",
  },
  otherInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: "#d1d5db",
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 14,
    color: "#111827",
    backgroundColor: "#fff",
  },
  addBtn: {
    paddingHorizontal: 16,
    paddingVertical: 11,
    borderRadius: 10,
  },
  addBtnText: {
    color: "#fff",
    fontSize: 13,
    fontWeight: "600",
  },
  customsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 12,
  },
  customChip: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 20,
    borderWidth: 1.5,
    backgroundColor: "#fff",
  },
  customChipText: {
    fontSize: 13,
    fontWeight: "600",
  },
  otherHint: {
    fontSize: 11,
    color: "#9ca3af",
    marginTop: 8,
  },

  btn: {
    backgroundColor: "#16a34a",
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: "center",
    marginBottom: 12,
  },
  btnDisabled: {
    opacity: 0.6,
  },
  btnText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
  skipBtn: {
    alignItems: "center",
    paddingVertical: 12,
  },
  skipText: {
    fontSize: 14,
    color: "#9ca3af",
  },
});