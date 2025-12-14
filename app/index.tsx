import { useEffect } from "react";
import { useRouter, useSegments } from "expo-router";
import { View, ActivityIndicator } from "react-native";
import { useAuthContext } from "../contexts/AuthContext";

export default function Index() {
  const { isAuthenticated, loading } = useAuthContext();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;

    const inAuthGroup = segments[0] === "auth";

    if (!isAuthenticated) {
      // Redirect to welcome screen if not authenticated
      router.replace("/auth/welcome");
    } else if (isAuthenticated && inAuthGroup) {
      // Redirect to dashboard if authenticated and in auth group
      router.replace("/dashboard");
    } else if (isAuthenticated && !inAuthGroup && segments.length <= 1) {
      // If authenticated and on index, go to dashboard
      router.replace("/dashboard");
    }
  }, [isAuthenticated, loading, segments, router]);

  // Show loading indicator while checking auth or redirecting
  return (
    <View
      style={{
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
        backgroundColor: "#18202B",
      }}
    >
      <ActivityIndicator size="large" color="#06b6d4" />
    </View>
  );
}
