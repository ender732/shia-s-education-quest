import { Link } from "@tanstack/react-router";
import { useTranslation } from "@/i18n";

const REPO = "https://github.com/ender732/shia-s-education-quest";

/** Site-wide credit required for Netlify Open Source plan eligibility. */
export function SiteFooter() {
  const { t } = useTranslation();

  return (
    <footer className="mt-auto border-t border-border/60 bg-background/80 px-5 py-6 text-center text-xs text-muted-foreground">
      <nav
        className="flex flex-wrap items-center justify-center gap-x-3 gap-y-1"
        aria-label={t("footer.legalNavAria")}
      >
        <Link to="/privacy" className="underline-offset-2 hover:underline hover:text-foreground">
          {t("footer.privacy")}
        </Link>
        <span aria-hidden className="text-border">
          ·
        </span>
        <a
          href={`${REPO}/blob/main/CODE_OF_CONDUCT.md`}
          target="_blank"
          rel="noopener noreferrer"
          className="underline-offset-2 hover:underline hover:text-foreground"
        >
          {t("footer.codeOfConduct")}
        </a>
        <span aria-hidden className="text-border">
          ·
        </span>
        <a
          href={`${REPO}/blob/main/LICENSE.md`}
          target="_blank"
          rel="noopener noreferrer"
          className="underline-offset-2 hover:underline hover:text-foreground"
        >
          {t("footer.license")}
        </a>
      </nav>
      <p className="mt-3">
        {t("footer.poweredByPrefix")}{" "}
        <a
          href="https://www.netlify.com"
          target="_blank"
          rel="noopener noreferrer"
          className="font-medium text-foreground underline-offset-2 hover:underline"
        >
          {t("footer.netlify")}
        </a>
        .
      </p>
      <p className="mt-2">
        <a
          href="https://www.netlify.com"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex opacity-90 transition hover:opacity-100"
        >
          <img
            src="https://www.netlify.com/v3/img/components/netlify-color-accent.svg"
            alt={t("footer.netlifyBadgeAlt")}
            width={114}
            height={50}
            className="mx-auto h-8 w-auto"
          />
        </a>
      </p>
    </footer>
  );
}
