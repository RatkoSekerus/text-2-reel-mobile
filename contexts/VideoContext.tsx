import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useRef,
  ReactNode,
} from "react";
import { supabase } from "../lib/supabase";
import { useAuthContext } from "./AuthContext";
import {
  VideoRecord,
  VIDEOS_PER_PAGE,
  VIDEO_FETCH_CHUNK_SIZE,
  SIGNED_URL_EXPIRES,
  getSignedUrlAndDownload,
} from "../constants/constants";

interface VideoContextType {
  videos: VideoRecord[];
  loading: boolean;
  loadingMore: boolean;
  hasMore: boolean;
  error: string | null;
  loadMore: () => Promise<void>;
  deleteVideo: (videoId: string) => Promise<void>;
  refreshVideoSignedUrl: (videoId: string) => Promise<string>;
  refetch: () => Promise<void>;
}

const VideoContext = createContext<VideoContextType | undefined>(undefined);

export function VideoProvider({ children }: { children: ReactNode }) {
  const { user, loading: authLoading } = useAuthContext();
  const [videos, setVideos] = useState<VideoRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(true);
  const offsetRef = useRef(0);

  // Helper function to process videos and get signed URLs
  const processVideosWithSignedUrls = async (
    videosArray: VideoRecord[]
  ): Promise<VideoRecord[]> => {
    const updatedVideos = [];

    // Process videos in chunks to limit concurrent requests
    for (let i = 0; i < videosArray.length; i += VIDEO_FETCH_CHUNK_SIZE) {
      const chunk = videosArray.slice(i, i + VIDEO_FETCH_CHUNK_SIZE);

      const chunkResults = await Promise.all(
        chunk.map(async (video) => {
          try {
            // Only generate signed URL if video is completed
            if (video.status === "completed" && video.bucket_path) {
              const signedUrl = await getSignedUrlAndDownload({
                bucket: "32_seconds_videos",
                path: video.bucket_path,
                expires: SIGNED_URL_EXPIRES,
                filename: video.id,
                supabase,
              });

              return {
                ...video,
                signed_url: signedUrl,
                signed_url_loading: false,
                signed_url_created_at: Date.now(),
              };
            } else {
              return {
                ...video,
                signed_url: null,
                signed_url_loading: false,
                signed_url_created_at: undefined,
              };
            }
          } catch (err) {
            console.error(
              `[VideoContext] ❌ Failed to get signed url for video ${video?.id}:`,
              err
            );
            return {
              ...video,
              signed_url: video.signed_url ?? null,
              signed_url_loading: false,
            };
          }
        })
      );

      updatedVideos.push(...chunkResults);
    }

    return updatedVideos;
  };

  const fetchVideos = useCallback(
    async (reset = true) => {
      if (!user) {
        setLoading(false);
        return;
      }

      try {
        if (reset) {
          setLoading(true);
          offsetRef.current = 0;
          setHasMore(true);
        } else {
          setLoadingMore(true);
        }
        setError(null);

        const from = reset ? 0 : offsetRef.current;
        const to = from + VIDEOS_PER_PAGE - 1;

        // Fetch videos ordered by created_at DESC with pagination
        const { data, error: fetchError } = await supabase
          .from("videos")
          .select(
            "id, user_id, prompt, status, bucket_path, signed_url, duration, created_at, completed_at, error_message"
          )
          .eq("user_id", user.id)
          .order("created_at", { ascending: false })
          .order("id", { ascending: false })
          .range(from, to);

        if (fetchError) {
          console.error("[VideoContext] Error fetching videos:", fetchError);
          setError(fetchError.message);
          if (reset) {
            setLoading(false);
          } else {
            setLoadingMore(false);
          }
          return;
        }

        const videosArray = Array.isArray(data) ? data : [];

        // Check if there are more videos to load
        if (videosArray.length < VIDEOS_PER_PAGE) {
          setHasMore(false);
        }

        // Process videos to get signed URLs
        const processedVideos = await processVideosWithSignedUrls(
          videosArray as VideoRecord[]
        );

        if (reset) {
          setVideos(processedVideos);
          offsetRef.current = VIDEOS_PER_PAGE;
        } else {
          setVideos((prev) => {
            // Check if we're not duplicating videos
            const existingIds = new Set(prev.map((v) => v.id));
            const newVideosToAdd = processedVideos.filter(
              (v) => !existingIds.has(v.id)
            );
            const newVideos = [...prev, ...newVideosToAdd];
            offsetRef.current = newVideos.length;
            return newVideos;
          });
        }

        setError(null);
      } catch (err) {
        console.error("[VideoContext] Error fetching videos:", err);
        setError(err instanceof Error ? err.message : "Failed to fetch videos");
      } finally {
        setLoading(false);
        setLoadingMore(false);
      }
    },
    [user]
  );

  const loadMore = useCallback(async () => {
    if (!hasMore || loadingMore || loading) {
      return;
    }

    await fetchVideos(false);
  }, [hasMore, loadingMore, loading, fetchVideos]);

  useEffect(() => {
    if (authLoading) {
      return;
    }

    if (!user) {
      setVideos([]);
      setLoading(false);
      offsetRef.current = 0;
      setHasMore(true);
      return;
    }

    let unsubscribeRealtime: (() => void) | undefined;
    let authListener: {
      data: { subscription: { unsubscribe: () => void } };
    } | null = null;
    let isSubscribed = false;

    const subscribeAndFetch = (user: { id: string }) => {
      if (isSubscribed) {
        return () => {};
      }

      const topic = `user:${user.id}:videos`;

      const channel = supabase
        .channel(topic, { config: { private: true } })
        .on(
          // @ts-ignore - Supabase broadcast type is incomplete
          "broadcast" as any,
          { event: "INSERT" },
          // @ts-ignore
          (event: any) => {
            // The payload structure from realtime.broadcast_changes is:
            // payload: { id, old_record, operation, record: {...actual video data...}, schema, table }
            // We need to extract payload.record which contains the actual video record
            let record: any = null;

            // The actual video record is in payload.record
            if (event?.payload?.record) {
              record = event.payload.record;
            }
            // Fallback: if payload itself looks like a record (has id and user_id)
            else if (event?.payload?.id && event?.payload?.user_id) {
              record = event.payload;
            }
            // Last resort: check event itself
            else if (event?.id && event?.user_id) {
              record = event;
            } else {
              console.warn(
                "[VideoContext] Could not extract record from INSERT broadcast. Payload:",
                event?.payload
              );
              return;
            }

            if (record && record.id) {
              // Add the record immediately - the broadcast contains all the data we need
              setVideos((prev) => {
                const exists = prev.find((v) => v.id === record.id);
                if (exists) {
                  // Update existing video
                  return prev.map((v) =>
                    v.id === record.id
                      ? ({
                          ...v,
                          ...record,
                          signed_url: record.signed_url || v.signed_url || null,
                          signed_url_loading: false,
                          signed_url_created_at:
                            record.signed_url_created_at ||
                            v.signed_url_created_at,
                        } as VideoRecord)
                      : v
                  );
                }
                // Ensure we have all required fields with defaults
                const videoRecord: VideoRecord = {
                  id: record.id,
                  user_id: record.user_id || "",
                  prompt: record.prompt || "",
                  status: record.status || "processing",
                  bucket_path: record.bucket_path || null,
                  signed_url: record.signed_url || null,
                  signed_url_loading: false,
                  signed_url_created_at: record.signed_url_created_at,
                  duration: record.duration || null,
                  created_at: record.created_at || new Date().toISOString(),
                  completed_at: record.completed_at || null,
                  error_message: record.error_message || null,
                };
                // Add new video at the beginning (most recent first)
                return [videoRecord, ...prev];
              });
            }
          }
        )
        .on(
          // @ts-ignore - Supabase broadcast type is incomplete
          "broadcast" as any,
          { event: "UPDATE" },
          // @ts-ignore
          async (event: any) => {
            // Extract record from payload.record (same structure as INSERT)
            let record: any = null;

            if (event?.payload?.record) {
              record = event.payload.record;
            } else if (event?.payload?.id && event?.payload?.user_id) {
              record = event.payload;
            } else if (event?.id && event?.user_id) {
              record = event;
            } else {
              console.warn(
                "[VideoContext] Could not extract record from UPDATE broadcast. Payload:",
                event?.payload
              );
              return;
            }

            if (record && record.id) {
              // Check if video status changed to completed and needs signed URL
              const shouldGenerateSignedUrl =
                record.status === "completed" &&
                record.bucket_path &&
                !record.signed_url;

              if (shouldGenerateSignedUrl) {
                // Generate signed URL for completed video
                try {
                  setVideos((prev) =>
                    prev.map((v) =>
                      v.id === record.id
                        ? ({
                            ...v,
                            ...record,
                            signed_url_loading: true,
                          } as VideoRecord)
                        : v
                    )
                  );

                  const signedUrl = await getSignedUrlAndDownload({
                    bucket: "32_seconds_videos",
                    path: record.bucket_path,
                    expires: SIGNED_URL_EXPIRES,
                    filename: record.id,
                    supabase,
                  });

                  setVideos((prev) =>
                    prev.map((v) =>
                      v.id === record.id
                        ? ({
                            ...v,
                            ...record,
                            signed_url: signedUrl,
                            signed_url_loading: false,
                            signed_url_created_at: Date.now(),
                          } as VideoRecord)
                        : v
                    )
                  );
                } catch (err) {
                  console.error(
                    `[VideoContext] Failed to get signed url for ${record.id}:`,
                    err
                  );
                  // Still update with the record even if signed URL fails
                  setVideos((prev) =>
                    prev.map((v) =>
                      v.id === record.id
                        ? ({
                            ...v,
                            ...record,
                            signed_url_loading: false,
                          } as VideoRecord)
                        : v
                    )
                  );
                }
              } else {
                // Merge updates into the existing item
                setVideos((prev) =>
                  prev.map((v) => {
                    if (v.id !== record.id) {
                      return v;
                    }

                    const merged = {
                      ...v,
                      ...record,
                    } as VideoRecord;

                    // If the video is no longer completed, clear any stale signed URL
                    if (record.status && record.status !== "completed") {
                      merged.signed_url = null;
                      merged.signed_url_loading = false;
                      merged.signed_url_created_at = undefined;
                    } else {
                      merged.signed_url =
                        record.signed_url || v.signed_url || null;
                      merged.signed_url_loading = false;
                      // Preserve existing signed_url_created_at if URL wasn't regenerated
                      merged.signed_url_created_at = v.signed_url_created_at;
                    }

                    return merged;
                  })
                );
              }
            }
          }
        )
        .on(
          // @ts-ignore - Supabase broadcast type is incomplete
          "broadcast" as any,
          { event: "DELETE" },
          // @ts-ignore
          (event: any) => {
            // Extract record from payload.record or payload.old_record
            let record: any = null;

            if (event?.payload?.record) {
              record = event.payload.record;
            } else if (event?.payload?.old_record) {
              record = event.payload.old_record;
            } else if (event?.payload?.id) {
              record = { id: event.payload.id };
            } else if (event?.id) {
              record = { id: event.id };
            }

            const id = record?.id;

            if (id) {
              setVideos((prev) => {
                const newVideos = prev.filter((v) => v.id !== id);
                // Update offset when video is deleted
                offsetRef.current = newVideos.length;
                return newVideos;
              });
            }
          }
        )
        // @ts-ignore
        .subscribe((status: any, err: any) => {
          if (err) {
            console.error("[VideoContext] Subscription error:", err);
          }
          if (status === "SUBSCRIBED") {
            if (!isSubscribed) {
              fetchVideos(true);
              isSubscribed = true;
            }
          } else if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") {
            isSubscribed = false;
            console.warn(
              `[VideoContext] Realtime connection ${status}. Client will attempt reconnect.`
            );
          }
        });

      return () => {
        isSubscribed = false;
        supabase.removeChannel(channel);
      };
    };

    // Subscribe when user is available (only once)
    if (user && !unsubscribeRealtime) {
      unsubscribeRealtime = subscribeAndFetch(user);
    }

    authListener = supabase.auth.onAuthStateChange((event, session) => {
      // Skip if we already have a subscription for this user
      if (session?.user && unsubscribeRealtime && event === "TOKEN_REFRESHED") {
        return; // Don't resubscribe on token refresh
      }

      if (unsubscribeRealtime) {
        unsubscribeRealtime();
        unsubscribeRealtime = undefined;
      }

      if (session?.user && event !== "TOKEN_REFRESHED") {
        unsubscribeRealtime = subscribeAndFetch(session.user);
      } else if (event === "SIGNED_OUT") {
        supabase.removeAllChannels();
        setVideos([]);
        offsetRef.current = 0;
        setHasMore(true);
      }
    });

    return () => {
      if (unsubscribeRealtime) {
        unsubscribeRealtime();
      }
      if (authListener) {
        authListener.data.subscription.unsubscribe();
      }
    };
  }, [fetchVideos, user, authLoading]);

  const deleteVideo = useCallback(async (videoId: string) => {
    const { error } = await supabase.from("videos").delete().eq("id", videoId);
    if (error) {
      throw error;
    }
    setVideos((prev) => prev.filter((v) => v.id !== videoId));
    // Update offset when video is deleted
    offsetRef.current = Math.max(0, offsetRef.current - 1);
  }, []);

  const refreshVideoSignedUrl = useCallback(
    async (videoId: string) => {
      const video = videos.find((v) => v.id === videoId);
      if (!video || video.status !== "completed" || !video.bucket_path) {
        throw new Error("Video not found or not completed");
      }

      try {
        const signedUrl = await getSignedUrlAndDownload({
          bucket: "32_seconds_videos",
          path: video.bucket_path,
          expires: SIGNED_URL_EXPIRES,
          filename: video.id,
          supabase,
        });

        // Update the video in state
        setVideos((prev) =>
          prev.map((v) =>
            v.id === videoId
              ? {
                  ...v,
                  signed_url: signedUrl,
                  signed_url_created_at: Date.now(),
                }
              : v
          )
        );

        return signedUrl;
      } catch (err) {
        console.error(
          `[VideoContext] Failed to refresh signed URL for video ${videoId}:`,
          err
        );
        throw err;
      }
    },
    [videos]
  );

  const refetch = useCallback(() => {
    return fetchVideos(true);
  }, [fetchVideos]);

  return (
    <VideoContext.Provider
      value={{
        videos,
        loading,
        loadingMore,
        hasMore,
        error,
        loadMore,
        deleteVideo,
        refreshVideoSignedUrl,
        refetch,
      }}
    >
      {children}
    </VideoContext.Provider>
  );
}

export function useVideoContext() {
  const context = useContext(VideoContext);
  if (context === undefined) {
    throw new Error("useVideoContext must be used within a VideoProvider");
  }
  return context;
}

