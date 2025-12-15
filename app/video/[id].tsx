import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  Dimensions,
  Animated,
  ActivityIndicator,
  Alert,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { useRouter, useLocalSearchParams } from "expo-router";
import { VideoView, useVideoPlayer } from "expo-video";
// Using legacy API to keep downloadAsync working without warnings on SDK 54
import * as FileSystem from "expo-file-system/legacy";
import * as Sharing from "expo-sharing";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Colors } from "@/constants/colors";
import { BottomMenu } from "@/components/BottomMenu";
import { useVideos } from "@/hooks/useVideos";
import { useBalance } from "@/hooks/useBalance";
import type { VideoRecord } from "@/constants/constants";

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get("window");
const AUTO_HIDE_DELAY = 3000; // 3 seconds

interface VideoPlayerItemProps {
  video: VideoRecord;
  isActive: boolean;
}

function VideoPlayerItem({ video, isActive }: VideoPlayerItemProps) {
  const player = useVideoPlayer(
    video.status === "completed" && video.signed_url ? video.signed_url : "",
    (player) => {
      player.loop = true;
      player.muted = false;
    }
  );

  useEffect(() => {
    if (player && isActive && video.status === "completed") {
      player.play();
    } else if (player && !isActive) {
      player.pause();
    }
  }, [player, isActive, video.status]);

  if (video.status !== "completed" || !video.signed_url) {
    return (
      <View style={styles.videoPlaceholder}>
        <ActivityIndicator size="large" color={Colors.cyan[500]} />
        <Text style={styles.placeholderText}>
          {video.status === "processing"
            ? "Processing..."
            : video.status === "queued"
            ? "Queued"
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
          contentFit="contain"
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
  const { videos, deleteVideo } = useVideos();
  const { balance } = useBalance();
  const insets = useSafeAreaInsets();

  const [currentIndex, setCurrentIndex] = useState(0);
  const [initialIndexSet, setInitialIndexSet] = useState(false);
  const [uiVisible, setUiVisible] = useState(true);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);

  const fadeAnim = useRef(new Animated.Value(1)).current;
  const hideTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const flatListRef = useRef<FlatList>(null);

  // Find initial index
  useEffect(() => {
    if (params.id && videos.length > 0 && !initialIndexSet) {
      const index = videos.findIndex((v) => v.id === params.id);
      if (index !== -1) {
        setCurrentIndex(index);
        setInitialIndexSet(true);
        // Scroll to the initial video after a short delay
        setTimeout(() => {
          flatListRef.current?.scrollToIndex({
            index,
            animated: false,
          });
        }, 100);
      }
    }
  }, [params.id, videos, initialIndexSet]);

  const currentVideo = videos[currentIndex] || null;

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
              // Navigate back if this was the last video or go to previous
              if (videos.length <= 1) {
                router.back();
              } else if (currentIndex > 0) {
                setCurrentIndex(currentIndex - 1);
              }
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
    } catch (error) {
      console.error("Download error:", error);
      Alert.alert("Error", "Failed to download video. Please try again.");
    } finally {
      setIsDownloading(false);
    }
  };

  const onViewableItemsChanged = useRef(
    ({ viewableItems }: { viewableItems: { index: number | null }[] }) => {
      if (viewableItems.length > 0 && viewableItems[0].index !== null) {
        setCurrentIndex(viewableItems[0].index);
      }
    }
  ).current;

  const viewabilityConfig = useRef({
    itemVisiblePercentThreshold: 50,
  }).current;

  const renderVideoItem = ({
    item,
    index,
  }: {
    item: VideoRecord;
    index: number;
  }) => <VideoPlayerItem video={item} isActive={index === currentIndex} />;

  if (videos.length === 0) {
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

  const topPadding = insets.top + 8; // safe-area aware
  const backButtonOffset = Math.max(12, insets.top * 0.08); // add a bit more top space
  const rightIconsOffset = Math.max(10, insets.top * 0.12);

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
        <FlatList
          ref={flatListRef}
          data={videos}
          renderItem={renderVideoItem}
          keyExtractor={(item) => item.id}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          getItemLayout={(_, index) => ({
            length: SCREEN_WIDTH,
            offset: SCREEN_WIDTH * index,
            index,
          })}
          onViewableItemsChanged={onViewableItemsChanged}
          viewabilityConfig={viewabilityConfig}
          onScrollToIndexFailed={(info) => {
            // Fallback: scroll to offset
            const wait = new Promise((resolve) => setTimeout(resolve, 500));
            wait.then(() => {
              flatListRef.current?.scrollToIndex({
                index: info.index,
                animated: false,
              });
            });
          }}
        />

        {/* Top UI Overlay */}
        <Animated.View
          style={[
            styles.topOverlay,
            {
              opacity: fadeAnim,
              pointerEvents: uiVisible ? "auto" : "none",
            },
          ]}
        >
          {/* Back Button - absolute top-left */}
          <View
            style={[
              styles.backButtonContainer,
              { top: topPadding + backButtonOffset, left: 16 },
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

          {/* Right Icons - absolute top-right */}
          <View
            style={[
              styles.rightIconsContainer,
              { top: topPadding + rightIconsOffset, right: 16 },
            ]}
          >
            <TouchableOpacity
              style={styles.iconButton}
              onPress={handleDownload}
              disabled={isDownloading || !currentVideo?.signed_url}
              activeOpacity={0.8}
            >
              {isDownloading ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <Ionicons name="download-outline" size={24} color="#FFFFFF" />
              )}
            </TouchableOpacity>
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
            onPressProfile={() => router.push("/profile/index" as any)}
            onPressAdd={() => router.push("/dashboard")}
          />
        </View>
      </TouchableOpacity>
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
  },
  placeholderText: {
    color: "#FFFFFF",
    marginTop: 16,
    fontSize: 14,
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
  titleContainer: {
    paddingHorizontal: 16,
    paddingBottom: 8,
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
