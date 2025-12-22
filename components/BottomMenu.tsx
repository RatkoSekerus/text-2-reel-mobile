import React from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ViewStyle,
  StyleProp,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";

import { Colors } from "@/constants/colors";

type Props = {
  balance: number | null;
  onPressBilling: () => void;
  onPressProfile: () => void;
  onPressAdd: () => void;
  containerStyle?: StyleProp<ViewStyle>;
  addButtonDisabled?: boolean;
};

export function BottomMenu({
  balance,
  onPressBilling,
  onPressProfile,
  onPressAdd,
  containerStyle,
  addButtonDisabled = false,
}: Props) {
  return (
    <View style={[styles.bottomMenu, containerStyle]}>
      <TouchableOpacity
        style={styles.leftSection}
        activeOpacity={0.85}
        onPress={onPressBilling}
      >
        <Text style={styles.balanceLabel}>Credits</Text>
        <Text style={styles.balanceAmount}>
          ${balance !== null ? balance.toFixed(2) : "0.00"}
        </Text>
      </TouchableOpacity>

      <View style={styles.rightSection}>
        <TouchableOpacity activeOpacity={0.8} onPress={onPressProfile}>
          <Ionicons name="person-outline" size={24} color="#FFFFFF" />
        </TouchableOpacity>
      </View>

      <View pointerEvents="box-none" style={styles.centerOverlay}>
        <TouchableOpacity
          style={[
            styles.addButton,
            addButtonDisabled && styles.addButtonDisabled,
          ]}
          activeOpacity={0.8}
          onPress={addButtonDisabled ? undefined : onPressAdd}
          disabled={addButtonDisabled}
        >
          <Ionicons
            name="add"
            size={32}
            color={addButtonDisabled ? "#666666" : "#FFFFFF"}
          />
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  bottomMenu: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#1a1a1a",
    paddingHorizontal: 16,
    paddingVertical: 12,
    paddingBottom: 24,
    borderTopWidth: 1,
    borderTopColor: "#2a2a2a",
  },
  leftSection: {
    flex: 1,
    alignItems: "flex-start",
  },
  rightSection: {
    flex: 1,
    alignItems: "flex-end",
  },
  centerOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    justifyContent: "center",
  },
  balanceLabel: {
    fontSize: 12,
    color: "#888888",
    marginBottom: 4,
  },
  balanceAmount: {
    fontSize: 18,
    fontWeight: "600",
    color: Colors.cyan[500],
  },
  addButton: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: Colors.cyan[500],
    justifyContent: "center",
    alignItems: "center",
    shadowColor: Colors.cyan[500],
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  addButtonDisabled: {
    backgroundColor: "#2a2a2a",
    shadowOpacity: 0,
    elevation: 0,
  },
});

export default BottomMenu;
