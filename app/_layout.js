import { useEffect } from "react";
import { Stack } from "expo-router";
import { AuthProvider } from "../src/context/AuthContext";
import { LanguageProvider } from "../src/context/LanguageContext";
import { StatusBar } from "expo-status-bar";

export default function RootLayout() {
  return (
    <LanguageProvider>
      <AuthProvider>
        <StatusBar style="dark" />
        <Stack screenOptions={{ headerShown: true, title: "",}} />
      </AuthProvider>
    </LanguageProvider>
  );
}