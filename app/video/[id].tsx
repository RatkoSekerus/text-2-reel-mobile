import React, {
  useState,
  useEffect,
  useRef,
  useCallback,
  useMemo,
} from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
  Animated,
  ActivityIndicator,
  Alert,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { useRouter, useLocalSearchParams } from "expo-router";
import { useIsFocused } from "@react-navigation/native";
import { VideoView, useVideoPlayer } from "expo-video";
// Using legacy API to keep downloadAsync working without warnings on SDK 54
import * as FileSystem from "expo-file-system/legacy";
import * as Sharing from "expo-sharing";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Colors } from "@/constants/colors";
import { BottomMenu } from "@/components/BottomMenu";
import { CreateVideoModal } from "@/components/CreateVideoModal";
import { useVideos } from "@/hooks/useVideos";
import { useBalance } from "@/hooks/useBalance";
import type { VideoRecord } from "@/constants/constants";

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get("window");
const AUTO_HIDE_DELAY = 3000; // 3 seconds
const BOTTOM_MENU_HEIGHT = 110;

interface VideoPlayerItemProps {
  video: VideoRecord;
  isFocused: boolean;
}

function VideoPlayerItem({ video, isFocused }: VideoPlayerItemProps) {
  const player = useVideoPlayer(
    video.status === "completed" && video.signed_url ? video.signed_url : "",
    (player) => {
      player.loop = true;
      player.muted = false;
    }
  );

  const hasPlayedRef = useRef(false);

  useEffect(() => {
    if (!player) return;
    if (!isFocused) return;
    if (hasPlayedRef.current) return;
    if (video.status !== "completed" || !video.signed_url) return;

    hasPlayedRef.current = true;

    // Autoplay once when the screen first gains focus
    try {
      player.play();
    } catch {
      // Ignore initial playback errors (e.g. if player not ready yet)
    }
    const timeoutId = setTimeout(() => {
      try {
        player.play();
      } catch {
        // Ignore secondary nudge errors
      }
    }, 50);

    return () => {
      clearTimeout(timeoutId);
    };
  }, [player, isFocused, video.status, video.signed_url]);

  useEffect(() => {
    if (!player) return;
    if (video.status !== "completed" || !video.signed_url) return;

    if (!isFocused) {
      // Pause when screen loses focus
      try {
        player.pause();
      } catch {
        // Ignore pause errors
      }
    } else if (hasPlayedRef.current) {
      // Resume when screen regains focus (only if it was already played before)
      try {
        player.play();
      } catch {
        // Ignore play errors
      }
    }
  }, [player, isFocused, video.status, video.signed_url]);

  if (video.status !== "completed" || !video.signed_url) {
    // Special-case failed videos: no spinner, show error state
    if (video.status === "failed") {
      return (
        <View style={styles.videoPlaceholder}>
          <Ionicons name="alert-circle-outline" size={36} color="#F87171" />
          <Text style={[{ ...styles.placeholderText, color: "#FCA5A5" }]}>
            {video.error_message || "We couldn’t generate this video."}
          </Text>
        </View>
      );
    }

    // Queued videos: show informative message and clock icon, no spinner
    if (video.status === "queued") {
      return (
        <View style={styles.videoPlaceholder}>
          <Ionicons name="time-outline" size={36} color="#FBBF24" />
          <Text style={styles.placeholderText}>
            Your video has been queued due to high demand.
            {"\n"}
            It will start processing automatically and may take 7–12 minutes to
            complete once processing begins.
          </Text>
        </View>
      );
    }

    // Default loading/other non-completed states with spinner
    return (
      <View style={styles.videoPlaceholder}>
        <ActivityIndicator size="large" color={Colors.cyan[500]} />
        <Text style={styles.placeholderText}>
          {video.status === "processing"
            ? "Processing your video, it usually takes 7-12 minutes..."
            : "Video not available"}
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.videoContainer}>
      {player && (
        <VideoView
          player={player}
          style={styles.video}
          contentFit="cover"
          nativeControls={false}
          fullscreenOptions={{ enable: false }}
          allowsPictureInPicture={false}
        />
      )}
    </View>
  );
}

