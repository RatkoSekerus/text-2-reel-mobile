import React, { useState, useMemo, useEffect, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  ActivityIndicator,
  TextInput,
  TouchableOpacity,
  Alert,
  Modal,
  KeyboardAvoidingView,
  Platform,
  Keyboard,
  TouchableWithoutFeedback,
  ScrollView,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { BlurView } from "expo-blur";
import { Ionicons } from "@expo/vector-icons";
import { AudioModule, setAudioModeAsync } from "expo-audio";
import type { AudioPlayer } from "expo-audio";

import { useBalance } from "../hooks/useBalance";
import { useVideos } from "../hooks/useVideos";
import { useVoicesList } from "../hooks/useVoicesList";
import { BottomMenu } from "@/components/BottomMenu";
import { useRouter } from "expo-router";
import { Colors } from "@/constants/colors";
import {
  VideoRecord,
  SIGNED_URL_EXPIRES,
  PRICE_PER_VIDEO,
} from "@/constants/constants";
import { downloadVideo } from "@/utils/videoDownload";
import { useAuthContext } from "../contexts/AuthContext";
import { supabase } from "../lib/supabase";
import Constants from "expo-constants";

// Constants
const REQUEST_TIMEOUT_MS = 30000; // 30 seconds

function getStatusColor(status: string): string {
  switch (status) {
    case "completed":
      return "#06b6d4";
    case "processing":
      return "#06b6d4"; // cyan
    case "queued":
      return "#fbbf24"; // yellow
    case "failed":
      return "#f87171"; // red
    default:
      return Colors.text.gray[400];
  }
}

function getStatusLabel(status: string): string {
  switch (status) {
    case "completed":
      return "Completed";
    case "processing":
      return "Processing";
    case "queued":
      return "Queued";
    case "failed":
      return "Failed";
    default:
      return status.charAt(0).toUpperCase() + status.slice(1);
  }
}

type VideoItemProps = {
  video: VideoRecord;
  onDownloadStart: () => void;
  onDownloadEnd: () => void;
  onDelete: (videoId: string) => void;
  onRefreshSignedUrl: (videoId: string) => Promise<string>;
};

function VideoItem({
  video,
  onDownloadStart,
  onDownloadEnd,
  onDelete,
  onRefreshSignedUrl,
}: VideoItemProps) {
  const router = useRouter();
  const statusColor = getStatusColor(video.status);
  const statusLabel = getStatusLabel(video.status);
  const [downloading, setDownloading] = useState(false);

  const handleDownload = async () => {
    if (downloading) return;

    try {
      setDownloading(true);

      // Check if URL needs refresh (within 15 minutes of expiring)
      let urlToUse = video.signed_url;
      const REFRESH_THRESHOLD = 15 * 60 * 1000; // 15 minutes in milliseconds

      if (video.signed_url_created_at) {
        const ageMs = Date.now() - video.signed_url_created_at;
        const expiresAtMs = SIGNED_URL_EXPIRES * 1000;
        const timeUntilExpiry = expiresAtMs - ageMs;

        if (timeUntilExpiry < REFRESH_THRESHOLD) {
          try {
            urlToUse = await onRefreshSignedUrl(video.id);
          } catch (refreshError) {
            // Continue with existing URL if refresh fails
            if (!urlToUse) {
              throw new Error("Failed to refresh video URL");
            }
          }
        }
      }

      if (!urlToUse) {
        Alert.alert("Error", "Video URL is not available");
        return;
      }

      const downloadStartTime = Date.now();
      onDownloadStart();
      await downloadVideo(urlToUse, `video-${video.id}.mp4`);
      const downloadEndTime = Date.now();

      onDownloadEnd();
    } catch (error) {
      onDownloadEnd();
      Alert.alert(
        "Download Failed",
        error instanceof Error
          ? error.message
          : "Failed to download video. Please try again."
      );
    } finally {
      setDownloading(false);
    }
  };

  const canDownload = video.status === "completed" && video.signed_url;
  const canDelete = video.status === "completed" || video.status === "failed";
  const canViewError = video.status === "failed";
  const canViewStatus =
    video.status === "queued" || video.status === "processing";

  const handleDelete = () => {
    onDelete(video.id);
  };

  const handleViewError = () => {
    router.push({
      pathname: "/video/[id]",
      params: {
        id: video.id,
        status: video.status,
        errorMessage: video.error_message || "Unknown error",
      },
    });
  };

  const handleViewStatus = () => {
    router.push({
      pathname: "/video/[id]",
      params: {
        id: video.id,
        status: video.status,
      },
    });
  };

  return (
    <View style={styles.videoItem}>
      <View style={styles.videoContent}>
        <Text style={styles.videoPrompt} numberOfLines={2}>
          {video.prompt}
        </Text>
        <View style={styles.statusContainer}>
          <View
            style={[
              styles.statusDot,
              {
                backgroundColor: statusColor,
              },
            ]}
          />
          <Text
            style={[
              styles.statusText,
              {
                color: statusColor,
              },
            ]}
          >
            {statusLabel}
          </Text>
        </View>
      </View>
      <View style={styles.actionContainer}>
        {canDownload && (
          <TouchableOpacity
            onPress={handleDownload}
            disabled={downloading}
            style={styles.iconButton}
            activeOpacity={0.7}
          >
            {downloading ? (
              <ActivityIndicator size="small" color={Colors.cyan[500]} />
            ) : (
              <Ionicons
                name="download-outline"
                size={20}
                color={Colors.cyan[500]}
              />
            )}
          </TouchableOpacity>
        )}
        {canDelete && (
          <TouchableOpacity
            onPress={handleDelete}
            style={styles.iconButton}
            activeOpacity={0.7}
          >
            <Ionicons name="trash-outline" size={20} color="#f87171" />
          </TouchableOpacity>
        )}
        {(canViewError || canViewStatus) && (
          <TouchableOpacity
            onPress={canViewError ? handleViewError : handleViewStatus}
            style={styles.iconButton}
            activeOpacity={0.7}
          >
            <Ionicons
              name="chevron-forward"
              size={20}
              color={Colors.text.gray[400]}
            />
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}
export default function DashboardScreen() {
  const router = useRouter();
  const { balance } = useBalance();
  const { user, session } = useAuthContext();
  const {
    videos,
    loading,
    loadingMore,
    hasMore,
    loadMore,
    deleteVideo,
    refreshVideoSignedUrl,
  } = useVideos();
  const { voices: VOICES, loading: loadingVoices } = useVoicesList();
  const [searchQuery, setSearchQuery] = useState("");
  const [showDownloadModal, setShowDownloadModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [videoToDelete, setVideoToDelete] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [showCreateInput, setShowCreateInput] = useState(false);
  const [prompt, setPrompt] = useState("");
  const [creatingVideo, setCreatingVideo] = useState(false);
  const [showVoiceModal, setShowVoiceModal] = useState(false);
  const [selectedVoice, setSelectedVoice] = useState<string | null>(null);
  const [playingVoiceId, setPlayingVoiceId] = useState<string | null>(null);
  const audioPlayersRef = useRef<{ [key: string]: AudioPlayer }>({});
  const isMountedRef = useRef(true);
  const abortControllerRef = useRef<AbortController | null>(null);

  // Hide input field when keyboard is dismissed
  useEffect(() => {
    if (!showCreateInput) return;

    const keyboardDidHideListener = Keyboard.addListener(
      Platform.OS === "ios" ? "keyboardWillHide" : "keyboardDidHide",
      () => {
        // Don't clear prompt if voice modal is showing (user is selecting voice)
        if (!showVoiceModal) {
          setPrompt("");
          setShowCreateInput(false);
        }
      }
    );

    return () => {
      keyboardDidHideListener.remove();
    };
  }, [showCreateInput, prompt, showVoiceModal]);

  // Filter videos based on search query
  const filteredVideos = useMemo(() => {
    if (!searchQuery.trim()) {
      return videos;
    }
    const query = searchQuery.toLowerCase().trim();
    return videos.filter((video) => video.prompt.toLowerCase().includes(query));
  }, [videos, searchQuery]);

  const handleEndReached = () => {
    if (hasMore && !loadingMore && !loading && !searchQuery.trim()) {
      loadMore();
    }
  };

  const renderFooter = () => {
    if (!loadingMore) return null;
    return (
      <View style={styles.footerLoader}>
        <ActivityIndicator size="small" color={Colors.cyan[500]} />
      </View>
    );
  };

  const handleDeleteClick = (videoId: string) => {
    setVideoToDelete(videoId);
    setShowDeleteModal(true);
  };

  const handleDeleteConfirm = async () => {
    if (!videoToDelete) return;

    try {
      setDeleting(true);
      await deleteVideo(videoToDelete);
      setShowDeleteModal(false);
      setVideoToDelete(null);
    } catch (error) {
      Alert.alert(
        "Delete Failed",
        error instanceof Error
          ? error.message
          : "Failed to delete video. Please try again."
      );
    } finally {
      setDeleting(false);
    }
  };

  const handleDeleteCancel = () => {
    setShowDeleteModal(false);
    setVideoToDelete(null);
  };

  // Handle voice preview playback
  const handlePlayVoice = (voiceId: string, url: string) => {
    try {
      // If clicking the same voice, toggle play/pause
      if (playingVoiceId === voiceId) {
        const player = audioPlayersRef.current[voiceId];
        if (player) {
          if (player.playing) {
            player.pause();
            setPlayingVoiceId(null);
          } else {
            player.play();
          }
        }
        return;
      }

      // Stop any currently playing audio
      for (const [id, player] of Object.entries(audioPlayersRef.current)) {
        if (player && player.playing) {
          try {
            player.pause();
            player.seekTo(0);
          } catch (err) {}
        }
      }

      // Load and play new voice
      let player = audioPlayersRef.current[voiceId];
      let shouldAutoPlay = true;

      if (!player) {
        // AudioSource can be a string (URI) or an object with uri property
        const audioSource = { uri: url };
        player = new (AudioModule as any).AudioPlayer(audioSource, 500, false);
        audioPlayersRef.current[voiceId] = player;

        // Handle playback finish and errors
        player.addListener("playbackStatusUpdate", (status: any) => {
          if (status.isLoaded) {
            // Auto-play when loaded if we haven't started yet
            if (shouldAutoPlay && !status.playing && !status.didJustFinish) {
              player.volume = 1.0;
              player.muted = false;
              player.play();
              setPlayingVoiceId(voiceId);
              shouldAutoPlay = false;
            }

            if (status.didJustFinish) {
              setPlayingVoiceId(null);
            }
          }
        });
      } else {
        // Replace source and reset position
        player.replace({ uri: url });
        player.seekTo(0);

        // Set up listener for auto-play on load
        const statusListener = (status: any) => {
          if (status.isLoaded && shouldAutoPlay && !status.playing) {
            player.volume = 1.0;
            player.muted = false;
            player.play();
            setPlayingVoiceId(voiceId);
            shouldAutoPlay = false;
            player.removeListener("playbackStatusUpdate", statusListener);
          }
        };
        player.addListener("playbackStatusUpdate", statusListener);
      }

      // Try to play immediately if already loaded
      if (player.isLoaded) {
        player.volume = 1.0;
        player.muted = false;
        player.play();
        setPlayingVoiceId(voiceId);
        shouldAutoPlay = false;
      }
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";
      Alert.alert("Error", `Failed to play voice preview: ${errorMessage}`);
      setPlayingVoiceId(null);
    }
  };

  // Configure audio mode on mount
  useEffect(() => {
    const configureAudio = async () => {
      try {
        await setAudioModeAsync({
          playsInSilentMode: true,
          interruptionMode: "duckOthers",
          shouldPlayInBackground: false,
        });
      } catch (error) {}
    };
    configureAudio();
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    isMountedRef.current = true;

    return () => {
      isMountedRef.current = false;

      // Abort any ongoing fetch requests
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
        abortControllerRef.current = null;
      }

      // Cleanup all audio players
      const currentPlayers = audioPlayersRef.current;
      Object.values(currentPlayers).forEach((player) => {
        if (player) {
          try {
            player.pause();
            player.seekTo(0);
            player.remove();
          } catch (error) {
            // Silently handle cleanup errors
          }
        }
      });
      audioPlayersRef.current = {};
    };
  }, []);

  // Cleanup audio players when voice changes (stop previous voice)
  useEffect(() => {
    // Stop any previously playing voices when a new one starts
    const previousPlayers = Object.entries(audioPlayersRef.current);
    previousPlayers.forEach(([voiceId, player]) => {
      if (voiceId !== playingVoiceId && player && player.playing) {
        try {
          player.pause();
          player.seekTo(0);
        } catch {
          // Silently handle cleanup errors
        }
      }
    });
  }, [playingVoiceId]);

  const handleCreateVideo = () => {
    if (!prompt.trim()) {
      return;
    }

    // Show voice selection modal instead of submitting immediately
    // Set modal state first to prevent keyboard listener from clearing prompt
    setShowVoiceModal(true);
    // Dismiss keyboard after modal state is set
    setTimeout(() => {
      Keyboard.dismiss();
    }, 50);
  };

  const handleConfirmVoiceAndSubmit = async () => {
    if (!selectedVoice) {
      Alert.alert("Error", "Please select a voice");
      return;
    }

    // Validate prompt exists - store it in a variable to prevent it from being cleared
    const promptToSubmit = prompt.trim();

    if (!promptToSubmit) {
      Alert.alert("Error", "Video prompt is required");
      setShowVoiceModal(false);
      return;
    }

    // Close modal first
    setShowVoiceModal(false);

    // Check if user has any queued videos
    const hasQueuedVideos = videos.some(
      (v) => v.status === "queued" || v.status === "processing"
    );
    if (hasQueuedVideos) {
      Alert.alert(
        "No concurrent executions",
        "You have a video queued or processing. Please wait for it to finish before creating a new video."
      );
      return;
    }

    if (balance === null || balance < PRICE_PER_VIDEO) {
      Alert.alert(
        "Insufficient Balance",
        `You need at least $${PRICE_PER_VIDEO} to generate a video.`
      );
      return;
    }

    if (!user || !session) {
      Alert.alert("Error", "User not authenticated");
      return;
    }

    setCreatingVideo(true);

    try {
      // Use current session, only refresh if needed
      let sessionToUse = session;

      if (!session || !session.access_token) {
        Alert.alert("Error", "User not authenticated");
        setCreatingVideo(false);
        return;
      }

      // Check if session is close to expiring (within 5 minutes)
      const expiresAt = session.expires_at ? session.expires_at * 1000 : null;
      const shouldRefresh = expiresAt && expiresAt - Date.now() < 5 * 60 * 1000;

      if (shouldRefresh) {
        // Only attempt refresh if session is close to expiring
        try {
          const {
            data: { session: refreshedSession },
            error: refreshError,
          } = await supabase.auth.refreshSession();

          if (!refreshError && refreshedSession) {
            sessionToUse = refreshedSession;
          }
          // If refresh fails, silently fall back to current session
        } catch {
          // Silently fall back to current session on network errors
          // The current session should still be valid
        }
      }

      // Get Supabase URL from environment variables first
      const supabaseUrl =
        process.env.EXPO_PUBLIC_SUPABASE_URL ||
        Constants.expoConfig?.extra?.supabaseUrl ||
        "";

      if (!supabaseUrl) {
        throw new Error("Supabase URL not configured");
      }

      // Call edge function to create video
      // Ensure URL is properly formatted
      let baseUrl = supabaseUrl.trim();
      if (!baseUrl.startsWith("http://") && !baseUrl.startsWith("https://")) {
        baseUrl = `https://${baseUrl}`;
      }
      const edgeFunctionUrl = `${baseUrl}/functions/v1/create-video`;

      // Create abort controller for cleanup
      abortControllerRef.current = new AbortController();

      let createVideoResponse;
      try {
        // Create a timeout promise
        const timeoutPromise = new Promise<never>((_, reject) => {
          setTimeout(
            () => reject(new Error("Request timeout")),
            REQUEST_TIMEOUT_MS
          );
        });

        // Race between fetch and timeout
        createVideoResponse = (await Promise.race([
          fetch(edgeFunctionUrl, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${sessionToUse.access_token}`,
            },
            body: JSON.stringify({
              prompt: promptToSubmit,
              refresh_token: sessionToUse.refresh_token,
              voice: selectedVoice,
            }),
            signal: abortControllerRef.current.signal,
          }).then((response) => {
            return response;
          }),
          timeoutPromise,
        ])) as Response;
      } catch (fetchError) {
        // Check if it's a network error
        if (
          fetchError instanceof TypeError &&
          fetchError.message.includes("Network request failed")
        ) {
          throw new Error(
            "Network request failed. Please check your internet connection and try again."
          );
        }
        if (
          fetchError instanceof Error &&
          fetchError.message === "Request timeout"
        ) {
          throw new Error(
            "Request timed out. The server may be slow or unreachable. Please try again."
          );
        }
        throw fetchError;
      }

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

      // Success
      Alert.alert(
        "Success",
        "Video generation started! Your video will appear below when ready."
      );
      setPrompt("");
      setShowCreateInput(false);
      setSelectedVoice(null);
    } catch (error) {
      if (isMountedRef.current) {
        Alert.alert(
          "Error",
          error instanceof Error ? error.message : "Failed to generate video"
        );
      }
    } finally {
      if (isMountedRef.current) {
        setCreatingVideo(false);
      }
    }
  };

  const handleDismissInput = () => {
    Keyboard.dismiss();
    if (!prompt.trim()) {
      setShowCreateInput(false);
    }
  };

  return (
    <LinearGradient
      colors={Colors.background.gradient as [string, string, string]}
      style={styles.container}
    >
      {showCreateInput && (
        <TouchableWithoutFeedback onPress={handleDismissInput}>
          <View style={styles.backdrop} />
        </TouchableWithoutFeedback>
      )}
      <View style={styles.content}>
        {/* Search Bar */}
        <View style={styles.searchContainer}>
          <Ionicons
            name="search-outline"
            size={20}
            color={Colors.text.gray[400]}
            style={styles.searchIcon}
          />
          <TextInput
            style={styles.searchInput}
            placeholder="Search videos..."
            placeholderTextColor={Colors.text.gray[500]}
            value={searchQuery}
            onChangeText={setSearchQuery}
            autoCapitalize="none"
            autoCorrect={false}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity
              onPress={() => setSearchQuery("")}
              style={styles.clearButton}
            >
              <Ionicons
                name="close-circle"
                size={20}
                color={Colors.text.gray[400]}
              />
            </TouchableOpacity>
          )}
        </View>

        {loading && filteredVideos.length === 0 ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={Colors.cyan[500]} />
          </View>
        ) : filteredVideos.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Ionicons
              name="videocam-outline"
              size={48}
              color={Colors.text.gray[500]}
            />
            <Text style={styles.emptyText}>
              {searchQuery.trim() ? "No videos found" : "No videos yet"}
            </Text>
            <Text style={styles.emptySubtext}>
              {searchQuery.trim()
                ? "Try a different search term"
                : "Create your first video to get started"}
            </Text>
          </View>
        ) : (
          <FlatList
            data={filteredVideos}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => (
              <VideoItem
                video={item}
                onDownloadStart={() => setShowDownloadModal(true)}
                onDownloadEnd={() => setShowDownloadModal(false)}
                onDelete={handleDeleteClick}
                onRefreshSignedUrl={refreshVideoSignedUrl}
              />
            )}
            ItemSeparatorComponent={() => <View style={styles.divider} />}
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
            onEndReached={handleEndReached}
            onEndReachedThreshold={0.5}
            ListFooterComponent={renderFooter}
          />
        )}
      </View>

      {/* Create Video Input - Above Keyboard */}
      {showCreateInput && (
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          style={styles.keyboardAvoidingView}
          keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 0}
        >
          <TouchableWithoutFeedback onPress={() => {}}>
            <View style={styles.createInputContainer}>
              <TextInput
                style={styles.createInput}
                placeholder="Describe the video you want to create..."
                placeholderTextColor={Colors.text.gray[500]}
                value={prompt}
                onChangeText={setPrompt}
                multiline
                autoFocus
                editable={!creatingVideo}
              />
              {prompt.trim().length > 0 && (
                <TouchableOpacity
                  onPress={handleCreateVideo}
                  disabled={creatingVideo}
                  style={styles.sendButton}
                  activeOpacity={0.7}
                >
                  {creatingVideo ? (
                    <ActivityIndicator size="small" color={Colors.cyan[500]} />
                  ) : (
                    <Ionicons
                      name="arrow-up"
                      size={20}
                      color={Colors.cyan[500]}
                    />
                  )}
                </TouchableOpacity>
              )}
            </View>
          </TouchableWithoutFeedback>
        </KeyboardAvoidingView>
      )}

      <BottomMenu
        balance={balance}
        onPressBilling={() => router.push("/profile/billing")}
        onPressProfile={() => router.push("/profile")}
        onPressAdd={() => setShowCreateInput(true)}
      />

      {/* Download Progress Modal */}
      <Modal
        visible={showDownloadModal}
        transparent
        animationType="fade"
        onRequestClose={() => {}}
      >
        <BlurView intensity={20} style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <ActivityIndicator size="large" color={Colors.cyan[500]} />
            <Text style={styles.modalTitle}>Downloading Video</Text>
            <Text style={styles.modalMessage}>
              This may take a few minutes depending on your connection speed.
            </Text>
            <Text style={styles.modalSubtext}>
              Please keep the app open while downloading...
            </Text>
          </View>
        </BlurView>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal
        visible={showDeleteModal}
        transparent
        animationType="fade"
        onRequestClose={handleDeleteCancel}
      >
        <BlurView intensity={20} style={styles.modalOverlay}>
          <View style={styles.deleteModalContent}>
            <Ionicons name="trash-outline" size={48} color="#f87171" />
            <Text style={styles.deleteModalTitle}>Delete Video?</Text>
            <Text style={styles.deleteModalMessage}>
              This action cannot be undone. The video will be permanently
              deleted from your account.
            </Text>
            <View style={styles.deleteModalActions}>
              <TouchableOpacity
                onPress={handleDeleteCancel}
                style={[styles.deleteModalButton, styles.cancelButton]}
                disabled={deleting}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={handleDeleteConfirm}
                style={[styles.deleteModalButton, styles.confirmButton]}
                disabled={deleting}
              >
                {deleting ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Text style={styles.confirmButtonText}>Delete</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </BlurView>
      </Modal>

      {/* Voice Selection Modal */}
      <Modal
        visible={showVoiceModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowVoiceModal(false)}
      >
        <BlurView intensity={20} style={styles.modalOverlay}>
          <View style={styles.voiceModalContent}>
            <Text style={styles.voiceModalTitle}>Select a Voice</Text>
            {loadingVoices ? (
              <View style={styles.voiceLoadingContainer}>
                <ActivityIndicator size="large" color={Colors.cyan[500]} />
                <Text style={styles.voiceLoadingText}>Loading voices...</Text>
              </View>
            ) : VOICES.length === 0 ? (
              <View style={styles.voiceLoadingContainer}>
                <Text style={styles.voiceLoadingText}>No voices available</Text>
              </View>
            ) : (
              <ScrollView
                style={styles.voiceList}
                showsVerticalScrollIndicator={false}
              >
                {VOICES.map((voice) => (
                  <TouchableOpacity
                    key={voice.id}
                    style={[
                      styles.voiceItem,
                      selectedVoice === voice.id && styles.voiceItemSelected,
                    ]}
                    onPress={() => setSelectedVoice(voice.id)}
                    activeOpacity={0.7}
                  >
                    <TouchableOpacity
                      onPress={(e) => {
                        e.stopPropagation();
                        handlePlayVoice(voice.id, voice.url);
                      }}
                      style={styles.voicePlayButton}
                      activeOpacity={0.8}
                    >
                      {playingVoiceId === voice.id ? (
                        <Ionicons name="pause" size={20} color="#FFFFFF" />
                      ) : (
                        <Ionicons name="play" size={20} color="#FFFFFF" />
                      )}
                    </TouchableOpacity>
                    <View style={styles.voiceInfo}>
                      <Text style={styles.voiceName}>{voice.displayName}</Text>
                      <View
                        style={[
                          styles.voiceGenderBadge,
                          voice.gender === "male"
                            ? styles.voiceGenderMale
                            : styles.voiceGenderFemale,
                        ]}
                      >
                        <Text
                          style={[
                            styles.voiceGenderText,
                            voice.gender === "male"
                              ? styles.voiceGenderTextMale
                              : styles.voiceGenderTextFemale,
                          ]}
                        >
                          {voice.gender === "male" ? "Male" : "Female"}
                        </Text>
                      </View>
                    </View>
                    <View
                      style={[
                        styles.voiceRadio,
                        selectedVoice === voice.id && styles.voiceRadioSelected,
                      ]}
                    >
                      {selectedVoice === voice.id && (
                        <View style={styles.voiceRadioInner} />
                      )}
                    </View>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            )}
            <View style={styles.voiceModalActions}>
              <TouchableOpacity
                onPress={() => {
                  setShowVoiceModal(false);
                  setSelectedVoice(null);
                }}
                style={[styles.voiceModalButton, styles.voiceModalCancelButton]}
              >
                <Text style={styles.voiceModalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={handleConfirmVoiceAndSubmit}
                disabled={!selectedVoice || creatingVideo}
                style={[
                  styles.voiceModalButton,
                  styles.voiceModalConfirmButton,
                  (!selectedVoice || creatingVideo) &&
                    styles.voiceModalButtonDisabled,
                ]}
              >
                {creatingVideo ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Text style={styles.voiceModalConfirmText}>Confirm</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </BlurView>
      </Modal>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: 60,
  },
  content: {
    flex: 1,
    paddingHorizontal: 16,
    paddingBottom: 100, // Space for bottom menu
  },
  backdrop: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 999,
  },
  keyboardAvoidingView: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    zIndex: 1000,
  },
  createInputContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "transparent",
    paddingHorizontal: 16,
    paddingVertical: 10,
    paddingBottom: Platform.OS === "ios" ? 18 : 10,
  },
  createInput: {
    flex: 1,
    backgroundColor: "rgba(60, 60, 60, 1.0) ",
    color: "#FFFFFF",
    fontSize: 16,
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginRight: 8,
    minHeight: 44,
    maxHeight: 100,
  },
  sendButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#FFFFFF",
    justifyContent: "center",
    alignItems: "center",
  },
  closeButton: {
    width: 36,
    height: 36,
    justifyContent: "center",
    alignItems: "center",
    marginLeft: 4,
  },
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(0, 0, 0, 0.3)",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.1)",
    paddingHorizontal: 12,
    marginBottom: 20,
    minHeight: 48,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    color: "#FFFFFF",
    fontSize: 16,
    paddingVertical: 12,
  },
  clearButton: {
    padding: 4,
    marginLeft: 4,
  },
  footerLoader: {
    paddingVertical: 20,
    alignItems: "center",
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
    paddingVertical: 60,
  },
  emptyText: {
    color: Colors.text.gray[400],
    fontSize: 18,
    fontWeight: "600",
    marginTop: 16,
  },
  emptySubtext: {
    color: Colors.text.gray[500],
    fontSize: 14,
    marginTop: 8,
    textAlign: "center",
  },
  listContent: {
    paddingBottom: 16,
  },
  videoItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 16,
    paddingHorizontal: 16,
    backgroundColor: "rgba(0, 0, 0, 0.2)",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.1)",
  },
  videoContent: {
    flex: 1,
    marginRight: 12,
  },
  actionContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  iconButton: {
    padding: 4,
  },
  videoPrompt: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 8,
  },
  statusContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  statusText: {
    fontSize: 14,
    fontWeight: "500",
  },
  divider: {
    height: 12,
  },
  modalOverlay: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(0, 0, 0, 0.7)",
  },
  modalContent: {
    backgroundColor: "rgba(30, 30, 30, 0.95)",
    borderRadius: 20,
    padding: 32,
    alignItems: "center",
    maxWidth: 320,
    width: "85%",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.1)",
  },
  modalTitle: {
    color: "#FFFFFF",
    fontSize: 20,
    fontWeight: "700",
    marginTop: 20,
    marginBottom: 12,
    textAlign: "center",
  },
  modalMessage: {
    color: Colors.text.gray[300],
    fontSize: 15,
    lineHeight: 22,
    textAlign: "center",
    marginBottom: 8,
  },
  modalSubtext: {
    color: Colors.text.gray[400],
    fontSize: 13,
    textAlign: "center",
    fontStyle: "italic",
  },
  deleteModalContent: {
    backgroundColor: "rgba(30, 30, 30, 0.95)",
    borderRadius: 20,
    padding: 32,
    alignItems: "center",
    maxWidth: 320,
    width: "85%",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.1)",
  },
  deleteModalTitle: {
    color: "#FFFFFF",
    fontSize: 20,
    fontWeight: "700",
    marginTop: 20,
    marginBottom: 12,
    textAlign: "center",
  },
  deleteModalMessage: {
    color: Colors.text.gray[300],
    fontSize: 15,
    lineHeight: 22,
    textAlign: "center",
    marginBottom: 24,
  },
  deleteModalActions: {
    flexDirection: "row",
    gap: 12,
    width: "100%",
  },
  deleteModalButton: {
    flex: 1,
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  cancelButton: {
    backgroundColor: "rgba(255, 255, 255, 0.1)",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.2)",
  },
  confirmButton: {
    backgroundColor: "#f87171",
  },
  cancelButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "600",
  },
  confirmButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "700",
  },
  voiceModalContent: {
    backgroundColor: "rgba(30, 30, 30, 0.95)",
    borderRadius: 20,
    padding: 24,
    maxWidth: 400,
    width: "90%",
    maxHeight: "80%",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.1)",
  },
  voiceModalTitle: {
    color: "#FFFFFF",
    fontSize: 24,
    fontWeight: "700",
    marginBottom: 20,
    textAlign: "center",
  },
  voiceLoadingContainer: {
    padding: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  voiceLoadingText: {
    color: Colors.text.gray[400],
    fontSize: 16,
    marginTop: 12,
  },
  voiceList: {
    maxHeight: 400,
    marginBottom: 20,
  },
  voiceItem: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    marginBottom: 12,
    backgroundColor: "rgba(0, 0, 0, 0.3)",
    borderRadius: 12,
    borderWidth: 2,
    borderColor: "rgba(255, 255, 255, 0.1)",
  },
  voiceItemSelected: {
    borderColor: Colors.cyan[500],
    backgroundColor: "rgba(6, 182, 212, 0.1)",
  },
  voicePlayButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.cyan[500],
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  voiceInfo: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  voiceName: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "600",
  },
  voiceGenderBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  voiceGenderMale: {
    backgroundColor: "rgba(59, 130, 246, 0.2)",
  },
  voiceGenderFemale: {
    backgroundColor: "rgba(236, 72, 153, 0.2)",
  },
  voiceGenderText: {
    fontSize: 12,
    fontWeight: "500",
  },
  voiceGenderTextMale: {
    color: "#93c5fd",
  },
  voiceGenderTextFemale: {
    color: "#f9a8d4",
  },
  voiceRadio: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: "rgba(255, 255, 255, 0.4)",
    justifyContent: "center",
    alignItems: "center",
  },
  voiceRadioSelected: {
    borderColor: Colors.cyan[500],
    backgroundColor: Colors.cyan[500],
  },
  voiceRadioInner: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#1a1a1a",
  },
  voiceModalActions: {
    flexDirection: "row",
    gap: 12,
    marginTop: 8,
  },
  voiceModalButton: {
    flex: 1,
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  voiceModalCancelButton: {
    backgroundColor: "rgba(255, 255, 255, 0.1)",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.2)",
  },
  voiceModalConfirmButton: {
    backgroundColor: Colors.cyan[500],
  },
  voiceModalButtonDisabled: {
    opacity: 0.5,
  },
  voiceModalCancelText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "600",
  },
  voiceModalConfirmText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "700",
  },
});
