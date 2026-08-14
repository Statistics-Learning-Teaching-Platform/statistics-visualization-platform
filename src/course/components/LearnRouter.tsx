import { Suspense, useState } from "react";
import { useLanguage } from "@stats-viz/shared/i18n";
import { appRegistry } from "../../shell/appRegistry";
import { LanguageTabs } from "../../shell/Sidebar";
import { chapterManifests, courseManifests } from "../courseManifest";
import {
  getActivityRoute,
  getChapterRoute,
  getTopicRoute,
  parseLearnRoute,
} from "../routeHelpers";
import { activityManifests, getTopicById, topicManifests } from "../topicRegistry";
import type { LocalizedText } from "../types";
import "../course.css";

type Language = "zh" | "en";

const explorerGroups: Array<{
  id: string;
  title: LocalizedText;
  topicIds: string[];
}> = [
  { id: "distributions", title: { zh: "分布", en: "Distributions" }, topicIds: ["probability-distributions", "normal-distribution", "t-distribution"] },
  { id: "sampling", title: { zh: "抽样", en: "Sampling" }, topicIds: ["sampling-methods", "sampling-distributions", "central-limit-theorem"] },
  { id: "inference", title: { zh: "推断", en: "Inference" }, topicIds: ["point-estimation", "confidence-interval"] },
  { id: "testing", title: { zh: "检验", en: "Testing" }, topicIds: ["hypothesis-testing", "type-i-type-ii-errors", "anova"] },
  { id: "regression", title: { zh: "回归", en: "Regression" }, topicIds: ["correlation", "linear-regression"] },
  { id: "simulation", title: { zh: "模拟", en: "Simulation" }, topicIds: ["simulation-foundations", "monte-carlo", "bootstrap-and-permutation", "mcmc", "variance-reduction"] },
  { id: "coding", title: { zh: "编程实验", en: "Coding labs" }, topicIds: ["descriptive-statistics", "histograms", "central-limit-theorem", "hypothesis-testing", "linear-regression"] },
];

function localize(value: LocalizedText, language: Language): string {
  return value[language];
}

function LearningHeader() {
  const language = useLanguage();
  return (
    <header className="learn-header">
      <a className="learn-brand" href="/teaching-platform" aria-label={language === "zh" ? "统计教学平台" : "Statistics teaching platform"}>
        <span className="learn-brand__mark" aria-hidden="true">Σ</span>
        <span><strong>StatMind</strong><small>{language === "zh" ? "统计学数字教学平台" : "Digital statistics learning"}</small></span>
      </a>
      <nav className="learn-header__links" aria-label={language === "zh" ? "平台导航" : "Platform navigation"}>
        <a href="/">{language === "zh" ? "平台首页" : "Platform home"}</a>
        <a href="/r-learning?returnTo=%2F">R</a>
        <a href="/python-learning?returnTo=%2F">Python</a>
      </nav>
      <LanguageTabs />
    </header>
  );
}

function Breadcrumbs({ items }: { items: Array<{ label: string; href?: string }> }) {
  return (
    <nav className="learn-breadcrumbs" aria-label="Breadcrumb">
      {items.map((item, index) => (
        <span key={`${item.label}-${index}`}>
          {index > 0 && <b aria-hidden="true">/</b>}
          {item.href ? <a href={item.href}>{item.label}</a> : <span aria-current="page">{item.label}</span>}
        </span>
      ))}
    </nav>
  );
}

