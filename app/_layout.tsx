import {
  DarkTheme,
  DefaultTheme,
  ThemeProvider,
} from "@react-navigation/native";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import "react-native-reanimated";

import { useColorScheme } from "@/hooks/use-color-scheme";
import { AuthProvider } from "@/contexts/AuthContext";

export default function RootLayout() {
  const colorScheme = useColorScheme();

  return (
    <AuthProvider>
      <ThemeProvider value={colorScheme === "dark" ? DarkTheme : DefaultTheme}>
        <Stack screenOptions={{ headerShown: false }}>
          <Stack.Screen name="index" />
          <Stack.Screen
            name="auth/welcome"
            options={{
              gestureEnabled: false,
              fullScreenGestureEnabled: false,
            }}
          />
          <Stack.Screen
            name="auth/register"
            options={{
              gestureEnabled: false,
              fullScreenGestureEnabled: false,
              headerBackButtonMenuEnabled: false,
              animation: "none",
            }}
          />
          <Stack.Screen
            name="auth/login"
            options={{
              gestureEnabled: false,
              fullScreenGestureEnabled: false,
              headerBackButtonMenuEnabled: false,
              animation: "none",
            }}
          />
          <Stack.Screen
            name="auth/forgot-password"
            options={{
              gestureEnabled: false,
              fullScreenGestureEnabled: false,
              headerBackButtonMenuEnabled: false,
              animation: "none",
            }}
          />
          <Stack.Screen name="auth/verification-pending" />
          <Stack.Screen
            name="dashboard"
            options={{
              gestureEnabled: false,
              fullScreenGestureEnabled: false,
            }}
          />
          <Stack.Screen
            name="profile/index"
            options={{
              headerBackButtonMenuEnabled: false,
              gestureEnabled: true,
              fullScreenGestureEnabled: true,
            }}
          />
          <Stack.Screen
            name="profile/change-password"
            options={{
              headerBackButtonMenuEnabled: false,
              gestureEnabled: true,
              fullScreenGestureEnabled: true,
            }}
          />
          <Stack.Screen
            name="profile/billing"
            options={{
              headerBackButtonMenuEnabled: false,
              gestureEnabled: true,
              fullScreenGestureEnabled: true,
            }}
          />
        </Stack>
        <StatusBar style="light" />
      </ThemeProvider>
    </AuthProvider>
  );
}
