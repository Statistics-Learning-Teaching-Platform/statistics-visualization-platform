import "../visual-demo/editorial-tailwind.css";
import "../visual-demo/editorial/editorial-demo.css";
import { useLanguage } from "@stats-viz/shared/i18n";
import {
  ArrowRightIcon,
  BookOpenIcon,
  BracesIcon,
  ChartNoAxesCombinedIcon,
  FileCheck2Icon,
  FlaskConicalIcon,
  LogInIcon,
} from "lucide-react";
import { useEffect, useState } from "react";
import { buttonVariants } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { type PortalUserRole, portalLoginUrl, usePortalSession } from "../auth/session";
import { loadLearningProgress } from "../course/progressStore";
import { ensureLearningProgressSynced } from "../course/progressSync";
import { cn } from "../lib/utils";
import { EditorialDemoShell } from "../visual-demo/editorial/EditorialPrimitives";

type Language = "zh" | "en";

const LESSON_TOTALS = { r: 39, python: 43 } as const;

const roleLabels: Record<PortalUserRole, Record<Language, string>> = {
  student: { zh: "学生账号", en: "Student account" },
  teacher: { zh: "教师账号", en: "Teacher account" },
  superadmin: { zh: "管理员账号", en: "Admin account" },
};

const copy = {
  zh: {
    eyebrow: "PERSONAL LEARNING RECORD",
    title: "我的学习档案",
    lead: "把教材阅读、模拟观察、编程复现与练习检验连接成一条学习证据链。",
    identity: "StatMind 学习者",
    localNote: "学习记录仅保存在当前浏览器",
    checkingSession: "正在确认登录状态…",
    loginTitle: "登录后查看学习档案",
    loginLead:
      "个人学习档案与账号绑定。请使用学校分配的账号登录后查看；AI 助教、题库与组卷同样需要登录。",
    loginAction: "前往登录",
    loginScopeEyebrow: "LOGIN-PROTECTED SPACES",
    loginScopeTitle: "登录后可以访问的内容",
    loginScopeIntro: "以下操作与个人账号相关，需要登录后使用，而不是依赖浏览器本地缓存。",
    continueLabel: "继续学习",
    startLabel: "从教材开始",
    spacesEyebrow: "FIVE CONNECTED SPACES",
    spacesTitle: "五个板块，同一条学习路径",
    spacesIntro: "每个板块保留自己的工具形态，但学习记录会在这里汇合。",
    evidenceEyebrow: "LEARNING EVIDENCE",
    evidenceTitle: "已形成的学习证据",
    evidenceIntro: "这里只展示系统已经真实保存的进度。",
    pathEyebrow: "RECOMMENDED FLOW",
    pathTitle: "下一次学习，从问题走到证据",
    pathIntro:
      "不需要在五个页面之间猜测顺序：教材给出问题，实验建立直觉，代码复现结果，题库完成检验。",
    open: "打开",
    noSaved: "尚未保存进度",
    completed: "已完成",
    items: "项",
    topics: "知识点",
    codeLabs: "编程实验",
    simulations: "模拟实验",
  },
  en: {
    eyebrow: "PERSONAL LEARNING RECORD",
    title: "My learning record",
    lead: "Connect textbook reading, simulation, reproducible code, and practice into one chain of evidence.",
    identity: "StatMind learner",
    localNote: "Learning records are stored in this browser only",
    checkingSession: "Checking your sign-in state…",
    loginTitle: "Sign in to view your learning record",
    loginLead:
      "This personal record is tied to your account. Sign in with your school account to view it; the AI tutors, question bank, and paper composition also require sign-in.",
    loginAction: "Go to sign-in",
    loginScopeEyebrow: "LOGIN-PROTECTED SPACES",
    loginScopeTitle: "What sign-in unlocks",
    loginScopeIntro:
      "These operations involve your personal account and require sign-in rather than browser-local caches.",
    continueLabel: "Continue learning",
    startLabel: "Start with the textbook",
    spacesEyebrow: "FIVE CONNECTED SPACES",
    spacesTitle: "Five spaces, one learning path",
    spacesIntro:
      "Each space keeps its own working form while its saved learning evidence meets here.",
    evidenceEyebrow: "LEARNING EVIDENCE",
    evidenceTitle: "Evidence already recorded",
    evidenceIntro: "Only progress actually stored by the product is shown here.",
    pathEyebrow: "RECOMMENDED FLOW",
    pathTitle: "Move from a question to evidence",
    pathIntro:
      "Let the textbook frame the question, the laboratory build intuition, code reproduce the result, and the question bank check understanding.",
    open: "Open",
    noSaved: "No saved progress",
    completed: "Completed",
    items: "items",
    topics: "Topics",
    codeLabs: "Code labs",
    simulations: "Simulations",
  },
} as const;