function LearnHome() {
  const language = useLanguage();
  const [view, setView] = useState<"path" | "topics">("path");
  const statisticsCourse = courseManifests.find(({ id }) => id === "statistics");
  const chapters = (statisticsCourse?.chapterIds ?? [])
    .map((id) => chapterManifests.find((chapter) => chapter.id === id))
    .filter((chapter): chapter is NonNullable<typeof chapter> => Boolean(chapter));

  return (
    <main className="learn-page">
      <section className="learn-hero">
        <p className="learn-eyebrow">STATMIND · {language === "zh" ? "学习路径" : "LEARNING PATH"}</p>
        <h1>{language === "zh" ? "从一个问题，走到可信的统计结论" : "From a question to a trustworthy statistical conclusion"}</h1>
        <p>{language === "zh" ? "按先修关系学习，也可以按主题快速进入。每个知识点将连接解释、可视化、例题、编程实验与练习。" : "Follow prerequisite relationships or jump in by theme. Every topic connects explanations, visualizations, examples, coding labs, and practice."}</p>
        <div className="learn-hero__metrics" aria-label={language === "zh" ? "课程概览" : "Course overview"}>
          <span><strong>{chapters.length}</strong>{language === "zh" ? "章课程" : "chapters"}</span>
          <span><strong>{topicManifests.filter(({ chapterId }) => chapters.some(({ id }) => id === chapterId)).length}</strong>{language === "zh" ? "个知识点" : "topics"}</span>
          <span><strong>{activityManifests.length}</strong>{language === "zh" ? "项学习活动" : "activities"}</span>
        </div>
      </section>

      <div className="learn-view-tabs" role="tablist" aria-label={language === "zh" ? "课程浏览方式" : "Course views"}>
        <button type="button" role="tab" aria-selected={view === "path"} onClick={() => setView("path")}>{language === "zh" ? "学习路径" : "Learning path"}</button>
        <button type="button" role="tab" aria-selected={view === "topics"} onClick={() => setView("topics")}>{language === "zh" ? "主题探索" : "Explore topics"}</button>
      </div>

      {view === "path" ? (
        <section className="chapter-list" aria-label={language === "zh" ? "章节学习路径" : "Chapter learning path"}>
          {chapters.map((chapter) => {
            const chapterTopics = topicManifests.filter(({ chapterId }) => chapterId === chapter.id);
            return (
              <article className="chapter-card" key={chapter.id}>
                <span className="chapter-card__number">{String(chapter.order).padStart(2, "0")}</span>
                <div className="chapter-card__body">
                  <h2>{localize(chapter.title, language).replace(/^\d{2}\s*/, "")}</h2>
                  <p>{localize(chapter.description, language)}</p>
                  <div className="chapter-card__meta"><span>{chapterTopics.length} {language === "zh" ? "个知识点" : "topics"}</span><span>{language === "zh" ? "进度 0%" : "0% complete"}</span></div>
                </div>
                <a className="learn-primary-link" href={getChapterRoute(chapter.id)}>{language === "zh" ? "开始学习" : "Start learning"}<span aria-hidden="true">→</span></a>
              </article>
            );
          })}
        </section>
      ) : (
        <section className="topic-explorer" aria-label={language === "zh" ? "主题探索" : "Topic explorer"}>
          {explorerGroups.map((group) => (
            <article className="topic-group" key={group.id}>
              <h2>{localize(group.title, language)}</h2>
              <div>
                {group.topicIds.map((topicId) => {
                  const topic = getTopicById(topicId);
                  if (!topic) return null;
                  return <a key={topic.id} href={getTopicRoute(topic.id)}><strong>{localize(topic.title, language)}</strong><span>{localize(topic.summary, language)}</span></a>;
                })}
              </div>
            </article>
          ))}
        </section>
      )}

      <aside className="simulation-path-card">
        <div><p className="learn-eyebrow">{language === "zh" ? "独立探索路径" : "INDEPENDENT EXPLORER"}</p><h2>{language === "zh" ? "统计模拟实验室" : "Statistical simulation laboratory"}</h2><p>{language === "zh" ? "Monte Carlo、Bootstrap、置换检验、MCMC 与方差缩减复用同一套知识点和活动注册。" : "Monte Carlo, bootstrap, permutation tests, MCMC, and variance reduction reuse the same topic and activity registry."}</p></div>
        <a className="learn-primary-link" href="/learn/simulation">{language === "zh" ? "进入模拟路径" : "Open simulation path"}<span aria-hidden="true">→</span></a>
      </aside>
    </main>
  );
}

