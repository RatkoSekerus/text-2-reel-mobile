import { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "../lib/supabase";
import { useAuthContext } from "../contexts/AuthContext";

export function useBalance() {
  const { user, loading: authLoading } = useAuthContext();
  const [balance, setBalance] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const fetchingRef = useRef(false);

  const fetchBalance = useCallback(async () => {
    if (!user) {
      setBalance(null);
      setLoading(false);
      fetchingRef.current = false;
      return;
    }

    // Prevent duplicate concurrent fetches
    if (fetchingRef.current) {
      return;
    }

    try {
      fetchingRef.current = true;
      setLoading(true);

      const { data, error: fetchError } = await supabase
        .from("profiles")
        .select("balance")
        .eq("id", user.id)
        .maybeSingle();

      if (fetchError) {
        setBalance(0);
        return;
      }

      setBalance(data?.balance || 0);
    } catch {
      setBalance(0);
    } finally {
      setLoading(false);
      fetchingRef.current = false;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]); // Only depend on user.id, not the entire user object

  useEffect(() => {
    if (authLoading) {
      return;
    }

    if (!user) {
      setBalance(null);
      setLoading(false);
      return;
    }

    // Fetch balance immediately, don't wait for subscription
    fetchBalance();

    let unsubscribeRealtime: (() => void) | undefined;
    let authListener: {
      data: { subscription: { unsubscribe: () => void } };
    } | null = null;
    let isSubscribed = false;

    const subscribeAndFetch = (user: { id: string }) => {
      // Don't retry if already subscribed
      if (isSubscribed) {
        return () => {};
      }

      const topic = `user:${user.id}:balance`;

      const channel = supabase
        .channel(topic, { config: { private: true } })
        .on(
          // @ts-ignore - Supabase broadcast type is incomplete
          "broadcast" as any,
          { event: "UPDATE" },
          // @ts-ignore
          (event: any) => {
            // The payload structure from realtime.broadcast_changes is:
            // payload: { id, old_record, operation, record: {...actual record data...}, schema, table }
            // We need to extract payload.record which contains the actual balance data
            // @ts-ignore
            let record: any = null;

            // The actual record is in payload.record
            if (event?.payload?.record) {
              record = event.payload.record;
            }
            // Fallback: if payload itself looks like a record (has id and balance)
            else if (
              event?.payload?.id &&
              event?.payload?.balance !== undefined
            ) {
              record = event.payload;
            }
            // Last resort: check event itself
            else if (event?.id && event?.balance !== undefined) {
              record = event;
            } else {
              return;
            }

            if (record && record.balance !== undefined) {
              setBalance(record.balance);
            }
          }
        )
        // @ts-ignore
        .subscribe((status: any, err: any) => {
          if (status === "SUBSCRIBED") {
            if (!isSubscribed) {
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
        // Fetch balance for new session
        fetchBalance();
        unsubscribeRealtime = subscribeAndFetch(session.user);
      } else if (event === "SIGNED_OUT") {
        supabase.removeAllChannels();
        setBalance(null);
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
  }, [fetchBalance, user, authLoading]);

  return { balance, loading, refetch: fetchBalance };
}
