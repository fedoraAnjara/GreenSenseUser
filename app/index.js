import { useEffect } from "react";
import { View, ActivityIndicator } from "react-native";
import { router } from "expo-router";
import { useAuth } from "../src/context/AuthContext";

export default function Index() {
  const { user, userData, loading } = useAuth();

  useEffect(() => {
    // Attendre uniquement la fin du chargement auth
    if (loading) return;

    // Pas connecté → login
    if (!user) {
      router.replace("/(auth)/login");
      return;
    }

    // Connecté mais userData pas encore chargé → attendre
    if (!userData) return;

    // Rediriger selon le rôle
    if (userData.role === "agriculteur") {
      router.replace("/(farmer)");
    } else {
      router.replace("/(consumer)");
    }
  }, [user, userData, loading]);

  return (
    <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
      <ActivityIndicator size="large" color="#16a34a" />
    </View>
  );
}