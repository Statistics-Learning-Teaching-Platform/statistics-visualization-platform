import type { Language } from "@stats-viz/shared/i18n";
import {
  ArrowLeftIcon,
  ArrowRightIcon,
  BookOpenCheckIcon,
  BookOpenIcon,
  Code2Icon,
  FlaskConicalIcon,
} from "lucide-react";
import { useState } from "react";
import { KnowledgeMap } from "../../../components/knowledge-map/KnowledgeMap";
import type { TextbookDemoChapterNumber } from "../../../visual-demo/editorial/textbook-content";
import type { TextbookChapterResources } from "../../resourceCatalog";

type ChapterOption = {
  number: string;
  title: string;
  detail: string;
};

type ChapterLearningHubProps = {
  chapterNumber: TextbookDemoChapterNumber;
  chapterOptions: ChapterOption[];
  chapter: {
    title: string;
    lead?: string;
  };
  entry: TextbookChapterResources;
  language: Language;
  previousChapter?: ChapterOption;
  nextChapter?: ChapterOption;
  onChapterChange: (chapter: TextbookDemoChapterNumber) => void;
  onBackToCatalog: () => void;
};

function chapterDescription(
  chapter: ChapterLearningHubProps["chapter"],
  entry: TextbookChapterResources,
  language: Language,
): string {
  return (
    chapter.lead ??
    entry.topics[0]?.summary[language] ??
    (language === "zh"
      ? "从真实问题出发，连接概念、证据与统计实践。"
      : "Connect concepts, evidence, and statistical practice through a real question.")
  );
}

function ChapterNavigation({
  chapterNumber,
  chapterOptions,
  previousChapter,
  nextChapter,
  onChapterChange,
  onBackToCatalog,
  language,
}: Omit<ChapterLearningHubProps, "chapter" | "entry">) {
  return (
    <nav
      className="chapter-hub-navigation"
      aria-label={language === "zh" ? "章节导航" : "Chapter navigation"}
    >
      <button type="button" className="chapter-hub-navigation__back" onClick={onBackToCatalog}>
        <ArrowLeftIcon aria-hidden="true" />
        {language === "zh" ? "返回完整教材" : "Back to textbook"}
      </button>
      <span className="chapter-hub-navigation__position">
        CHAPTER {chapterNumber} <span aria-hidden="true">/</span>{" "}
        {String(chapterOptions.length).padStart(2, "0")}
      </span>
      <div className="chapter-hub-navigation__siblings">
        {previousChapter ? (
          <button type="button" onClick={() => onChapterChange(previousChapter.number)}>
            <ArrowLeftIcon aria-hidden="true" />
            <span>{language === "zh" ? "上一章" : "Previous"}</span>
          </button>
        ) : (
          <span className="chapter-hub-navigation__disabled">
            {language === "zh" ? "第一章" : "First"}
          </span>
        )}
        {nextChapter ? (
          <button type="button" onClick={() => onChapterChange(nextChapter.number)}>
            <span>{language === "zh" ? "下一章" : "Next"}</span>
            <ArrowRightIcon aria-hidden="true" />
          </button>
        ) : (
          <span className="chapter-hub-navigation__disabled">
            {language === "zh" ? "最后一章" : "Last"}
          </span>
        )}
      </div>
    </nav>
  );
}

