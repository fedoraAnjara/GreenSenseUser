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
  Switch,
  Modal,
} from "react-native";
import {
  collection,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  serverTimestamp,
} from "firebase/firestore";
import { db } from "../../src/lib/firebase";
import { useAuth } from "../../src/context/AuthContext";
import { useLanguage } from "../../src/context/LanguageContext";

const emptyForm = {
  nom: "",
  categorie: "legume",
  description: "",
  prix: "",
  disponible: true,
};

export default function ProductsScreen() {
  const { user } = useAuth();
  const { t } = useLanguage();

  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState(null);
  const [saving, setSaving] = useState(false);

  const fetchProducts = async () => {
    try {
      const snap = await getDocs(
        collection(db, "agriculteurs", user.uid, "produits")
      );
      setProducts(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProducts();
  }, [user]);

  const openAdd = () => {
    setForm(emptyForm);
    setEditingId(null);
    setShowModal(true);
  };

  const openEdit = (product) => {
    setForm({
      nom: product.nom,
      categorie: product.categorie,
      description: product.description || "",
      prix: product.prix ? String(product.prix) : "",
      disponible: product.disponible,
    });
    setEditingId(product.id);
    setShowModal(true);
  };

  const handleSave = async () => {
    if (!form.nom.trim()) {
      Alert.alert("Erreur", "Le nom du produit est obligatoire");
      return;
    }
    setSaving(true);
    try {
      const data = {
        nom: form.nom.trim(),
        categorie: form.categorie,
        description: form.description.trim(),
        prix: form.prix ? parseFloat(form.prix) : null,
        disponible: form.disponible,
        updatedAt: serverTimestamp(),
      };

      if (editingId) {
        await updateDoc(
          doc(db, "agriculteurs", user.uid, "produits", editingId),
          data
        );
      } else {
        await addDoc(
          collection(db, "agriculteurs", user.uid, "produits"),
          { ...data, createdAt: serverTimestamp() }
        );
      }
      setShowModal(false);
      fetchProducts();
    } catch (e) {
      Alert.alert("Erreur", "Une erreur est survenue");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    Alert.alert(
      t.farmer.products.form.delete,
      t.farmer.products.form.deleteConfirm,
      [
        { text: t.common.no, style: "cancel" },
        {
          text: t.common.yes,
          style: "destructive",
          onPress: async () => {
            try {
              await deleteDoc(
                doc(db, "agriculteurs", user.uid, "produits", editingId)
              );
              setShowModal(false);
              fetchProducts();
            } catch (e) {
              Alert.alert("Erreur", "Une erreur est survenue");
            }
          },
        },
      ]
    );
  };

  const toggleAvailability = async (product) => {
    try {
      await updateDoc(
        doc(db, "agriculteurs", user.uid, "produits", product.id),
        { disponible: !product.disponible }
      );
      fetchProducts();
    } catch (e) {
      console.error(e);
    }
  };

  const CATEGORY_EMOJIS = {
    legume: "🥦",
    fruit: "🍎",
    legumineuse: "🫘",
    cereale: "🌾",
    viande: "🥩",
    poisson: "🐟",
    autre: "📦",
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#16a34a" />
      </View>
    );
  }

  return (
    <View style={styles.container}>

      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>{t.farmer.products.title}</Text>
        <TouchableOpacity style={styles.addBtn} onPress={openAdd}>
          <Text style={styles.addBtnText}>+ {t.farmer.products.add}</Text>
        </TouchableOpacity>
      </View>

      {products.length === 0 ? (
        <View style={styles.empty}>
          <Text style={styles.emptyEmoji}>🌱</Text>
          <Text style={styles.emptyText}>{t.farmer.products.empty}</Text>
          <Text style={styles.emptySub}>{t.farmer.products.emptySub}</Text>
          <TouchableOpacity style={styles.emptyBtn} onPress={openAdd}>
            <Text style={styles.emptyBtnText}>+ {t.farmer.products.add}</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.scroll}>
          {products.map((product) => (
            <TouchableOpacity
              key={product.id}
              style={styles.productCard}
              onPress={() => openEdit(product)}
            >
              <View style={styles.productLeft}>
                <View style={styles.productIconBox}>
                  <Text style={styles.productIcon}>
                    {CATEGORY_EMOJIS[product.categorie] || "📦"}
                  </Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.productName}>{product.nom}</Text>
                  <Text style={styles.productCategory}>
                    {t.farmer.products.categories[product.categorie]}
                  </Text>
                  {product.prix ? (
                    <Text style={styles.productPrice}>
                      {product.prix.toLocaleString()} Ar
                    </Text>
                  ) : null}
                </View>
              </View>
              <View style={styles.productRight}>
                <Switch
                  value={product.disponible}
                  onValueChange={() => toggleAvailability(product)}
                  trackColor={{ false: "#d1d5db", true: "#86efac" }}
                  thumbColor={product.disponible ? "#16a34a" : "#9ca3af"}
                />
                <Text style={[
                  styles.availText,
                  { color: product.disponible ? "#16a34a" : "#9ca3af" }
                ]}>
                  {product.disponible
                    ? t.farmer.products.available
                    : t.farmer.products.unavailable}
                </Text>
              </View>
            </TouchableOpacity>
          ))}
        </ScrollView>
      )}

      {/* Modal ajout/édition */}
      <Modal
        visible={showModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowModal(false)}
      >
        <View style={styles.modal}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setShowModal(false)}>
              <Text style={styles.modalCancel}>{t.common.cancel}</Text>
            </TouchableOpacity>
            <Text style={styles.modalTitle}>
              {editingId
                ? t.farmer.products.form.editTitle
                : t.farmer.products.form.title}
            </Text>
            <TouchableOpacity onPress={handleSave} disabled={saving}>
              <Text style={[styles.modalSave, saving && { opacity: 0.5 }]}>
                {saving ? t.farmer.products.form.saving : t.farmer.products.form.save}
              </Text>
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalScroll} keyboardShouldPersistTaps="handled">

            {/* Nom */}
            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>{t.farmer.products.form.name}</Text>
              <TextInput
                style={styles.formInput}
                value={form.nom}
                onChangeText={(v) => setForm((p) => ({ ...p, nom: v }))}
                placeholder={t.farmer.products.form.namePlaceholder}
                placeholderTextColor="#9ca3af"
              />
            </View>

            {/* Catégorie */}
            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>{t.farmer.products.form.category}</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                <View style={styles.categoryRow}>
                  {Object.entries(t.farmer.products.categories).map(([key, label]) => (
                    <TouchableOpacity
                      key={key}
                      style={[
                        styles.categoryChip,
                        form.categorie === key && styles.categoryChipActive,
                      ]}
                      onPress={() => setForm((p) => ({ ...p, categorie: key }))}
                    >
                      <Text style={styles.categoryChipEmoji}>
                        {CATEGORY_EMOJIS[key]}
                      </Text>
                      <Text style={[
                        styles.categoryChipText,
                        form.categorie === key && styles.categoryChipTextActive,
                      ]}>
                        {label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </ScrollView>
            </View>

            {/* Description */}
            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>{t.farmer.products.form.description}</Text>
              <TextInput
                style={[styles.formInput, styles.formTextarea]}
                value={form.description}
                onChangeText={(v) => setForm((p) => ({ ...p, description: v }))}
                placeholder={t.farmer.products.form.descriptionPlaceholder}
                placeholderTextColor="#9ca3af"
                multiline
                numberOfLines={3}
              />
            </View>

            {/* Prix */}
            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>{t.farmer.products.form.price}</Text>
              <TextInput
                style={styles.formInput}
                value={form.prix}
                onChangeText={(v) => setForm((p) => ({ ...p, prix: v }))}
                placeholder={t.farmer.products.form.pricePlaceholder}
                placeholderTextColor="#9ca3af"
                keyboardType="numeric"
              />
            </View>

            {/* Disponibilité */}
            <View style={styles.formGroup}>
              <View style={styles.switchRow}>
                <Text style={styles.formLabel}>{t.farmer.products.form.available}</Text>
                <Switch
                  value={form.disponible}
                  onValueChange={(v) => setForm((p) => ({ ...p, disponible: v }))}
                  trackColor={{ false: "#d1d5db", true: "#86efac" }}
                  thumbColor={form.disponible ? "#16a34a" : "#9ca3af"}
                />
              </View>
            </View>

            {/* Supprimer */}
            {editingId && (
              <TouchableOpacity style={styles.deleteBtn} onPress={handleDelete}>
                <Text style={styles.deleteBtnText}>🗑️ {t.farmer.products.form.delete}</Text>
              </TouchableOpacity>
            )}

            <View style={{ height: 40 }} />
          </ScrollView>
        </View>
      </Modal>

    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f9fafb" },
  loadingContainer: { flex: 1, justifyContent: "center", alignItems: "center" },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 16,
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#f3f4f6",
  },
  headerTitle: { fontSize: 20, fontWeight: "700", color: "#111827" },
  addBtn: {
    backgroundColor: "#16a34a",
    borderRadius: 10,
    paddingVertical: 8,
    paddingHorizontal: 14,
  },
  addBtnText: { color: "#fff", fontSize: 13, fontWeight: "600" },
  scroll: { padding: 16, paddingBottom: 40 },
  empty: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 40,
  },
  emptyEmoji: { fontSize: 56, marginBottom: 16 },
  emptyText: { fontSize: 17, fontWeight: "600", color: "#111827", marginBottom: 8 },
  emptySub: { fontSize: 14, color: "#6b7280", textAlign: "center", marginBottom: 24 },
  emptyBtn: {
    backgroundColor: "#16a34a",
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 24,
  },
  emptyBtnText: { color: "#fff", fontSize: 14, fontWeight: "600" },
  productCard: {
    backgroundColor: "#fff",
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  productLeft: { flexDirection: "row", alignItems: "center", gap: 12, flex: 1 },
  productIconBox: {
    width: 46, height: 46, borderRadius: 12,
    backgroundColor: "#f0fdf4",
    alignItems: "center", justifyContent: "center",
  },
  productIcon: { fontSize: 24 },
  productName: { fontSize: 14, fontWeight: "600", color: "#111827" },
  productCategory: { fontSize: 12, color: "#6b7280", marginTop: 2 },
  productPrice: { fontSize: 12, color: "#16a34a", fontWeight: "500", marginTop: 2 },
  productRight: { alignItems: "center", gap: 4 },
  availText: { fontSize: 10, fontWeight: "500" },
  modal: { flex: 1, backgroundColor: "#f9fafb" },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 16,
    paddingTop: 20,
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#f3f4f6",
  },
  modalCancel: { fontSize: 16, color: "#6b7280" },
  modalTitle: { fontSize: 16, fontWeight: "600", color: "#111827" },
  modalSave: { fontSize: 16, color: "#16a34a", fontWeight: "600" },
  modalScroll: { padding: 20 },
  formGroup: { marginBottom: 20 },
  formLabel: { fontSize: 13, fontWeight: "500", color: "#374151", marginBottom: 8 },
  formInput: {
    borderWidth: 1, borderColor: "#d1d5db",
    borderRadius: 10, paddingHorizontal: 14,
    paddingVertical: 12, fontSize: 15,
    color: "#111827", backgroundColor: "#fff",
  },
  formTextarea: { height: 90, textAlignVertical: "top" },
  categoryRow: { flexDirection: "row", gap: 8 },
  categoryChip: {
    flexDirection: "row", alignItems: "center", gap: 6,
    paddingHorizontal: 12, paddingVertical: 8,
    borderRadius: 20, borderWidth: 1.5,
    borderColor: "#e5e7eb", backgroundColor: "#f9fafb",
  },
  categoryChipActive: { borderColor: "#16a34a", backgroundColor: "#f0fdf4" },
  categoryChipEmoji: { fontSize: 16 },
  categoryChipText: { fontSize: 13, color: "#6b7280", fontWeight: "500" },
  categoryChipTextActive: { color: "#16a34a" },
  switchRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  deleteBtn: {
    backgroundColor: "#fef2f2",
    borderRadius: 12,
    padding: 14,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#fecaca",
    marginTop: 8,
  },
  deleteBtnText: { color: "#dc2626", fontSize: 14, fontWeight: "600" },
});