function getResumeDestination(route: string, language: Language) {
  const allowedPrefixes = [
    "/catalog",
    "/teaching-platform",
    "/learn/",
    "/r-learning",
    "/python-learning",
    "/st-qselector",
  ];
  const href = allowedPrefixes.some((prefix) => route.startsWith(prefix)) ? route : "/catalog";
  const labels =
    language === "zh"
      ? ([
          ["/r-learning", "继续 R 编程练习"],
          ["/python-learning", "继续 Python 编程练习"],
          ["/st-qselector", "继续组卷与练习"],
          ["/teaching-platform", "继续统计模拟实验"],
          ["/learn/", "继续当前学习活动"],
        ] as const)
      : ([
          ["/r-learning", "Continue R practice"],
          ["/python-learning", "Continue Python practice"],
          ["/st-qselector", "Continue composing and practice"],
          ["/teaching-platform", "Continue the statistical laboratory"],
          ["/learn/", "Continue the current activity"],
        ] as const);
  return {
    href,
    label:
      labels.find(([prefix]) => href.startsWith(prefix))?.[1] ??
      (language === "zh" ? "继续阅读教材" : "Continue reading"),
  };
}

export function ProfilePage() {
  const language = useLanguage() as Language;
  const text = copy[language];
  const session = usePortalSession();
  const [progress, setProgress] = useState(() => loadLearningProgress());
  useEffect(() => {
    let active = true;
    void ensureLearningProgressSynced().finally(() => {
      // After the account merge, local storage is the merged view.
      if (active) setProgress(loadLearningProgress());
    });
    return () => {
      active = false;
    };
  }, []);

  const hasRecordedProgress =
    progress.completedTopics.length +
      progress.completedActivities.length +
      progress.completedRLessons.length +
      progress.completedPythonLessons.length >
    0;
  const resume = hasRecordedProgress
    ? getResumeDestination(progress.lastVisitedRoute, language)
    : {
        href: "/catalog",
        label: text.startLabel,
      };

  const spaces = [
    {
      key: "textbook",
      icon: BookOpenIcon,
      title: language === "zh" ? "教材" : "Textbook",
      description:
        language === "zh"
          ? "《现代基础统计学》· 从概念与问题开始"
          : "Modern Basic Statistics · begin with concepts and questions",
      status: language === "zh" ? "12 章连续教材" : "12 connected chapters",
      href: "/catalog",
    },
    {
      key: "laboratory",
      icon: FlaskConicalIcon,
      title: language === "zh" ? "模拟实验" : "Laboratory",
      description:
        language === "zh"
          ? "改变参数，观察抽样、估计与检验如何变化"
          : "Change parameters and observe sampling, estimation, and tests",
      status: progress.completedActivities.length
        ? `${text.completed} ${progress.completedActivities.length} ${text.items}`
        : text.noSaved,
      href: "/teaching-platform",
    },
    {
      key: "paper",
      icon: FileCheck2Icon,
      title: language === "zh" ? "组卷" : "Question bank",
      description:
        language === "zh"
          ? "按章节、题型与知识点筛选题目，检验理解"
          : "Filter reviewed questions by chapter, type, and topic",
      status: language === "zh" ? "296 道已审核题目" : "296 reviewed questions",
      href: "/st-qselector",
    },
    {
      key: "r",
      icon: ChartNoAxesCombinedIcon,
      title: "R",
      description:
        language === "zh"
          ? "用可运行代码复现统计方法与结果"
          : "Reproduce statistical methods and results with executable code",
      status: `${progress.completedRLessons.length} / ${LESSON_TOTALS.r} ${text.completed}`,
      href: "/r-learning?returnTo=%2Fprofile",
    },
    {
      key: "python",
      icon: BracesIcon,
      title: "Python",
      description:
        language === "zh"
          ? "用数据处理与建模工具完成可复现分析"
          : "Build reproducible analysis with data and modelling tools",
      status: `${progress.completedPythonLessons.length} / ${LESSON_TOTALS.python} ${text.completed}`,
      href: "/python-learning?returnTo=%2Fprofile",
    },
  ] as const;

  const evidence = [
    { label: text.topics, value: progress.completedTopics.length },
    {
      label: text.codeLabs,
      value: progress.completedRLessons.length + progress.completedPythonLessons.length,
    },
    { label: text.simulations, value: progress.completedActivities.length },
  ];

  const identityName = session.status === "authenticated" ? session.username : text.identity;
  const identityRole =
    session.status === "authenticated" ? roleLabels[session.role][language] : text.localNote;
  const syncedNote =
    session.status === "authenticated"
      ? language === "zh"
        ? "学习进度已与账号同步"
        : "Progress synced to your account"
      : text.localNote;

  if (session.status === "loading") {
    return (
      <EditorialDemoShell current="profile" siteMode="product">
        <main id="main-content" className="ed-profile-page">
          <header className="ed-profile-hero">
            <p className="ed-kicker">{text.eyebrow}</p>
            <h1>{text.title}</h1>
            <p>{text.checkingSession}</p>
          </header>
        </main>
      </EditorialDemoShell>
    );
  }

  if (session.status === "anonymous") {
    return (
      <EditorialDemoShell current="profile" siteMode="product">
        <main id="main-content" className="ed-profile-page">
          <header className="ed-profile-hero">
            <div className="ed-profile-identity" aria-hidden="true">
              <LogInIcon />
            </div>
            <div className="ed-profile-hero__copy">
              <p className="ed-kicker">{text.eyebrow}</p>
              <h1>{text.loginTitle}</h1>
              <p>{text.loginLead}</p>
            </div>
            <div className="ed-profile-resume">
              <span>{text.continueLabel}</span>
              <a
                href={portalLoginUrl("/profile")}
                className={cn(buttonVariants({ variant: "default" }), "ed-profile-resume__action")}
              >
                {text.loginAction}
                <ArrowRightIcon data-icon="inline-end" />
              </a>
            </div>
          </header>
          <section className="ed-profile-section" aria-labelledby="profile-login-scope-title">
            <header className="ed-profile-section__heading">
              <div>
                <p className="ed-kicker">{text.loginScopeEyebrow}</p>
                <h2 id="profile-login-scope-title">{text.loginScopeTitle}</h2>
              </div>
              <p>{text.loginScopeIntro}</p>
            </header>
            <ol className="ed-profile-path__steps">
              {(language === "zh"
                ? [
                    "查看这份个人学习档案（本页）",
                    "在 R / Python 工作区使用 AI 助教",
                    "浏览题库、查看题目内容与附件",
                    "生成与导出试卷（教师账号）",
                  ]
                : [
                    "View this personal learning record (this page)",
                    "Use the AI tutor in the R / Python studios",
                    "Browse the question bank with full content",
                    "Generate and export papers (teacher accounts)",
                  ]
              ).map((step) => (
                <li key={step}>{step}</li>
              ))}
            </ol>
          </section>
        </main>
      </EditorialDemoShell>
    );
  }

  return (
    <EditorialDemoShell current="profile" siteMode="product">
      <main id="main-content" className="ed-profile-page">
        <header className="ed-profile-hero">
          <div className="ed-profile-identity" aria-hidden="true">
            <span>S</span>
          </div>
          <div className="ed-profile-hero__copy">
            <p className="ed-kicker">{text.eyebrow}</p>
            <h1>{text.title}</h1>
            <p>{text.lead}</p>
            <div className="ed-profile-identity-line">
              <strong>{identityName}</strong>
              <span>{identityRole}</span>
              <span>{syncedNote}</span>
            </div>
          </div>
          <div className="ed-profile-resume">
            <span>{text.continueLabel}</span>
            <a
              href={resume.href}
              className={cn(buttonVariants({ variant: "default" }), "ed-profile-resume__action")}
            >
              {resume.label}
              <ArrowRightIcon data-icon="inline-end" />
            </a>
          </div>
        </header>

        <section className="ed-profile-section" aria-labelledby="profile-spaces-title">
          <header className="ed-profile-section__heading">
            <div>
              <p className="ed-kicker">{text.spacesEyebrow}</p>
              <h2 id="profile-spaces-title">{text.spacesTitle}</h2>
            </div>
            <p>{text.spacesIntro}</p>
          </header>
          <div className="ed-profile-spaces">
            {spaces.map((space) => {
              const Icon = space.icon;
              return (
                <a key={space.key} href={space.href} className="ed-profile-space">
                  <span className="ed-profile-space__icon" aria-hidden="true">
                    <Icon />
                  </span>
                  <span className="ed-profile-space__copy">
                    <strong>{space.title}</strong>
                    <small>{space.description}</small>
                  </span>
                  <span className="ed-profile-space__status">{space.status}</span>
                  <span className="ed-profile-space__action">
                    {text.open}
                    <ArrowRightIcon aria-hidden="true" />
                  </span>
                </a>
              );
            })}
          </div>
        </section>

        <div className="ed-profile-lower">
          <section className="ed-profile-section" aria-labelledby="profile-evidence-title">
            <header className="ed-profile-section__heading ed-profile-section__heading--stacked">
              <div>
                <p className="ed-kicker">{text.evidenceEyebrow}</p>
                <h2 id="profile-evidence-title">{text.evidenceTitle}</h2>
              </div>
              <p>{text.evidenceIntro}</p>
            </header>
            <div className="ed-profile-evidence">
              {evidence.map((item, index) => (
                <div key={item.label}>
                  <span>{item.label}</span>
                  <strong>{item.value}</strong>
                  {index < evidence.length - 1 ? <Separator orientation="vertical" /> : null}
                </div>
              ))}
            </div>
          </section>

          <section
            className="ed-profile-section ed-profile-path"
            aria-labelledby="profile-path-title"
          >
            <header className="ed-profile-section__heading ed-profile-section__heading--stacked">
              <div>
                <p className="ed-kicker">{text.pathEyebrow}</p>
                <h2 id="profile-path-title">{text.pathTitle}</h2>
              </div>
              <p>{text.pathIntro}</p>
            </header>
            <ol className="ed-profile-path__steps">
              <li>
                {language === "zh"
                  ? "阅读一节教材，明确核心问题"
                  : "Read a textbook section and frame the question"}
              </li>
              <li>
                {language === "zh"
                  ? "打开关联实验，观察参数变化"
                  : "Open its laboratory and observe parameter changes"}
              </li>
              <li>
                {language === "zh"
                  ? "选择 R 或 Python 复现结果"
                  : "Reproduce the result in R or Python"}
              </li>
              <li>
                {language === "zh"
                  ? "回到题库检验理解"
                  : "Check understanding in the question bank"}
              </li>
            </ol>
          </section>
        </div>
      </main>
    </EditorialDemoShell>
  );
}

export default ProfilePage;