function ChapterHero({
  chapterNumber,
  chapter,
  entry,
  language,
}: Pick<ChapterLearningHubProps, "chapterNumber" | "chapter" | "entry" | "language">) {
  const steps = [
    { label: language === "zh" ? "知识地图" : "Knowledge map", tone: "blue", Icon: BookOpenIcon },
    { label: language === "zh" ? "模拟实验" : "Experiments", tone: "teal", Icon: FlaskConicalIcon },
    { label: language === "zh" ? "代码实践" : "Code practice", tone: "orange", Icon: Code2Icon },
    { label: language === "zh" ? "练习巩固" : "Practice", tone: "green", Icon: BookOpenCheckIcon },
  ];
  return (
    <header className="chapter-hub-hero">
      <div>
        <p className="chapter-hub-eyebrow">CHAPTER {chapterNumber}</p>
        <h1>{chapter.title}</h1>
        <p>{chapterDescription(chapter, entry, language)}</p>
      </div>
      <nav
        className="chapter-hub-path"
        aria-label={language === "zh" ? "章节学习路径" : "Chapter learning path"}
      >
        {steps.map(({ label, tone, Icon }, index) => (
          <span className="chapter-hub-path__step" key={label}>
            <span className={`chapter-hub-path__icon chapter-hub-path__icon--${tone}`}>
              <Icon aria-hidden="true" />
            </span>
            <span>{label}</span>
            {index < steps.length - 1 && (
              <ArrowRightIcon className="chapter-hub-path__arrow" aria-hidden="true" />
            )}
          </span>
        ))}
      </nav>
    </header>
  );
}

function ExperimentSection({
  entry,
  language,
}: Pick<ChapterLearningHubProps, "entry" | "language">) {
  return (
    <section
      className="chapter-hub-section chapter-hub-experiments"
      aria-labelledby="chapter-hub-experiments-title"
    >
      <div className="chapter-hub-section__heading">
        <p className="chapter-hub-eyebrow">02 · EXPLORE</p>
        <h2 id="chapter-hub-experiments-title">
          {language === "zh" ? "对应实验" : "Explore experiments"}
        </h2>
        <p>
          {language === "zh"
            ? "通过交互模拟观察本章核心统计现象。"
            : "Observe this chapter's core statistical phenomena through interactive simulations."}
        </p>
      </div>
      {entry.visualizations.length > 0 ? (
        <div className="chapter-hub-experiment-grid">
          {entry.visualizations.map((resource) => (
            <a className="chapter-hub-experiment" href={resource.href} key={resource.id}>
              <span className="chapter-hub-card-icon chapter-hub-card-icon--teal">
                <FlaskConicalIcon aria-hidden="true" />
              </span>
              <p className="chapter-hub-eyebrow">EXPERIMENT / VISUALIZATION</p>
              <h3>{resource.title[language]}</h3>
              <p>{resource.topic.summary[language]}</p>
              <span className="chapter-hub-resource-topic">
                {resource.topic.title[language]} <ArrowRightIcon aria-hidden="true" />
              </span>
            </a>
          ))}
        </div>
      ) : (
        <div className="chapter-hub-empty">
          <p>
            {language === "zh"
              ? "本章暂无配套可视化实验。"
              : "No visual experiment is mapped to this chapter yet."}
          </p>
          <a href="/teaching-platform">
            {language === "zh" ? "浏览统计实验室 →" : "Browse the statistical laboratory →"}
          </a>
        </div>
      )}
    </section>
  );
}

