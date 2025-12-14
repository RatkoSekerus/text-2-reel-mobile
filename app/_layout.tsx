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
        <Stack>
          <Stack.Screen name="index" options={{ headerShown: false }} />
          <Stack.Screen
            name="auth/welcome"
            options={{
              headerShown: false,
              gestureEnabled: false,
              fullScreenGestureEnabled: false,
            }}
          />
          <Stack.Screen
            name="auth/register"
            options={{
              headerShown: false,
              gestureEnabled: false,
              fullScreenGestureEnabled: false,
              headerBackButtonMenuEnabled: false,
              animation: "none",
            }}
          />
          <Stack.Screen
            name="auth/login"
            options={{
              headerShown: false,
              gestureEnabled: false,
              fullScreenGestureEnabled: false,
              headerBackButtonMenuEnabled: false,
              animation: "none",
            }}
          />
          <Stack.Screen
            name="auth/forgot-password"
            options={{
              headerShown: false,
              gestureEnabled: false,
              fullScreenGestureEnabled: false,
              headerBackButtonMenuEnabled: false,
              animation: "none",
            }}
          />
          <Stack.Screen
            name="auth/verification-pending"
            options={{ headerShown: false }}
          />
          <Stack.Screen
            name="dashboard"
            options={{
              headerShown: false,
              gestureEnabled: false,
              fullScreenGestureEnabled: false,
            }}
          />
        </Stack>
        <StatusBar style="light" />
      </ThemeProvider>
    </AuthProvider>
  );
}
