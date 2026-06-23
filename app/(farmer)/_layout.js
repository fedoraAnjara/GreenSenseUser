import { Tabs } from "expo-router";
import { Ionicons } from "@expo/vector-icons";

export default function FarmerLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,

        tabBarActiveTintColor: "#16a34a",
        tabBarInactiveTintColor: "#9ca3af",

        tabBarStyle: {
          position: "absolute",
          bottom: 20,
          left: 10,
          right: 10,

          height: 64,
          borderRadius: 20,

          backgroundColor: "#ffffff",

          shadowColor: "#000",
          shadowOffset: {
            width: 0,
            height: 4,
          },
          shadowOpacity: 0.15,
          shadowRadius: 10,
          elevation: 10,

          borderTopWidth: 0,
        },

        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: "600",
          paddingTop: 5,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Accueil",
          tabBarIcon: ({ color, size }) => (
            <Ionicons
              name="grid-outline"
              size={size}
              color={color}
            />
          ),
        }}
      />

      <Tabs.Screen
        name="products"
        options={{
          title: "Produits",
          tabBarIcon: ({ color, size }) => (
            <Ionicons
              name="leaf-outline"
              size={size}
              color={color}
            />
          ),
        }}
      />

      <Tabs.Screen
        name="profile"
        options={{
          title: "Ferme",
          tabBarIcon: ({ color, size }) => (
            <Ionicons
              name="business-outline"
              size={size}
              color={color}
            />
          ),
        }}
      />
    </Tabs>
  );
}