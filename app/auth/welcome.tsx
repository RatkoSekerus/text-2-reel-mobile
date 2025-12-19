import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  Platform,
} from "react-native";
import { useRouter } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import { Image } from "expo-image";
import * as WebBrowser from "expo-web-browser";
import Constants from "expo-constants";
import { supabase } from "../../lib/supabase";
import { Colors } from "../../constants/colors";
import GlowText from "../../components/GlowText";

// Complete the OAuth session in the browser
WebBrowser.maybeCompleteAuthSession();

export default function WelcomeScreen() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const handleGoogleSignIn = async () => {
    setLoading(true);
    try {
      // Create redirect URI for deep linking
      // IMPORTANT: Always use the production scheme (text2reel://)
      // Custom URL schemes only work in production builds, not in Expo Go
      // For development testing, you need to build the app or use a development build
      const redirectUrl = "text2reel://auth/callback";

      console.log("Using redirect URL:", redirectUrl);
      console.log("Platform:", Platform.OS);
      console.log("App scheme:", Constants.expoConfig?.scheme);

      // Use Supabase's built-in OAuth flow which handles PKCE correctly
      // Supabase uses authorization code flow with PKCE, which Google accepts
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: redirectUrl,
          skipBrowserRedirect: false,
        },
      });

      if (error) {
        Alert.alert("Error", error.message);
        setLoading(false);
        return;
      }

      // If we get a URL, open it in the browser
      if (data?.url) {
        console.log("Opening OAuth URL:", data.url);
        console.log("Expected redirect URL:", redirectUrl);

        const result = await WebBrowser.openAuthSessionAsync(
          data.url,
          redirectUrl
        );

        console.log(
          "OAuth result:",
          result.type,
          "url" in result ? result.url : "no url"
        );

        if (result.type === "success" && "url" in result && result.url) {
          const resultUrl = result.url;
          // Check if the result URL is our deep link
          if (
            resultUrl.startsWith("text2reel://") ||
            resultUrl.startsWith("com.text2reel.app://")
          ) {
            // The deep link was triggered, the callback handler will process it
            console.log("Deep link received, callback handler will process");
            // Don't set loading to false yet - let the callback handler manage navigation
            return;
          } else {
            // If we get a different URL, try to extract tokens and set session
            console.log(
              "Received URL that is not deep link, attempting to parse:",
              resultUrl
            );

            // Parse tokens from the URL
            const url = resultUrl;
            const hashIndex = url.indexOf("#");
            const queryIndex = url.indexOf("?");

            let accessToken: string | null = null;
            let refreshToken: string | null = null;

            if (hashIndex !== -1) {
              const hash = url.substring(hashIndex + 1);
              const params = hash.split("&");
              params.forEach((param) => {
                const [key, value] = param.split("=");
                if (key === "access_token")
                  accessToken = decodeURIComponent(value);
                if (key === "refresh_token")
                  refreshToken = decodeURIComponent(value);
              });
            } else if (queryIndex !== -1) {
              const query = url.substring(queryIndex + 1).split("#")[0];
              const params = query.split("&");
              params.forEach((param) => {
                const [key, value] = param.split("=");
                if (key === "access_token")
                  accessToken = decodeURIComponent(value);
                if (key === "refresh_token")
                  refreshToken = decodeURIComponent(value);
              });
            }

            if (accessToken && refreshToken) {
              const { error: sessionError } = await supabase.auth.setSession({
                access_token: accessToken,
                refresh_token: refreshToken,
              });

              if (sessionError) {
                Alert.alert("Error", sessionError.message);
                setLoading(false);
                return;
              }

              // Success - navigation will be handled by auth state change
              setLoading(false);
            } else {
              // Wait and check for session
              setTimeout(async () => {
                const {
                  data: { session },
                  error: sessionError,
                } = await supabase.auth.getSession();
                if (sessionError || !session) {
                  Alert.alert(
                    "Error",
                    "Failed to establish session. Please try again."
                  );
                  setLoading(false);
                  return;
                }
                setLoading(false);
              }, 1500);
            }
          }
        } else if (result.type === "cancel") {
          setLoading(false);
        } else {
          Alert.alert("Error", "Google sign-in was cancelled or failed");
          setLoading(false);
        }
      } else {
        Alert.alert("Error", "Failed to initiate Google sign-in");
        setLoading(false);
      }
    } catch (error: any) {
      Alert.alert(
        "Error",
        error.message || "An error occurred during Google sign-in"
      );
      setLoading(false);
    }
  };

  const handleOpenTerms = async () => {
    await WebBrowser.openBrowserAsync(
      "https://text2reel.ai/terms-of-service?standalone=true"
    );
  };

  const handleOpenPrivacyPolicy = async () => {
    await WebBrowser.openBrowserAsync(
      "https://text2reel.ai/privacy-policy?standalone=true"
    );
  };

  return (
    <LinearGradient
      colors={Colors.background.gradient as [string, string, string]}
      style={styles.container}
    >
      <View style={styles.content}>
        {/* App Name */}
        <GlowText animated style={styles.appName}>
          text2reel
        </GlowText>

        {/* Logo */}
        <View style={styles.logoContainer}>
          <Image
            source={require("../../assets/images/text-to-reel-icon.png")}
            style={styles.logoImage}
            contentFit="contain"
          />
        </View>

        {/* Buttons */}
        <View style={styles.buttonContainer}>
          {/* Continue with Google */}
          <TouchableOpacity
            style={[styles.googleButton, loading && styles.buttonDisabled]}
            onPress={handleGoogleSignIn}
            disabled={loading}
            activeOpacity={0.8}
          >
            <Image
              source={{
                uri: "https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg",
              }}
              style={styles.googleIcon}
              contentFit="contain"
            />
            <Text style={styles.googleButtonText}>Continue with Google</Text>
          </TouchableOpacity>

          {/* Sign Up */}
          <TouchableOpacity
            style={styles.signUpButton}
            onPress={() => router.push("/auth/register")}
            activeOpacity={0.8}
          >
            <Text style={styles.signUpButtonText}>Sign Up</Text>
          </TouchableOpacity>

          {/* Sign In */}
          <TouchableOpacity
            style={styles.signInButton}
            onPress={() => router.push("/auth/login")}
            activeOpacity={0.8}
          >
            <Text style={styles.signInButtonText}>Sign In</Text>
          </TouchableOpacity>
        </View>

        {/* Legal Disclaimer */}
        <View style={styles.legalContainer}>
          <Text style={styles.legalText}>
            By signing up you agree to{" "}
            <Text style={styles.legalLink} onPress={handleOpenTerms}>
              terms
            </Text>{" "}
            and{" "}
            <Text style={styles.legalLink} onPress={handleOpenPrivacyPolicy}>
              privacy policy
            </Text>
          </Text>
        </View>
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 24,
    paddingTop: 60,
    paddingBottom: 40,
  },
  appName: {
    fontSize: 32,
    fontWeight: "900",
    marginBottom: 40,
  },
  logoContainer: {
    marginBottom: 60,
    alignItems: "center",
    justifyContent: "center",
  },
  logoImage: {
    width: 120,
    height: 120,
  },
  buttonContainer: {
    width: "100%",
    gap: 16,
    marginBottom: 40,
  },
  googleButton: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 20,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  googleIcon: {
    width: 20,
    height: 20,
    marginRight: 12,
  },
  googleButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#000000",
  },
  signUpButton: {
    backgroundColor: Colors.cyan[500],
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: Colors.cyan[500],
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  signUpButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#FFFFFF",
  },
  signInButton: {
    backgroundColor: "#1a3a5c",
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#2a4a6c",
  },
  signInButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#FFFFFF",
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  legalContainer: {
    marginTop: "auto",
    paddingHorizontal: 20,
  },
  legalText: {
    fontSize: 12,
    color: "#B0B0B0",
    textAlign: "center",
    lineHeight: 18,
  },
  legalLink: {
    color: Colors.cyan[500],
    textDecorationLine: "underline",
  },
});
