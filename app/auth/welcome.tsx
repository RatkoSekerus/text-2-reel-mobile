import React, { useState } from "react";
import { View, Text, StyleSheet, TouchableOpacity, Alert } from "react-native";
import { useRouter } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import { Image } from "expo-image";
import * as WebBrowser from "expo-web-browser";
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
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: undefined, // Mobile apps handle this differently
        },
      });

      if (error) {
        Alert.alert("Error", error.message);
        setLoading(false);
        return;
      }

      // OAuth will open in browser, navigation will be handled by auth state change
    } catch {
      Alert.alert("Error", "An error occurred during Google sign-in");
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
            <View style={styles.googleIconContainer}>
              <View style={styles.googleLogo}>
                <View style={styles.googleLogoInner}>
                  <View
                    style={[
                      styles.googleColorBlock,
                      { backgroundColor: "#EA4335", top: 0, left: 0 },
                    ]}
                  />
                  <View
                    style={[
                      styles.googleColorBlock,
                      { backgroundColor: "#4285F4", top: 0, right: 0 },
                    ]}
                  />
                  <View
                    style={[
                      styles.googleColorBlock,
                      { backgroundColor: "#FBBC05", bottom: 0, left: 0 },
                    ]}
                  />
                  <View
                    style={[
                      styles.googleColorBlock,
                      { backgroundColor: "#34A853", bottom: 0, right: 0 },
                    ]}
                  />
                </View>
              </View>
            </View>
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
  googleIconContainer: {
    width: 24,
    height: 24,
    marginRight: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  googleLogo: {
    width: 20,
    height: 20,
    borderRadius: 10,
    overflow: "hidden",
    backgroundColor: "#FFFFFF",
  },
  googleLogoInner: {
    width: "100%",
    height: "100%",
    position: "relative",
  },
  googleColorBlock: {
    position: "absolute",
    width: "50%",
    height: "50%",
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
