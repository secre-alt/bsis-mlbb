import { useEffect, useRef, useState } from "react";
import { supabase } from "../lib/supabaseClient";

// Presence is intentionally ephemeral: it shows connected browser tabs, not
// a stored or analytics-grade count of people who have ever visited.
function createPresenceKey() {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

export function useVisitorPresence() {
  const [onlineVisitors, setOnlineVisitors] = useState(null);
  const channelRef = useRef(null);
  const presenceKeyRef = useRef(createPresenceKey());

  useEffect(() => {
    if (!supabase || !navigator.onLine) return undefined;

    const channel = supabase.channel("bsis-mlbb-visitors", {
      config: { presence: { key: presenceKeyRef.current } },
    });
    channelRef.current = channel;

    const updateCount = () => {
      setOnlineVisitors(Object.keys(channel.presenceState()).length);
    };

    channel.on("presence", { event: "sync" }, updateCount).subscribe((status) => {
      if (status === "SUBSCRIBED") {
        channel.track({ joinedAt: new Date().toISOString() });
      }
      if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") {
        setOnlineVisitors(null);
      }
    });

    return () => {
      setOnlineVisitors(null);
      if (channelRef.current === channel) channelRef.current = null;
      supabase.removeChannel(channel);
    };
  }, []);

  return onlineVisitors;
}
