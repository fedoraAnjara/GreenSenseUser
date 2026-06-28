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
import { doc, getDoc, collection, getDocs } from "firebase/firestore";
import { db } from "../../src/lib/firebase";
import { useAuth } from "../../src/context/AuthContext";
import { useLanguage } from "../../src/context/LanguageContext";
import { useRouter } from "expo-router";
import { getOrGenerateMenu, getCurrentDay } from "../../src/lib/menuService";
import * as Location from "expo-location";

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
  const [pointsProches, setPointsProches] = useState([]);
  const [userLocation, setUserLocation] = useState(null);

  // Distance à vol d'oiseau en km
  const getDistance = (lat1, lon1, lat2, lon2) => {
    const R = 6371;
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLon = ((lon2 - lon1) * Math.PI) / 180;
    const a =
      Math.sin(dLat / 2) ** 2 +
      Math.cos((lat1 * Math.PI) / 180) *
        Math.cos((lat2 * Math.PI) / 180) *
        Math.sin(dLon / 2) ** 2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  };

  const fetchData = async () => {
    if (!user) return;
    try {
      const healthSnap = await getDoc(
        doc(db, "users", user.uid, "profilSante", "data")
      );
      const profile = healthSnap.exists() ? healthSnap.data() : null;
      setHealthProfile(profile);

      setGeneratingMenu(true);
      const menuData = await getOrGenerateMenu(user.uid, profile);
      setMenu(menuData);

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

  const fetchPointsProches = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      let coords = null;
      if (status === "granted") {
        const loc = await Location.getCurrentPositionAsync({});
        coords = { lat: loc.coords.latitude, lng: loc.coords.longitude };
        setUserLocation(coords);
      }

      const snap = await getDocs(collection(db, "pointsDeVente"));
      const points = snap.docs.map((d) => ({ id: d.id, ...d.data() }));

      const enriched = await Promise.all(
        points.map(async (point) => {
          let produits = [];
          if (point.agriculteurId) {
            try {
              const prodSnap = await getDocs(
                collection(db, "agriculteurs", point.agriculteurId, "produits")
              );
              produits = prodSnap.docs
                .map((p) => p.data())
                .filter((p) => p.disponible !== false)
                .slice(0, 3);
            } catch (e) {}
          }

          let distance = null;
          const pLat = point.latitude ?? point.lat;
          const pLng = point.longitude ?? point.lng;
          if (coords && pLat && pLng) {
            distance = getDistance(coords.lat, coords.lng, pLat, pLng);
          }

          return { ...point, produits, distance };
        })
      );

      enriched.sort((a, b) => {
        if (a.distance == null) return 1;
        if (b.distance == null) return -1;
        return a.distance - b.distance;
      });

      setPointsProches(enriched);
    } catch (e) {
      console.error("Erreur points proches:", e);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchData();
    fetchPointsProches();
  };

  useEffect(() => {
    fetchData();
    fetchPointsProches();
  }, [user]);

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

  const typeConfig = {
    vente: { emoji: "🛒", label: "Point de vente", color: "#16a34a", bg: "#f0fdf4" },
    cultivation: { emoji: "🌾", label: "Cultivation", color: "#ca8a04", bg: "#fefce8" },
    elevage: { emoji: "🐄", label: "Élevage", color: "#dc2626", bg: "#fef2f2" },
  };

  return (
    <View style={styles.container}>
      {/* Bande d'en-tête verte organique */}
      <View style={styles.headerBg}>
        <View style={styles.blob1} />
        <View style={styles.blob2} />

        <View style={styles.headerContent}>
          <View style={{ flex: 1 }}>
            <Text style={styles.hello}>
              {t.consumer.hello}, {userData?.nom?.split(" ")[1] || userData?.nom?.split(" ")[0] || ""}
            </Text>
            <Text style={styles.subtitle}>{t.consumer.subtitle}</Text>
          </View>
          <TouchableOpacity
            style={styles.avatarBtn}
            onPress={() => router.push("/(consumer)/profile")}
          >
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>
                {(userData?.nom?.split(" ")[1] || userData?.nom?.split(" ")[0] || "U").charAt(0).toUpperCase()}
              </Text>
            </View>
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#16a34a" />
        }
      >
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
              onPress={() => router.push("/(consumer)/feed")}
            >
              <View style={[styles.actionIconBox, { backgroundColor: "#f5f3ff" }]}>
                <Text style={styles.actionEmoji}>📢</Text>
              </View>
              <Text style={styles.actionText}>Actualités</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.actionCard}
              onPress={() => router.push("/(consumer)/chat")}
            >
              <View style={[styles.actionIconBox, { backgroundColor: "#eff6ff" }]}>
                <Text style={styles.actionEmoji}>🤖</Text>
              </View>
              <Text style={styles.actionText}>{t.consumer.chat}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.actionCard}
              onPress={() => router.push("/(consumer)/map")}
            >
              <View style={[styles.actionIconBox, { backgroundColor: "#f0fdf4" }]}>
                <Text style={styles.actionEmoji}>🗺️</Text>
              </View>
              <Text style={styles.actionText}>{t.consumer.map}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.actionCard}
              onPress={() => router.push("/(consumer)/profile")}
            >
              <View style={[styles.actionIconBox, { backgroundColor: "#fef3c7" }]}>
                <Text style={styles.actionEmoji}>👤</Text>
              </View>
              <Text style={styles.actionText}>{t.consumer.profile}</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Carrousel points de vente proches */}
        {pointsProches.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>📍 Près de vous</Text>
              <TouchableOpacity onPress={() => router.push("/(consumer)/map")}>
                <Text style={styles.weekLink}>Voir la carte</Text>
              </TouchableOpacity>
            </View>

            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.carouselContent}
            >
              {pointsProches.map((point) => {
                const config = typeConfig[point.type] || typeConfig.vente;
                return (
                  <TouchableOpacity
                    key={point.id}
                    style={styles.posCard}
                    onPress={() => router.push("/(consumer)/map")}
                    activeOpacity={0.85}
                  >
                    <View style={[styles.posTypeBadge, { backgroundColor: config.bg }]}>
                      <Text style={styles.posTypeEmoji}>{config.emoji}</Text>
                      <Text style={[styles.posTypeText, { color: config.color }]}>{config.label}</Text>
                    </View>

                    <Text style={styles.posName} numberOfLines={1}>{point.nom}</Text>
                    <Text style={styles.posFarmer} numberOfLines={1}>
                      👤 {point.agriculteurNom || "Agriculteur"}
                    </Text>

                    {point.distance != null && (
                      <Text style={styles.posDistance}>
                        📍 À {point.distance < 1
                          ? `${Math.round(point.distance * 1000)} m`
                          : `${point.distance.toFixed(1)} km`} de vous
                      </Text>
                    )}

                    {point.produits.length > 0 && (
                      <View style={styles.posProduits}>
                        {point.produits.map((prod, i) => (
                          <View key={i} style={styles.posProduitChip}>
                            <Text style={styles.posProduitText}>{prod.nom}</Text>
                          </View>
                        ))}
                      </View>
                    )}
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>
        )}

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

            <DayCard dayData={todayMenu} isToday={true} />

            {showWeek && menu?.semaine
              ?.filter((d) => d.jour !== todayMenu.jour)
              .map((dayData) => (
                <DayCard key={dayData.jour} dayData={dayData} isToday={false} />
              ))}
          </View>
        ) : null}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f6f9f6",
  },
  headerBg: {
    backgroundColor: "#15805d",
    paddingTop: 26,
    paddingBottom: 28,
    paddingHorizontal: 20,
    marginTop: 55,
    overflow: "hidden",
  },
  blob1: {
    position: "absolute",
    top: -30,
    right: -20,
    width: 130,
    height: 130,
    borderRadius: 65,
    backgroundColor: "#16a34a",
    opacity: 0.5,
  },
  blob2: {
    position: "absolute",
    bottom: -40,
    left: -30,
    width: 110,
    height: 110,
    borderRadius: 55,
    backgroundColor: "#22c55e",
    opacity: 0.35,
  },
  headerContent: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  hello: {
    fontSize: 22,
    fontWeight: "800",
    color: "#fff",
    letterSpacing: -0.3,
  },
  subtitle: {
    fontSize: 14,
    color: "#dcfce7",
    marginTop: 4,
  },
  avatarBtn: {},
  avatar: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: "rgba(255,255,255,0.2)",
    borderWidth: 2,
    borderColor: "rgba(255,255,255,0.4)",
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "700",
  },
  scrollView: {
    flex: 1,
  },
  scroll: {
    padding: 20,
    paddingTop: 20,
    paddingBottom: 40,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#f6f9f6",
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: "#6b7280",
  },
  profileBanner: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fffbeb",
    borderRadius: 16,
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
    marginBottom: 22,
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#111827",
    marginBottom: 12,
  },
  weekLink: {
    fontSize: 13,
    color: "#16a34a",
    fontWeight: "600",
  },
  actionsRow: {
    flexDirection: "row",
    gap: 10,
  },
  actionCard: {
    flex: 1,
    backgroundColor: "#fff",
    borderRadius: 16,
    paddingVertical: 14,
    paddingHorizontal: 6,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  actionIconBox: {
    width: 46,
    height: 46,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
  },
  actionEmoji: {
    fontSize: 24,
  },
  actionText: {
    fontSize: 11,
    fontWeight: "600",
    color: "#374151",
    textAlign: "center",
  },
  generatingBox: {
    backgroundColor: "#fff",
    borderRadius: 16,
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
    borderRadius: 18,
    padding: 16,
    marginBottom: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
    borderWidth: 1,
    borderColor: "#f3f4f6",
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
  carouselContent: {
    paddingRight: 8,
    gap: 12,
  },
  posCard: {
    width: 220,
    backgroundColor: "#fff",
    borderRadius: 18,
    padding: 14,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
    borderWidth: 1,
    borderColor: "#f3f4f6",
  },
  posTypeBadge: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 10,
    marginBottom: 10,
  },
  posTypeEmoji: { fontSize: 12 },
  posTypeText: { fontSize: 11, fontWeight: "600" },
  posName: { fontSize: 15, fontWeight: "700", color: "#111827" },
  posFarmer: { fontSize: 12, color: "#6b7280", marginTop: 3 },
  posDistance: { fontSize: 12, color: "#16a34a", fontWeight: "600", marginTop: 6 },
  posProduits: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
    marginTop: 10,
  },
  posProduitChip: {
    backgroundColor: "#f3f4f6",
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  posProduitText: { fontSize: 11, color: "#374151", fontWeight: "500" },
});