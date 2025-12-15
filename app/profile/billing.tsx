import React, { useMemo, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Modal,
  ActivityIndicator,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";

import { Colors } from "@/constants/colors";
import { PRICE_PER_VIDEO } from "@/constants/constants";
import { useAuthContext } from "@/contexts/AuthContext";
import { useBalance } from "@/hooks/useBalance";
import { supabase } from "@/lib/supabase";

const MAX_BALANCE = 100;

export default function BillingScreen() {
  const router = useRouter();
  const { user } = useAuthContext();
  const { balance, loading: loadingBalance, refetch } = useBalance();

  const [amount, setAmount] = useState<string>("");
  const [confirmVisible, setConfirmVisible] = useState(false);
  const [pendingAmount, setPendingAmount] = useState<number>(0);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const minimumTopUp = PRICE_PER_VIDEO;
  const parsedAmount = useMemo(() => {
    const v = parseFloat(amount);
    return Number.isFinite(v) ? v : NaN;
  }, [amount]);

  const handleAddCreditsPress = () => {
    setError(null);
    setSuccess(null);

    if (!user) {
      setError("User not authenticated.");
      return;
    }

    if (!amount || amount.trim() === "") {
      setError("Please enter an amount.");
      return;
    }

    if (!Number.isFinite(parsedAmount) || parsedAmount <= 0) {
      setError("Please enter a valid amount.");
      return;
    }

    if (parsedAmount < minimumTopUp) {
      setError(`Minimum top-up amount is $${minimumTopUp.toFixed(2)}.`);
      return;
    }

    const currentBalance = balance ?? 0;
    const newBalance = currentBalance + parsedAmount;

    if (newBalance > MAX_BALANCE) {
      setError(
        `Maximum credit balance is $${MAX_BALANCE}. Your current balance is $${currentBalance.toFixed(
          2
        )}. You can add up to $${(MAX_BALANCE - currentBalance).toFixed(2)}.`
      );
      return;
    }

    setPendingAmount(parsedAmount);
    setConfirmVisible(true);
  };

  const handleConfirmTopUp = async () => {
    if (!user) return;
    const parsed = pendingAmount;
    const currentBalance = balance ?? 0;
    const newBalance = currentBalance + parsed;

    setSubmitting(true);
    try {
      const { error: updateError } = await supabase
        .from("profiles")
        .update({ balance: newBalance })
        .eq("id", user.id);

      if (updateError) {
        setError("Failed to add credits. Please try again.");
        return;
      }

      // Record top up (mirrors web app)
      await supabase.from("top_up_history").insert({
        user_id: user.id,
        amount: parsedAmount,
        status: "completed",
        transaction_id: `TXN-${Date.now()}`,
      });

      setSuccess(`Successfully added $${parsed.toFixed(2)}.`);
      setAmount("");
      refetch();
    } catch {
      setError("An error occurred. Please try again.");
    } finally {
      setConfirmVisible(false);
      setPendingAmount(0);
      setSubmitting(false);
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
        <Text style={styles.title}>Billing & credits</Text>
        <View style={styles.topBarRightSpacer} />
      </View>

      {/* Current balance */}
      <View style={styles.balanceCard}>
        <Text style={styles.balanceCardLabel}>Current balance</Text>
        {loadingBalance ? (
          <View style={styles.balanceLoading}>
            <ActivityIndicator color={Colors.cyan[500]} />
            <Text style={styles.balanceLoadingText}>Loading...</Text>
          </View>
        ) : (
          <View style={styles.balanceRow}>
            <Text style={styles.balanceValue}>
              ${(balance ?? 0).toFixed(2)}
            </Text>
            <Text style={styles.balanceHint}>
              ≈ {((balance ?? 0) / PRICE_PER_VIDEO).toFixed(1)} videos
            </Text>
          </View>
        )}
      </View>

      {/* Add credits */}
      <Text style={styles.sectionTitle}>Add custom amount</Text>

      <Text style={styles.label}>Amount ($)</Text>
      <TextInput
        value={amount}
        onChangeText={(t) => {
          setAmount(t);
          setError(null);
          setSuccess(null);
        }}
        placeholder="Enter amount"
        placeholderTextColor={Colors.text.gray[500]}
        keyboardType="decimal-pad"
        editable={!submitting}
        style={styles.input}
      />
      <Text style={styles.helpText}>
        Minimum: ${minimumTopUp.toFixed(2)}. Maximum balance: ${MAX_BALANCE}.
      </Text>

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
        style={[styles.submitButton, submitting && { opacity: 0.6 }]}
        onPress={handleAddCreditsPress}
        activeOpacity={0.9}
        disabled={submitting}
      >
        {submitting ? (
          <ActivityIndicator color="#FFFFFF" />
        ) : (
          <Text style={styles.submitButtonText}>Add credits</Text>
        )}
      </TouchableOpacity>

      {/* Confirmation modal */}
      <Modal
        visible={confirmVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setConfirmVisible(false)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Confirm top up</Text>
            <Text style={styles.modalText}>
              Add ${pendingAmount.toFixed(2)} to your balance?
            </Text>
            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.modalCancel}
                activeOpacity={0.9}
                onPress={() => setConfirmVisible(false)}
                disabled={submitting}
              >
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalOk, submitting && { opacity: 0.7 }]}
                activeOpacity={0.9}
                onPress={handleConfirmTopUp}
                disabled={submitting}
              >
                {submitting ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <Text style={styles.modalOkText}>OK</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: 60,
    paddingHorizontal: 8,
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
  balanceCard: {
    borderWidth: 1,
    borderColor: "rgba(6, 182, 212, 0.35)",
    backgroundColor: "rgba(6, 182, 212, 0.08)",
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
  },
  balanceCardLabel: {
    color: Colors.text.gray[400],
    fontSize: 12,
    marginBottom: 8,
  },
  balanceRow: {
    flexDirection: "row",
    alignItems: "baseline",
    gap: 10,
  },
  balanceValue: {
    color: Colors.cyan[400],
    fontSize: 28,
    fontWeight: "900",
  },
  balanceHint: {
    color: Colors.text.gray[400],
    fontSize: 12,
  },
  balanceLoading: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  balanceLoadingText: {
    color: Colors.text.gray[400],
    fontSize: 12,
  },
  card: {
    borderWidth: 1,
    borderColor: "#2a2a2a",
    backgroundColor: "rgba(17, 24, 39, 0.45)",
    borderRadius: 16,
    padding: 16,
  },
  sectionTitle: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "800",
    marginTop: 8,
    marginBottom: 12,
    paddingHorizontal: 4,
  },
  label: {
    color: Colors.text.gray[400],
    fontSize: 12,
    marginBottom: 8,
    paddingHorizontal: 4,
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
    marginHorizontal: 4,
    marginBottom: 8,
  },
  helpText: {
    color: Colors.text.gray[500],
    fontSize: 11,
    marginTop: 8,
    paddingHorizontal: 4,
    marginBottom: 8,
  },
  alertError: {
    marginTop: 14,
    marginHorizontal: 4,
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
    marginHorizontal: 4,
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
    marginHorizontal: 4,
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
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.65)",
    justifyContent: "center",
    paddingHorizontal: 20,
  },
  modalCard: {
    borderWidth: 1,
    borderColor: "#2a2a2a",
    backgroundColor: "#111827",
    borderRadius: 16,
    padding: 16,
  },
  modalTitle: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "800",
    marginBottom: 8,
  },
  modalText: {
    color: Colors.text.gray[300],
    fontSize: 13,
    lineHeight: 18,
    marginBottom: 16,
  },
  modalActions: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: 10,
  },
  modalCancel: {
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#2a2a2a",
    backgroundColor: "rgba(255, 255, 255, 0.06)",
  },
  modalCancelText: {
    color: Colors.text.gray[300],
    fontSize: 13,
    fontWeight: "700",
  },
  modalOk: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    backgroundColor: Colors.cyan[500],
    alignItems: "center",
    justifyContent: "center",
    minWidth: 72,
  },
  modalOkText: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "900",
  },
});
