import { useVideosContext } from "../contexts/VideosContext";
import type { VideoRecord } from "../constants/constants";

export type { VideoRecord };

export function useVideos() {
  return useVideosContext();
}
