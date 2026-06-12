import { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
} from "react-native";
import { collection, getDocs, doc, getDoc, query, orderBy, limit } from "firebase/firestore";
import { db } from "../../src/lib/firebase";
import { useAuth } from "../../src/context/AuthContext";
import { useLanguage } from "../../src/context/LanguageContext";
import { useRouter } from "expo-router";

export default function HomeScreen() {
  const { user, userData, logout } = useAuth();
  const { t } = useLanguage();
  const router = useRouter();

  const [healthProfile, setHealthProfile] = useState(null);
  const [lastRecommendation, setLastRecommendation] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      if (!user) return;
      try {
        // Récupérer profil santé
        const healthSnap = await getDoc(
          doc(db, "users", user.uid, "profilSante", "data")
        );
        if (healthSnap.exists()) setHealthProfile(healthSnap.data());

        // Récupérer dernière recommandation
        const recommSnap = await getDocs(
          query(
            collection(db, "recommandations"),
            orderBy("generatedAt", "desc"),
            limit(1)
          )
        );
        if (!recommSnap.empty) {
          setLastRecommendation(recommSnap.docs[0].data());
        }
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [user]);

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
            {t.consumer.hello}, {userData?.nom?.split(" ")[0]} 👋
          </Text>
          <Text style={styles.subtitle}>{t.consumer.subtitle}</Text>
        </View>
        <TouchableOpacity
          style={styles.avatarBtn}
          onPress={() => router.push("/(consumer)/profile")}
        >
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>
              {userData?.nom?.charAt(0).toUpperCase() || "U"}
            </Text>
          </View>
        </TouchableOpacity>
      </View>

      {/* Bannière profil incomplet */}
      {!healthProfile && (
        <TouchableOpacity
          style={styles.profileBanner}
          onPress={() => router.push("/(consumer)/health-profile")}
        >
          <Text style={styles.profileBannerEmoji}>🏥</Text>
          <View style={styles.profileBannerText}>
            <Text style={styles.profileBannerTitle}>{t.consumer.completeProfile}</Text>
            <Text style={styles.profileBannerSub}>{t.consumer.completeProfileSub}</Text>
          </View>
          <Text style={styles.profileBannerArrow}>›</Text>
        </TouchableOpacity>
      )}

      {/* Actions rapides */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>{t.consumer.quickActions}</Text>
        <View style={styles.actionsRow}>

          <TouchableOpacity
            style={styles.actionCard}
            onPress={() => router.push("/(consumer)/chat")}
          >
            <Text style={styles.actionEmoji}>🤖</Text>
            <Text style={styles.actionText}>{t.consumer.chat}</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionCard}
            onPress={() => router.push("/(consumer)/map")}
          >
            <Text style={styles.actionEmoji}>🗺️</Text>
            <Text style={styles.actionText}>{t.consumer.map}</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionCard}
            onPress={() => router.push("/(consumer)/profile")}
          >
            <Text style={styles.actionEmoji}>👤</Text>
            <Text style={styles.actionText}>{t.consumer.profile}</Text>
          </TouchableOpacity>

        </View>
      </View>

      {/* Profil santé résumé */}
      {healthProfile && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Mon profil santé</Text>
          <View style={styles.healthCard}>
            <View style={styles.healthRow}>
              <View style={styles.healthItem}>
                <Text style={styles.healthValue}>{healthProfile.poids} kg</Text>
                <Text style={styles.healthLabel}>Poids</Text>
              </View>
              <View style={styles.healthDivider} />
              <View style={styles.healthItem}>
                <Text style={styles.healthValue}>{healthProfile.taille} cm</Text>
                <Text style={styles.healthLabel}>Taille</Text>
              </View>
              <View style={styles.healthDivider} />
              <View style={styles.healthItem}>
                <Text style={styles.healthValue}>{healthProfile.imc}</Text>
                <Text style={styles.healthLabel}>IMC</Text>
              </View>
            </View>

            {healthProfile.pathologies?.length > 0 && (
              <View style={styles.tagsRow}>
                {healthProfile.pathologies.map((p) => (
                  <View key={p} style={styles.tag}>
                    <Text style={styles.tagText}>{p}</Text>
                  </View>
                ))}
              </View>
            )}

            {healthProfile.objectifs?.length > 0 && (
              <View style={styles.tagsRow}>
                {healthProfile.objectifs.map((o) => (
                  <View key={o} style={[styles.tag, styles.tagBlue]}>
                    <Text style={[styles.tagText, styles.tagTextBlue]}>{o}</Text>
                  </View>
                ))}
              </View>
            )}
          </View>
        </View>
      )}

      {/* Dernière recommandation */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>{t.consumer.lastRecommendation}</Text>
        </View>

        {!lastRecommendation ? (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyEmoji}>🥗</Text>
            <Text style={styles.emptyText}>{t.consumer.noRecommendations}</Text>
            <TouchableOpacity
              style={styles.emptyBtn}
              onPress={() => router.push("/(consumer)/chat")}
            >
              <Text style={styles.emptyBtnText}>{t.consumer.startChat}</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.recommCard}>
            <Text style={styles.recommText}>{lastRecommendation.menu}</Text>
          </View>
        )}
      </View>

      {/* Bouton déconnexion temporaire */}
      <TouchableOpacity style={styles.logoutBtn} onPress={logout}>
        <Text style={styles.logoutText}>Déconnexion (test)</Text>
      </TouchableOpacity>

    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f9fafb",
  },
  scroll: {
    padding: 20,
    paddingBottom: 40,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 20,
    paddingTop: 20,
  },
  hello: {
    fontSize: 22,
    fontWeight: "700",
    color: "#111827",
  },
  subtitle: {
    fontSize: 14,
    color: "#6b7280",
    marginTop: 4,
  },
  avatarBtn: {
    marginTop: 4,
  },
  avatar: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: "#16a34a",
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "700",
  },
  profileBanner: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fffbeb",
    borderRadius: 14,
    padding: 14,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: "#fde68a",
    gap: 12,
  },
  profileBannerEmoji: {
    fontSize: 28,
  },
  profileBannerText: {
    flex: 1,
  },
  profileBannerTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: "#92400e",
  },
  profileBannerSub: {
    fontSize: 12,
    color: "#b45309",
    marginTop: 2,
  },
  profileBannerArrow: {
    fontSize: 22,
    color: "#b45309",
    fontWeight: "300",
  },
  section: {
    marginBottom: 20,
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#111827",
    marginBottom: 10,
  },
  actionsRow: {
    flexDirection: "row",
    gap: 12,
  },
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
  },
  actionEmoji: {
    fontSize: 28,
    marginBottom: 8,
  },
  actionText: {
    fontSize: 12,
    fontWeight: "500",
    color: "#374151",
    textAlign: "center",
  },
  healthCard: {
    backgroundColor: "#fff",
    borderRadius: 14,
    padding: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  healthRow: {
    flexDirection: "row",
    justifyContent: "space-around",
    marginBottom: 12,
  },
  healthItem: {
    alignItems: "center",
  },
  healthValue: {
    fontSize: 18,
    fontWeight: "700",
    color: "#16a34a",
  },
  healthLabel: {
    fontSize: 12,
    color: "#6b7280",
    marginTop: 2,
  },
  healthDivider: {
    width: 1,
    backgroundColor: "#e5e7eb",
  },
  tagsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
    marginTop: 8,
  },
  tag: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
    backgroundColor: "#f0fdf4",
    borderWidth: 1,
    borderColor: "#bbf7d0",
  },
  tagText: {
    fontSize: 11,
    color: "#16a34a",
    fontWeight: "500",
  },
  tagBlue: {
    backgroundColor: "#eff6ff",
    borderColor: "#bfdbfe",
  },
  tagTextBlue: {
    color: "#2563eb",
  },
  emptyCard: {
    backgroundColor: "#fff",
    borderRadius: 14,
    padding: 24,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  emptyEmoji: {
    fontSize: 40,
    marginBottom: 12,
  },
  emptyText: {
    fontSize: 14,
    color: "#6b7280",
    textAlign: "center",
    marginBottom: 16,
  },
  emptyBtn: {
    backgroundColor: "#16a34a",
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 20,
  },
  emptyBtnText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "600",
  },
  recommCard: {
    backgroundColor: "#fff",
    borderRadius: 14,
    padding: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  recommText: {
    fontSize: 14,
    color: "#374151",
    lineHeight: 22,
  },
  logoutBtn: {
    alignItems: "center",
    paddingVertical: 12,
    marginTop: 8,
  },
  logoutText: {
    fontSize: 13,
    color: "#ef4444",
  },
});