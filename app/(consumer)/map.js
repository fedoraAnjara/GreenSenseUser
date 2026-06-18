import { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  ScrollView,
  Animated,
  Dimensions,
} from "react-native";
import MapView, { Marker, Polyline, PROVIDER_DEFAULT } from "react-native-maps";
import * as Location from "expo-location";
import { collection, getDocs } from "firebase/firestore";
import { db } from "../../src/lib/firebase";
import { useLanguage } from "../../src/context/LanguageContext";
import { useRouter } from "expo-router";

const { height: SCREEN_HEIGHT } = Dimensions.get("window");

const MARKER_COLORS = {
  vente: "#16a34a",
  cultivation: "#d97706",
  elevage: "#2563eb",
};

const TYPE_EMOJIS = {
  vente: "🛒",
  cultivation: "🌱",
  elevage: "🐄",
};

const calculateDistance = (lat1, lon1, lat2, lon2) => {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return (R * c).toFixed(1);
};

const getRoute = async (fromLat, fromLon, toLat, toLon) => {
  const url = `https://router.project-osrm.org/route/v1/driving/${fromLon},${fromLat};${toLon},${toLat}?overview=full&geometries=geojson`;
  const response = await fetch(url);
  const data = await response.json();
  if (data.code !== "Ok") throw new Error("Route not found");
  const coordinates = data.routes[0].geometry.coordinates.map(([lon, lat]) => ({
    latitude: lat,
    longitude: lon,
  }));
  const duration = Math.ceil(data.routes[0].duration / 60);
  const distance = (data.routes[0].distance / 1000).toFixed(1);
  return { coordinates, duration, distance };
};

