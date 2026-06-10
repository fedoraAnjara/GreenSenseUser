import { useEffect, useState } from "react";
import { View, ActivityIndicator } from "react-native";
import { doc, getDoc } from "firebase/firestore";
import { db } from "../../src/lib/firebase";
import { useAuth } from "../../src/context/AuthContext";
import { useRouter } from "expo-router";

export default function ConsumerIndex() {
  const { user, userData } = useAuth();
  const router = useRouter();

  useEffect(() => {
    const checkHealthProfile = async () => {
      if (!user || !userData) return;

      try {
        const snap = await getDoc(
          doc(db, "users", user.uid, "profilSante", "data")
        );

        if (!snap.exists() && userData.healthProfilePrompted !== true) {
          // Première fois — montrer le profil santé
          router.replace("/(consumer)/health-profile");
        } else {
          // Profil existe OU utilisateur a déjà passé
          router.replace("/(consumer)/home");
        }
      } catch (e) {
        router.replace("/(consumer)/home");
      }
    };

    checkHealthProfile();
  }, [user, userData]);

  return (
    <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
      <ActivityIndicator size="large" color="#16a34a" />
    </View>
  );
}