function ChapterPage({ chapterIds }: { chapterIds: string[] }) {
  const language = useLanguage();
  const chapters = chapterIds
    .map((id) => chapterManifests.find((chapter) => chapter.id === id))
    .filter((chapter): chapter is NonNullable<typeof chapter> => Boolean(chapter));
  const title = chapters.map((chapter) => localize(chapter.title, language).replace(/^\d{2}\s*/, "")).join(" · ");
  return (
    <main className="learn-page learn-page--detail">
      <Breadcrumbs items={[{ label: language === "zh" ? "统计教学平台" : "Teaching platform", href: "/teaching-platform" }, { label: title }]} />
      <header className="learn-section-heading"><p className="learn-eyebrow">{language === "zh" ? "章节学习" : "CHAPTER STUDY"}</p><h1>{title}</h1><p>{chapters.map((chapter) => localize(chapter.description, language)).join(" ")}</p></header>
      <section className="chapter-topic-list">
        {chapters.map((chapter) => (
          <article key={chapter.id}>
            {chapters.length > 1 && <h2>{localize(chapter.title, language)}</h2>}
            <div>
              {chapter.topicIds.map((topicId) => {
                const topic = getTopicById(topicId);
                if (!topic) return null;
                return <a key={topic.id} href={getTopicRoute(topic.id)}><span>{String(topic.order).padStart(2, "0")}</span><div><strong>{localize(topic.title, language)}</strong><p>{localize(topic.summary, language)}</p></div><b aria-hidden="true">→</b></a>;
              })}
            </div>
          </article>
        ))}
      </section>
    </main>
  );
}

function TopicPage({ topicId }: { topicId: string }) {
  const language = useLanguage();
  const topic = getTopicById(topicId);
  if (!topic) return <NotFound />;
  const chapter = chapterManifests.find(({ id }) => id === topic.chapterId);
  const activities = activityManifests.filter(({ topicId: ownerId }) => ownerId === topic.id).sort((left, right) => left.order - right.order);
  return (
    <main className="learn-page learn-page--detail">
      <Breadcrumbs items={[{ label: language === "zh" ? "统计教学平台" : "Teaching platform", href: "/teaching-platform" }, { label: chapter ? localize(chapter.title, language) : "", href: getChapterRoute(topic.chapterId) }, { label: localize(topic.title, language) }]} />
      <header className="learn-section-heading"><p className="learn-eyebrow">{language === "zh" ? "知识点" : "TOPIC"}</p><h1>{localize(topic.title, language)}</h1><p>{localize(topic.summary, language)}</p><span className={`review-badge review-badge--${topic.reviewStatus}`}>{topic.reviewStatus}</span></header>
      <div className="topic-overview-grid">
        <section><h2>{language === "zh" ? "学习目标" : "Learning objectives"}</h2><ul>{topic.learningObjectives.map((objective, index) => <li key={index}>{localize(objective, language)}</li>)}</ul></section>
        <section><h2>{language === "zh" ? "先修知识" : "Prerequisites"}</h2>{topic.prerequisites.length ? <div className="topic-chip-row">{topic.prerequisites.map((id) => { const prerequisite = getTopicById(id); return prerequisite ? <a key={id} href={getTopicRoute(id)}>{localize(prerequisite.title, language)}</a> : null; })}</div> : <p>{language === "zh" ? "无" : "None"}</p>}</section>
        {topic.misconceptions.length > 0 && <section className="misconception-card"><h2>{language === "zh" ? "常见误区" : "Common misconception"}</h2><ul>{topic.misconceptions.map((item, index) => <li key={index}>{localize(item, language)}</li>)}</ul></section>}
      </div>
      <section className="topic-activities"><div className="topic-activities__heading"><div><p className="learn-eyebrow">{language === "zh" ? "学习活动" : "LEARNING ACTIVITIES"}</p><h2>{language === "zh" ? "从直觉到实践" : "From intuition to practice"}</h2></div><a href={`/st-qselector?topicId=${topic.id}`}>{language === "zh" ? "练习这一知识点" : "Practice this topic"} →</a></div>
        {activities.length ? <div className="activity-card-grid">{activities.map((activity) => <a className="activity-card" key={activity.id} href={getActivityRoute(activity.id)}><span>{activity.type}</span><strong>{localize(activity.title, language)}</strong><b aria-hidden="true">→</b></a>)}</div> : <p className="learn-empty-state">{language === "zh" ? "本知识点的交互活动正在复核中。" : "Interactive activities for this topic are being reviewed."}</p>}
        <div className="coding-links">{topic.rLessonIds.map((lessonId) => <a key={`r-${lessonId}`} href={`/r-learning?topicId=${topic.id}&lessonId=${lessonId}&returnTo=${encodeURIComponent(getTopicRoute(topic.id))}`}>R · {lessonId}</a>)}{topic.pythonLessonIds.map((lessonId) => <a key={`python-${lessonId}`} href={`/python-learning?topicId=${topic.id}&lessonId=${lessonId}&returnTo=${encodeURIComponent(getTopicRoute(topic.id))}`}>Python · {lessonId}</a>)}</div>
      </section>
    </main>
  );
}