function CodeSection({ entry, language }: Pick<ChapterLearningHubProps, "entry" | "language">) {
  const hasR = entry.rLessons.length > 0;
  const [activeTab, setActiveTab] = useState<"r" | "python">(hasR ? "r" : "python");
  const lessons = activeTab === "r" ? entry.rLessons : entry.pythonLessons;
  return (
    <section
      className="chapter-hub-section chapter-hub-code"
      aria-labelledby="chapter-hub-code-title"
    >
      <div className="chapter-hub-section__heading">
        <p className="chapter-hub-eyebrow">03 · CODE</p>
        <h2 id="chapter-hub-code-title">
          {language === "zh" ? "用代码复现" : "Reproduce with code"}
        </h2>
        <p>
          {language === "zh"
            ? "使用 R 或 Python 将统计方法转化为可运行的分析过程。"
            : "Turn statistical methods into runnable analyses with R or Python."}
        </p>
      </div>
      <div
        className="chapter-hub-code__tabs"
        role="tablist"
        aria-label={language === "zh" ? "编程语言" : "Programming language"}
      >
        <button
          id="chapter-hub-r-tab"
          type="button"
          role="tab"
          aria-selected={activeTab === "r"}
          aria-controls="chapter-hub-lesson-panel"
          data-active={activeTab === "r" || undefined}
          onClick={() => setActiveTab("r")}
          disabled={!hasR}
        >
          R
        </button>
        <button
          id="chapter-hub-python-tab"
          type="button"
          role="tab"
          aria-selected={activeTab === "python"}
          aria-controls="chapter-hub-lesson-panel"
          data-active={activeTab === "python" || undefined}
          onClick={() => setActiveTab("python")}
          disabled={entry.pythonLessons.length === 0}
        >
          Python
        </button>
      </div>
      <div
        id="chapter-hub-lesson-panel"
        className="chapter-hub-lesson-list"
        role="tabpanel"
        aria-labelledby={activeTab === "r" ? "chapter-hub-r-tab" : "chapter-hub-python-tab"}
      >
        {lessons.length > 0 ? (
          lessons.slice(0, 4).map((lesson, index) => (
            <a className="chapter-hub-lesson" href={lesson.href} key={lesson.id}>
              <span className="chapter-hub-lesson__number">
                {String(index + 1).padStart(2, "0")}
              </span>
              <span className="chapter-hub-lesson__copy">
                <strong>{lesson.title[language]}</strong>
                <small>
                  {lesson.topic.title[language]} · {lesson.topic.summary[language]}
                </small>
              </span>
              <span className="chapter-hub-lesson__cta">
                {activeTab === "r" ? "R Learning" : "Python Learning"}{" "}
                <ArrowRightIcon aria-hidden="true" />
              </span>
            </a>
          ))
        ) : (
          <div className="chapter-hub-empty">
            <p>
              {language === "zh"
                ? `本章暂无 ${activeTab === "r" ? "R" : "Python"} 配套实验。`
                : `No ${activeTab} lesson is mapped to this chapter yet.`}
            </p>
          </div>
        )}
      </div>
    </section>
  );
}

function PracticeSection({ entry, language }: Pick<ChapterLearningHubProps, "entry" | "language">) {
  return (
    <section className="chapter-hub-practice" aria-labelledby="chapter-hub-practice-title">
      <div>
        <p className="chapter-hub-eyebrow">04 · PRACTICE</p>
        <h2 id="chapter-hub-practice-title">
          {language === "zh" ? "练习与巩固" : "Practice and consolidate"}
        </h2>
        <p>
          {language === "zh"
            ? "围绕本章知识点完成练习，检查概念理解与方法应用。"
            : "Check your understanding and method choices with chapter-focused practice."}
        </p>
      </div>
      <a className="chapter-hub-practice__cta" href={entry.questionBankHref}>
        <BookOpenCheckIcon aria-hidden="true" />
        <span>{language === "zh" ? "开始本章练习" : "Start chapter practice"}</span>
        <ArrowRightIcon aria-hidden="true" />
      </a>
    </section>
  );
}

export function ChapterLearningHub(props: ChapterLearningHubProps) {
  return (
    <main className="chapter-hub" id="main-content">
      <ChapterNavigation {...props} />
      <ChapterHero {...props} />
      <KnowledgeMap
        chapterNumber={props.chapterNumber}
        chapter={props.chapter}
        entry={props.entry}
        language={props.language}
      />
      <ExperimentSection entry={props.entry} language={props.language} />
      <CodeSection entry={props.entry} language={props.language} />
      <PracticeSection entry={props.entry} language={props.language} />
      <nav
        className="chapter-hub-footer-nav"
        aria-label={props.language === "zh" ? "章节翻页" : "Chapter pagination"}
      >
        {props.previousChapter ? (
          <button
            type="button"
            onClick={() => props.onChapterChange(props.previousChapter!.number)}
          >
            <ArrowLeftIcon aria-hidden="true" />
            {props.previousChapter.title}
          </button>
        ) : (
          <span />
        )}
        {props.nextChapter ? (
          <button type="button" onClick={() => props.onChapterChange(props.nextChapter!.number)}>
            {props.nextChapter.title}
            <ArrowRightIcon aria-hidden="true" />
          </button>
        ) : (
          <span />
        )}
      </nav>
    </main>
  );
}
