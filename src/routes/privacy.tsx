import { createFileRoute, Link } from "@tanstack/react-router";

export const Route = createFileRoute("/privacy")({
  head: () => ({
    meta: [
      { title: "Privacy Policy — Shia's 5th Grade Quest" },
      {
        name: "description",
        content:
          "Privacy policy for Shia's 5th Grade Quest, a 5th-grade learning app for P.S./I.S. 187.",
      },
    ],
  }),
  component: PrivacyPage,
});

function PrivacyPage() {
  return (
    <main className="mx-auto min-h-screen max-w-2xl px-5 py-16">
      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">
        Shia&apos;s 5th Grade Quest
      </p>
      <h1 className="mt-3 text-3xl font-bold">Privacy Policy</h1>
      <p className="mt-2 text-sm text-muted-foreground">Last updated: July 31, 2026</p>

      <div className="mt-8 space-y-5 text-sm leading-relaxed text-foreground/90">
        <p>
          Shia&apos;s 5th Grade Quest (&quot;the App&quot;) helps students prepare for 5th grade at
          P.S./I.S. 187 and lets parents monitor progress. This page explains what information we
          collect and how we use it.
        </p>

        <section>
          <h2 className="text-base font-semibold">Information we collect</h2>
          <ul className="mt-2 list-disc space-y-1 pl-5 text-muted-foreground">
            <li>Account details (email, name if provided by your sign-in provider)</li>
            <li>Role (student or parent) and age verification for parent accounts</li>
            <li>Learning activity (tasks, XP, streaks, book reports, and related progress)</li>
            <li>Files parents upload (for example assigned reading PDFs)</li>
          </ul>
        </section>

        <section>
          <h2 className="text-base font-semibold">How we use information</h2>
          <p className="mt-2 text-muted-foreground">
            We use this information to run accounts, save progress, grade writing with AI where
            enabled, and let linked parents review student work. We do not sell personal information.
          </p>
        </section>

        <section>
          <h2 className="text-base font-semibold">Sign-in with Google</h2>
          <p className="mt-2 text-muted-foreground">
            If you choose Google sign-in, Google shares basic profile information (such as email)
            with our authentication provider so we can create or open your account. Authentication is
            handled by Supabase Auth.
          </p>
        </section>

        <section>
          <h2 className="text-base font-semibold">Contact</h2>
          <p className="mt-2 text-muted-foreground">
            Questions about this policy: use the contact email configured on the Google OAuth
            consent screen for this app, or reach the parent/guardian who manages the App.
          </p>
        </section>
      </div>

      <Link to="/" className="mt-10 inline-block text-sm font-medium text-primary hover:underline">
        ← Back home
      </Link>
    </main>
  );
}
