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
import { doc, getDoc } from "firebase/firestore";
import { db } from "../../src/lib/firebase";
import { useAuth } from "../../src/context/AuthContext";
import { useLanguage } from "../../src/context/LanguageContext";
import { useRouter } from "expo-router";
import { getOrGenerateMenu, getCurrentDay } from "../../src/lib/menuService";

export default function HomeScreen() {
  const { user, userData, logout } = useAuth();
  const { t } = useLanguage();
  const router = useRouter();

  const [healthProfile, setHealthProfile] = useState(null);
  const [menu, setMenu] = useState(null);
  const [todayMenu, setTodayMenu] = useState(null);
  const [loading, setLoading] = useState(true);
  const [generatingMenu, setGeneratingMenu] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [showWeek, setShowWeek] = useState(false);

  const fetchData = async () => {
    if (!user) return;
    try {
      // Profil santé
      const healthSnap = await getDoc(
        doc(db, "users", user.uid, "profilSante", "data")
      );
      const profile = healthSnap.exists() ? healthSnap.data() : null;
      setHealthProfile(profile);

      // Menu
      setGeneratingMenu(true);
      const menuData = await getOrGenerateMenu(user.uid, profile);
      setMenu(menuData);

      // Trouver le menu du jour
      const today = getCurrentDay();
      const dayMenu = menuData.semaine?.find((d) => d.jour === today);
      setTodayMenu(dayMenu);

    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
      setGeneratingMenu(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [user]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchData();
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#16a34a" />
        <Text style={styles.loadingText}>
          {generatingMenu ? "Génération de votre menu..." : "Chargement..."}
        </Text>
      </View>
    );
  }

  const MealCard = ({ emoji, label, plat, description, calories }) => (
    <View style={styles.mealCard}>
      <View style={styles.mealHeader}>
        <Text style={styles.mealEmoji}>{emoji}</Text>
        <View style={styles.mealHeaderText}>
          <Text style={styles.mealLabel}>{label}</Text>
          <Text style={styles.mealCalories}>{calories} kcal</Text>
        </View>
      </View>
      <Text style={styles.mealPlat}>{plat}</Text>
      <Text style={styles.mealDesc}>{description}</Text>
    </View>
  );

  const DayCard = ({ dayData, isToday }) => (
    <View style={[styles.dayCard, isToday && styles.dayCardToday]}>
      <View style={styles.dayHeader}>
        <Text style={[styles.dayName, isToday && styles.dayNameToday]}>
          {dayData.jour} {isToday ? "— Aujourd'hui" : ""}
        </Text>
        <Text style={styles.dayCalories}>{dayData.totalCalories} kcal</Text>
      </View>

      <MealCard
        emoji={dayData.petitDejeuner.emoji}
        label="Petit-déjeuner"
        plat={dayData.petitDejeuner.plat}
        description={dayData.petitDejeuner.description}
        calories={dayData.petitDejeuner.calories}
      />
      <MealCard
        emoji={dayData.dejeuner.emoji}
        label="Déjeuner"
        plat={dayData.dejeuner.plat}
        description={dayData.dejeuner.description}
        calories={dayData.dejeuner.calories}
      />
      <MealCard
        emoji={dayData.diner.emoji}
        label="Dîner"
        plat={dayData.diner.plat}
        description={dayData.diner.description}
        calories={dayData.diner.calories}
      />
      <MealCard
        emoji={dayData.collation.emoji}
        label="Collation"
        plat={dayData.collation.plat}
        description={dayData.collation.description}
        calories={dayData.collation.calories}
      />

      {dayData.conseil && (
        <View style={styles.conseilBox}>
          <Text style={styles.conseilText}>💡 {dayData.conseil}</Text>
        </View>
      )}
    </View>
  );

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.scroll}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#16a34a" />
      }
    >
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

      {/* Menu du jour */}
      {generatingMenu ? (
        <View style={styles.generatingBox}>
          <ActivityIndicator color="#16a34a" />
          <Text style={styles.generatingText}>Génération de votre menu personnalisé...</Text>
        </View>
      ) : todayMenu ? (
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Menu du jour</Text>
            <TouchableOpacity onPress={() => setShowWeek(!showWeek)}>
              <Text style={styles.weekLink}>
                {showWeek ? "Voir moins" : "Voir la semaine"}
              </Text>
            </TouchableOpacity>
          </View>

          {/* Jour actuel */}
          <DayCard dayData={todayMenu} isToday={true} />

          {/* Reste de la semaine */}
          {showWeek && menu?.semaine
            ?.filter((d) => d.jour !== todayMenu.jour)
            .map((dayData) => (
              <DayCard key={dayData.jour} dayData={dayData} isToday={false} />
            ))}
        </View>
      ) : null}

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
    backgroundColor: "#f9fafb",
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: "#6b7280",
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
  profileBannerEmoji: { fontSize: 28 },
  profileBannerText: { flex: 1 },
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
  weekLink: {
    fontSize: 13,
    color: "#16a34a",
    fontWeight: "500",
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
  generatingBox: {
    backgroundColor: "#fff",
    borderRadius: 14,
    padding: 20,
    alignItems: "center",
    gap: 10,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: "#e5e7eb",
  },
  generatingText: {
    fontSize: 13,
    color: "#6b7280",
    textAlign: "center",
  },
  dayCard: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
    borderWidth: 1,
    borderColor: "#e5e7eb",
  },
  dayCardToday: {
    borderColor: "#16a34a",
    borderWidth: 1.5,
  },
  dayHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  dayName: {
    fontSize: 15,
    fontWeight: "700",
    color: "#111827",
  },
  dayNameToday: {
    color: "#16a34a",
  },
  dayCalories: {
    fontSize: 13,
    color: "#6b7280",
    fontWeight: "500",
  },
  mealCard: {
    backgroundColor: "#f9fafb",
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
  },
  mealHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 6,
    gap: 8,
  },
  mealEmoji: {
    fontSize: 24,
  },
  mealHeaderText: {
    flex: 1,
    flexDirection: "row",
    justifyContent: "space-between",
  },
  mealLabel: {
    fontSize: 12,
    fontWeight: "600",
    color: "#6b7280",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  mealCalories: {
    fontSize: 12,
    color: "#9ca3af",
  },
  mealPlat: {
    fontSize: 14,
    fontWeight: "600",
    color: "#111827",
    marginBottom: 2,
  },
  mealDesc: {
    fontSize: 12,
    color: "#6b7280",
    lineHeight: 18,
  },
  conseilBox: {
    backgroundColor: "#f0fdf4",
    borderRadius: 10,
    padding: 10,
    marginTop: 8,
    borderWidth: 1,
    borderColor: "#bbf7d0",
  },
  conseilText: {
    fontSize: 12,
    color: "#16a34a",
    lineHeight: 18,
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