import { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Linking,
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
  const [compte, setCompte] = useState(null);
  const [pointDeVente, setPointDeVente] = useState(null);
  const [produits, setProduits] = useState([]);
  const [publications, setPublications] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      if (!id) return;
      try {
        // 1. Infos exploitation (collection agriculteurs publique)
        const agriSnap = await getDoc(doc(db, "agriculteurs", id));
        const agriData = agriSnap.exists() ? agriSnap.data() : {};

        // 2. Compte du producteur : requête filtrée sur les agriculteurs
        //    (les règles autorisent la liste des comptes de rôle "agriculteur")
        let compteData = null;
        try {
          const usersSnap = await getDocs(
            query(collection(db, "users"), where("role", "==", "agriculteur"))
          );
          const match = usersSnap.docs.find((d) => d.id === id);
          if (match) compteData = match.data();
        } catch (e) {
          console.log("Statut du producteur non disponible");
        }
        setCompte(compteData);

        // 3. Point de vente lié
        const pdvSnap = await getDocs(
          query(collection(db, "pointsDeVente"), where("agriculteurId", "==", id))
        );
        let pdvData = null;
        if (!pdvSnap.empty) {
          pdvData = { id: pdvSnap.docs[0].id, ...pdvSnap.docs[0].data() };
          setPointDeVente(pdvData);
        }

        setAgriculteur({
          nom:
            compteData?.nom ||
            pdvData?.agriculteurNom ||
            agriData.nomFerme ||
            "Agriculteur",
          ...agriData,
        });

        // 4. Catalogue produits (public)
        const prodSnap = await getDocs(
          collection(db, "agriculteurs", id, "produits")
        );
        setProduits(prodSnap.docs.map((d) => ({ id: d.id, ...d.data() })));

        // 5. Annonces : en cours et historique des ventes passées
        const pubSnap = await getDocs(
          query(
            collection(db, "publications"),
            where("agriculteurId", "==", id),
            where("statut", "in", ["approuve", "perime"])
          )
        );
        const pubs = pubSnap.docs.map((d) => ({ id: d.id, ...d.data() }));
        pubs.sort((a, b) => {
          const aPast = a.statut === "perime" ? 1 : 0;
          const bPast = b.statut === "perime" ? 1 : 0;
          if (aPast !== bPast) return aPast - bPast;
          const dateA = a.createdAt?.toDate?.() ?? new Date(0);
          const dateB = b.createdAt?.toDate?.() ?? new Date(0);
          return dateB - dateA;
        });
        setPublications(pubs.slice(0, 8));
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
  const isSuspended = compte?.farmerStatus === "suspended";

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
        <View style={[styles.identityCard, isSuspended && styles.identityCardMuted]}>
          <View style={[styles.avatar, isSuspended && styles.avatarMuted]}>
            <Text style={styles.avatarText}>
              {nomComplet.charAt(0).toUpperCase()}
            </Text>
          </View>
          <Text style={styles.farmerName}>{nomComplet}</Text>
          <Text style={[styles.farmName, isSuspended && styles.textMuted]}>
            🏡 {nomFerme}
          </Text>

          {isSuspended ? (
            <View style={styles.pausedBadge}>
              <Text style={styles.pausedBadgeText}>
                ⏸️ {t.farmerProfile.unavailableBadge}
              </Text>
            </View>
          ) : (
            pointDeVente && config && (
              <View style={[styles.typeBadge, { backgroundColor: config.bg }]}>
                <Text style={styles.typeBadgeEmoji}>{config.emoji}</Text>
                <Text style={[styles.typeBadgeText, { color: config.color }]}>
                  {config.label}
                </Text>
              </View>
            )
          )}

          {(pointDeVente?.adresse || agriculteur.adresse) && (
            <Text style={styles.address}>
              📍 {pointDeVente?.adresse || agriculteur.adresse}
            </Text>
          )}

          {pointDeVente && !isSuspended && (
            <TouchableOpacity
              style={styles.mapBtn}
              onPress={() => router.push(`/(consumer)/map?pointId=${pointDeVente.id}`)}
            >
              <Text style={styles.mapBtnText}>🗺️ {t.farmerProfile.viewOnMap}</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Bandeau indisponibilité */}
        {isSuspended && (
          <View style={styles.pausedCard}>
            <Text style={styles.pausedIcon}>🌾</Text>
            <View style={{ flex: 1 }}>
              <Text style={styles.pausedTitle}>{t.farmerProfile.unavailableTitle}</Text>
              <Text style={styles.pausedText}>{t.farmerProfile.unavailableMessage}</Text>
            </View>
          </View>
        )}

        {/* Contact */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t.farmerProfile.contact}</Text>
          {isSuspended || !compte?.telephone ? (
            <View style={styles.emptyCard}>
              <Text style={styles.emptyText}>
                {isSuspended
                  ? t.farmerProfile.contactHidden
                  : t.farmerProfile.noContact}
              </Text>
            </View>
          ) : (
            <TouchableOpacity
              style={styles.contactCard}
              onPress={() => Linking.openURL(`tel:${compte.telephone}`)}
            >
              <View style={styles.contactIconBox}>
                <Text style={styles.contactIcon}>📞</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.contactLabel}>{t.farmerProfile.callFarmer}</Text>
                <Text style={styles.contactValue}>{compte.telephone}</Text>
              </View>
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
                    {
                      backgroundColor:
                        !isSuspended && prod.disponible !== false ? "#f0fdf4" : "#fef2f2",
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.availText,
                      {
                        color:
                          !isSuspended && prod.disponible !== false ? "#16a34a" : "#dc2626",
                      },
                    ]}
                  >
                    {!isSuspended && prod.disponible !== false
                      ? t.farmerProfile.available
                      : t.farmerProfile.unavailable}
                  </Text>
                </View>
              </View>
            ))
          )}
        </View>

        {/* Annonces et historique */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t.farmerProfile.publications}</Text>
          {publications.length === 0 ? (
            <View style={styles.emptyCard}>
              <Text style={styles.emptyText}>{t.farmerProfile.noPublications}</Text>
            </View>
          ) : (
            publications.map((pub, index) => {
              const isPast = pub.statut === "perime";
              const prev = publications[index - 1];
              const showDivider = isPast && (!prev || prev.statut !== "perime");

              return (
                <View key={pub.id}>
                  {showDivider && (
                    <View style={styles.divider}>
                      <View style={styles.dividerLine} />
                      <Text style={styles.dividerText}>
                        {t.farmerProfile.pastSection}
                      </Text>
                      <View style={styles.dividerLine} />
                    </View>
                  )}

                  <View style={[styles.pubCard, isPast && styles.pubCardPast]}>
                    {isPast && (
                      <Text style={styles.pubPastBadge}>
                        🗄️ {t.farmerProfile.pastSale}
                      </Text>
                    )}
                    <Text style={[styles.pubContent, isPast && styles.textMuted]}>
                      {pub.contenu}
                    </Text>
                    <View style={styles.pubInfoRow}>
                      {pub.produit && (
                        <View style={styles.pubChip}>
                          <Text style={styles.pubChipText}>🌿 {pub.produit}</Text>
                        </View>
                      )}
                      {pub.prix && (
                        <View style={styles.pubChip}>
                          <Text style={styles.pubChipText}>
                            💰 {pub.prix.toLocaleString()} Ar
                          </Text>
                        </View>
                      )}
                    </View>
                  </View>
                </View>
              );
            })
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
  identityCardMuted: { backgroundColor: "#fafafa" },
  avatar: {
    width: 72, height: 72, borderRadius: 36,
    backgroundColor: "#16a34a",
    alignItems: "center", justifyContent: "center",
    marginBottom: 12,
  },
  avatarMuted: { backgroundColor: "#9ca3af" },
  avatarText: { fontSize: 30, fontWeight: "800", color: "#fff" },
  farmerName: { fontSize: 20, fontWeight: "800", color: "#111827" },
  farmName: { fontSize: 14, color: "#16a34a", marginTop: 4, fontWeight: "600" },
  textMuted: { color: "#9ca3af" },
  typeBadge: {
    flexDirection: "row", alignItems: "center", gap: 4,
    paddingHorizontal: 12, paddingVertical: 6, borderRadius: 14, marginTop: 12,
  },
  typeBadgeEmoji: { fontSize: 14 },
  typeBadgeText: { fontSize: 12, fontWeight: "700" },
  pausedBadge: {
    backgroundColor: "#f3f4f6",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 14,
    marginTop: 12,
  },
  pausedBadgeText: { fontSize: 12, fontWeight: "700", color: "#6b7280" },
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

  // Bandeau indisponibilité
  pausedCard: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
    backgroundColor: "#fffbeb",
    borderWidth: 1,
    borderColor: "#fde68a",
    borderRadius: 16,
    padding: 16,
    marginBottom: 20,
  },
  pausedIcon: { fontSize: 22 },
  pausedTitle: { fontSize: 14, fontWeight: "700", color: "#92400e" },
  pausedText: { fontSize: 13, color: "#b45309", marginTop: 3, lineHeight: 19 },

  section: { marginBottom: 22 },
  sectionTitle: { fontSize: 16, fontWeight: "700", color: "#111827", marginBottom: 12 },

  // Contact
  contactCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: "#bbf7d0",
  },
  contactIconBox: {
    width: 44, height: 44, borderRadius: 14,
    backgroundColor: "#f0fdf4",
    alignItems: "center", justifyContent: "center",
  },
  contactIcon: { fontSize: 20 },
  contactLabel: { fontSize: 12, color: "#6b7280" },
  contactValue: { fontSize: 15, fontWeight: "700", color: "#16a34a", marginTop: 2 },

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
  emptyText: { fontSize: 13, color: "#9ca3af", textAlign: "center", lineHeight: 19 },
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

  // Séparateur historique
  divider: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginTop: 6,
    marginBottom: 12,
  },
  dividerLine: { flex: 1, height: 1, backgroundColor: "#e5e7eb" },
  dividerText: { fontSize: 12, fontWeight: "600", color: "#9ca3af" },

  pubCard: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: "#f3f4f6",
  },
  pubCardPast: { backgroundColor: "#f9fafb", borderColor: "#e5e7eb" },
  pubPastBadge: { fontSize: 11, fontWeight: "700", color: "#6b7280", marginBottom: 6 },
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