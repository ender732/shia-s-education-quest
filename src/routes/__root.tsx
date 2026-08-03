import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  Link,
  createRootRouteWithContext,
  useRouter,
  HeadContent,
  Scripts,
} from "@tanstack/react-router";
import type { ReactNode } from "react";
import { Toaster } from "sonner";
import { AnalyticsPageTracker } from "@/components/AnalyticsPageTracker";
import { SiteFooter } from "@/components/SiteFooter";
import { SkipToMain } from "@/components/SkipToMain";
import { DEFAULT_LOCALE, I18nProvider, LOCALE_META, useTranslation } from "@/i18n";

import appCss from "../styles.css?url";

function NotFoundComponent() {
  const { t } = useTranslation();

  return (
    <main id="main-content" tabIndex={-1} className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-7xl font-bold text-foreground">{t("errors.notFound.code")}</h1>
        <h2 className="mt-4 text-xl font-semibold text-foreground">{t("errors.notFound.title")}</h2>
        <p className="mt-2 text-sm text-muted-foreground">{t("errors.notFound.body")}</p>
        <div className="mt-6">
          <Link
            to="/"
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            {t("common.goHome")}
          </Link>
        </div>
      </div>
    </main>
  );
}

function ErrorComponent({ error, reset }: { error: Error; reset: () => void }) {
  console.error(error);
  const router = useRouter();
  const { t } = useTranslation();

  return (
    <main id="main-content" tabIndex={-1} className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-xl font-semibold tracking-tight text-foreground">
          {t("errors.boundary.title")}
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">{t("errors.boundary.body")}</p>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <button
            type="button"
            onClick={() => {
              router.invalidate();
              reset();
            }}
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            {t("common.tryAgain")}
          </button>
          <a
            href="/"
            className="inline-flex items-center justify-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-accent"
          >
            {t("common.goHome")}
          </a>
        </div>
      </div>
    </main>
  );
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "Shia's 5th Grade Quest — P.S./I.S. 187 Grade 5 Prep" },
      {
        name: "description",
        content:
          "Gamified 5th-grade prep and AI-graded book reports for P.S./I.S. 187 Hudson Cliffs students and parents.",
      },
      { name: "author", content: "Shia's 5th Grade Quest" },
      { property: "og:title", content: "Shia's 5th Grade Quest — P.S./I.S. 187 Grade 5 Prep" },
      {
        property: "og:description",
        content: "Earn XP, keep your streak, and get instant AI feedback on RACECE writing.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],

    links: [
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,600;12..96,800&family=Space+Grotesk:wght@400;500;700&display=swap",
      },
      {
        rel: "stylesheet",
        href: appCss,
      },
      // Cache-bust so browsers drop the old Lovable heart favicon.
      { rel: "icon", href: "/favicon.ico?v=2", type: "image/x-icon" },
      { rel: "shortcut icon", href: "/favicon.ico?v=2", type: "image/x-icon" },
      { rel: "apple-touch-icon", href: "/favicon.ico?v=2" },
    ],

  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function RootShell({ children }: { children: ReactNode }) {
  return (
    // Server render is always the default locale; I18nProvider rewrites lang/dir
    // on mount so Arabic gets dir="rtl" without a hydration mismatch.
    <html lang={LOCALE_META[DEFAULT_LOCALE].bcp47} dir={LOCALE_META[DEFAULT_LOCALE].dir}>
      <head>
        <HeadContent />
      </head>
      <body>
        <I18nProvider>{children}</I18nProvider>
        <Scripts />
      </body>
    </html>
  );
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();

  return (
    <QueryClientProvider client={queryClient}>
      <SkipToMain />
      <div className="flex min-h-screen flex-col">
        {/* Required: nested routes render here. Removing <Outlet /> breaks all child routes. */}
        <AnalyticsPageTracker />
        <div className="flex-1">
          <Outlet />
        </div>
        <SiteFooter />
      </div>
      <Toaster theme="dark" position="top-center" richColors closeButton />
    </QueryClientProvider>
  );
}