function ActivityPage({ activityId, topicId }: { activityId: string; topicId: string }) {
  const language = useLanguage();
  const activity = activityManifests.find(({ id }) => id === activityId);
  const topic = getTopicById(topicId);
  if (!activity || !topic) return <NotFound />;
  const chapter = chapterManifests.find(({ id }) => id === topic.chapterId);
  const siblingTopics = chapter?.topicIds
    .map((id) => getTopicById(id))
    .filter((entry): entry is NonNullable<typeof entry> => Boolean(entry)) ?? [];
  const ActiveApp = activity.appId ? appRegistry[activity.appId] : undefined;
  const returnTo = getActivityRoute(activity.id);
  const codingHref = activity.type === "r-lab" ? `/r-learning?topicId=${topic.id}&lessonId=${activity.lessonId ?? ""}&returnTo=${encodeURIComponent(returnTo)}` : `/python-learning?topicId=${topic.id}&lessonId=${activity.lessonId ?? ""}&returnTo=${encodeURIComponent(returnTo)}`;
  return (
    <main className="learn-activity-page">
      <div className="learn-activity-toolbar">
        <Breadcrumbs items={[{ label: language === "zh" ? "统计教学平台" : "Teaching platform", href: "/teaching-platform" }, { label: localize(topic.title, language), href: getTopicRoute(topic.id) }, { label: localize(activity.title, language) }]} />
        <span>{activity.type}</span>
      </div>
      <section className="learn-activity-stage">
        <aside className="learn-activity-course-nav">
          <details open>
            <summary>{chapter ? localize(chapter.title, language) : (language === "zh" ? "课程目录" : "Course outline")}</summary>
            <nav aria-label={language === "zh" ? "本章知识点" : "Chapter topics"}>
              {siblingTopics.map((entry) => (
                <a key={entry.id} href={getTopicRoute(entry.id)} aria-current={entry.id === topic.id ? "page" : undefined}>
                  <span>{String(entry.order).padStart(2, "0")}</span>
                  {localize(entry.title, language)}
                </a>
              ))}
            </nav>
          </details>
        </aside>
        <div className="learn-activity-visualizer">
          {ActiveApp ? <Suspense fallback={<div className="learn-route-loading" role="status">{language === "zh" ? "正在加载实验…" : "Loading activity…"}</div>}><ActiveApp /></Suspense> : <div className="learn-coding-handoff"><h1>{localize(activity.title, language)}</h1><p>{language === "zh" ? "此活动将在共享编程工作室中打开，并携带当前知识点。" : "This activity opens in the shared coding workspace with the current topic context."}</p><a className="learn-primary-link" href={codingHref}>{language === "zh" ? "打开编程实验" : "Open coding lab"} →</a></div>}
        </div>
      </section>
    </main>
  );
}

function NotFound() {
  const language = useLanguage();
  return <main className="learn-page learn-not-found"><p className="learn-eyebrow">404</p><h1>{language === "zh" ? "没有找到这个知识点页面" : "Learning page not found"}</h1><a className="learn-primary-link" href="/teaching-platform">{language === "zh" ? "返回统计教学平台" : "Back to teaching platform"}</a></main>;
}

export function LearnRouter({ pathname = window.location.pathname }: { pathname?: string }) {
  const route = parseLearnRoute(pathname);
  let content: React.ReactNode;
  if (route.kind === "home") content = <LearnHome />;
  else if (route.kind === "chapter") content = <ChapterPage chapterIds={route.chapterIds} />;
  else if (route.kind === "topic") content = <TopicPage topicId={route.topicId} />;
  else if (route.kind === "activity") content = <ActivityPage activityId={route.activityId} topicId={route.topicId} />;
  else content = <NotFound />;
  return <div className="learn-root"><LearningHeader />{content}</div>;
}
