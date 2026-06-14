import { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from "react-native";
import { doc, getDoc } from "firebase/firestore";
import { db } from "../../src/lib/firebase";
import { useAuth } from "../../src/context/AuthContext";
import { useLanguage } from "../../src/context/LanguageContext";
import { useRouter } from "expo-router";

export default function ProfileScreen() {
  const { user, userData, logout } = useAuth();
  const { t } = useLanguage();
  const router = useRouter();

  const [healthProfile, setHealthProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchHealthProfile = async () => {
      if (!user) return;
      try {
        const snap = await getDoc(
          doc(db, "users", user.uid, "profilSante", "data")
        );
        if (snap.exists()) setHealthProfile(snap.data());
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    fetchHealthProfile();
  }, [user]);

  const handleLogout = () => {
    Alert.alert(
      t.profile.logout,
      t.profile.logoutConfirm,
      [
        { text: t.common.no, style: "cancel" },
        { text: t.common.yes, onPress: logout, style: "destructive" },
      ]
    );
  };

  const formatList = (arr) => {
    if (!arr || arr.length === 0) return t.profile.none;
    return arr.join(", ");
  };

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
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.backBtn}
        >
          <Text style={styles.backText}>‹</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t.profile.title}</Text>
        <View style={{ width: 36 }} />
      </View>

      {/* Avatar */}
      <View style={styles.avatarSection}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>
            {userData?.nom?.charAt(0).toUpperCase() || "U"}
          </Text>
        </View>
        <Text style={styles.userName}>{userData?.nom}</Text>
        <Text style={styles.userEmail}>{userData?.email}</Text>
        <View style={styles.roleBadge}>
          <Text style={styles.roleText}>
            {userData?.role === "consommateur" ? "🛒 Consommateur" : "🌾 Agriculteur"}
          </Text>
        </View>
      </View>

      {/* Informations personnelles */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>{t.profile.personalInfo}</Text>
        <View style={styles.card}>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>{t.profile.name}</Text>
            <Text style={styles.infoValue}>{userData?.nom || "—"}</Text>
          </View>
          <View style={styles.divider} />
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>{t.profile.email}</Text>
            <Text style={styles.infoValue}>{userData?.email || "—"}</Text>
          </View>
        </View>
      </View>

      {/* Profil de santé */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>{t.profile.healthInfo}</Text>
          <TouchableOpacity
            onPress={() => router.push("/(consumer)/health-profile")}
          >
            <Text style={styles.editLink}>{t.profile.editHealth}</Text>
          </TouchableOpacity>
        </View>

        {!healthProfile ? (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyEmoji}>🏥</Text>
            <Text style={styles.emptyText}>{t.profile.noHealthData}</Text>
            <TouchableOpacity
              style={styles.emptyBtn}
              onPress={() => router.push("/(consumer)/health-profile")}
            >
              <Text style={styles.emptyBtnText}>{t.profile.completeNow}</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.card}>

            {/* Métriques */}
            <View style={styles.metricsRow}>
              <View style={styles.metric}>
                <Text style={styles.metricValue}>{healthProfile.poids}</Text>
                <Text style={styles.metricUnit}>{t.profile.kg}</Text>
                <Text style={styles.metricLabel}>{t.profile.weight}</Text>
              </View>
              <View style={styles.metricDivider} />
              <View style={styles.metric}>
                <Text style={styles.metricValue}>{healthProfile.taille}</Text>
                <Text style={styles.metricUnit}>{t.profile.cm}</Text>
                <Text style={styles.metricLabel}>{t.profile.height}</Text>
              </View>
              <View style={styles.metricDivider} />
              <View style={styles.metric}>
                <Text style={styles.metricValue}>{healthProfile.imc}</Text>
                <Text style={styles.metricUnit}> </Text>
                <Text style={styles.metricLabel}>{t.profile.imc}</Text>
              </View>
            </View>

            <View style={styles.divider} />

            {/* Pathologies */}
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>{t.profile.pathologies}</Text>
              <Text style={styles.infoValue}>
                {formatList(healthProfile.pathologies)}
              </Text>
            </View>
            <View style={styles.divider} />

            {/* Objectifs */}
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>{t.profile.objectives}</Text>
              <Text style={styles.infoValue}>
                {formatList(healthProfile.objectifs)}
              </Text>
            </View>
            <View style={styles.divider} />

            {/* Allergies */}
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>{t.profile.allergies}</Text>
              <Text style={styles.infoValue}>
                {formatList(healthProfile.allergies)}
              </Text>
            </View>

          </View>
        )}
      </View>

      {/* Bouton déconnexion */}
      <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
        <Text style={styles.logoutText}>🚪 {t.profile.logout}</Text>
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
    paddingBottom: 40,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
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
    width: 36,
    height: 36,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 10,
    backgroundColor: "#f3f4f6",
  },
  backText: {
    fontSize: 24,
    color: "#374151",
    lineHeight: 28,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#111827",
  },
  avatarSection: {
    alignItems: "center",
    paddingVertical: 28,
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#f3f4f6",
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: "#16a34a",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
  },
  avatarText: {
    color: "#fff",
    fontSize: 32,
    fontWeight: "700",
  },
  userName: {
    fontSize: 20,
    fontWeight: "700",
    color: "#111827",
    marginBottom: 4,
  },
  userEmail: {
    fontSize: 14,
    color: "#6b7280",
    marginBottom: 10,
  },
  roleBadge: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: "#f0fdf4",
    borderWidth: 1,
    borderColor: "#bbf7d0",
  },
  roleText: {
    fontSize: 13,
    color: "#16a34a",
    fontWeight: "500",
  },
  section: {
    padding: 16,
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: "600",
    color: "#111827",
    marginBottom: 10,
  },
  editLink: {
    fontSize: 13,
    color: "#16a34a",
    fontWeight: "500",
  },
  card: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  infoRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    paddingVertical: 10,
    gap: 12,
  },
  infoLabel: {
    fontSize: 13,
    color: "#6b7280",
    fontWeight: "500",
    flex: 1,
  },
  infoValue: {
    fontSize: 13,
    color: "#111827",
    fontWeight: "500",
    flex: 2,
    textAlign: "right",
  },
  divider: {
    height: 1,
    backgroundColor: "#f3f4f6",
  },
  metricsRow: {
    flexDirection: "row",
    justifyContent: "space-around",
    paddingVertical: 12,
  },
  metric: {
    alignItems: "center",
  },
  metricValue: {
    fontSize: 22,
    fontWeight: "700",
    color: "#16a34a",
  },
  metricUnit: {
    fontSize: 11,
    color: "#6b7280",
    marginBottom: 2,
  },
  metricLabel: {
    fontSize: 12,
    color: "#6b7280",
  },
  metricDivider: {
    width: 1,
    backgroundColor: "#e5e7eb",
  },
  emptyCard: {
    backgroundColor: "#fff",
    borderRadius: 16,
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
  logoutBtn: {
    margin: 16,
    backgroundColor: "#fff",
    borderRadius: 14,
    padding: 16,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#fee2e2",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  logoutText: {
    fontSize: 15,
    fontWeight: "600",
    color: "#ef4444",
  },
});