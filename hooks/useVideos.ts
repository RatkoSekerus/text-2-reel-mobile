import { useVideoContext } from "../contexts/VideoContext";

/**
 * Hook to access video data and operations.
 * This is a thin wrapper around VideoContext for backward compatibility.
 * All video state and operations are managed centrally in VideoContext.
 */
export function useVideos() {
  return useVideoContext();
}
