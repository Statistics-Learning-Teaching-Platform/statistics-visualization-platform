import { useState } from "react";

const copy = {
  en: {
    kicker: "STATMIND · STATISTICS THINKING PLATFORM",
    title: "Learn statistics by thinking",
    lead: "Learn Statistics by Thinking, Exploring and Interacting. Choose a workspace to begin.",
    teachingEyebrow: "12 VISUALIZER MODULES",
    teachingTitle: "Teaching Platform",
    teachingDescription:
      "Build intuition for confidence intervals, regression, hypothesis testing, and simulation through interactive visualizers.",
    teachingAction: "Open teaching platform",
    paperEyebrow: "QUESTION BANK + EXPORT",
    paperTitle: "Paper Builder",
    paperDescription:
      "Filter the reviewed question bank by chapter, type, difficulty, and knowledge point, then assemble and export a paper.",
    paperAction: "Open paper builder",
    footer: "One learning entrance · Statistics teaching tools",
  },
  zh: {
    kicker: "STATMIND · 统计思维教学平台",
    title: "在思考中学习统计",
    lead: "通过思考、探索与互动学习统计学。请选择要进入的学习空间。",
    teachingEyebrow: "12 个可视化模块",
    teachingTitle: "统计教学平台",
    teachingDescription: "通过交互式可视化学习置信区间、回归、假设检验与统计模拟。",
    teachingAction: "进入教学平台",
    paperEyebrow: "题库筛选 + 试卷导出",
    paperTitle: "统计学组卷系统",
    paperDescription: "按章节、题型、难度和知识点筛选已审核题目，完成组卷与导出。",
    paperAction: "进入组卷系统",
    footer: "一个学习入口 · 一套统计教学工具",
  },
} as const;

function VisualizerIcon() {
  return (
    <svg viewBox="0 0 48 48" aria-hidden="true">
      <path d="M9 37h30" />
      <path d="M12 31l8-8 7 5 10-14" />
      <circle cx="12" cy="31" r="2.5" />
      <circle cx="20" cy="23" r="2.5" />
      <circle cx="27" cy="28" r="2.5" />
      <circle cx="37" cy="14" r="2.5" />
    </svg>
  );
}

function PaperIcon() {
  return (
    <svg viewBox="0 0 48 48" aria-hidden="true">
      <path d="M14 7h15l7 7v27H14z" />
      <path d="M29 7v8h7M20 22h10M20 28h10M20 34h7" />
    </svg>
  );
}

export function PortalHome() {
  const [language, setLanguage] = useState<keyof typeof copy>("en");
  const t = copy[language];

  return (
    <main className="portal-home">
      <div className="portal-orbit portal-orbit--left" aria-hidden="true" />
      <div className="portal-orbit portal-orbit--right" aria-hidden="true" />

      <div className="portal-language" aria-label="Language">
        <button data-active={language === "zh"} onClick={() => setLanguage("zh")}>中文</button>
        <button data-active={language === "en"} onClick={() => setLanguage("en")}>English</button>
      </div>

      <section className="portal-hero" aria-labelledby="portal-title">
        <img
          className="portal-logo"
          src="/brand/statmind-logo.png"
          alt="统计思维 StatMind"
        />
        <p className="portal-kicker">{t.kicker}</p>
        <h1 id="portal-title">{t.title}</h1>
        <p className="portal-lead">{t.lead}</p>

        <div className="portal-destinations">
          <a className="portal-card portal-card--teaching" href="/teaching#confidence-interval">
            <span className="portal-card__icon"><VisualizerIcon /></span>
            <span className="portal-card__copy">
              <span className="portal-card__eyebrow">{t.teachingEyebrow}</span>
              <strong>{t.teachingTitle}</strong>
              <span>{t.teachingDescription}</span>
            </span>
            <span className="portal-card__action">{t.teachingAction} <b>↗</b></span>
          </a>

          <a className="portal-card portal-card--paper" href="/st-qselector">
            <span className="portal-card__icon"><PaperIcon /></span>
            <span className="portal-card__copy">
              <span className="portal-card__eyebrow">{t.paperEyebrow}</span>
              <strong>{t.paperTitle}</strong>
              <span>{t.paperDescription}</span>
            </span>
            <span className="portal-card__action">{t.paperAction} <b>↗</b></span>
          </a>
        </div>

        <p className="portal-footer">{t.footer}</p>
      </section>
    </main>
  );
}
