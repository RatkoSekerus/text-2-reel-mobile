import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
} from "react-native";
import { useRouter } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import { Image } from "expo-image";
import { Ionicons } from "@expo/vector-icons";
import Constants from "expo-constants";
import { supabase } from "../../lib/supabase";
import Input from "../../components/ui/Input";
import { Colors } from "../../constants/colors";

export default function ForgotPasswordScreen() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  const handleSubmit = async () => {
    setError("");
    setLoading(true);

    try {
      // Configure redirect URL for password reset deep link
      const redirectUrl = `${
        Constants.expoConfig?.scheme || "text2reel"
      }://auth/reset-password`;

      const { error: resetError } = await supabase.auth.resetPasswordForEmail(
        email,
        {
          redirectTo: redirectUrl,
        }
      );

      if (resetError) {
        setError("Failed to send reset email. Please try again.");
        setLoading(false);
        return;
      }

      setSuccess(true);
    } catch {
      setError("An error occurred. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <LinearGradient
        colors={Colors.background.gradient as [string, string, string]}
        style={styles.container}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.replace("/auth/welcome")}
          >
            <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
          </TouchableOpacity>

          <View style={styles.logoContainer}>
            <Image
              source={require("../../assets/images/text-to-reel-icon.png")}
              style={styles.logoImage}
              contentFit="contain"
            />
          </View>

          <View style={styles.successContainer}>
            <Text style={styles.successTitle}>Check Your Email</Text>
            <Text style={styles.successText}>
              We&apos;ve sent a password reset link to {email}
            </Text>
            <Text style={styles.successSubtext}>
              Click the link in the email to reset your password. If you
              don&apos;t see the email, check your spam folder.
            </Text>

            <TouchableOpacity
              style={styles.backToLoginButton}
              onPress={() => router.push("/auth/login")}
              activeOpacity={0.8}
            >
              <Text style={styles.backToLoginButtonText}>Back to Login</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </LinearGradient>
    );
  }

  return (
    <LinearGradient
      colors={Colors.background.gradient as [string, string, string]}
      style={styles.container}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        {/* Back Button */}
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
        </TouchableOpacity>

        {/* Logo */}
        <View style={styles.logoContainer}>
          <Image
            source={require("../../assets/images/text-to-reel-icon.png")}
            style={styles.logoImage}
            contentFit="contain"
          />
        </View>

        {/* Form */}
        <View style={styles.formContainer}>
          <Text style={styles.title}>Reset Password</Text>
          <Text style={styles.subtitle}>
            Enter your email to receive a password reset link
          </Text>

          {error && (
            <View style={styles.errorContainer}>
              <Text style={styles.errorText}>{error}</Text>
            </View>
          )}

          <Input
            value={email}
            onChangeText={setEmail}
            placeholder="Enter your email"
            keyboardType="email-address"
            autoCapitalize="none"
            disabled={loading}
          />

          <TouchableOpacity
            style={[styles.sendResetButton, loading && styles.buttonDisabled]}
            onPress={handleSubmit}
            disabled={loading}
            activeOpacity={0.8}
          >
            <Text style={styles.sendResetButtonText}>
              {loading ? "Sending..." : "Send Reset Link"}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.backToLoginButton}
            onPress={() => router.push("/auth/login")}
            activeOpacity={0.8}
          >
            <Text style={styles.backToLoginButtonText}>Back to Login</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingTop: 60,
    paddingBottom: 40,
  },
  backButton: {
    alignSelf: "flex-start",
    marginBottom: 30,
    padding: 8,
  },
  logoContainer: {
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 30,
  },
  logoImage: {
    width: 100,
    height: 100,
  },
  formContainer: {
    flex: 1,
    width: "100%",
  },
  title: {
    fontSize: 28,
    fontWeight: "bold",
    color: "#FFFFFF",
    marginBottom: 8,
    textAlign: "center",
  },
  subtitle: {
    fontSize: 14,
    color: "#B0B0B0",
    marginBottom: 24,
    textAlign: "center",
  },
  errorContainer: {
    backgroundColor: "rgba(255, 68, 68, 0.2)",
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
  },
  errorText: {
    color: "#FF4444",
    fontSize: 14,
  },
  sendResetButton: {
    backgroundColor: Colors.cyan[500],
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 8,
    shadowColor: Colors.cyan[500],
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  sendResetButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#FFFFFF",
  },
  backToLoginButton: {
    backgroundColor: "transparent",
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 16,
    borderWidth: 1,
    borderColor: Colors.cyan[500],
  },
  backToLoginButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: Colors.cyan[500],
  },
  successContainer: {
    flex: 1,
    width: "100%",
    alignItems: "center",
    justifyContent: "center",
  },
  successTitle: {
    fontSize: 28,
    fontWeight: "bold",
    color: "#FFFFFF",
    marginBottom: 16,
    textAlign: "center",
  },
  successText: {
    fontSize: 16,
    color: "#B0B0B0",
    marginBottom: 12,
    textAlign: "center",
  },
  successSubtext: {
    fontSize: 14,
    color: "#888888",
    marginBottom: 32,
    textAlign: "center",
    lineHeight: 20,
  },
});
