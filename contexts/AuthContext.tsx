import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  ReactNode,
} from "react";
import { User, Session } from "@supabase/supabase-js";
import { supabase } from "../lib/supabase";
import AsyncStorage from "@react-native-async-storage/async-storage";

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signOut: () => Promise<void>;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Get initial session with error handling
    const initializeAuth = async () => {
      try {
        const {
          data: { session },
          error,
        } = await supabase.auth.getSession();

        if (error) {
          // If there's an error (like invalid refresh token), clear the session
          console.warn("Session error:", error.message);

          // Clear potentially corrupted auth data from AsyncStorage
          if (
            error.message?.includes("Refresh Token") ||
            error.message?.includes("Invalid")
          ) {
            try {
              // Clear Supabase auth storage
              const keys = await AsyncStorage.getAllKeys();
              const authKeys = keys.filter(
                (key) => key.includes("supabase") || key.includes("auth")
              );
              if (authKeys.length > 0) {
                await AsyncStorage.multiRemove(authKeys);
              }
            } catch (clearError) {
              console.warn("Error clearing storage:", clearError);
            }
          }

          // Set session to null and continue
          setSession(null);
          setUser(null);
        } else {
          setSession(session);
          setUser(session?.user ?? null);
        }
      } catch (err) {
        console.error("Error initializing auth:", err);
        setSession(null);
        setUser(null);
      } finally {
        setLoading(false);
      }
    };

    initializeAuth();

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signOut = async () => {
    try {
      await supabase.auth.signOut();
      // Clear any remaining auth data
      const keys = await AsyncStorage.getAllKeys();
      const authKeys = keys.filter(
        (key) => key.includes("supabase") || key.includes("auth")
      );
      if (authKeys.length > 0) {
        await AsyncStorage.multiRemove(authKeys);
      }
    } catch (error) {
      console.error("Error signing out:", error);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        loading,
        signOut,
        isAuthenticated: !!user,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuthContext() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuthContext must be used within an AuthProvider");
  }
  return context;
}
