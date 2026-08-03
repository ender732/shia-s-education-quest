import { createFileRoute, Link } from "@tanstack/react-router";
import { useTranslation } from "@/i18n";

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
  const { t } = useTranslation();

  return (
    <main className="mx-auto min-h-screen max-w-2xl px-5 py-16">
      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">
        {t("app.name")}
      </p>
      <h1 className="mt-3 text-3xl font-bold">{t("privacy.title")}</h1>
      <p className="mt-2 text-sm text-muted-foreground">{t("privacy.lastUpdated")}</p>

      <div className="mt-8 space-y-5 text-sm leading-relaxed text-foreground/90">
        <p>{t("privacy.intro")}</p>

        <section>
          <h2 className="text-base font-semibold">{t("privacy.collectTitle")}</h2>
          <ul className="mt-2 list-disc space-y-1 ps-5 text-muted-foreground">
            <li>{t("privacy.collect.account")}</li>
            <li>{t("privacy.collect.role")}</li>
            <li>{t("privacy.collect.activity")}</li>
            <li>{t("privacy.collect.files")}</li>
          </ul>
        </section>

        <section>
          <h2 className="text-base font-semibold">{t("privacy.useTitle")}</h2>
          <p className="mt-2 text-muted-foreground">{t("privacy.useBody")}</p>
        </section>

        <section>
          <h2 className="text-base font-semibold">{t("privacy.googleTitle")}</h2>
          <p className="mt-2 text-muted-foreground">{t("privacy.googleBody")}</p>
        </section>

        <section>
          <h2 className="text-base font-semibold">{t("privacy.contactTitle")}</h2>
          <p className="mt-2 text-muted-foreground">{t("privacy.contactBody")}</p>
        </section>
      </div>

      <Link to="/" className="mt-10 inline-block text-sm font-medium text-primary hover:underline">
        {t("privacy.backHome")}
      </Link>
    </main>
  );
}
