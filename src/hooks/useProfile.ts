import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

export type Profile = {
  id: string;
  display_name: string | null;
  role: string;
  xp_points: number;
  level: number;
  streak_days: number;
  last_active_date: string | null;
  link_code?: string | null;
  date_of_birth?: string | null;
  age_verified_at?: string | null;
  parent_contact_email?: string | null;
};

export function useSession() {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    supabase.auth.getSession().then(({ data }) => {
      if (!active) return;
      setSession(data.session);
      setLoading(false);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_event, next) => {
      setSession(next);
    });
    return () => {
      active = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  return { session, loading };
}

export function useProfile(userId?: string) {
  return useQuery({
    queryKey: ["profile", userId],
    enabled: Boolean(userId),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", userId!)
        .maybeSingle();
      if (error) throw error;
      return data as Profile | null;
    },
  });
}

/** Keeps the daily streak counter fresh once per day. */
export function useStreakTouch(profile: Profile | null | undefined) {
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!profile) return;
    const today = new Date().toISOString().slice(0, 10);
    if (profile.last_active_date === today) return;

    const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
    const streak = profile.last_active_date === yesterday ? profile.streak_days + 1 : 1;

    supabase
      .from("profiles")
      .update({ last_active_date: today, streak_days: streak })
      .eq("id", profile.id)
      .then(() => {
        queryClient.invalidateQueries({ queryKey: ["profile", profile.id] });
      });
  }, [profile, queryClient]);
}
