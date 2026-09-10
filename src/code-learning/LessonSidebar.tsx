import { useLanguage } from "@stats-viz/shared/i18n";
import type { CodeLesson, CodeLessonUnit } from "./types";

type Props<Unit extends string> = {
  label: string;
  lessons: readonly CodeLesson<Unit>[];
  units: readonly CodeLessonUnit<Unit>[];
  activeLessonId: string;
  completedLessonIds: readonly string[];
  onSelect: (lessonId: string) => void;
};

export function LessonSidebar<Unit extends string>({
  label,
  lessons,
  units,
  activeLessonId,
  completedLessonIds,
  onSelect,
}: Props<Unit>) {
  const language = useLanguage();
  return (
    <aside className="r-lesson-sidebar">
      <div className="r-sidebar-heading">
        <span>{label}</span>
        <b>{String(lessons.length).padStart(2, "0")}</b>
      </div>
      <nav className="r-lesson-nav" aria-label={label}>
        {units.map((unit) => {
          const unitLessons = lessons.filter((lesson) => lesson.unit === unit.id);
          if (!unitLessons.length) return null;
          return (
            <section key={unit.id} className="r-lesson-nav__unit">
              <div className="r-lesson-nav__unit-title">
                <span>{unit.number}</span>
                <strong>{unit[language]}</strong>
              </div>
              {unitLessons.map((lesson) => {
                const complete = completedLessonIds.includes(lesson.id);
                const active = lesson.id === activeLessonId;
                return (
                  <button
                    key={lesson.id}
                    type="button"
                    className="r-lesson-nav__item"
                    data-active={active}
                    onClick={() => onSelect(lesson.id)}
                    aria-current={active ? "page" : undefined}
                  >
                    <span className="r-lesson-nav__number">
                      {String(lesson.order).padStart(2, "0")}
                    </span>
                    <span className="r-lesson-nav__copy">
                      <strong>{lesson.title[language]}</strong>
                      <small>{lesson.concepts.join(" · ")}</small>
                    </span>
                    <span
                      className="r-lesson-nav__state"
                      data-complete={complete}
                      aria-label={complete ? "complete" : "not complete"}
                    >
                      {complete ? "✓" : ""}
                    </span>
                  </button>
                );
              })}
            </section>
          );
        })}
      </nav>
    </aside>
  );
}
