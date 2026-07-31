import type { EmailOtpType, Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

export type AuthCallbackResult = {
  session: Session | null;
  error: string | null;
  /** True when the URL had auth params we tried to process. */
  hadAuthParams: boolean;
};

function readHashParams(): URLSearchParams {
  if (typeof window === "undefined") return new URLSearchParams();
  const raw = window.location.hash.replace(/^#/, "");
  return new URLSearchParams(raw);
}

function clearAuthParamsFromUrl(): void {
  if (typeof window === "undefined") return;
  const url = new URL(window.location.href);
  for (const key of [
    "code",
    "sb_flow_id",
    "token_hash",
    "type",
    "error",
    "error_code",
    "error_description",
  ]) {
    url.searchParams.delete(key);
  }
  url.hash = "";
  window.history.replaceState(window.history.state, "", url.pathname + url.search);
}

/**
 * Establish a session from a Supabase email / OAuth redirect URL.
 * Handles PKCE `code`, `token_hash`+`type`, and implicit hash tokens.
 */
export async function establishSessionFromUrl(): Promise<AuthCallbackResult> {
  if (typeof window === "undefined") {
    return { session: null, error: null, hadAuthParams: false };
  }

  const url = new URL(window.location.href);
  const hash = readHashParams();

  const errorMessage =
    url.searchParams.get("error_description") ||
    url.searchParams.get("error") ||
    hash.get("error_description") ||
    hash.get("error");

  if (errorMessage) {
    clearAuthParamsFromUrl();
    return {
      session: null,
      error: decodeURIComponent(errorMessage.replace(/\+/g, " ")),
      hadAuthParams: true,
    };
  }

  const code = url.searchParams.get("code");
  if (code) {
    const flowId = url.searchParams.get("sb_flow_id");
    const { data, error } = await supabase.auth.exchangeCodeForSession(
      code,
      flowId ? { flowId } : undefined,
    );
    clearAuthParamsFromUrl();
    if (error) return { session: null, error: error.message, hadAuthParams: true };
    return { session: data.session, error: null, hadAuthParams: true };
  }

  const tokenHash = url.searchParams.get("token_hash");
  const type = url.searchParams.get("type") as EmailOtpType | null;
  if (tokenHash && type) {
    const { data, error } = await supabase.auth.verifyOtp({
      token_hash: tokenHash,
      type,
    });
    clearAuthParamsFromUrl();
    if (error) return { session: null, error: error.message, hadAuthParams: true };
    return { session: data.session, error: null, hadAuthParams: true };
  }

  const accessToken = hash.get("access_token");
  const refreshToken = hash.get("refresh_token");
  if (accessToken && refreshToken) {
    const { data, error } = await supabase.auth.setSession({
      access_token: accessToken,
      refresh_token: refreshToken,
    });
    clearAuthParamsFromUrl();
    if (error) return { session: null, error: error.message, hadAuthParams: true };
    return { session: data.session, error: null, hadAuthParams: true };
  }

  // Client may already have processed the URL via detectSessionInUrl.
  const { data } = await supabase.auth.getSession();
  return { session: data.session, error: null, hadAuthParams: false };
}
