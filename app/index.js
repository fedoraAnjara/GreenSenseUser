import { useEffect } from "react";
import { View, ActivityIndicator } from "react-native";
import { router } from "expo-router";
import { useAuth } from "../src/context/AuthContext";

export default function Index() {
  const { user, userData, loading } = useAuth();

useEffect(() => {
  if (loading || !userData) return;

  if (!user) {
    router.replace("/(auth)/login");
    return;
  }

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