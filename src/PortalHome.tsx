import { useLanguage, setLanguage } from "@stats-viz/shared/i18n";
import { apps } from "../scripts/apps";

const copy = {
  en: {
    kicker: "STATMIND · STATISTICS THINKING PLATFORM",
    title: "Learn statistics by thinking",
    lead: "Learn Statistics by Thinking, Exploring and Interacting. Choose a workspace to begin.",
    teachingEyebrow: "VISUALIZER MODULES",
    teachingTitle: "Teaching Platform",
    teachingDescription:
      "Build intuition for confidence intervals, regression, hypothesis testing, and simulation through interactive visualizers.",
    teachingAction: "Open teaching platform",
    paperEyebrow: "QUESTION BANK + EXPORT",
    paperTitle: "Paper Builder",
    paperDescription:
      "Filter the reviewed question bank by chapter, type, difficulty, and knowledge point, then assemble and export a paper.",
    paperAction: "Open paper builder",
    rEyebrow: "LIVE R + GUIDED PRACTICE",
    rTitle: "R Coding Studio",
    rDescription:
      "Write and run real R code in the browser, receive automatic feedback, and connect programming with statistical reasoning.",
    rAction: "Open R coding studio",
    pythonEyebrow: "LIVE PYTHON + DATA SCIENCE",
    pythonTitle: "Python Coding Studio",
    pythonDescription:
      "Run real Python with NumPy, pandas, Matplotlib, and SciPy while receiving guided practice and automatic feedback.",
    pythonAction: "Open Python coding studio",
    footer: "One learning entrance · Statistics teaching tools",
  },
  zh: {
    kicker: "STATMIND · 统计思维教学平台",
    title: "在思考中学习统计",
    lead: "通过思考、探索与互动学习统计学。请选择要进入的学习空间。",
    teachingEyebrow: "个可视化模块",
    teachingTitle: "统计教学平台",
    teachingDescription: "通过交互式可视化学习置信区间、回归、假设检验与统计模拟。",
    teachingAction: "进入教学平台",
    paperEyebrow: "题库筛选 + 试卷导出",
    paperTitle: "统计学组卷系统",
    paperDescription: "按章节、题型、难度和知识点筛选已审核题目，完成组卷与导出。",
    paperAction: "进入组卷系统",
    rEyebrow: "真实 R 环境 + 引导练习",
    rTitle: "R 语言编程工作室",
    rDescription: "在浏览器中编写并运行真实 R 代码，通过自动检查把编程与统计思维连接起来。",
    rAction: "进入 R 编程工作室",
    pythonEyebrow: "真实 PYTHON + 数据科学",
    pythonTitle: "Python 语言编程工作室",
    pythonDescription: "在浏览器中运行真实 Python，通过 NumPy、pandas、Matplotlib 与 SciPy 完成引导练习和自动检查。",
    pythonAction: "进入 Python 编程工作室",
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

function RCodeIcon() {
  return (
    <svg viewBox="0 0 48 48" aria-hidden="true">
      <path d="m18 14-10 10 10 10M30 14l10 10-10 10M27 8l-6 32" />
    </svg>
  );
}

function PythonCodeIcon() {
  return (
    <svg viewBox="0 0 48 48" aria-hidden="true">
      <path d="M24 7c-8 0-10 3-10 8v5h12v3H10c-4 0-6 3-6 9s3 9 8 9h5v-7c0-5 4-8 9-8h9c5 0 9-4 9-9v-2c0-5-4-8-10-8z" />
      <path d="M24 41c8 0 10-3 10-8v-5H22v-3h16c4 0 6-3 6-9S41 7 36 7h-5v7c0 5-4 8-9 8h-9c-5 0-9 4-9 9v2c0 5 4 8 10 8z" />
      <circle cx="20" cy="13" r="1.5" />
      <circle cx="28" cy="35" r="1.5" />
    </svg>
  );
}

export function PortalHome() {
  const language = useLanguage();
  const t = copy[language];

  return (
    <main className="portal-home">
      <div className="portal-orbit portal-orbit--left" aria-hidden="true" />
      <div className="portal-orbit portal-orbit--right" aria-hidden="true" />

      <div className="portal-language" role="group" aria-label={language === "zh" ? "界面语言" : "Interface language"}>
        <button type="button" data-active={language === "zh"} aria-pressed={language === "zh"} onClick={() => setLanguage("zh")}>中文</button>
        <button type="button" data-active={language === "en"} aria-pressed={language === "en"} onClick={() => setLanguage("en")}>English</button>
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
          <a className="portal-card portal-card--teaching" href="/learn">
            <span className="portal-card__icon"><VisualizerIcon /></span>
            <span className="portal-card__copy">
              <span className="portal-card__eyebrow">{apps.length} {t.teachingEyebrow}</span>
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

          <a className="portal-card portal-card--r" href="/r-learning">
            <span className="portal-card__icon"><RCodeIcon /></span>
            <span className="portal-card__copy">
              <span className="portal-card__eyebrow">{t.rEyebrow}</span>
              <strong>{t.rTitle}</strong>
              <span>{t.rDescription}</span>
            </span>
            <span className="portal-card__action">{t.rAction} <b>↗</b></span>
          </a>

          <a className="portal-card portal-card--python" href="/python-learning">
            <span className="portal-card__icon"><PythonCodeIcon /></span>
            <span className="portal-card__copy">
              <span className="portal-card__eyebrow">{t.pythonEyebrow}</span>
              <strong>{t.pythonTitle}</strong>
              <span>{t.pythonDescription}</span>
            </span>
            <span className="portal-card__action">{t.pythonAction} <b>↗</b></span>
          </a>
        </div>

        <p className="portal-footer">{t.footer}</p>
      </section>
    </main>
  );
}
