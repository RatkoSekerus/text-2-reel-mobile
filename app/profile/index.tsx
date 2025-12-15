import React, { useCallback, useState } from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import * as WebBrowser from "expo-web-browser";

import { Colors } from "@/constants/colors";
import { useAuthContext } from "@/contexts/AuthContext";

const TERMS_URL = "https://text2reel.ai/terms-of-service?standalone=true";
const PRIVACY_URL = "https://text2reel.ai/privacy-policy?standalone=true";
const ACCEPTABLE_USE_URL =
  "https://text2reel.ai/acceptable-use-policy?standalone=true";
const REFUND_URL = "https://text2reel.ai/refund-policy?standalone=true";

type RowProps = {
  icon: React.ComponentProps<typeof Ionicons>["name"];
  title: string;
  onPress: () => void;
  rightIcon?: React.ComponentProps<typeof Ionicons>["name"];
};

function Row({
  icon,
  title,
  onPress,
  rightIcon = "chevron-forward",
}: RowProps) {
  return (
    <TouchableOpacity style={styles.row} activeOpacity={0.85} onPress={onPress}>
      <View style={styles.rowLeft}>
        <Ionicons name={icon} size={18} color={Colors.cyan[500]} />
        <Text style={styles.rowTitle}>{title}</Text>
      </View>
      <Ionicons name={rightIcon} size={18} color={Colors.text.gray[400]} />
    </TouchableOpacity>
  );
}

export default function ProfileScreen() {
  const router = useRouter();
  const { user, signOut } = useAuthContext();
  const [signingOut, setSigningOut] = useState(false);

  const email = user?.email ?? "";

  const openExternal = useCallback(async (url: string) => {
    await WebBrowser.openBrowserAsync(url);
  }, []);

  const handleSignOut = useCallback(async () => {
    if (signingOut) return;
    try {
      setSigningOut(true);
      await signOut();
      // Reset navigation so no authenticated screens (like video viewer)
      // remain on the stack after logout.
      // First go to root; the index route will redirect to /auth/welcome.
      router.replace("/");
    } finally {
      setSigningOut(false);
    }
  }, [router, signOut, signingOut]);

  return (
    <LinearGradient
      colors={Colors.background.gradient as [string, string, string]}
      style={styles.container}
    >
      {/* Top bar */}
      <View style={styles.topBar}>
        <TouchableOpacity
          onPress={() => router.replace("/dashboard")}
          activeOpacity={0.8}
          style={styles.backButton}
        >
          <Ionicons name="chevron-back" size={24} color="#FFFFFF" />
        </TouchableOpacity>
        <Text style={styles.title}>Profile</Text>
        <View style={styles.topBarRightSpacer} />
      </View>

      {/* Flat list (no section containers) */}
      <View style={styles.list}>
        <Text style={styles.sectionHeader}>Account info</Text>

        <View style={styles.emailRow}>
          <Ionicons name="mail-outline" size={20} color={Colors.cyan[500]} />
          <View style={styles.emailTextCol}>
            <Text style={styles.emailLabel}>Email</Text>
            <Text style={styles.emailValue} numberOfLines={2}>
              {email || "—"}
            </Text>
          </View>
        </View>
        <View style={styles.divider} />

        <Row
          icon="lock-closed-outline"
          title="Change password"
          onPress={() => router.push("/profile/change-password")}
        />
        <View style={styles.divider} />

        <Row
          icon="card-outline"
          title="Billing & credits"
          onPress={() => router.push("/profile/billing")}
        />
        <View style={styles.divider} />

        <Text style={[styles.sectionHeader, { marginTop: 18 }]}>
          Terms & privacy policy
        </Text>

        <Row
          icon="document-text-outline"
          title="Terms and conditions"
          rightIcon="open-outline"
          onPress={() => openExternal(TERMS_URL)}
        />
        <View style={styles.divider} />

        <Row
          icon="shield-checkmark-outline"
          title="Privacy policy"
          rightIcon="open-outline"
          onPress={() => openExternal(PRIVACY_URL)}
        />
        <View style={styles.divider} />

        <Row
          icon="hand-left-outline"
          title="Acceptable Use"
          rightIcon="open-outline"
          onPress={() => openExternal(ACCEPTABLE_USE_URL)}
        />
        <View style={styles.divider} />

        <Row
          icon="cash-outline"
          title="Refund policy"
          rightIcon="open-outline"
          onPress={() => openExternal(REFUND_URL)}
        />

        <View style={[styles.divider, { marginTop: 18 }]} />
        <TouchableOpacity
          style={styles.signOutRow}
          activeOpacity={0.7}
          onPress={handleSignOut}
          disabled={signingOut}
        >
          <Text style={styles.signOutText}>
            {signingOut ? "Signing out..." : "Sign out"}
          </Text>
          <Ionicons name="log-out-outline" size={20} color="#F87171" />
        </TouchableOpacity>
        <View style={styles.divider} />
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: 60,
    paddingHorizontal: 0,
  },
  topBar: {
    height: 48,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 16,
    paddingHorizontal: 16,
  },
  backButton: {
    width: 44,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
  },
  title: {
    color: "#FFFFFF",
    fontSize: 18,
    fontWeight: "700",
  },
  topBarRightSpacer: {
    width: 44,
    height: 44,
  },
  list: {
    borderTopWidth: 1,
    borderTopColor: "rgba(255, 255, 255, 0.10)",
  },
  sectionHeader: {
    color: Colors.text.gray[400],
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 0.6,
    paddingHorizontal: 16,
    paddingVertical: 10,
    textTransform: "uppercase",
  },
  divider: {
    height: 1,
    backgroundColor: "rgba(255, 255, 255, 0.10)",
  },
  emailRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 16,
    backgroundColor: "rgba(0, 0, 0, 0.4)",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.08)",
  },
  emailTextCol: {
    flex: 1,
  },
  emailLabel: {
    color: Colors.text.gray[300],
    fontSize: 13,
    marginBottom: 6,
    fontWeight: "500",
  },
  emailValue: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "700",
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: "rgba(0, 0, 0, 0.06)",
  },
  rowLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    flex: 1,
  },
  rowTitle: {
    color: "#FFFFFF",
    fontSize: 18,
    fontWeight: "600",
  },
  signOutRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 16,
    paddingVertical: 16,
    backgroundColor: "rgba(248, 113, 113, 0.2)",
    borderWidth: 1,
    borderColor: "rgba(248, 113, 113, 0.4)",
    marginHorizontal: 16,
    marginVertical: 8,
    borderRadius: 12,
  },
  signOutText: {
    color: "#F87171",
    fontSize: 18,
    fontWeight: "700",
    flex: 1,
  },
});
