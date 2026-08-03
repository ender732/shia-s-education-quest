import { useTranslation } from "@/i18n";
import { accentFor } from "@/lib/gamification";
import { imageForSubject } from "@/lib/subject-images";

type Subject = {
  id: string;
  title: string;
};

type SubjectTabsProps = {
  subjects: Subject[];
  activeId: string | null | undefined;
  onSelect: (id: string) => void;
};

export function SubjectTabs({ subjects, activeId, onSelect }: SubjectTabsProps) {
  const { t, tDb } = useTranslation();

  return (
    <nav
      aria-label={t("subjects.navAria")}
      className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5"
    >
      {subjects.map((s) => {
        const active = activeId === s.id;
        const accent = accentFor(s.title);
        const image = imageForSubject(s.title);

        return (
          <button
            key={s.id}
            type="button"
            onClick={() => onSelect(s.id)}
            aria-pressed={active}
            style={
              active
                ? {
                    borderColor: `var(--${accent})`,
                    boxShadow: `0 0 0 2px color-mix(in oklab, var(--${accent}) 35%, transparent)`,
                  }
                : undefined
            }
            className={`group overflow-hidden rounded-xl border bg-surface text-start transition ${
              active
                ? "border-2"
                : "border-border hover:border-foreground/25 hover:shadow-sm"
            }`}
          >
            <div className="relative aspect-[16/10] overflow-hidden bg-secondary">
              {image ? (
                <img
                  src={image}
                  alt=""
                  className="size-full object-cover transition duration-300 group-hover:scale-[1.03]"
                />
              ) : (
                <div
                  className="size-full"
                  style={{ background: `color-mix(in oklab, var(--${accent}) 25%, transparent)` }}
                />
              )}
              <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/55 via-black/10 to-transparent" />
              <span
                className={`absolute inset-x-0 bottom-0 p-2 text-[11px] font-bold leading-tight text-white drop-shadow sm:text-xs ${
                  active ? "" : "opacity-95"
                }`}
                style={active ? { textShadow: `0 0 12px var(--${accent})` } : undefined}
              >
              {tDb("subjects.title", s.title)}
            </span>
            </div>
          </button>
        );
      })}
    </nav>
  );
}
