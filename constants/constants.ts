import { SupabaseClient } from "@supabase/supabase-js";
import Constants from "expo-constants";

export const PRICE_PER_VIDEO: number = 9.99;
export const VIDEO_FETCH_CHUNK_SIZE = 5; // Number of videos to process concurrently
export const SIGNED_URL_EXPIRES = 10800; // 3 hours in seconds
export const VIDEOS_PER_PAGE = 10; // Number of videos to load per page

export interface VideoRecord {
  id: string;
  user_id: string;
  prompt: string;
  status: string;
  bucket_path: string | null;
  signed_url: string | null;
  signed_url_loading?: boolean;
  duration: number | null;
  created_at: string;
  completed_at: string | null;
  error_message: string | null;
}

interface GetSignedUrlParams {
  bucket: string;
  path: string;
  expires?: number;
  filename?: string;
  supabase: SupabaseClient;
}

export const getSignedUrlAndDownload = async function getSignedUrlAndDownload({
  bucket,
  path,
  expires = SIGNED_URL_EXPIRES,
  filename,
  supabase,
}: GetSignedUrlParams): Promise<string> {
  const { data: sessionData } = await supabase.auth.getSession();
  const accessToken = sessionData?.session?.access_token;

  // Get Supabase URL from environment or config
  const supabaseUrl =
    Constants.expoConfig?.extra?.supabaseUrl ||
    process.env.EXPO_PUBLIC_SUPABASE_URL ||
    "";

  if (!supabaseUrl) {
    throw new Error("Supabase URL not configured");
  }

  const endpoint = `${supabaseUrl.replace(
    /^https?:\/\//,
    "https://"
  )}/functions/v1/smooth-handler`;

  const requestBody = { bucket, path, expires, filename };

  const res = await fetch(endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
    },
    body: JSON.stringify(requestBody),
  });

  if (!res.ok) {
    const txt = await res.text();
    throw new Error(`Function error: ${res.status} ${txt}`);
  }

  const json = await res.json();

  const signedUrl = json.url;
  if (!signedUrl) {
    throw new Error("No signed URL returned");
  }

  return signedUrl;
};
