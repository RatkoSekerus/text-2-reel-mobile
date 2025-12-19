import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
} from "react-native";
import { useRouter } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import { Image } from "expo-image";
import { Ionicons } from "@expo/vector-icons";
import { supabase } from "../../lib/supabase";
import { Colors } from "../../constants/colors";
import Constants from "expo-constants";

export default function VerificationPendingScreen() {
  const router = useRouter();
  const [resending, setResending] = useState(false);
  const [email, setEmail] = useState("");

  // Try to get email from route params or auth state
  React.useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user?.email) {
        setEmail(user.email);
      }
    });
  }, []);

  const handleResendEmail = async () => {
    if (!email) {
      Alert.alert("Error", "Email address not found. Please register again.");
      return;
    }

    setResending(true);
    try {
      const { error } = await supabase.auth.resend({
        type: "signup",
        email: email,
        options: {
          emailRedirectTo: `${
            Constants.expoConfig?.scheme || "text2reel"
          }://auth/confirm`,
        },
      });

      if (error) {
        Alert.alert("Error", error.message);
      } else {
        Alert.alert(
          "Success",
          "Verification email sent! Please check your inbox."
        );
      }
    } catch (error: any) {
      Alert.alert("Error", error.message || "Failed to resend email");
    } finally {
      setResending(false);
    }
  };

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

        <View style={styles.content}>
          <View style={styles.iconContainer}>
            <Ionicons name="mail-outline" size={64} color={Colors.cyan[500]} />
          </View>

          <Text style={styles.title}>Check Your Email</Text>
          <Text style={styles.text}>
            We&apos;ve sent a verification email to{" "}
            {email || "your email address"}.
          </Text>
          <Text style={styles.subtext}>
            Please click the verification link in the email to activate your
            account. If you don&apos;t see the email, check your spam folder.
          </Text>

          {email && (
            <TouchableOpacity
              style={[styles.resendButton, resending && styles.buttonDisabled]}
              onPress={handleResendEmail}
              disabled={resending}
              activeOpacity={0.8}
            >
              <Text style={styles.resendButtonText}>
                {resending ? "Sending..." : "Resend Verification Email"}
              </Text>
            </TouchableOpacity>
          )}

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
  content: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 24,
  },
  iconContainer: {
    marginBottom: 24,
    alignItems: "center",
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#FFFFFF",
    marginBottom: 16,
    textAlign: "center",
  },
  text: {
    fontSize: 16,
    color: "#B0B0B0",
    textAlign: "center",
    lineHeight: 24,
    marginBottom: 12,
  },
  subtext: {
    fontSize: 14,
    color: "#888888",
    textAlign: "center",
    lineHeight: 20,
    marginBottom: 24,
  },
  resendButton: {
    backgroundColor: Colors.cyan[500],
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 24,
    marginTop: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  resendButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#FFFFFF",
  },
  backToLoginButton: {
    backgroundColor: "transparent",
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 24,
    marginTop: 16,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: Colors.cyan[500],
  },
  backToLoginButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: Colors.cyan[500],
  },
});
