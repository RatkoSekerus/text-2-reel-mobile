import React, { useState, useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  Dimensions,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { VideoView, useVideoPlayer } from "expo-video";
import { useRouter, type Href } from "expo-router";
import { Colors } from "../constants/colors";
import { useVideos } from "../hooks/useVideos";
import type { VideoRecord } from "../constants/constants";
import { useBalance } from "../hooks/useBalance";
import { BottomMenu } from "@/components/BottomMenu";

const { width } = Dimensions.get("window");
const NUM_COLUMNS = 2;
const VIDEO_WIDTH = width / NUM_COLUMNS;

interface VideoGridItemProps {
  video: VideoRecord;
}

function VideoGridItem({ video }: VideoGridItemProps) {
  const router = useRouter();
  const player = useVideoPlayer(
    video.status === "completed" && video.signed_url ? video.signed_url : "",
    (player) => {
      // Configure player for thumbnail display
      player.loop = false;
      player.muted = true;
    }
  );

  // Seek to 100ms to get a visible frame (frame 0 might be black) and pause
  React.useEffect(() => {
    if (!player || video.status !== "completed" || !video.signed_url) {
      return;
    }

    let hasSeeked = false;
    let timeoutId: ReturnType<typeof setTimeout> | null = null;

    const setupThumbnail = () => {
      try {
        // Wait for video to be ready before seeking
        const checkAndSeek = () => {
          if (!player) {
            return;
          }

          if (player.duration > 0 && !hasSeeked) {
            hasSeeked = true;
            // Seek to 100ms to get a visible frame
            player.currentTime = 0.1;
            player.pause();
          } else if (!hasSeeked) {
            // Retry after a short delay if duration not available yet
            timeoutId = setTimeout(checkAndSeek, 100);
          }
        };

        // Start checking immediately
        checkAndSeek();

        // Also try after a longer delay as fallback
        const fallbackTimeout = setTimeout(() => {
          if (player && !hasSeeked) {
            hasSeeked = true;
            try {
              player.currentTime = 0.1;
              player.pause();
            } catch {}
          }
        }, 1000);

        return () => {
          if (timeoutId) {
            clearTimeout(timeoutId);
          }
          clearTimeout(fallbackTimeout);
        };
      } catch {}
    };

    return setupThumbnail();
  }, [player, video.id, video.status, video.signed_url]);

  const handlePress = () => {
    router.push(`/video/${video.id}` as any);
  };

  return (
    <TouchableOpacity
      style={styles.videoItem}
      onPress={handlePress}
      activeOpacity={0.9}
    >
      <View style={styles.videoContainer}>
        {video.status === "completed" && video.signed_url && player ? (
          <View style={styles.videoWrapper}>
            <VideoView
              player={player}
              style={styles.videoThumbnail}
              contentFit="cover"
              nativeControls={false}
              fullscreenOptions={{ enable: false }}
              allowsPictureInPicture={false}
            />
            <View style={styles.playButtonOverlay}>
              <Ionicons name="play-circle" size={40} color="#FFFFFF" />
            </View>
          </View>
        ) : video.status === "processing" ? (
          <View style={styles.videoPlaceholder}>
            <ActivityIndicator size="small" color={Colors.cyan[500]} />
            <Text style={styles.statusText}>Processing...</Text>
          </View>
        ) : video.status === "queued" ? (
          <View style={styles.videoPlaceholder}>
            <Ionicons name="time-outline" size={24} color={Colors.cyan[500]} />
            <Text style={styles.statusText}>Queued</Text>
          </View>
        ) : video.status === "failed" ? (
          <View style={styles.videoPlaceholder}>
            <Ionicons name="alert-circle-outline" size={24} color="#FF4444" />
            <Text style={styles.statusText}>Failed</Text>
          </View>
        ) : (
          <View style={styles.videoPlaceholder}>
            <ActivityIndicator size="small" color={Colors.cyan[500]} />
          </View>
        )}
      </View>
      <Text style={styles.videoTitle} numberOfLines={2}>
        {video.prompt || "Untitled Video"}
      </Text>
    </TouchableOpacity>
  );
}

export default function DashboardScreen() {
  const router = useRouter();
  const { videos, loading } = useVideos();
  console.log("videos - length", videos.length);
  console.log("loading", loading);
  const { balance } = useBalance();
  const [searchQuery, setSearchQuery] = useState("");

  const filteredVideos = useMemo(() => {
    const filtered = !searchQuery.trim()
      ? videos
      : videos.filter((video) =>
          video.prompt?.toLowerCase().includes(searchQuery.toLowerCase())
        );

    return filtered;
  }, [videos, searchQuery]);

  const renderVideoItem = ({ item }: { item: VideoRecord }) => {
    return <VideoGridItem video={item} />;
  };

  return (
    <LinearGradient
      colors={Colors.background.gradient as [string, string, string]}
      style={styles.container}
    >
      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <Ionicons
          name="search-outline"
          size={20}
          color="#888888"
          style={styles.searchIcon}
        />
        <TextInput
          style={styles.searchInput}
          placeholder="Search videos..."
          placeholderTextColor="#888888"
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity
            onPress={() => setSearchQuery("")}
            style={styles.clearButton}
          >
            <Ionicons name="close-circle" size={20} color="#888888" />
          </TouchableOpacity>
        )}
      </View>
      {/* Video Grid */}

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.cyan[500]} />
        </View>
      ) : filteredVideos.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Ionicons name="videocam-off-outline" size={64} color="#666666" />
          <Text style={styles.emptyText}>
            {searchQuery ? "No videos found" : "No videos yet"}
          </Text>
          <Text style={styles.emptySubtext}>
            {searchQuery
              ? "Try a different search term"
              : "Create your first video to get started"}
          </Text>
        </View>
      ) : (
        <FlatList
          data={filteredVideos}
          renderItem={renderVideoItem}
          keyExtractor={(item) => item.id}
          numColumns={NUM_COLUMNS}
          contentContainerStyle={styles.gridContainer}
          columnWrapperStyle={styles.row}
          showsVerticalScrollIndicator={false}
        />
      )}
      {/* Sticky Bottom Menu Bar */}
      <BottomMenu
        balance={balance}
        onPressBilling={() => router.push("/profile/billing")}
        onPressProfile={() => router.push("/profile" as Href)}
        onPressAdd={() => {}}
      />
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#2a2a2a",
    marginHorizontal: 16,
    marginTop: 50,
    marginBottom: 8,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: "#3a3a3a",
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    color: "#FFFFFF",
    fontSize: 16,
  },
  clearButton: {
    marginLeft: 8,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 32,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: "600",
    color: "#FFFFFF",
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    color: "#888888",
    textAlign: "center",
  },
  gridContainer: {
    paddingBottom: 100, // Space for bottom menu
  },
  row: {
    justifyContent: "flex-start",
  },
  videoItem: {
    width: VIDEO_WIDTH,
    aspectRatio: 9 / 16, // Vertical video aspect ratio
  },
  videoContainer: {
    flex: 1,
    backgroundColor: "#2a2a2a",
    justifyContent: "center",
    alignItems: "center",
  },
  videoWrapper: {
    width: "100%",
    height: "100%",
    position: "relative",
  },
  videoThumbnail: {
    width: "100%",
    height: "100%",
  },
  playButtonOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(0, 0, 0, 0.3)",
  },
  videoPlaceholder: {
    justifyContent: "center",
    alignItems: "center",
    gap: 8,
  },
  statusText: {
    color: "#FFFFFF",
    fontSize: 12,
    marginTop: 4,
  },
  videoTitle: {
    color: "#FFFFFF",
    fontSize: 12,
    paddingHorizontal: 8,
    paddingVertical: 8,
    backgroundColor: "#1a1a1a",
    textAlign: "center",
  },
});
