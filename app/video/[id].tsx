import React from "react";
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { useRouter, useLocalSearchParams } from "expo-router";

import { Colors } from "@/constants/colors";

export default function VideoStatusScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const status = params.status as string | undefined;
  const errorMessage = params.errorMessage as string | undefined;

  const getStatusContent = () => {
    if (status === "failed") {
      return {
        icon: "alert-circle",
        iconColor: "#f87171",
        title: "Video Generation Failed",
        message: errorMessage || "An error occurred while generating your video. Please try creating a new video.",
        headerTitle: "Video Error",
      };
    } else if (status === "queued") {
      return {
        icon: "time-outline",
        iconColor: "#fbbf24",
        title: "Video Queued",
        message: "Your video has been queued due to high demand. It will start processing automatically and take 7-12 minutes to complete once processing begins.",
        headerTitle: "Video Status",
      };
    } else if (status === "processing") {
      return {
        icon: "hourglass-outline",
        iconColor: "#06b6d4",
        title: "Processing Video",
        message: "Processing your video, it usually takes 7-12 minutes...",
        headerTitle: "Video Status",
      };
    } else {
      return {
        icon: "information-circle-outline",
        iconColor: Colors.text.gray[400],
        title: "Video Status",
        message: "Unknown video status.",
        headerTitle: "Video Status",
      };
    }
  };

  const statusContent = getStatusContent();
  const isProcessing = status === "processing";

  return (
    <LinearGradient
      colors={Colors.background.gradient as [string, string, string]}
      style={styles.container}
    >
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.backButton}
          activeOpacity={0.8}
        >
          <Ionicons name="chevron-back" size={24} color="#FFFFFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{statusContent.headerTitle}</Text>
        <View style={styles.headerSpacer} />
      </View>

      {/* Content */}
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.statusContainer}>
          {isProcessing ? (
            <ActivityIndicator size="large" color={statusContent.iconColor} />
          ) : (
            <Ionicons name={statusContent.icon as any} size={64} color={statusContent.iconColor} />
          )}
          <Text style={styles.statusTitle}>{statusContent.title}</Text>
          <Text style={styles.statusMessage}>{statusContent.message}</Text>
        </View>
      </ScrollView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: 60,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginBottom: 20,
  },
  backButton: {
    width: 44,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: {
    color: "#FFFFFF",
    fontSize: 18,
    fontWeight: "700",
  },
  headerSpacer: {
    width: 44,
  },
  content: {
    flexGrow: 1,
    paddingHorizontal: 16,
    paddingBottom: 40,
  },
  statusContainer: {
    backgroundColor: "rgba(0, 0, 0, 0.3)",
    borderRadius: 16,
    padding: 32,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.1)",
  },
  statusTitle: {
    color: "#FFFFFF",
    fontSize: 24,
    fontWeight: "700",
    marginTop: 24,
    marginBottom: 16,
    textAlign: "center",
  },
  statusMessage: {
    color: Colors.text.gray[300],
    fontSize: 16,
    lineHeight: 24,
    textAlign: "center",
  },
});
