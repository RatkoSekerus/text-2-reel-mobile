import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator,
} from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import { Image } from "expo-image";
import { Ionicons } from "@expo/vector-icons";
import { supabase } from "../../lib/supabase";
import Input from "../../components/ui/Input";
import { Colors } from "../../constants/colors";

export default function ResetPasswordScreen() {
  const router = useRouter();
  const { token_hash, type } = useLocalSearchParams();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [validSession, setValidSession] = useState(false);
  const [checkingSession, setCheckingSession] = useState(true);

  useEffect(() => {
    const verifyTokenAndCheckSession = async () => {
      // If we have a token_hash and type, verify it first to establish a session
      if (token_hash && type === "recovery") {
        try {
          const { error: verifyError } = await supabase.auth.verifyOtp({
            token_hash: token_hash as string,
            type: "recovery",
          });

          if (verifyError) {
            console.error("Token verification error:", verifyError);
            setCheckingSession(false);
            return;
          }
        } catch (err) {
          console.error("Error verifying token:", err);
          setCheckingSession(false);
          return;
        }
      }

      // Check for a valid session (either existing or newly established)
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (session) {
        setValidSession(true);
      }
      setCheckingSession(false);
    };

    verifyTokenAndCheckSession();
  }, [token_hash, type]);

  const passwordMeetsRequirements = (value: string) => {
    if (!value) return false;
    const minLength = value.length >= 10;
    const hasSpecialChar = /[^A-Za-z0-9]/.test(value);
    return minLength && hasSpecialChar;
  };

  const passwordError =
    password && !passwordMeetsRequirements(password)
      ? "Password must be at least 10 characters and include a special character"
      : undefined;

  const confirmPasswordError =
    confirmPassword && passwordMeetsRequirements(password)
      ? password !== confirmPassword
        ? "Passwords do not match"
        : undefined
      : undefined;

  const handleSubmit = async () => {
    setError("");

    if (!passwordMeetsRequirements(password)) {
      setError(
        "Password must be at least 10 characters long and include at least one special character"
      );
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    setLoading(true);

    try {
      const { error: updateError } = await supabase.auth.updateUser({
        password: password,
      });

      if (updateError) {
        setError(
          updateError.message || "Failed to update password. Please try again."
        );
        setLoading(false);
        return;
      }

      setSuccess(true);

      // Redirect to login after a short delay
      setTimeout(() => {
        router.replace("/auth/login");
      }, 2000);
    } catch (err: any) {
      setError(err.message || "An error occurred. Please try again.");
      setLoading(false);
    }
  };

  if (checkingSession) {
    return (
      <LinearGradient
        colors={Colors.background.gradient as [string, string, string]}
        style={styles.container}
      >
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Verifying reset link...</Text>
        </View>
      </LinearGradient>
    );
  }

  if (!validSession) {
    return (
      <LinearGradient
        colors={Colors.background.gradient as [string, string, string]}
        style={styles.container}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.logoContainer}>
            <Image
              source={require("../../assets/images/text-to-reel-icon.png")}
              style={styles.logoImage}
              contentFit="contain"
            />
          </View>

          <View style={styles.content}>
            <Ionicons name="close-circle-outline" size={64} color="#FF4444" />
            <Text style={styles.title}>Invalid Link</Text>
            <Text style={styles.text}>
              This password reset link is invalid or has expired. Please request
              a new one.
            </Text>

            <TouchableOpacity
              style={styles.requestNewButton}
              onPress={() => router.push("/auth/forgot-password")}
              activeOpacity={0.8}
            >
              <Text style={styles.requestNewButtonText}>Request New Link</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.backToLoginButton}
              onPress={() => router.replace("/auth/welcome")}
              activeOpacity={0.8}
            >
              <Text style={styles.backToLoginButtonText}>Back to Home</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </LinearGradient>
    );
  }

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
          <View style={styles.logoContainer}>
            <Image
              source={require("../../assets/images/text-to-reel-icon.png")}
              style={styles.logoImage}
              contentFit="contain"
            />
          </View>

          <View style={styles.content}>
            <Ionicons
              name="checkmark-circle-outline"
              size={64}
              color={Colors.cyan[500]}
            />
            <Text style={styles.title}>Password Updated</Text>
            <Text style={styles.text}>
              Your password has been successfully updated. Redirecting to
              login...
            </Text>
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

        <View style={styles.formContainer}>
          <Text style={styles.formTitle}>Set New Password</Text>
          <Text style={styles.formSubtitle}>Enter your new password below</Text>

          {error && (
            <View style={styles.errorContainer}>
              <Text style={styles.errorText}>{error}</Text>
            </View>
          )}

          <Input
            value={password}
            onChangeText={setPassword}
            placeholder="Enter new password (min 10 characters...)"
            secureTextEntry
            showPasswordToggle
            error={passwordError}
            disabled={loading}
          />

          <Input
            value={confirmPassword}
            onChangeText={setConfirmPassword}
            placeholder="Confirm new password"
            secureTextEntry
            showPasswordToggle
            error={confirmPasswordError}
            disabled={loading}
          />

          <TouchableOpacity
            style={[styles.updateButton, loading && styles.buttonDisabled]}
            onPress={handleSubmit}
            disabled={loading || !!passwordError || !!confirmPasswordError}
            activeOpacity={0.8}
          >
            <Text style={styles.updateButtonText}>
              {loading ? "Updating..." : "Update Password"}
            </Text>
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
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    color: "#FFFFFF",
    fontSize: 16,
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
  content: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    width: "100%",
  },
  formContainer: {
    flex: 1,
    width: "100%",
  },
  formTitle: {
    fontSize: 28,
    fontWeight: "bold",
    color: "#FFFFFF",
    marginBottom: 8,
    textAlign: "center",
  },
  formSubtitle: {
    fontSize: 14,
    color: "#B0B0B0",
    marginBottom: 24,
    textAlign: "center",
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#FFFFFF",
    marginTop: 16,
    marginBottom: 16,
    textAlign: "center",
  },
  text: {
    fontSize: 16,
    color: "#B0B0B0",
    textAlign: "center",
    lineHeight: 24,
    marginBottom: 24,
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
  updateButton: {
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
  updateButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#FFFFFF",
  },
  requestNewButton: {
    backgroundColor: Colors.cyan[500],
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 32,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 16,
    shadowColor: Colors.cyan[500],
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  requestNewButtonText: {
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
});
