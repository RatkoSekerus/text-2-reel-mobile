import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Modal,
  ActivityIndicator,
  Alert,
  Keyboard,
} from "react-native";
import { BlurView } from "expo-blur";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { supabase } from "../lib/supabase";
import { useAuthContext } from "../contexts/AuthContext";
import { useVideos } from "../hooks/useVideos";
import { useBalance } from "../hooks/useBalance";
import { PRICE_PER_VIDEO } from "../constants/constants";
import Constants from "expo-constants";

interface CreateVideoModalProps {
  visible: boolean;
  onClose: () => void;
}

export function CreateVideoModal({ visible, onClose }: CreateVideoModalProps) {
  const { user, session } = useAuthContext();
  const { videos } = useVideos();
  const { balance } = useBalance();
  const insets = useSafeAreaInsets();
  const [prompt, setPrompt] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [keyboardHeight, setKeyboardHeight] = useState(0);

  // Reset state when modal closes
  useEffect(() => {
    if (!visible) {
      setPrompt("");
      setError(null);
      setLoading(false);
      setKeyboardHeight(0);
    }
  }, [visible]);

  // Handle keyboard show/hide
  useEffect(() => {
    if (!visible) return;

    const showSubscription = Keyboard.addListener("keyboardDidShow", (e) => {
      setKeyboardHeight(e.endCoordinates.height);
    });
    const hideSubscription = Keyboard.addListener("keyboardDidHide", () => {
      setKeyboardHeight(0);
    });

    return () => {
      showSubscription.remove();
      hideSubscription.remove();
    };
  }, [visible]);

  const handleSubmit = async () => {
    if (!prompt.trim()) {
      return;
    }

    setLoading(true);
    setError(null);

    // Check if user has any queued videos
    const hasQueuedVideos = videos.some((v) => v.status === "queued");
    const hasProcessingVideos = videos.some((v) => v.status === "processing");
    if (hasQueuedVideos || hasProcessingVideos) {
      setError(
        "You have a video queued or processing. Please wait for it to start processing and finish before creating a new video."
      );
      setLoading(false);
      return;
    }

    if (balance === null || balance < PRICE_PER_VIDEO) {
      setError(
        `Insufficient balance. You need at least $${PRICE_PER_VIDEO} to generate a video.`
      );
      setLoading(false);
      return;
    }

    if (!user || !session) {
      setError("User not authenticated");
      setLoading(false);
      return;
    }

    try {
      // Refresh session to ensure we have a fresh token before sending request
      const {
        data: { session: refreshedSession },
        error: refreshError,
      } = await supabase.auth.refreshSession();

      if (refreshError || !refreshedSession) {
        setError("Failed to refresh authentication. Please try again.");
        setLoading(false);
        return;
      }

      // Get Supabase URL from environment variables first
      const supabaseUrl =
        process.env.EXPO_PUBLIC_SUPABASE_URL ||
        Constants.expoConfig?.extra?.supabaseUrl ||
        "";

      if (!supabaseUrl) {
        setError("Supabase URL not configured");
        setLoading(false);
        return;
      }

      // Call atomic edge function that handles all operations:
      // 1. Takes slot
      // 2. Inserts video
      // 3. Stores refresh_token (if queued)
      // 4. Calls n8n webhook
      const edgeFunctionUrl = `${supabaseUrl.replace(
        /^https?:\/\//,
        "https://"
      )}/functions/v1/create-video`;

      const createVideoResponse = await fetch(edgeFunctionUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${refreshedSession.access_token}`,
        },
        body: JSON.stringify({
          prompt: prompt.trim(),
          refresh_token: refreshedSession.refresh_token,
        }),
      });

      if (!createVideoResponse.ok) {
        const errorData = await createVideoResponse.json().catch(() => ({
          error: "Unknown error occurred",
        }));
        throw new Error(errorData.error || "Failed to create video");
      }

      const result = await createVideoResponse.json();

      if (!result.ok) {
        throw new Error(result.error || "Failed to create video");
      }

      // Success - close modal and reset
      setPrompt("");
      onClose();
      Alert.alert(
        "Success",
        "Video generation started! Your video will appear in the grid when ready."
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to generate video");
    } finally {
      setLoading(false);
    }
  };

  const hasText = prompt.trim().length > 0;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <BlurView intensity={80} tint="dark" style={StyleSheet.absoluteFill}>
        <TouchableOpacity
          style={styles.backdrop}
          activeOpacity={1}
          onPress={onClose}
        >
          <View style={styles.container} pointerEvents="box-none">
            <View style={styles.content} pointerEvents="box-none">
              {/* Header */}
              <View
                style={[styles.header, { paddingTop: insets.top + 16 }]}
                pointerEvents="box-none"
              >
                <TouchableOpacity
                  onPress={onClose}
                  style={styles.closeButton}
                  activeOpacity={0.8}
                >
                  <Ionicons name="close" size={28} color="#FFFFFF" />
                </TouchableOpacity>
                <Text style={styles.title}>Create video</Text>
                <View style={styles.placeholder} />
              </View>

              {/* Error message */}
              {error && (
                <View style={styles.errorContainer}>
                  <Text style={styles.errorText}>{error}</Text>
                </View>
              )}

              {/* Spacer to push input to bottom */}
              <View style={styles.spacer} />

              {/* Input field container */}
              <TouchableOpacity
                activeOpacity={1}
                onPress={(e) => e.stopPropagation()}
                style={[
                  styles.inputContainer,
                  {
                    marginBottom:
                      keyboardHeight > 0
                        ? keyboardHeight + 10
                        : Math.max(16, insets.bottom + 16),
                  },
                ]}
              >
                <TextInput
                  style={styles.input}
                  placeholder="Describe new video..."
                  placeholderTextColor="#888888"
                  value={prompt}
                  onChangeText={setPrompt}
                  multiline
                  autoFocus
                  editable={!loading}
                  returnKeyType="send"
                  onSubmitEditing={handleSubmit}
                />
                {hasText && (
                  <TouchableOpacity
                    onPress={handleSubmit}
                    disabled={loading}
                    style={styles.sendButton}
                    activeOpacity={0.8}
                  >
                    {loading ? (
                      <ActivityIndicator size="small" color="#FFFFFF" />
                    ) : (
                      <Ionicons name="arrow-up" size={18} color="#FFFFFF" />
                    )}
                  </TouchableOpacity>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </TouchableOpacity>
      </BlurView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
  },
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
    justifyContent: "space-between",
  },
  spacer: {
    flex: 1,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  closeButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "rgba(0, 0, 0, 0.3)",
    justifyContent: "center",
    alignItems: "center",
  },
  title: {
    fontSize: 18,
    fontWeight: "600",
    color: "#FFFFFF",
  },
  placeholder: {
    width: 44,
  },
  errorContainer: {
    marginHorizontal: 16,
    marginBottom: 16,
    padding: 12,
    backgroundColor: "rgba(239, 68, 68, 0.2)",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "rgba(239, 68, 68, 0.4)",
  },
  errorText: {
    color: "#FCA5A5",
    fontSize: 14,
  },
  inputContainer: {
    marginHorizontal: 8,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(42, 42, 42, 0.95)",
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: "#4a4a4a",
    minHeight: 44,
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5,
  },
  input: {
    flex: 1,
    color: "#FFFFFF",
    fontSize: 16,
    maxHeight: 120,
    paddingRight: 8,
    paddingVertical: 0,
    lineHeight: 20,
  },
  sendButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#06B6D4",
    justifyContent: "center",
    alignItems: "center",
    marginLeft: 8,
  },
});
