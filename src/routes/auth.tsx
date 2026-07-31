import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Loader2, Sparkles } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useSession } from "@/hooks/useProfile";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Sign in — Shia's 5th Grade Quest" },
      {
        name: "description",
        content:
          "Sign in to Shia's 5th Grade Quest to track XP, complete P.S./I.S. 187 assignments, and submit AI-graded book reports.",
      },
      { property: "og:title", content: "Sign in — Shia's 5th Grade Quest" },
      {
        property: "og:description",
        content: "Student and parent access for the P.S./I.S. 187 5th-grade prep platform.",
      },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const navigate = useNavigate();
  const { session } = useSession();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [role, setRole] = useState<"student" | "parent">("student");
  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [checkEmail, setCheckEmail] = useState(false);

  useEffect(() => {
    if (session) navigate({ to: "/dashboard", replace: true });
  }, [session, navigate]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      if (mode === "signup") {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: window.location.origin,
            data: { display_name: displayName || email.split("@")[0], role },
          },
        });
        if (error) throw error;
        if (!data.session) setCheckEmail(true);
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setBusy(false);
    }
  }

  async function handleGoogle() {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: window.location.origin },
    });
    if (error) toast.error("Google sign-in failed. Please try again.");
  }

  return (
    <main className="flex min-h-screen items-center justify-center px-5 py-12">
      <div className="surface-card w-full max-w-md p-6 sm:p-8">
        <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.2em] text-primary">
          <Sparkles className="size-3.5" /> Shia's 5th Grade Quest
        </p>
        <h1 className="mt-2 text-2xl font-bold">
          {mode === "signin" ? "Welcome back" : "Create your account"}
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          P.S./I.S. 187 5th-grade prep for students and parents.
        </p>

        {checkEmail ? (
          <div className="mt-6 rounded-xl border border-border bg-background/60 p-4 text-sm text-muted-foreground">
            Check your email to confirm your account, then come back and sign in.
          </div>
        ) : (
          <>
            <form onSubmit={handleSubmit} className="mt-6 space-y-3">
              {mode === "signup" && (
                <>
                  <input
                    className="input-base"
                    placeholder="Display name"
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                  />
                  <div className="grid grid-cols-2 gap-2">
                    {(["student", "parent"] as const).map((r) => (
                      <button
                        key={r}
                        type="button"
                        onClick={() => setRole(r)}
                        className={`rounded-lg border px-3 py-2 text-xs font-bold capitalize transition ${
                          role === r
                            ? "border-primary bg-primary/15 text-primary"
                            : "border-border text-muted-foreground"
                        }`}
                      >
                        {r}
                      </button>
                    ))}
                  </div>
                  {role === "parent" && (
                    <p className="text-[11px] leading-relaxed text-muted-foreground">
                      Parent Portal access also requires your email to be on the authorized allowlist
                      (configured by the site admin). Choosing parent here only sets your profile role.
                    </p>
                  )}
                </>
              )}
              <input
                className="input-base"
                type="email"
                placeholder="Email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
              <input
                className="input-base"
                type="password"
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                minLength={6}
                required
              />
              <button
                type="submit"
                disabled={busy}
                className="glow-ring inline-flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-4 py-3 text-sm font-bold text-primary-foreground transition hover:brightness-110 disabled:opacity-60"
              >
                {busy && <Loader2 className="size-4 animate-spin" />}
                {mode === "signin" ? "Sign in" : "Create account"}
              </button>
            </form>

            <div className="my-4 flex items-center gap-3 text-[11px] uppercase tracking-wider text-muted-foreground">
              <span className="h-px flex-1 bg-border" /> or <span className="h-px flex-1 bg-border" />
            </div>

            <button
              onClick={handleGoogle}
              className="w-full rounded-xl border border-border bg-background px-4 py-3 text-sm font-semibold transition hover:bg-secondary"
            >
              Continue with Google
            </button>

            <button
              onClick={() => setMode(mode === "signin" ? "signup" : "signin")}
              className="mt-5 w-full text-center text-xs text-muted-foreground underline-offset-4 hover:underline"
            >
              {mode === "signin"
                ? "New here? Create an account"
                : "Already have an account? Sign in"}
            </button>
          </>
        )}
      </div>
    </main>
  );
}
