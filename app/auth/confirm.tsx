import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
} from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import { Image } from "expo-image";
import { Ionicons } from "@expo/vector-icons";
import { supabase } from "../../lib/supabase";
import { Colors } from "../../constants/colors";
import * as Linking from "expo-linking";

export default function ConfirmEmailScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const [status, setStatus] = useState<"loading" | "success" | "error">(
    "loading"
  );
  const [message, setMessage] = useState("Verifying your email...");

  useEffect(() => {
    const handleEmailConfirmation = async () => {
      try {
        // Get the URL from params or from Linking
        const url = params.token_hash
          ? `${Linking.createURL("auth/confirm")}?token_hash=${
              params.token_hash
            }&type=${params.type || "signup"}`
          : undefined;

        if (url) {
          // Extract token_hash and type from URL
          const tokenHash = params.token_hash as string;
          const type = (params.type as string) || "signup";

          if (type === "signup" || type === "email") {
            // Verify the email
            const { error } = await supabase.auth.verifyOtp({
              token_hash: tokenHash,
              type: type === "signup" ? "signup" : "email",
            });

            if (error) {
              setStatus("error");
              setMessage(
                error.message ||
                  "Failed to verify email. The link may have expired."
              );
            } else {
              setStatus("success");
              setMessage(
                "Email verified successfully! Redirecting to dashboard..."
              );

              // Redirect to dashboard after a short delay
              setTimeout(() => {
                router.replace("/dashboard");
              }, 2000);
            }
          } else if (type === "recovery") {
            // This is a password reset link, redirect to reset-password
            setStatus("success");
            setMessage("Password reset link verified. Redirecting...");

            setTimeout(() => {
              router.replace("/auth/reset-password");
            }, 1500);
          }
        } else {
          // Try to get session to check if already verified
          const {
            data: { session },
          } = await supabase.auth.getSession();
          if (session?.user?.email_confirmed_at) {
            setStatus("success");
            setMessage("Email already verified! Redirecting...");
            setTimeout(() => {
              router.replace("/dashboard");
            }, 1500);
          } else {
            setStatus("error");
            setMessage(
              "Invalid confirmation link. Please request a new verification email."
            );
          }
        }
      } catch (error: any) {
        setStatus("error");
        setMessage(
          error.message || "An error occurred during email verification."
        );
      }
    };

    handleEmailConfirmation();
  }, [params]);

  return (
    <LinearGradient
      colors={Colors.background.gradient as [string, string, string]}
      style={styles.container}
    >
      <View style={styles.content}>
        <View style={styles.logoContainer}>
          <Image
            source={require("../../assets/images/text-to-reel-icon.png")}
            style={styles.logoImage}
            contentFit="contain"
          />
        </View>

        {status === "loading" && (
          <>
            <ActivityIndicator size="large" color={Colors.cyan[500]} />
            <Text style={styles.message}>{message}</Text>
          </>
        )}

        {status === "success" && (
          <>
            <Ionicons
              name="checkmark-circle-outline"
              size={64}
              color={Colors.cyan[500]}
            />
            <Text style={styles.title}>Email Verified</Text>
            <Text style={styles.message}>{message}</Text>
          </>
        )}

        {status === "error" && (
          <>
            <Ionicons name="close-circle-outline" size={64} color="#FF4444" />
            <Text style={styles.title}>Verification Failed</Text>
            <Text style={styles.message}>{message}</Text>

            <TouchableOpacity
              style={styles.button}
              onPress={() => router.replace("/auth/welcome")}
              activeOpacity={0.8}
            >
              <Text style={styles.buttonText}>Back to Home</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.secondaryButton}
              onPress={() => router.push("/auth/register")}
              activeOpacity={0.8}
            >
              <Text style={styles.secondaryButtonText}>Register Again</Text>
            </TouchableOpacity>
          </>
        )}
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
  },
  logoContainer: {
    marginBottom: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  logoImage: {
    width: 100,
    height: 100,
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#FFFFFF",
    marginTop: 16,
    marginBottom: 16,
    textAlign: "center",
  },
  message: {
    fontSize: 16,
    color: "#B0B0B0",
    textAlign: "center",
    lineHeight: 24,
    marginTop: 16,
    paddingHorizontal: 20,
  },
  button: {
    backgroundColor: Colors.cyan[500],
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 32,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 32,
    shadowColor: Colors.cyan[500],
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  buttonText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#FFFFFF",
  },
  secondaryButton: {
    backgroundColor: "transparent",
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 32,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 16,
    borderWidth: 1,
    borderColor: Colors.cyan[500],
  },
  secondaryButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: Colors.cyan[500],
  },
});
