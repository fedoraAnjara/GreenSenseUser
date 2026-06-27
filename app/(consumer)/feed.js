import { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
} from "react-native";
import {
  collection,
  getDocs,
  query,
  where,
  updateDoc,
  doc,
  arrayUnion,
  arrayRemove,
} from "firebase/firestore";
import { db } from "../../src/lib/firebase";
import { useAuth } from "../../src/context/AuthContext";
import { useLanguage } from "../../src/context/LanguageContext";
import { useRouter } from "expo-router";

const TYPE_CONFIG = {
  vente: { emoji: "🛒", color: "#16a34a", bg: "#f0fdf4" },
  atelier: { emoji: "📚", color: "#2563eb", bg: "#eff6ff" },
  promotion: { emoji: "🏷️", color: "#d97706", bg: "#fffbeb" },
  stock: { emoji: "📦", color: "#dc2626", bg: "#fef2f2" },
  autre: { emoji: "📢", color: "#7c3aed", bg: "#f5f3ff" },
};

export default function FeedScreen() {
  const { user } = useAuth();
  const { t } = useLanguage();
  const router = useRouter();

  const [publications, setPublications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeFilter, setActiveFilter] = useState("all");

  const fetchPublications = async () => {
    try {
      const snap = await getDocs(
        query(
          collection(db, "publications"),
          where("statut", "==", "approuve")
        )
      );
      const data = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      // Trier par date décroissante côté client
      data.sort((a, b) => {
        const dateA = a.createdAt?.toDate?.() ?? new Date(0);
        const dateB = b.createdAt?.toDate?.() ?? new Date(0);
        return dateB - dateA;
      });
      setPublications(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchPublications();
  }, []);

  const handleLike = async (pub) => {
    if (!user) return;
    const isLiked = pub.likes?.includes(user.uid);
    try {
      await updateDoc(doc(db, "publications", pub.id), {
        likes: isLiked ? arrayRemove(user.uid) : arrayUnion(user.uid),
      });
      setPublications((prev) =>
        prev.map((p) =>
          p.id === pub.id
            ? {
                ...p,
                likes: isLiked
                  ? p.likes.filter((id) => id !== user.uid)
                  : [...(p.likes || []), user.uid],
              }
            : p
        )
      );
    } catch (e) {
      console.error(e);
    }
  };

  const formatDate = (timestamp) => {
    if (!timestamp) return "";
    const date = timestamp.toDate?.() ?? new Date(timestamp);
    const now = new Date();
    const diff = Math.floor((now - date) / 1000 / 60);
    if (diff < 1) return "À l'instant";
    if (diff < 60) return `Il y a ${diff} min`;
    if (diff < 1440) return `Il y a ${Math.floor(diff / 60)}h`;
    return date.toLocaleDateString("fr-FR");
  };

  const filtered = publications.filter((p) =>
    activeFilter === "all" ? true : p.type === activeFilter
  );

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
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Text style={styles.backText}>‹</Text>
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>{t.feed.title}</Text>
          <Text style={styles.headerSub}>{t.feed.subtitle}</Text>
        </View>
        <View style={{ width: 36 }} />
      </View>

      {/* Filtres */}
      <View style={styles.filtersWrap}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filtersContent}
        >
          {["all", "vente", "atelier", "promotion", "stock"].map((f) => (
            <TouchableOpacity
              key={f}
              style={[styles.filterChip, activeFilter === f && styles.filterChipActive]}
              onPress={() => setActiveFilter(f)}
            >
              <Text style={[styles.filterChipText, activeFilter === f && styles.filterChipTextActive]}>
                {t.feed.filters[f]}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* Feed */}
      <ScrollView
        contentContainerStyle={styles.scroll}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => { setRefreshing(true); fetchPublications(); }}
            tintColor="#16a34a"
          />
        }
      >
        {filtered.length === 0 ? (
          <View style={styles.empty}>
            <Text style={styles.emptyEmoji}>📢</Text>
            <Text style={styles.emptyText}>{t.feed.empty}</Text>
          </View>
        ) : (
          filtered.map((pub) => {
            const config = TYPE_CONFIG[pub.type] || TYPE_CONFIG.autre;
            const isLiked = pub.likes?.includes(user?.uid);
            return (
              <View key={pub.id} style={styles.card}>

                {/* Header post */}
                <View style={styles.cardHeader}>
                  <View style={[styles.farmerAvatar, { backgroundColor: config.bg }]}>
                    <Text style={styles.farmerAvatarText}>
                      {pub.agriculteurNom?.charAt(0).toUpperCase() || "A"}
                    </Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.farmerName}>{pub.agriculteurNom}</Text>
                    {pub.nomFerme ? (
                      <Text style={styles.farmName}>🏡 {pub.nomFerme}</Text>
                    ) : null}
                    <Text style={styles.postDate}>{formatDate(pub.createdAt)}</Text>
                  </View>
                  <View style={[styles.typeBadge, { backgroundColor: config.bg }]}>
                    <Text style={styles.typeBadgeEmoji}>{config.emoji}</Text>
                    <Text style={[styles.typeBadgeText, { color: config.color }]}>
                      {t.feed.types[pub.type]}
                    </Text>
                  </View>
                </View>

                {/* Contenu */}
                <Text style={styles.cardContent}>{pub.contenu}</Text>

                {/* Infos extraites */}
                <View style={styles.infoRow}>
                  {pub.produit && (
                    <View style={styles.infoChip}>
                      <Text style={styles.infoChipText}>🌿 {pub.produit}</Text>
                    </View>
                  )}
                  {pub.prix && (
                    <View style={styles.infoChip}>
                      <Text style={styles.infoChipText}>💰 {pub.prix.toLocaleString()} Ar</Text>
                    </View>
                  )}
                  {pub.quantite && (
                    <View style={styles.infoChip}>
                      <Text style={styles.infoChipText}>📦 {pub.quantite}</Text>
                    </View>
                  )}
                  {pub.localisation && (
                    <View style={styles.infoChip}>
                      <Text style={styles.infoChipText}>📍 {pub.localisation}</Text>
                    </View>
                  )}
                </View>

                {/* Source SMS */}
                {pub.source === "sms" && (
                  <View style={styles.smsSource}>
                    <Text style={styles.smsSourceText}>📱 {t.feed.receivedBySms}</Text>
                  </View>
                )}

                {/* Actions */}
                <View style={styles.cardActions}>
                  <TouchableOpacity
                    style={styles.likeBtn}
                    onPress={() => handleLike(pub)}
                  >
                    <Text style={styles.likeBtnText}>
                      {isLiked ? "❤️" : "🤍"} {pub.likes?.length || 0}
                    </Text>
                  </TouchableOpacity>
                </View>

              </View>
            );
          })
        )}
        <View style={{ height: 40 }} />
      </ScrollView>

    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f9fafb" },
  loadingContainer: { flex: 1, justifyContent: "center", alignItems: "center" },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
    paddingTop: 52,
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#f3f4f6",
  },
  backBtn: {
    width: 36, height: 36, borderRadius: 10,
    backgroundColor: "#f3f4f6",
    alignItems: "center", justifyContent: "center",
  },
  backText: { fontSize: 24, color: "#374151", lineHeight: 28 },
  headerCenter: { flex: 1, paddingHorizontal: 12 },
  headerTitle: { fontSize: 16, fontWeight: "700", color: "#111827" },
  headerSub: { fontSize: 12, color: "#6b7280" },
  filtersWrap: {
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#f3f4f6",
  },
  filtersContent: { paddingHorizontal: 16, paddingVertical: 10, gap: 8 },
  filterChip: {
    paddingHorizontal: 14, paddingVertical: 7,
    borderRadius: 20, borderWidth: 1, borderColor: "#e5e7eb",
    backgroundColor: "#f9fafb",
  },
  filterChipActive: { backgroundColor: "#16a34a", borderColor: "#16a34a" },
  filterChipText: { fontSize: 13, color: "#6b7280", fontWeight: "500" },
  filterChipTextActive: { color: "#fff" },
  scroll: { padding: 16 },
  empty: { alignItems: "center", paddingVertical: 60 },
  emptyEmoji: { fontSize: 48, marginBottom: 12 },
  emptyText: { fontSize: 14, color: "#6b7280" },
  card: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  cardHeader: { flexDirection: "row", alignItems: "flex-start", gap: 10, marginBottom: 10 },
  farmerAvatar: {
    width: 40, height: 40, borderRadius: 20,
    alignItems: "center", justifyContent: "center",
  },
  farmerAvatarText: { fontSize: 16, fontWeight: "700", color: "#374151" },
  farmerName: { fontSize: 14, fontWeight: "600", color: "#111827" },
  farmName: { fontSize: 12, color: "#16a34a", marginTop: 1 },
  postDate: { fontSize: 11, color: "#9ca3af", marginTop: 1 },
  typeBadge: {
    flexDirection: "row", alignItems: "center", gap: 4,
    paddingHorizontal: 8, paddingVertical: 4, borderRadius: 10,
  },
  typeBadgeEmoji: { fontSize: 12 },
  typeBadgeText: { fontSize: 11, fontWeight: "600" },
  cardContent: { fontSize: 14, color: "#374151", lineHeight: 20, marginBottom: 10 },
  infoRow: { flexDirection: "row", flexWrap: "wrap", gap: 6, marginBottom: 8 },
  infoChip: {
    backgroundColor: "#f3f4f6",
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  infoChipText: { fontSize: 12, color: "#374151", fontWeight: "500" },
  smsSource: { marginBottom: 10 },
  smsSourceText: { fontSize: 11, color: "#9ca3af" },
  cardActions: {
    flexDirection: "row",
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: "#f3f4f6",
  },
  likeBtn: { flexDirection: "row", alignItems: "center", gap: 4 },
  likeBtnText: { fontSize: 14, color: "#6b7280" },
});