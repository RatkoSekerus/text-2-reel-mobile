import { createClient } from "@supabase/supabase-js";
import AsyncStorage from "@react-native-async-storage/async-storage";
import Constants from "expo-constants";

// Get Supabase credentials from environment variables (set in Expo dashboard)
// Fallback to app.json extra config for local development only
const supabaseUrl =
  process.env.EXPO_PUBLIC_SUPABASE_URL ||
  Constants.expoConfig?.extra?.supabaseUrl ||
  "";

const supabaseAnonKey =
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ||
  Constants.expoConfig?.extra?.supabaseAnonKey ||
  "";

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    "Supabase credentials not configured. Please set EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY in Expo environment variables."
  );
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true, // Enable to detect sessions from URLs
    storageKey: 'supabase.auth.token',
  },
});

// Add global error handler for auth errors
supabase.auth.onAuthStateChange((event, session) => {
  if (event === 'TOKEN_REFRESHED') {
    // Token refreshed successfully
    return;
  }
  
  if (event === 'SIGNED_OUT' || !session) {
    // Clear storage on sign out
    AsyncStorage.getAllKeys().then(keys => {
      const authKeys = keys.filter(key => 
        key.includes('supabase') || key.includes('auth')
      );
      if (authKeys.length > 0) {
        AsyncStorage.multiRemove(authKeys).catch(console.warn);
      }
    });
  }
});