export default function MapScreen() {
  const { t } = useLanguage();
  const router = useRouter();
  const mapRef = useRef(null);

  // Animations
  const detailAnim = useRef(new Animated.Value(0)).current;
  const listAnim = useRef(new Animated.Value(0)).current;

  const [location, setLocation] = useState(null);
  const [points, setPoints] = useState([]);
  const [selectedPoint, setSelectedPoint] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [route, setRoute] = useState(null);
  const [routeLoading, setRouteLoading] = useState(false);
  const [routeInfo, setRouteInfo] = useState(null);
  const [showList, setShowList] = useState(false);
  const [expandedCategory, setExpandedCategory] = useState(null);
  const [activeFilter, setActiveFilter] = useState("all");

  useEffect(() => {
    const init = async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== "granted") {
          setError(t.map.permissionDenied);
          setLoading(false);
          return;
        }
        const loc = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Balanced,
        });
        setLocation(loc.coords);
        const snap = await getDocs(collection(db, "pointsDeVente"));
        const data = snap.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
        setPoints(data);
      } catch (e) {
        setError("Une erreur est survenue");
      } finally {
        setLoading(false);
      }
    };
    init();
  }, []);

  // Ouvrir fiche détail
  const openDetail = () => {
    Animated.spring(detailAnim, {
      toValue: 1,
      useNativeDriver: true,
      tension: 65,
      friction: 11,
    }).start();
  };

  // Fermer fiche détail
  const closeDetail = () => {
    Animated.timing(detailAnim, {
      toValue: 0,
      duration: 250,
      useNativeDriver: true,
    }).start(() => {
      setSelectedPoint(null);
      setRoute(null);
      setRouteInfo(null);
    });
  };

  // Ouvrir liste
  const openList = () => {
    setShowList(true);
    Animated.spring(listAnim, {
      toValue: 1,
      useNativeDriver: true,
      tension: 65,
      friction: 11,
    }).start();
  };

  // Fermer liste
  const closeList = () => {
    Animated.timing(listAnim, {
      toValue: 0,
      duration: 250,
      useNativeDriver: true,
    }).start(() => {
      setShowList(false);
      setExpandedCategory(null);
    });
  };

  const handleMarkerPress = async (point) => {
    // Fermer liste si ouverte
    if (showList) closeList();

    setSelectedPoint(point);
    setRoute(null);
    setRouteInfo(null);
    openDetail();

    // Zoom sur le point
    mapRef.current?.animateToRegion({
      latitude: location
        ? (location.latitude + point.latitude) / 2
        : point.latitude,
      longitude: location
        ? (location.longitude + point.longitude) / 2
        : point.longitude,
      latitudeDelta: location
        ? Math.abs(location.latitude - point.latitude) * 2.5 + 0.01
        : 0.05,
      longitudeDelta: location
        ? Math.abs(location.longitude - point.longitude) * 2.5 + 0.01
        : 0.05,
    }, 800);

    // Calculer itinéraire
    if (location) {
      setRouteLoading(true);
      try {
        const result = await getRoute(
          location.latitude,
          location.longitude,
          point.latitude,
          point.longitude
        );
        setRoute(result.coordinates);
        setRouteInfo({ duration: result.duration, distance: result.distance });
      } catch (e) {
        console.error(e);
      } finally {
        setRouteLoading(false);
      }
    }
  };

  const handleListPointPress = (point) => {
    closeList();
    setTimeout(() => handleMarkerPress(point), 300);
  };

  const filteredPoints = points.filter((p) =>
    activeFilter === "all" ? true : p.type === activeFilter
  );

  const groupedPoints = {
    vente: points.filter((p) => p.type === "vente"),
    cultivation: points.filter((p) => p.type === "cultivation"),
    elevage: points.filter((p) => p.type === "elevage"),
  };

  const detailTranslateY = detailAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [400, 0],
  });

  const listTranslateY = listAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [SCREEN_HEIGHT, 0],
  });

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#16a34a" />
        <Text style={styles.loadingText}>{t.map.loading}</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.centered}>
        <Text style={{ fontSize: 48 }}>📍</Text>
        <Text style={styles.errorText}>{error}</Text>
        <TouchableOpacity style={styles.btn} onPress={() => router.back()}>
          <Text style={styles.btnText}>{t.common.back}</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>

      {/* Carte plein écran */}
      <MapView
        ref={mapRef}
        style={StyleSheet.absoluteFillObject}
        provider={PROVIDER_DEFAULT}
        initialRegion={{
          latitude: location?.latitude ?? -18.9137,
          longitude: location?.longitude ?? 47.5361,
          latitudeDelta: 0.1,
          longitudeDelta: 0.1,
        }}
        showsUserLocation
        showsMyLocationButton={false}
        onPress={() => {
          if (selectedPoint) closeDetail();
        }}
      >
        {filteredPoints.map((point) => (
          <Marker
            key={point.id}
            coordinate={{ latitude: point.latitude, longitude: point.longitude }}
            pinColor={MARKER_COLORS[point.type] || MARKER_COLORS.vente}
            onPress={() => handleMarkerPress(point)}
          />
        ))}

        {route && (
          <Polyline
            coordinates={route}
            strokeColor="#16a34a"
            strokeWidth={4}
          />
        )}
      </MapView>

      {/* Header flottant */}
      <View style={styles.floatingHeader}>
        <TouchableOpacity onPress={() => router.back()} style={styles.floatingBtn}>
          <Text style={styles.floatingBtnText}>‹</Text>
        </TouchableOpacity>
        <View style={styles.floatingTitle}>
          <Text style={styles.floatingTitleText}>{t.map.title}</Text>
          <Text style={styles.floatingTitleSub}>
            {points.length} point{points.length > 1 ? "s" : ""}
          </Text>
        </View>
        <TouchableOpacity
          onPress={() => {
            if (!location || !mapRef.current) return;
            mapRef.current.animateToRegion({
              latitude: location.latitude,
              longitude: location.longitude,
              latitudeDelta: 0.05,
              longitudeDelta: 0.05,
            }, 800);
          }}
          style={styles.floatingBtn}
        >
          <Text style={styles.floatingBtnText}>📍</Text>
        </TouchableOpacity>
      </View>

      {/* Filtres flottants */}
      <View style={styles.floatingFilters}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          {["all", "vente", "cultivation", "elevage"].map((filter) => (
            <TouchableOpacity
              key={filter}
              style={[styles.filterChip, activeFilter === filter && styles.filterChipActive]}
              onPress={() => setActiveFilter(filter)}
            >
              <Text style={[styles.filterChipText, activeFilter === filter && styles.filterChipTextActive]}>
                {filter === "all" ? "🗺️ Tous" : `${TYPE_EMOJIS[filter]} ${t.map.types[filter]}`}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* Indicateur calcul itinéraire */}
      {routeLoading && (
        <View style={styles.routeLoadingBadge}>
          <ActivityIndicator size="small" color="#16a34a" />
          <Text style={styles.routeLoadingText}>Calcul itinéraire...</Text>
        </View>
      )}

      {/* Bouton flottant Liste */}
      {!selectedPoint && !showList && (
        <TouchableOpacity style={styles.listFab} onPress={openList}>
          <Text style={styles.listFabText}>☰  Liste des points</Text>
        </TouchableOpacity>
      )}

      {/* Fiche détail (slide up) */}
      {selectedPoint && (
        <Animated.View style={[styles.detailSheet, { transform: [{ translateY: detailTranslateY }] }]}>
          <View style={styles.sheetHandle} />

          <View style={styles.detailTop}>
            <View style={styles.detailLeft}>
              <View style={[
                styles.detailIcon,
                { backgroundColor: MARKER_COLORS[selectedPoint.type] + "20" }
              ]}>
                <Text style={styles.detailIconEmoji}>{TYPE_EMOJIS[selectedPoint.type]}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.detailName}>{selectedPoint.nom}</Text>
                <Text style={[styles.detailType, { color: MARKER_COLORS[selectedPoint.type] }]}>
                  {t.map.types[selectedPoint.type]}
                </Text>
              </View>
            </View>
            <TouchableOpacity onPress={closeDetail} style={styles.closeBtn}>
              <Text style={styles.closeBtnText}>✕</Text>
            </TouchableOpacity>
          </View>

          {selectedPoint.adresse ? (
            <Text style={styles.detailMeta}>📍 {selectedPoint.adresse}</Text>
          ) : null}
          {selectedPoint.agriculteurNom ? (
            <Text style={styles.detailMeta}>🌾 {selectedPoint.agriculteurNom}</Text>
          ) : null}

          {routeInfo && (
            <View style={styles.routeInfoBox}>
              <View style={styles.routeInfoItem}>
                <Text style={styles.routeInfoValue}>{routeInfo.distance} km</Text>
                <Text style={styles.routeInfoLabel}>Distance</Text>
              </View>
              <View style={styles.routeInfoSep} />
              <View style={styles.routeInfoItem}>
                <Text style={styles.routeInfoValue}>{routeInfo.duration} min</Text>
                <Text style={styles.routeInfoLabel}>Durée</Text>
              </View>
              <View style={styles.routeInfoSep} />
              <View style={styles.routeInfoItem}>
                <Text style={styles.routeInfoValue}>🚗</Text>
                <Text style={styles.routeInfoLabel}>En voiture</Text>
              </View>
            </View>
          )}
        </Animated.View>
      )}

      {/* Liste bottom sheet */}
      {showList && (
        <>
          {/* Overlay */}
          <TouchableOpacity
            style={styles.overlay}
            activeOpacity={1}
            onPress={closeList}
          />
          <Animated.View style={[styles.listSheet, { transform: [{ translateY: listTranslateY }] }]}>
            <View style={styles.listSheetTop}>
              <View style={styles.sheetHandle} />
              <View style={styles.listSheetHeader}>
                <Text style={styles.listSheetTitle}>Points disponibles</Text>
                <TouchableOpacity onPress={closeList} style={styles.closeBtn}>
                  <Text style={styles.closeBtnText}>✕</Text>
                </TouchableOpacity>
              </View>
            </View>

            <ScrollView style={styles.listScroll} showsVerticalScrollIndicator={false}>
              {Object.entries(groupedPoints).map(([type, pts]) => {
                if (pts.length === 0) return null;
                const isExpanded = expandedCategory === type;
                return (
                  <View key={type} style={styles.catGroup}>
                    <TouchableOpacity
                      style={styles.catHeader}
                      onPress={() => setExpandedCategory(isExpanded ? null : type)}
                    >
                      <View style={styles.catLeft}>
                        <Text style={styles.catEmoji}>{TYPE_EMOJIS[type]}</Text>
                        <Text style={styles.catName}>{t.map.types[type]}</Text>
                        <View style={[styles.catBadge, { backgroundColor: MARKER_COLORS[type] + "20" }]}>
                          <Text style={[styles.catBadgeText, { color: MARKER_COLORS[type] }]}>
                            {pts.length}
                          </Text>
                        </View>
                      </View>
                      <Text style={styles.catChevron}>{isExpanded ? "▲" : "▼"}</Text>
                    </TouchableOpacity>

                    {isExpanded && pts.map((point) => (
                      <TouchableOpacity
                        key={point.id}
                        style={styles.pointRow}
                        onPress={() => handleListPointPress(point)}
                      >
                        <View style={[styles.pointDot, { backgroundColor: MARKER_COLORS[type] }]} />
                        <View style={{ flex: 1 }}>
                          <Text style={styles.pointRowName}>{point.nom}</Text>
                          {point.adresse ? (
                            <Text style={styles.pointRowSub}>{point.adresse}</Text>
                          ) : null}
                          {point.agriculteurNom ? (
                            <Text style={[styles.pointRowSub, { color: "#16a34a" }]}>
                              🌾 {point.agriculteurNom}
                            </Text>
                          ) : null}
                        </View>
                        {location && (
                          <Text style={styles.pointRowDist}>
                            {calculateDistance(
                              location.latitude, location.longitude,
                              point.latitude, point.longitude
                            )} km
                          </Text>
                        )}
                      </TouchableOpacity>
                    ))}
                  </View>
                );
              })}

              {points.length === 0 && (
                <View style={styles.emptyList}>
                  <Text style={{ fontSize: 40 }}>🗺️</Text>
                  <Text style={styles.emptyListText}>{t.map.noPoints}</Text>
                </View>
              )}
              <View style={{ height: 40 }} />
            </ScrollView>
          </Animated.View>
        </>
      )}

    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  centered: { flex: 1, justifyContent: "center", alignItems: "center", padding: 24, backgroundColor: "#f9fafb" },
  loadingText: { marginTop: 12, fontSize: 14, color: "#6b7280" },
  errorText: { fontSize: 14, color: "#6b7280", textAlign: "center", marginVertical: 16 },
  btn: { backgroundColor: "#16a34a", borderRadius: 10, paddingVertical: 10, paddingHorizontal: 24 },
  btnText: { color: "#fff", fontWeight: "600" },

  // Header flottant
  floatingHeader: {
    position: "absolute",
    top: 52,
    left: 16,
    right: 16,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.95)",
    borderRadius: 16,
    padding: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 6,
  },
  floatingBtn: {
    width: 36, height: 36,
    borderRadius: 10, backgroundColor: "#f3f4f6",
    alignItems: "center", justifyContent: "center",
  },
  floatingBtnText: { fontSize: 20, color: "#374151", lineHeight: 26 },
  floatingTitle: { flex: 1, paddingHorizontal: 10 },
  floatingTitleText: { fontSize: 15, fontWeight: "600", color: "#111827" },
  floatingTitleSub: { fontSize: 11, color: "#6b7280" },

  // Filtres flottants
  floatingFilters: {
    position: "absolute",
    top: 116,
    left: 0,
    right: 0,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  filterChip: {
    paddingHorizontal: 14, paddingVertical: 7,
    borderRadius: 20, marginRight: 8,
    backgroundColor: "rgba(255,255,255,0.95)",
    borderWidth: 1, borderColor: "#e5e7eb",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  filterChipActive: { backgroundColor: "#16a34a", borderColor: "#16a34a" },
  filterChipText: { fontSize: 13, color: "#6b7280", fontWeight: "500" },
  filterChipTextActive: { color: "#fff" },

  // Badge calcul
  routeLoadingBadge: {
    position: "absolute",
    top: 175,
    alignSelf: "center",
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "rgba(255,255,255,0.95)",
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 4,
  },
  routeLoadingText: { fontSize: 13, color: "#374151" },

  // FAB liste
  listFab: {
    position: "absolute",
    bottom: 36,
    alignSelf: "center",
    backgroundColor: "#111827",
    paddingHorizontal: 22,
    paddingVertical: 14,
    borderRadius: 32,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 10,
  },
  listFabText: { color: "#fff", fontSize: 14, fontWeight: "600" },

  // Fiche détail
  detailSheet: {
    position: "absolute",
    bottom: 0, left: 0, right: 0,
    backgroundColor: "#fff",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    paddingTop: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 24,
  },
  sheetHandle: {
    width: 40, height: 4, borderRadius: 2,
    backgroundColor: "#d1d5db",
    alignSelf: "center", marginBottom: 14,
  },
  detailTop: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 10,
  },
  detailLeft: { flexDirection: "row", alignItems: "center", gap: 10, flex: 1 },
  detailIcon: {
    width: 46, height: 46, borderRadius: 14,
    alignItems: "center", justifyContent: "center",
  },
  detailIconEmoji: { fontSize: 22 },
  detailName: { fontSize: 16, fontWeight: "700", color: "#111827" },
  detailType: { fontSize: 12, fontWeight: "500", marginTop: 2 },
  closeBtn: {
    width: 30, height: 30, borderRadius: 15,
    backgroundColor: "#f3f4f6",
    alignItems: "center", justifyContent: "center",
  },
  closeBtnText: { fontSize: 12, color: "#6b7280" },
  detailMeta: { fontSize: 13, color: "#6b7280", marginBottom: 4 },
  routeInfoBox: {
    flexDirection: "row",
    backgroundColor: "#f0fdf4",
    borderRadius: 14,
    padding: 14,
    marginTop: 12,
    justifyContent: "space-around",
    borderWidth: 1,
    borderColor: "#bbf7d0",
  },
  routeInfoItem: { alignItems: "center" },
  routeInfoValue: { fontSize: 16, fontWeight: "700", color: "#16a34a" },
  routeInfoLabel: { fontSize: 11, color: "#6b7280", marginTop: 2 },
  routeInfoSep: { width: 1, backgroundColor: "#bbf7d0" },

  // Overlay
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.4)",
  },

  // Liste sheet
  listSheet: {
    position: "absolute",
    bottom: 0, left: 0, right: 0,
    backgroundColor: "#fff",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: "75%",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 24,
  },
  listSheetTop: { paddingTop: 12, paddingHorizontal: 20 },
  listSheetHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  listSheetTitle: { fontSize: 17, fontWeight: "700", color: "#111827" },
  listScroll: { paddingHorizontal: 16 },
  catGroup: {
    marginBottom: 8, borderRadius: 14,
    overflow: "hidden", borderWidth: 1, borderColor: "#f3f4f6",
  },
  catHeader: {
    flexDirection: "row", justifyContent: "space-between",
    alignItems: "center", padding: 14, backgroundColor: "#f9fafb",
  },
  catLeft: { flexDirection: "row", alignItems: "center", gap: 10 },
  catEmoji: { fontSize: 20 },
  catName: { fontSize: 14, fontWeight: "600", color: "#111827" },
  catBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 10 },
  catBadgeText: { fontSize: 12, fontWeight: "700" },
  catChevron: { fontSize: 10, color: "#9ca3af" },
  pointRow: {
    flexDirection: "row", alignItems: "flex-start",
    padding: 14, gap: 10,
    backgroundColor: "#fff",
    borderTopWidth: 1, borderTopColor: "#f9fafb",
  },
  pointDot: { width: 10, height: 10, borderRadius: 5, marginTop: 4, flexShrink: 0 },
  pointRowName: { fontSize: 14, fontWeight: "600", color: "#111827" },
  pointRowSub: { fontSize: 12, color: "#6b7280", marginTop: 2 },
  pointRowDist: { fontSize: 13, color: "#16a34a", fontWeight: "600", flexShrink: 0 },
  emptyList: { alignItems: "center", paddingVertical: 40, gap: 12 },
  emptyListText: { fontSize: 14, color: "#6b7280" },
});