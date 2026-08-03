import { useTranslation } from "@/i18n";

/** First focusable control: jumps keyboard / screen-reader users past chrome. */
export function SkipToMain() {
  const { t } = useTranslation();

  return (
    <a href="#main-content" className="skip-to-main">
      {t("a11y.skipToMain")}
    </a>
  );
}