export default function VideoViewerScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ id: string }>();
  const isFocused = useIsFocused();
  const { videos, deleteVideo, loading } = useVideos();
  const { balance } = useBalance();
  const insets = useSafeAreaInsets();
  const [uiVisible, setUiVisible] = useState(true);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);

  const fadeAnim = useRef(new Animated.Value(1)).current;
  const hideTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const currentVideo = useMemo(
    () => videos.find((v) => v.id === params.id) || null,
    [videos, params.id]
  );

  const hideUI = useCallback(() => {
    Animated.timing(fadeAnim, {
      toValue: 0,
      duration: 300,
      useNativeDriver: true,
    }).start(() => {
      setUiVisible(false);
    });
  }, [fadeAnim]);

  const resetHideTimeout = useCallback(() => {
    if (hideTimeoutRef.current) {
      clearTimeout(hideTimeoutRef.current);
    }
    hideTimeoutRef.current = setTimeout(() => {
      hideUI();
    }, AUTO_HIDE_DELAY);
  }, [hideUI]);

  const showUI = useCallback(() => {
    setUiVisible(true);
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 300,
      useNativeDriver: true,
    }).start();
    resetHideTimeout();
  }, [fadeAnim, resetHideTimeout]);

  useEffect(() => {
    if (uiVisible) {
      resetHideTimeout();
    }
    return () => {
      if (hideTimeoutRef.current) {
        clearTimeout(hideTimeoutRef.current);
      }
    };
  }, [uiVisible, resetHideTimeout]);

  const handleScreenPress = () => {
    if (uiVisible) {
      hideUI();
    } else {
      showUI();
    }
  };

  const handleDelete = async () => {
    if (!currentVideo) return;

    Alert.alert(
      "Delete Video",
      "Are you sure you want to delete this video? This action cannot be undone.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            setIsDeleting(true);
            try {
              await deleteVideo(currentVideo.id);
              // After deleting, just go back to the grid
              router.back();
            } catch {
              Alert.alert("Error", "Failed to delete video. Please try again.");
            } finally {
              setIsDeleting(false);
            }
          },
        },
      ]
    );
  };

  const handleDownload = async () => {
    if (!currentVideo?.signed_url) {
      Alert.alert("Error", "Video URL not available for download.");
      return;
    }

    setIsDownloading(true);
    try {
      // Use a temporary file path
      const cacheDir = (FileSystem as any).cacheDirectory || "";
      const fileUri = `${cacheDir}${currentVideo.id}.mp4`;
      const downloadResult = await FileSystem.downloadAsync(
        currentVideo.signed_url,
        fileUri
      );

      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(downloadResult.uri, {
          mimeType: "video/mp4",
          dialogTitle: "Share Video",
        });
      } else {
        Alert.alert(
          "Download Complete",
          `Video saved to: ${downloadResult.uri}`,
          [{ text: "OK" }]
        );
      }
    } catch {
      Alert.alert("Error", "Failed to download video. Please try again.");
    } finally {
      setIsDownloading(false);
    }
  };

  if (loading || videos.length === 0) {
    return (
      <LinearGradient
        colors={Colors.background.gradient as [string, string, string]}
        style={styles.container}
      >
        <View style={styles.videoPlaceholder}>
          <ActivityIndicator size="large" color={Colors.cyan[500]} />
          <Text style={styles.placeholderText}>Loading videos...</Text>
        </View>
      </LinearGradient>
    );
  }

  if (!currentVideo) {
    return (
      <LinearGradient
        colors={Colors.background.gradient as [string, string, string]}
        style={styles.container}
      >
        <View style={styles.videoPlaceholder}>
          <Text style={styles.placeholderText}>Video not found.</Text>
        </View>
      </LinearGradient>
    );
  }

  const topPadding = insets.top; // safe-area only, no extra black spacer
  const backButtonOffset = Math.max(4, insets.top * 0.05);
  const rightIconsOffset = Math.max(8, insets.top * 0.1);

  return (
    <LinearGradient
      colors={Colors.background.gradient as [string, string, string]}
      style={styles.container}
    >
      <TouchableOpacity
        style={styles.screenTouchable}
        activeOpacity={1}
        onPress={handleScreenPress}
      >
        {/* Single full-screen video */}
        <VideoPlayerItem video={currentVideo} isFocused={!!isFocused} />

        {/* Top UI Overlay */}
        {/* Always-visible Back Button */}
        <View
          style={[
            styles.backButtonContainer,
            { top: topPadding + backButtonOffset, left: 16, zIndex: 20 },
          ]}
        >
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.back()}
            activeOpacity={0.8}
          >
            <Ionicons name="chevron-back" size={28} color="#FFFFFF" />
          </TouchableOpacity>
        </View>

        <Animated.View
          style={[
            styles.topOverlay,
            {
              opacity: fadeAnim,
              pointerEvents: uiVisible ? "auto" : "none",
            },
          ]}
        >
          {/* Right Icons - absolute top-right */}
          <View
            style={[
              styles.rightIconsContainer,
              { top: topPadding + rightIconsOffset, right: 16 },
            ]}
          >
            {/* Only show download when the video is actually completed and has a URL */}
            {currentVideo?.status === "completed" &&
              currentVideo.signed_url && (
                <TouchableOpacity
                  style={styles.iconButton}
                  onPress={handleDownload}
                  disabled={isDownloading}
                  activeOpacity={0.8}
                >
                  {isDownloading ? (
                    <ActivityIndicator size="small" color="#FFFFFF" />
                  ) : (
                    <Ionicons
                      name="download-outline"
                      size={24}
                      color="#FFFFFF"
                    />
                  )}
                </TouchableOpacity>
              )}

            {/* Only allow deleting completed or failed videos (not while queued/processing) */}
            {(currentVideo?.status === "completed" ||
              currentVideo?.status === "failed") && (
              <TouchableOpacity
                style={styles.iconButton}
                onPress={handleDelete}
                disabled={isDeleting}
                activeOpacity={0.8}
              >
                {isDeleting ? (
                  <ActivityIndicator size="small" color="#F87171" />
                ) : (
                  <Ionicons name="trash-outline" size={24} color="#F87171" />
                )}
              </TouchableOpacity>
            )}
          </View>
        </Animated.View>

        {/* Bottom UI Overlay */}
        <View style={styles.bottomOverlay}>
          {/* Video Title */}
          <Animated.View
            style={{
              opacity: fadeAnim,
              pointerEvents: uiVisible ? "auto" : "none",
            }}
          >
            {currentVideo && (
              <View style={styles.titleContainer}>
                <Text style={styles.videoTitle} numberOfLines={2}>
                  {currentVideo.prompt || "Untitled Video"}
                </Text>
              </View>
            )}
          </Animated.View>

          {/* Bottom Menu Bar (same as dashboard) - Always visible */}
          <BottomMenu
            balance={balance}
            onPressBilling={() => router.push("/profile/billing")}
            onPressProfile={() => router.push("/profile" as any)}
            onPressAdd={() => setShowCreateModal(true)}
          />
        </View>
      </TouchableOpacity>
      {/* Create Video Modal */}
      <CreateVideoModal
        visible={showCreateModal}
        onClose={() => setShowCreateModal(false)}
      />
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  screenTouchable: {
    flex: 1,
  },
  videoContainer: {
    width: SCREEN_WIDTH,
    height: SCREEN_HEIGHT,
    backgroundColor: "#000000",
    justifyContent: "center",
    alignItems: "center",
  },
  video: {
    width: SCREEN_WIDTH,
    height: SCREEN_HEIGHT,
  },
  videoPlaceholder: {
    width: SCREEN_WIDTH,
    height: SCREEN_HEIGHT,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#000000",
    paddingHorizontal: 24,
  },
  placeholderText: {
    color: "#FFFFFF",
    marginTop: 16,
    fontSize: 14,
    textAlign: "center",
  },
  topOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    zIndex: 10,
  },
  backButtonContainer: {
    position: "absolute",
  },
  backButton: {
    width: 44,
    height: 44,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(0, 0, 0, 0.4)",
    borderRadius: 22,
  },
  rightIconsContainer: {
    position: "absolute",
    flexDirection: "column",
    gap: 12,
  },
  iconButton: {
    width: 44,
    height: 44,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(0, 0, 0, 0.4)",
    borderRadius: 22,
  },
  bottomOverlay: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    zIndex: 10,
  },
  flatListContent: {
    paddingBottom: BOTTOM_MENU_HEIGHT,
  },
  titleContainer: {
    paddingHorizontal: 16,
    paddingBottom: BOTTOM_MENU_HEIGHT - 25,
    alignItems: "flex-start",
  },
  videoTitle: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "600",
    textShadowColor: "rgba(0, 0, 0, 0.75)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
});
