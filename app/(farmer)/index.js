import { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from "react-native";
import { collection, getDocs, doc, getDoc } from "firebase/firestore";
import { db } from "../../src/lib/firebase";
import { useAuth } from "../../src/context/AuthContext";
import { useLanguage } from "../../src/context/LanguageContext";
import { useRouter } from "expo-router";

export default function FarmerDashboard() {
  const { user, userData, logout } = useAuth();
  const { t } = useLanguage();
  const router = useRouter();

  const [stats, setStats] = useState({
    totalProducts: 0,
    availableProducts: 0,
  });
  const [farmProfile, setFarmProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      if (!user) return;
      try {
        // Produits
        const productsSnap = await getDocs(
          collection(db, "agriculteurs", user.uid, "produits")
        );
        const products = productsSnap.docs.map((d) => d.data());
        setStats({
          totalProducts: products.length,
          availableProducts: products.filter((p) => p.disponible).length,
        });

        // Profil ferme
        const farmSnap = await getDoc(doc(db, "agriculteurs", user.uid));
        if (farmSnap.exists()) setFarmProfile(farmSnap.data());

      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [user]);

  const handleLogout = () => {
    Alert.alert(
      t.farmer.common.logout,
      t.farmer.common.logoutConfirm,
      [
        { text: t.common.no, style: "cancel" },
        { text: t.common.yes, onPress: logout, style: "destructive" },
      ]
    );
  };

  const getStatusStyle = (status) => {
    switch (status) {
      case "approved": return { bg: "#f0fdf4", color: "#16a34a", text: t.farmer.dashboard.status.approved };
      case "suspended": return { bg: "#fef2f2", color: "#dc2626", text: t.farmer.dashboard.status.suspended };
      default: return { bg: "#fffbeb", color: "#d97706", text: t.farmer.dashboard.status.pending };
    }
  };

  const statusStyle = getStatusStyle(userData?.farmerStatus);

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#16a34a" />
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.scroll}>

      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.hello}>
            {t.farmer.dashboard.hello}, {userData?.nom?.split(" ")[0]} 👋
          </Text>
          <Text style={styles.subtitle}>{t.farmer.dashboard.subtitle}</Text>
        </View>
        <TouchableOpacity onPress={handleLogout} style={styles.logoutBtn}>
          <Text style={styles.logoutBtnText}>🚪</Text>
        </TouchableOpacity>
      </View>

      {/* Statut compte */}
      <View style={[styles.statusBanner, { backgroundColor: statusStyle.bg }]}>
        <View style={[styles.statusDot, { backgroundColor: statusStyle.color }]} />
        <View style={{ flex: 1 }}>
          <Text style={[styles.statusText, { color: statusStyle.color }]}>
            {statusStyle.text}
          </Text>
          {userData?.farmerStatus === "pending" && (
            <Text style={styles.statusSub}>{t.farmer.dashboard.pendingMessage}</Text>
          )}
          {userData?.farmerStatus === "suspended" && (
            <Text style={styles.statusSub}>{t.farmer.dashboard.suspendedMessage}</Text>
          )}
        </View>
      </View>

      {/* Stats */}
      <View style={styles.statsRow}>
        <View style={styles.statCard}>
          <Text style={styles.statValue}>{stats.totalProducts}</Text>
          <Text style={styles.statLabel}>{t.farmer.dashboard.stats.products}</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={[styles.statValue, { color: "#16a34a" }]}>
            {stats.availableProducts}
          </Text>
          <Text style={styles.statLabel}>{t.farmer.dashboard.stats.available}</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={[styles.statValue, { color: statusStyle.color, fontSize: 18 }]}>
            {statusStyle.text}
          </Text>
          <Text style={styles.statLabel}>{t.farmer.dashboard.stats.status}</Text>
        </View>
      </View>

      {/* Profil ferme incomplet */}
      {!farmProfile?.nomFerme && (
        <TouchableOpacity
          style={styles.profileBanner}
          onPress={() => router.push("/(farmer)/profile")}
        >
          <Text style={styles.profileBannerEmoji}>🏡</Text>
          <View style={{ flex: 1 }}>
            <Text style={styles.profileBannerTitle}>Compléter le profil de ma ferme</Text>
            <Text style={styles.profileBannerSub}>
              Renseignez les informations de votre ferme pour apparaître sur la carte
            </Text>
          </View>
          <Text style={styles.profileBannerArrow}>›</Text>
        </TouchableOpacity>
      )}

      {/* Ferme info */}
      {farmProfile?.nomFerme && (
        <View style={styles.farmCard}>
          <View style={styles.farmCardHeader}>
            <Text style={styles.farmCardEmoji}>🏡</Text>
            <View style={{ flex: 1 }}>
              <Text style={styles.farmCardName}>{farmProfile.nomFerme}</Text>
              {farmProfile.adresse ? (
                <Text style={styles.farmCardAddress}>📍 {farmProfile.adresse}</Text>
              ) : null}
            </View>
          </View>
          {farmProfile.certifications?.length > 0 && (
            <View style={styles.certRow}>
              {farmProfile.certifications.map((cert) => (
                <View key={cert} style={styles.certBadge}>
                  <Text style={styles.certText}>✓ {cert}</Text>
                </View>
              ))}
            </View>
          )}
        </View>
      )}

      {/* Actions rapides */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>{t.farmer.dashboard.quickActions}</Text>
        <View style={styles.actionsRow}>
          <TouchableOpacity
            style={[styles.actionCard, { borderColor: "#16a34a" }]}
            onPress={() => router.push("/(farmer)/products")}
          >
            <Text style={styles.actionEmoji}>🌿</Text>
            <Text style={styles.actionText}>{t.farmer.dashboard.myProducts}</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.actionCard}
            onPress={() => router.push("/(farmer)/profile")}
          >
            <Text style={styles.actionEmoji}>🏡</Text>
            <Text style={styles.actionText}>{t.farmer.dashboard.myFarm}</Text>
          </TouchableOpacity>
        </View>
      </View>

    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f9fafb" },
  scroll: { padding: 20, paddingBottom: 40 },
  loadingContainer: { flex: 1, justifyContent: "center", alignItems: "center" },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 20,
    paddingTop: 20,
  },
  hello: { fontSize: 22, fontWeight: "700", color: "#111827" },
  subtitle: { fontSize: 14, color: "#6b7280", marginTop: 4 },
  logoutBtn: {
    width: 40, height: 40,
    borderRadius: 12, backgroundColor: "#fff",
    alignItems: "center", justifyContent: "center",
    borderWidth: 1, borderColor: "#e5e7eb",
  },
  logoutBtnText: { fontSize: 18 },
  statusBanner: {
    flexDirection: "row",
    alignItems: "flex-start",
    borderRadius: 14,
    padding: 14,
    marginBottom: 16,
    gap: 10,
  },
  statusDot: {
    width: 10, height: 10, borderRadius: 5, marginTop: 4, flexShrink: 0,
  },
  statusText: { fontSize: 14, fontWeight: "600" },
  statusSub: { fontSize: 12, color: "#6b7280", marginTop: 2, lineHeight: 18 },
  statsRow: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 16,
  },
  statCard: {
    flex: 1,
    backgroundColor: "#fff",
    borderRadius: 14,
    padding: 14,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  statValue: {
    fontSize: 22,
    fontWeight: "700",
    color: "#111827",
    marginBottom: 4,
  },
  statLabel: { fontSize: 11, color: "#6b7280", textAlign: "center" },
  profileBanner: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fffbeb",
    borderRadius: 14,
    padding: 14,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#fde68a",
    gap: 12,
  },
  profileBannerEmoji: { fontSize: 28 },
  profileBannerTitle: { fontSize: 14, fontWeight: "600", color: "#92400e" },
  profileBannerSub: { fontSize: 12, color: "#b45309", marginTop: 2 },
  profileBannerArrow: { fontSize: 22, color: "#b45309" },
  farmCard: {
    backgroundColor: "#fff",
    borderRadius: 14,
    padding: 14,
    marginBottom: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  farmCardHeader: { flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 8 },
  farmCardEmoji: { fontSize: 28 },
  farmCardName: { fontSize: 15, fontWeight: "700", color: "#111827" },
  farmCardAddress: { fontSize: 12, color: "#6b7280", marginTop: 2 },
  certRow: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
  certBadge: {
    backgroundColor: "#f0fdf4",
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: "#bbf7d0",
  },
  certText: { fontSize: 11, color: "#16a34a", fontWeight: "500" },
  section: { marginBottom: 16 },
  sectionTitle: { fontSize: 16, fontWeight: "600", color: "#111827", marginBottom: 10 },
  actionsRow: { flexDirection: "row", gap: 12 },
  actionCard: {
    flex: 1,
    backgroundColor: "#fff",
    borderRadius: 14,
    padding: 16,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
    borderWidth: 1,
    borderColor: "#e5e7eb",
  },
  actionEmoji: { fontSize: 28, marginBottom: 8 },
  actionText: { fontSize: 13, fontWeight: "500", color: "#374151", textAlign: "center" },
});