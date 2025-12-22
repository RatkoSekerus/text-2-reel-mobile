import { useState, useEffect } from "react";
import { supabase } from "../lib/supabase";

export interface VoiceOption {
  id: string; // voice_id from database
  displayName: string; // display_name from database
  gender: "male" | "female";
  url: string; // audio_url from database
}

export function useVoicesList() {
  const [voices, setVoices] = useState<VoiceOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchVoices = async () => {
      try {
        setLoading(true);
        setError(null);

        const { data, error: fetchError } = await supabase
          .from("voices")
          .select("voice_id, display_name, gender, audio_url, display_order")
          .eq("active", true)
          .order("display_order", { ascending: true });

        if (fetchError) {
          console.error("Error fetching voices:", fetchError);
          setError(fetchError.message);
          return;
        }

        if (data) {
          const mappedVoices: VoiceOption[] = data.map((voice) => ({
            id: voice.voice_id,
            displayName: voice.display_name,
            gender: voice.gender as "male" | "female",
            url: voice.audio_url,
          }));
          setVoices(mappedVoices);
        }
      } catch (err) {
        console.error("Error fetching voices:", err);
        setError(err instanceof Error ? err.message : "Failed to fetch voices");
      } finally {
        setLoading(false);
      }
    };

    fetchVoices();
  }, []);

  return { voices, loading, error };
}


