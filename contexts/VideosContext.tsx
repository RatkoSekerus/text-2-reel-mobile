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
import { useAuthContext } from "../contexts/AuthContext";
import {
  VideoRecord,
  getSignedUrlAndDownload,
  VIDEO_FETCH_CHUNK_SIZE,
  SIGNED_URL_EXPIRES,
  VIDEOS_PER_PAGE,
} from "../constants/constants";

interface VideosContextValue {
  videos: VideoRecord[];
  loading: boolean;
  loadingMore: boolean;
  error: string | null;
  hasMore: boolean;
  fetchVideos: (reset?: boolean) => Promise<void>;
  loadMore: () => Promise<void>;
  deleteVideo: (videoId: string) => Promise<void>;
  deleteMultipleVideos: (videoIds: string[]) => Promise<void>;
}

const VideosContext = createContext<VideosContextValue | undefined>(undefined);

export function VideosProvider({ children }: { children: ReactNode }) {
  const { user, loading: authLoading } = useAuthContext();
  const [videos, setVideos] = useState<VideoRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(true);
  const offsetRef = useRef(0);

  // Helper function to process videos and get signed URLs
  const processVideosWithSignedUrls = useCallback(
    async (videosArray: VideoRecord[]): Promise<VideoRecord[]> => {
      const updatedVideos: VideoRecord[] = [];

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
                };
              } else {
                return {
                  ...video,
                  signed_url: null,
                  signed_url_loading: false,
                };
              }
            } catch {
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
    },
    []
  );

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

        const from = reset ? 0 : offsetRef.current;
        const to = from + VIDEOS_PER_PAGE - 1;

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
          setError(fetchError.message);
          if (reset) {
            setLoading(false);
          } else {
            setLoadingMore(false);
          }
          return;
        }

        const videosArray = Array.isArray(data) ? (data as VideoRecord[]) : [];

        if (videosArray.length < VIDEOS_PER_PAGE) {
          setHasMore(false);
        }

        const processedVideos = await processVideosWithSignedUrls(videosArray);

        if (reset) {
          setVideos(processedVideos);
          offsetRef.current = VIDEOS_PER_PAGE;
        } else {
          setVideos((prev) => {
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
        setError(err instanceof Error ? err.message : "Failed to fetch videos");
      } finally {
        setLoading(false);
        setLoadingMore(false);
      }
    },
    [user, processVideosWithSignedUrls]
  );

  const loadMore = useCallback(async () => {
    if (!hasMore || loadingMore || loading) {
      return;
    }
    await fetchVideos(false);
  }, [hasMore, loadingMore, loading, fetchVideos]);

  // Realtime subscription & initial fetch
  useEffect(() => {
    if (authLoading) {
      return;
    }

    if (!user) {
      setVideos([]);
      // Treat "no user" as a loading/transition state so consumers
      // don't briefly show empty-state UI like "No videos yet".
      setLoading(true);
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
        .on("broadcast" as any, { event: "INSERT" }, async (event: any) => {
          let record: any = null;

          if (event?.payload?.record) {
            record = event.payload.record;
          } else if (event?.payload?.id && event?.payload?.user_id) {
            record = event.payload;
          } else if (event?.id && event?.user_id) {
            record = event;
          } else {
            return;
          }

          if (record && record.id) {
            setVideos((prev) => {
              const exists = prev.find((v) => v.id === record.id);
              if (exists) {
                return prev.map((v) =>
                  v.id === record.id
                    ? ({
                        ...v,
                        ...record,
                        signed_url_loading:
                          v.signed_url_loading ??
                          (record.status === "completed" && !record.signed_url
                            ? true
                            : false),
                      } as VideoRecord)
                    : v
                );
              }

              const videoRecord: VideoRecord = {
                id: record.id,
                user_id: record.user_id || "",
                prompt: record.prompt || "",
                status: record.status || "processing",
                bucket_path: record.bucket_path || null,
                signed_url: record.signed_url || null,
                signed_url_loading: false,
                duration: record.duration || null,
                created_at: record.created_at || new Date().toISOString(),
                completed_at: record.completed_at || null,
                error_message: record.error_message || null,
              };

              return [videoRecord, ...prev];
            });

            if (!record.prompt || !record.status) {
              try {
                const { data, error } = await supabase
                  .from("videos")
                  .select(
                    "id, user_id, prompt, status, bucket_path, signed_url, duration, created_at, completed_at, error_message"
                  )
                  .eq("id", record.id)
                  .single();

                if (!error && data) {
                  setVideos((prev) => {
                    const found = prev.find((v) => v.id === data.id);
                    if (found) {
                      return prev.map((v) =>
                        v.id === data.id
                          ? ({
                              ...data,
                              signed_url_loading: false,
                            } as VideoRecord)
                          : v
                      );
                    }
                    return [
                      { ...data, signed_url_loading: false } as VideoRecord,
                      ...prev,
                    ];
                  });
                }
              } catch {
                // ignore
              }
            }
          }
        })
        .on("broadcast" as any, { event: "UPDATE" }, async (event: any) => {
          let record: any = null;

          if (event?.payload?.record) {
            record = event.payload.record;
          } else if (event?.payload?.id && event?.payload?.user_id) {
            record = event.payload;
          } else if (event?.id && event?.user_id) {
            record = event;
          } else {
            return;
          }

          if (record && record.id) {
            setVideos((prev) =>
              prev.map((v) => {
                if (v.id !== record.id) {
                  return v;
                }

                const merged = {
                  ...v,
                  ...record,
                } as VideoRecord;

                if (record.status && record.status !== "completed") {
                  merged.signed_url = null;
                  merged.signed_url_loading = false;
                } else if (
                  record.status === "completed" &&
                  record.bucket_path
                ) {
                  merged.signed_url_loading =
                    v.signed_url_loading ?? merged.signed_url_loading ?? false;
                }

                return merged;
              })
            );

            const shouldRefetch =
              !record.prompt ||
              !record.duration ||
              record.status === "completed" ||
              record.status === "failed" ||
              record.bucket_path;

            const shouldGenerateSignedUrlDirectly =
              !shouldRefetch &&
              record.status === "completed" &&
              record.bucket_path;

            if (shouldRefetch) {
              try {
                const { data, error } = await supabase
                  .from("videos")
                  .select(
                    "id, user_id, prompt, status, bucket_path, signed_url, duration, created_at, completed_at, error_message"
                  )
                  .eq("id", record.id)
                  .single();

                if (!error && data) {
                  if (data.status === "completed" && data.bucket_path) {
                    try {
                      setVideos((prev) =>
                        prev.map((v) =>
                          v.id === data.id
                            ? ({
                                ...v,
                                signed_url_loading: true,
                              } as VideoRecord)
                            : v
                        )
                      );

                      const signedUrl = await getSignedUrlAndDownload({
                        bucket: "32_seconds_videos",
                        path: data.bucket_path,
                        expires: SIGNED_URL_EXPIRES,
                        filename: data.id,
                        supabase,
                      });

                      setVideos((prev) =>
                        prev.map((v) =>
                          v.id === data.id
                            ? ({
                                ...data,
                                signed_url: signedUrl,
                                signed_url_loading: false,
                              } as VideoRecord)
                            : v
                        )
                      );
                    } catch {
                      setVideos((prev) =>
                        prev.map((v) =>
                          v.id === data.id
                            ? ({
                                ...data,
                                signed_url_loading: false,
                              } as VideoRecord)
                            : v
                        )
                      );
                    }
                  } else {
                    setVideos((prev) =>
                      prev.map((v) =>
                        v.id === data.id
                          ? ({
                              ...data,
                              signed_url_loading: false,
                            } as VideoRecord)
                          : v
                      )
                    );
                  }
                }
              } catch {
                // ignore
              }
            } else if (shouldGenerateSignedUrlDirectly) {
              try {
                setVideos((prev) =>
                  prev.map((v) =>
                    v.id === record.id
                      ? ({
                          ...v,
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
                          signed_url: signedUrl,
                          signed_url_loading: false,
                        } as VideoRecord)
                      : v
                  )
                );
              } catch {
                setVideos((prev) =>
                  prev.map((v) =>
                    v.id === record.id
                      ? ({ ...v, signed_url_loading: false } as VideoRecord)
                      : v
                  )
                );
              }
            }
          }
        })
        .on("broadcast" as any, { event: "DELETE" }, (event: any) => {
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
            setVideos((prev) => prev.filter((v) => v.id !== id));
          }
        })
        .subscribe((status: any, err: any) => {
          if (status === "SUBSCRIBED") {
            if (!isSubscribed) {
              fetchVideos(true);
              isSubscribed = true;
            }
          } else if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") {
            isSubscribed = false;
          }
        });

      return () => {
        isSubscribed = false;
        supabase.removeChannel(channel);
      };
    };

    if (user && !unsubscribeRealtime) {
      unsubscribeRealtime = subscribeAndFetch(user);
    }

    authListener = supabase.auth.onAuthStateChange((event, session) => {
      if (session?.user && unsubscribeRealtime && event === "TOKEN_REFRESHED") {
        return;
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
  }, [fetchVideos, user, authLoading, processVideosWithSignedUrls]);

  const deleteVideo = useCallback(async (videoId: string) => {
    const { error } = await supabase.from("videos").delete().eq("id", videoId);
    if (error) {
      throw error;
    }
    setVideos((prev) => prev.filter((v) => v.id !== videoId));
  }, []);

  const deleteMultipleVideos = useCallback(async (videoIds: string[]) => {
    const { error } = await supabase.from("videos").delete().in("id", videoIds);
    if (error) {
      throw error;
    }
    setVideos((prev) => prev.filter((v) => !videoIds.includes(v.id)));
  }, []);

  const value: VideosContextValue = {
    videos,
    loading,
    loadingMore,
    error,
    hasMore,
    fetchVideos,
    loadMore,
    deleteVideo,
    deleteMultipleVideos,
  };

  return (
    <VideosContext.Provider value={value}>{children}</VideosContext.Provider>
  );
}

export function useVideosContext(): VideosContextValue {
  const ctx = useContext(VideosContext);
  if (!ctx) {
    throw new Error("useVideosContext must be used within a VideosProvider");
  }
  return ctx;
}
