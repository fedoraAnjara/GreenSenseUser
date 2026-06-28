import { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
} from "react-native";
import {
  doc,
  getDoc,
  collection,
  getDocs,
  query,
  where,
} from "firebase/firestore";
import { db } from "../../../src/lib/firebase";
import { useLanguage } from "../../../src/context/LanguageContext";
import { useRouter, useLocalSearchParams } from "expo-router";

const CATEGORY_EMOJIS = {
  legume: "🥦",
  fruit: "🍎",
  legumineuse: "🫘",
  cereale: "🌾",
  viande: "🥩",
  poisson: "🐟",
  autre: "📦",
};

const TYPE_CONFIG = {
  vente: { emoji: "🛒", label: "Point de vente", color: "#16a34a", bg: "#f0fdf4" },
  cultivation: { emoji: "🌾", label: "Cultivation", color: "#ca8a04", bg: "#fefce8" },
  elevage: { emoji: "🐄", label: "Élevage", color: "#dc2626", bg: "#fef2f2" },
};

export default function FarmerProfileScreen() {
  const { id } = useLocalSearchParams();
  const { t } = useLanguage();
  const router = useRouter();

  const [agriculteur, setAgriculteur] = useState(null);
  const [pointDeVente, setPointDeVente] = useState(null);
  const [produits, setProduits] = useState([]);
  const [publications, setPublications] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      if (!id) return;
      try {
        // 1. Infos de l'agriculteur (users + agriculteurs)
        const userSnap = await getDoc(doc(db, "users", id));
        const agriSnap = await getDoc(doc(db, "agriculteurs", id));
        const userData = userSnap.exists() ? userSnap.data() : {};
        const agriData = agriSnap.exists() ? agriSnap.data() : {};
        setAgriculteur({ ...userData, ...agriData });

        // 2. Point de vente lié
        const pdvSnap = await getDocs(
          query(collection(db, "pointsDeVente"), where("agriculteurId", "==", id))
        );
        if (!pdvSnap.empty) {
          setPointDeVente({ id: pdvSnap.docs[0].id, ...pdvSnap.docs[0].data() });
        }

        // 3. Catalogue produits
        const prodSnap = await getDocs(
          collection(db, "agriculteurs", id, "produits")
        );
        setProduits(prodSnap.docs.map((d) => ({ id: d.id, ...d.data() })));

        // 4. Publications approuvées de cet agriculteur
        const pubSnap = await getDocs(
          query(
            collection(db, "publications"),
            where("agriculteurId", "==", id),
            where("statut", "==", "approuve")
          )
        );
        const pubs = pubSnap.docs.map((d) => ({ id: d.id, ...d.data() }));
        pubs.sort((a, b) => {
          const dateA = a.createdAt?.toDate?.() ?? new Date(0);
          const dateB = b.createdAt?.toDate?.() ?? new Date(0);
          return dateB - dateA;
        });
        setPublications(pubs.slice(0, 5));
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [id]);

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#16a34a" />
      </View>
    );
  }

  if (!agriculteur) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.notFound}>Agriculteur introuvable</Text>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={styles.backLink}>Retour</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const config = pointDeVente
    ? TYPE_CONFIG[pointDeVente.type] || TYPE_CONFIG.vente
    : null;

  const nomComplet = agriculteur.nom || "Agriculteur";
  const nomFerme = agriculteur.nomFerme || pointDeVente?.nom || "Ferme";

  return (
    <View style={styles.container}>
      {/* En-tête */}
      <View style={styles.headerBg}>
        <View style={styles.blob1} />
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Text style={styles.backText}>‹</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t.farmerProfile.title}</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
      >
        {/* Carte identité */}
        <View style={styles.identityCard}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>
              {nomComplet.charAt(0).toUpperCase()}
            </Text>
          </View>
          <Text style={styles.farmerName}>{nomComplet}</Text>
          <Text style={styles.farmName}>🏡 {nomFerme}</Text>

          {pointDeVente && config && (
            <View style={[styles.typeBadge, { backgroundColor: config.bg }]}>
              <Text style={styles.typeBadgeEmoji}>{config.emoji}</Text>
              <Text style={[styles.typeBadgeText, { color: config.color }]}>
                {config.label}
              </Text>
            </View>
          )}

          {(pointDeVente?.adresse || agriculteur.adresse) && (
            <Text style={styles.address}>
              📍 {pointDeVente?.adresse || agriculteur.adresse}
            </Text>
          )}

          {pointDeVente && (
            <TouchableOpacity
            style={styles.mapBtn}
            onPress={() => router.push(`/(consumer)/map?pointId=${pointDeVente.id}`)}
            >
              <Text style={styles.mapBtnText}>🗺️ {t.farmerProfile.viewOnMap}</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* À propos */}
        {agriculteur.description && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>{t.farmerProfile.about}</Text>
            <View style={styles.aboutCard}>
              <Text style={styles.aboutText}>{agriculteur.description}</Text>
            </View>
          </View>
        )}

        {/* Certifications */}
        {agriculteur.certifications?.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>{t.farmerProfile.certifications}</Text>
            <View style={styles.certsRow}>
              {agriculteur.certifications.map((cert, i) => (
                <View key={i} style={styles.certChip}>
                  <Text style={styles.certText}>✓ {cert}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Catalogue produits */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t.farmerProfile.products}</Text>
          {produits.length === 0 ? (
            <View style={styles.emptyCard}>
              <Text style={styles.emptyText}>{t.farmerProfile.noProducts}</Text>
            </View>
          ) : (
            produits.map((prod) => (
              <View key={prod.id} style={styles.productCard}>
                <View style={styles.productIconBox}>
                  <Text style={styles.productIcon}>
                    {CATEGORY_EMOJIS[prod.categorie] || "📦"}
                  </Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.productName}>{prod.nom}</Text>
                  {prod.description ? (
                    <Text style={styles.productDesc} numberOfLines={2}>
                      {prod.description}
                    </Text>
                  ) : null}
                  {prod.prix ? (
                    <Text style={styles.productPrice}>
                      {prod.prix.toLocaleString()} Ar
                    </Text>
                  ) : null}
                </View>
                <View
                  style={[
                    styles.availBadge,
                    { backgroundColor: prod.disponible !== false ? "#f0fdf4" : "#fef2f2" },
                  ]}
                >
                  <Text
                    style={[
                      styles.availText,
                      { color: prod.disponible !== false ? "#16a34a" : "#dc2626" },
                    ]}
                  >
                    {prod.disponible !== false
                      ? t.farmerProfile.available
                      : t.farmerProfile.unavailable}
                  </Text>
                </View>
              </View>
            ))
          )}
        </View>

        {/* Annonces récentes */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t.farmerProfile.publications}</Text>
          {publications.length === 0 ? (
            <View style={styles.emptyCard}>
              <Text style={styles.emptyText}>{t.farmerProfile.noPublications}</Text>
            </View>
          ) : (
            publications.map((pub) => (
              <View key={pub.id} style={styles.pubCard}>
                <Text style={styles.pubContent}>{pub.contenu}</Text>
                <View style={styles.pubInfoRow}>
                  {pub.produit && (
                    <View style={styles.pubChip}>
                      <Text style={styles.pubChipText}>🌿 {pub.produit}</Text>
                    </View>
                  )}
                  {pub.prix && (
                    <View style={styles.pubChip}>
                      <Text style={styles.pubChipText}>💰 {pub.prix.toLocaleString()} Ar</Text>
                    </View>
                  )}
                </View>
              </View>
            ))
          )}
        </View>

        <View style={{ height: 30 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f6f9f6" },
  loadingContainer: { flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: "#f6f9f6" },
  notFound: { fontSize: 15, color: "#6b7280", marginBottom: 12 },
  backLink: { fontSize: 14, color: "#16a34a", fontWeight: "600" },
  headerBg: {
    backgroundColor: "#15803d",
    paddingTop: 52,
    paddingBottom: 16,
    paddingHorizontal: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    overflow: "hidden",
  },
  blob1: {
    position: "absolute",
    top: -40,
    right: -20,
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: "#16a34a",
    opacity: 0.4,
  },
  backBtn: {
    width: 40, height: 40, borderRadius: 12,
    backgroundColor: "rgba(255,255,255,0.2)",
    alignItems: "center", justifyContent: "center",
  },
  backText: { fontSize: 26, color: "#fff", lineHeight: 30 },
  headerTitle: { fontSize: 17, fontWeight: "700", color: "#fff" },
  scroll: { padding: 16, paddingTop: 20 },
  identityCard: {
    backgroundColor: "#fff",
    borderRadius: 22,
    padding: 24,
    alignItems: "center",
    marginBottom: 20,
    marginTop: -40,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 16,
    elevation: 4,
  },
  avatar: {
    width: 72, height: 72, borderRadius: 36,
    backgroundColor: "#16a34a",
    alignItems: "center", justifyContent: "center",
    marginBottom: 12,
  },
  avatarText: { fontSize: 30, fontWeight: "800", color: "#fff" },
  farmerName: { fontSize: 20, fontWeight: "800", color: "#111827" },
  farmName: { fontSize: 14, color: "#16a34a", marginTop: 4, fontWeight: "600" },
  typeBadge: {
    flexDirection: "row", alignItems: "center", gap: 4,
    paddingHorizontal: 12, paddingVertical: 6, borderRadius: 14, marginTop: 12,
  },
  typeBadgeEmoji: { fontSize: 14 },
  typeBadgeText: { fontSize: 12, fontWeight: "700" },
  address: { fontSize: 13, color: "#6b7280", marginTop: 12 },
  mapBtn: {
    marginTop: 16,
    backgroundColor: "#f0fdf4",
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderWidth: 1,
    borderColor: "#bbf7d0",
  },
  mapBtnText: { fontSize: 13, color: "#16a34a", fontWeight: "600" },
  section: { marginBottom: 22 },
  sectionTitle: { fontSize: 16, fontWeight: "700", color: "#111827", marginBottom: 12 },
  aboutCard: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: "#f3f4f6",
  },
  aboutText: { fontSize: 14, color: "#374151", lineHeight: 21 },
  certsRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  certChip: {
    backgroundColor: "#f0fdf4",
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: "#bbf7d0",
  },
  certText: { fontSize: 13, color: "#16a34a", fontWeight: "600" },
  emptyCard: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 24,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#f3f4f6",
  },
  emptyText: { fontSize: 13, color: "#9ca3af" },
  productCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 14,
    marginBottom: 10,
    gap: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  productIconBox: {
    width: 48, height: 48, borderRadius: 14,
    backgroundColor: "#f0fdf4",
    alignItems: "center", justifyContent: "center",
  },
  productIcon: { fontSize: 24 },
  productName: { fontSize: 15, fontWeight: "600", color: "#111827" },
  productDesc: { fontSize: 12, color: "#6b7280", marginTop: 2 },
  productPrice: { fontSize: 13, color: "#16a34a", fontWeight: "700", marginTop: 4 },
  availBadge: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 10 },
  availText: { fontSize: 11, fontWeight: "600" },
  pubCard: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: "#f3f4f6",
  },
  pubContent: { fontSize: 14, color: "#374151", lineHeight: 20 },
  pubInfoRow: { flexDirection: "row", flexWrap: "wrap", gap: 6, marginTop: 8 },
  pubChip: {
    backgroundColor: "#f3f4f6",
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  pubChipText: { fontSize: 12, color: "#374151", fontWeight: "500" },
});