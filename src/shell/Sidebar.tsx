import { useLanguage, setLanguage, getPlatformCopy, getVisualizerLabel } from "@stats-viz/shared/i18n";
import { apps, type AppRecord } from "../../scripts/apps";

const GROUP_ORDER: AppRecord["group"][] = [
  "Core Visualizers",
  "WALS Simulation",
  "WALS MES",
];

interface SidebarProps {
  activeId: string;
  onNavigate: (id: string) => void;
}

export function Sidebar({ activeId, onNavigate }: SidebarProps) {
  const lang = useLanguage();
  const copy = getPlatformCopy(lang);

  return (
    <aside className="platform-sidebar">
      <div className="platform-sidebar__title-group">
        <div className="platform-sidebar__mark" aria-hidden="true">
          <svg viewBox="0 0 64 64" role="img">
            <path d="M8 44c7-1 9-26 24-26s17 25 24 26" />
            <path d="M10 46h44" />
            <circle cx="32" cy="18" r="4" />
          </svg>
        </div>
        <h1 className="platform-sidebar__title">{copy.brandTitle}</h1>
        <p className="platform-sidebar__subtitle">{copy.brandSubtitle}</p>
        <p className="platform-sidebar__active-title">
          {getVisualizerLabel(activeId, lang)[1]}
        </p>
      </div>

      <nav className="visualizer-nav" aria-label={copy.navLabel}>
        {GROUP_ORDER.map((groupName) => {
          const groupApps = apps.filter((app) => app.group === groupName);
          return (
            <section
              key={groupName}
              className="visualizer-nav__group"
              data-group-name={groupName}
            >
              <h2 className="visualizer-nav__group-title">
                {copy.groups[groupName]}
              </h2>
              <div className="visualizer-nav__button-row">
                {groupApps.map((app) => {
                  const isActive = app.id === activeId;
                  const [label, detail] = getVisualizerLabel(app.id, lang);
                  return (
                    <button
                      key={app.id}
                      className="visualizer-nav__button"
                      type="button"
                      data-visualizer-id={app.id}
                      data-active={isActive}
                      aria-pressed={isActive}
                      onClick={() => onNavigate(app.id)}
                    >
                      <span className="visualizer-nav__icon">
                        {app.icon}
                      </span>
                      <span className="visualizer-nav__copy">
                        <span className="visualizer-nav__label">{label}</span>
                        <span className="visualizer-nav__detail">{detail}</span>
                      </span>
                      <span className="visualizer-nav__marker">
                        {isActive ? "✦" : ""}
                      </span>
                    </button>
                  );
                })}
              </div>
            </section>
          );
        })}
      </nav>

      <aside className="platform-sidebar__tip">
        <strong>{copy.tipTitle}</strong>
        <span>{copy.tipBody}</span>
      </aside>
    </aside>
  );
}

export function LanguageTabs() {
  const lang = useLanguage();

  const tabs: Array<{ language: "zh" | "en"; label: string }> = [
    { language: "zh", label: "中文" },
    { language: "en", label: "English" },
  ];

  return (
    <div className="platform-language-tabs" role="tablist" aria-label="Language">
      {tabs.map(({ language, label }) => (
        <button
          key={language}
          className="platform-language-tab"
          type="button"
          data-language={language}
          data-active={lang === language}
          role="tab"
          aria-selected={lang === language}
          onClick={() => setLanguage(language)}
        >
          {label}
        </button>
      ))}
    </div>
  );
}
