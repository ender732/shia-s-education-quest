import { Languages } from "lucide-react";
import { useId } from "react";
import { localeOptions, useTranslation, type Locale } from "@/i18n";

/**
 * Language picker shown in the authenticated dashboard header.
 * The choice is stored per browser and applied to <html lang>/<html dir>.
 */
export function LanguageSwitcher({ className = "" }: { className?: string }) {
  const { locale, setLocale, t } = useTranslation();
  const selectId = useId();
  const options = localeOptions();

  return (
    <div
      className={`inline-flex items-center gap-1.5 rounded-lg border border-border bg-surface px-2.5 py-1.5 text-xs font-semibold ${className}`}
    >
      <Languages className="size-3.5 shrink-0 text-primary" aria-hidden />
      <label className="sr-only" htmlFor={selectId}>
        {t("language.chooseAria")}
      </label>
      <select
        id={selectId}
        value={locale}
        onChange={(e) => setLocale(e.target.value as Locale)}
        className="cursor-pointer bg-transparent pe-1 text-xs font-semibold text-foreground outline-none"
      >
        {options.map((option) => (
          <option key={option.code} value={option.code} className="bg-surface text-foreground">
            {option.autonym}
          </option>
        ))}
      </select>
    </div>
  );
}
