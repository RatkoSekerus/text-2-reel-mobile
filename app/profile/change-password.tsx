import React, { useMemo, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";

import { Colors } from "@/constants/colors";
import { useAuthContext } from "@/contexts/AuthContext";
import { supabase } from "@/lib/supabase";

export default function ChangePasswordScreen() {
  const router = useRouter();
  const { user } = useAuthContext();

  const userEmail = user?.email ?? "";
  const isOAuthUser = useMemo(() => {
    const provider = user?.app_metadata?.provider;
    return !!provider && provider !== "email";
  }, [user?.app_metadata?.provider]);

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmNewPassword, setConfirmNewPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const handleSubmit = async () => {
    setError(null);
    setSuccess(null);

    if (!userEmail) {
      setError("No user email found.");
      return;
    }

    if (newPassword.length < 6) {
      setError("New password must be at least 6 characters.");
      return;
    }

    if (newPassword !== confirmNewPassword) {
      setError("New passwords do not match.");
      return;
    }

    if (!currentPassword) {
      setError("Please enter your old password.");
      return;
    }

    setLoading(true);
    try {
      // Verify current password (matches web behavior)
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: userEmail,
        password: currentPassword,
      });

      if (signInError) {
        setError(
          isOAuthUser
            ? "This account was created with Google sign-in. If you never set a password, use “Forgot password” to create one."
            : "Old password is incorrect."
        );
        return;
      }

      const { error: updateError } = await supabase.auth.updateUser({
        password: newPassword,
      });

      if (updateError) {
        setError("Failed to update password. Please try again.");
        return;
      }

      setSuccess("Password updated successfully.");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmNewPassword("");
    } catch (e) {
      setError("An error occurred. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <LinearGradient
      colors={Colors.background.gradient as [string, string, string]}
      style={styles.container}
    >
      {/* Top bar */}
      <View style={styles.topBar}>
        <TouchableOpacity
          onPress={() => router.back()}
          activeOpacity={0.8}
          style={styles.backButton}
        >
          <Ionicons name="chevron-back" size={24} color="#FFFFFF" />
        </TouchableOpacity>
        <Text style={styles.title}>Change password</Text>
        <View style={styles.topBarRightSpacer} />
      </View>

      <View style={styles.form}>
        <Text style={styles.label}>Old password</Text>
        <TextInput
          value={currentPassword}
          onChangeText={setCurrentPassword}
          placeholder="Enter old password"
          placeholderTextColor={Colors.text.gray[500]}
          secureTextEntry
          editable={!loading}
          style={styles.input}
        />

        <Text style={[styles.label, { marginTop: 12 }]}>New password</Text>
        <TextInput
          value={newPassword}
          onChangeText={setNewPassword}
          placeholder="Enter new password"
          placeholderTextColor={Colors.text.gray[500]}
          secureTextEntry
          editable={!loading}
          style={styles.input}
        />

        <Text style={[styles.label, { marginTop: 12 }]}>
          Confirm new password
        </Text>
        <TextInput
          value={confirmNewPassword}
          onChangeText={setConfirmNewPassword}
          placeholder="Confirm new password"
          placeholderTextColor={Colors.text.gray[500]}
          secureTextEntry
          editable={!loading}
          style={styles.input}
        />

        {!!error && (
          <View style={styles.alertError}>
            <Ionicons name="alert-circle-outline" size={18} color="#F87171" />
            <Text style={styles.alertErrorText}>{error}</Text>
          </View>
        )}

        {!!success && (
          <View style={styles.alertSuccess}>
            <Ionicons name="checkmark-circle-outline" size={18} color="#34D399" />
            <Text style={styles.alertSuccessText}>{success}</Text>
          </View>
        )}

        <TouchableOpacity
          style={[styles.submitButton, loading && { opacity: 0.6 }]}
          onPress={handleSubmit}
          activeOpacity={0.9}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <Text style={styles.submitButtonText}>Submit</Text>
          )}
        </TouchableOpacity>
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: 60,
    paddingHorizontal: 16,
  },
  topBar: {
    height: 48,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 16,
  },
  backButton: {
    width: 44,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
  },
  title: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "700",
  },
  topBarRightSpacer: {
    width: 44,
    height: 44,
  },
  form: {},
  label: {
    color: Colors.text.gray[400],
    fontSize: 12,
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: "#3a3a3a",
    backgroundColor: "#111827",
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    color: "#FFFFFF",
    fontSize: 14,
  },
  alertError: {
    marginTop: 14,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(248, 113, 113, 0.35)",
    backgroundColor: "rgba(248, 113, 113, 0.08)",
    flexDirection: "row",
    gap: 10,
    alignItems: "flex-start",
  },
  alertErrorText: {
    flex: 1,
    color: "#FCA5A5",
    fontSize: 12,
    lineHeight: 16,
  },
  alertSuccess: {
    marginTop: 14,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(52, 211, 153, 0.35)",
    backgroundColor: "rgba(52, 211, 153, 0.08)",
    flexDirection: "row",
    gap: 10,
    alignItems: "flex-start",
  },
  alertSuccessText: {
    flex: 1,
    color: "#A7F3D0",
    fontSize: 12,
    lineHeight: 16,
  },
  submitButton: {
    marginTop: 16,
    backgroundColor: Colors.cyan[500],
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  submitButtonText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "800",
  },
});


