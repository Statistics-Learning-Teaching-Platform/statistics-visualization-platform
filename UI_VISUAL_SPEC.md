# StatMind 页面视觉稿生成规格

> 用途：为首页、教材资源、模拟实验、组卷、R 学习与 Python 学习页面生成高保真桌面端 UI 视觉稿。本文只描述视觉、布局与状态，不改变现有 API、数据结构和业务功能。

## 全局视觉基线

- 产品气质：Academic、Scientific、Calm、Precise、Modern。
- 画布与表面：页面背景 `#F4F7FA`，主要表面 `#FFFFFF`，柔和表面 `#EAF0F4`，正文 `#20313F`，次级文字 `#566A78`，边框 `#D7E0E6`。
- 品牌色：学术蓝 `#225F7A`，负责主要操作、导航选中和当前状态；分析蓝 `#3E6F9B` 用于图表参照与解释；学习绿 `#3C765C` 只用于完成、正确与覆盖结果。产品入口不再各自使用紫色或青色主调。
- 字体：中文展示标题使用现代宋体，如思源宋体，但只用于品牌、章节与课程标题；中文正文、功能卡标题与界面文字使用现代无衬线；英文使用 Geist / Inter；代码与数据使用 Geist Mono / JetBrains Mono。标题字重以 500 为主，界面字重以 500–650 为主，避免 800/850 的机械感。
- 字号层级：实验研究标题 40–52px，研究问题 16px，图表结论标题 24–28px，正文与控件 14–16px，辅助信息 12–13px；核心操作和教学说明不得使用辅助字号。
- 组件：统一 8–12px 圆角、1px 轻边框、极少阴影；以留白、分隔线、字重和色彩建立层级。
- 标志性语言：每页保留一条“Evidence Line”，把目标、操作、证据、解释串成清晰的学习路径。
- 交互：当前项需有背景、竖线或下划线等非颜色单一提示；按钮与可点击控件不小于 44px；键盘焦点清晰。
- 禁止：夸张渐变、玻璃拟态、悬浮发光、大量药丸标签、营销海报构图、厚重 Dashboard、装饰性 3D、无意义大数字、过量动画。

---

## 1. 首页

### 页面名称

StatMind 产品总入口首页

### 场景名称

默认状态：四个学习工作空间总览

### 场景目标

让访问者先理解 StatMind 的定位，再在不超过一次扫视的时间内选择统计教学、组卷、R 或 Python 工作空间；Learning Journey 只负责解释统一学习方法，不替代四张入口卡片。

### 页面布局结构

1440px 桌面画布，单列纵向结构：72px 顶部导航；紧凑 Hero；横向 Learning Journey；教材资源快捷条；醒目的 2×2 四张大功能卡片；底部一句产品说明。内容最大宽度 1120–1200px，页面无固定左右侧栏。

### 顶部区域内容

左侧为 StatMind 标志与名称；中间导航为“首页、教材资源、学习记录”；右侧为语言切换、帮助和账户入口。Hero 显示小标签“STATMIND · 统计思维教学平台”、宋体主标题“在思考中学习统计”、一句副标题“通过概念、模拟、编程与分析，建立可迁移的数据思维。”主标题下不放大型营销按钮。

### 左侧区域内容

首页无固定左侧栏。2×2 网格左列依次为“统计教学平台”和“R 语言知识库”：前者显示 13 个可视化模块、最近更新主题和“进入教学平台”；后者显示 39 项实验、R 运行环境状态和“进入 R 学习”。

### 中间主区域内容

Hero 下方是横向 Learning Journey，四步为“01 理解概念、02 模拟实验、03 编程实践、04 统计分析”，由细线连接，每步只有一句解释。其下是教材资源快捷条，显示《现代基础统计学》、12 章、14 个可视化、39 项 R 实验、43 项 Python 实验。视觉焦点是再下方的 2×2 大卡网格，而不是 Journey。

### 右侧区域内容

首页无固定右侧栏。2×2 网格右列依次为“统计学组卷系统”和“Python 语言知识库”：组卷卡显示已审核题量 296、支持的题型与“进入组卷系统”；Python 卡显示 43 项实验、Python 环境状态和“进入 Python 学习”。

### 页面中的关键卡片 / 列表 / 图表 / 组件

- 四张等高大卡，每张包含线性图标、空间名称、用途说明、资源数量、服务状态、主 CTA。
- 卡片 1：统计教学平台；“13 个可视化模块”；置信区间、回归、假设检验等主题。
- 卡片 2：统计学组卷系统；“296 道已审核题目”；题库筛选、试卷结构、导出。
- 卡片 3：R 语言知识库；“39 项引导实验”；`R 环境可用`。
- 卡片 4：Python 语言知识库；“43 项数据科学实验”；`Python 环境可用`。
- Learning Journey 四步细线流程。
- 教材资源横条，右端为“查看完整目录 →”。

### 页面中的关键状态信息

四张卡都显示资源规模与服务状态；默认状态不显示虚构的个人学习进度。当前导航“首页”使用深绿下划线和加粗文字双重高亮；环境状态用小圆点加文字表示，不只依赖颜色。

### 页面中的 CTA / 按钮

“查看完整目录”“进入教学平台”“进入组卷系统”“进入 R 学习”“进入 Python 学习”。CTA 放在卡片底部统一位置，整卡可点击但仍保留明确文字按钮。

### 视觉风格重点

Hero 克制，四张卡最醒目。卡片为白底或极浅单色底，禁止当前版本的多色渐变；用深绿、学术蓝和少量低饱和辅助色区分工作空间。宋体只用于品牌级标题，功能名称使用中等字重无衬线，避免学生作品式的大留白和软糖式圆角。

### 文案语气

学术、清楚、邀请探索，不做营销承诺。示例：“观察随机性如何形成稳定规律”“从题库选择、组织并导出一份可用试卷”。

### 适合生成视觉稿的完整页面描述

设计一张 1440×1000 的 StatMind 教育 SaaS 首页。顶部是细边框导航，下面是紧凑居中的品牌 Hero，主标题“在思考中学习统计”。Hero 下依次放置横向四步 Learning Journey、教材资源快捷条，以及页面最醒目的 2×2 四张大功能卡片。四卡分别是统计教学平台、统计学组卷系统、R 语言知识库、Python 语言知识库，显示 13 个可视化模块、296 道已审核题目、39 项 R 实验、43 项 Python 实验及环境状态。卡片保持同等尺寸和清晰 CTA。页面使用冷白画布、白色表面、学术蓝主色和学习绿状态色、轻边框、少阴影、现代宋体标题与无衬线正文，像成熟高校教育产品而非营销落地页。

### 页面视觉稿生成 Prompt

```text
Create a high-fidelity 1440px desktop homepage for StatMind, an educational SaaS platform for university students and statistics instructors. Use a stacked full-width layout with a slim top navigation, a compact centered hero titled “在思考中学习统计”, a secondary horizontal Learning Journey with four steps, a narrow textbook-resource strip, and—most importantly—a prominent 2×2 grid of four equal large workspace cards. The cards must be “统计教学平台”, “统计学组卷系统”, “R 语言知识库”, and “Python 语言知识库”, each with a line icon, concise description, resource count, service status, and clear CTA. Show realistic counts: 13 visualization modules, 296 reviewed questions, 39 R labs, and 43 Python labs. Learning Journey is supportive and must not replace or visually overpower the four cards. Style: academic, scientific, calm, precise, modern education SaaS; off-white canvas, white surfaces, forest green and academic blue accents, subtle 1px borders, minimal shadows, 8–12px radius, modern Chinese serif display title, Geist/Inter-like UI text. Avoid gradients, glassmorphism, giant whitespace, marketing-poster composition, candy colors, pill overload, excessive roundness, heavy dashboard styling, decorative 3D art, and flashy animation.
```

---

### 页面名称

StatMind 产品总入口首页

### 场景名称

有数据 / 使用中状态：跨工作空间继续学习

### 场景目标

让已登录学习者看见四个产品空间各自的最近活动与下一步，同时维持四张卡的入口属性，不把首页变成指标面板。

### 页面布局结构

保持顶部导航、紧凑 Hero、Journey、教材快捷条和 2×2 卡片网格。Hero 下增加一条低高度“继续学习”证据线，但不新增侧栏或一排小卡。

### 顶部区域内容

导航右侧显示用户头像与“已同步”。Hero 副标题下出现“继续学习：置信区间 · 已完成 3/5 步”，右侧是“继续实验”按钮；Learning Journey 的“02 模拟实验”以深绿实心圆和下划线高亮。

### 左侧区域内容

左列教学卡显示“上次：置信区间”“完成 3/5 步”“12 分钟前”；R 卡显示“上次：保存成绩并计算均值”“课程 1/39”“代码已自动保存”。进度条为细线，不做大型环形图。

### 中间主区域内容

四张卡仍是主区域。每张卡在资源规模下增加一条“最近活动”：主题名、阶段进度、更新时间；信息用两行紧凑排版。教材资源条显示“上次阅读：第 2 章 数据的图形化描述”。

### 右侧区域内容

右列组卷卡显示“期中考试卷 A · 草稿”“8 题 / 50 分”；Python 卡显示“上次：DataFrame 分组汇总”“课程 6/43”“输出已保存”。组卷卡提供“继续组卷”，Python 卡提供“继续 Python 课程”。

### 页面中的关键卡片 / 列表 / 图表 / 组件

- 四张大工作空间卡片及其最近活动行。
- 一条跨产品“继续学习”Evidence Line。
- 细进度条、状态点、自动保存文字。
- 教材快捷条的最近阅读状态。
- 不使用 KPI 四宫格、环形完成率或趋势图。

### 页面中的关键状态信息

“置信区间 · 3/5 步”“期中考试卷 A · 草稿”“R 课程 1/39”“Python 课程 6/43”“代码已自动保存”“12 分钟前”。当前步骤和草稿状态必须同时由文字与形状表示。

### 页面中的 CTA / 按钮

“继续实验”“继续组卷”“继续 R 课程”“继续 Python 课程”“继续阅读”“查看全部活动”。

### 视觉风格重点

状态信息应安静地嵌入卡片，而不是新增很多卡片。深绿用于当前学习，学术蓝用于代码与数据资源，赭黄只用于待完成提醒；所有进度条细而克制。

### 文案语气

行动导向、简短、无催促感。示例：“从上次停止的位置继续”“草稿已保存”“还剩 2 个步骤完成本实验”。

### 适合生成视觉稿的完整页面描述

设计 StatMind 首页的已登录使用中状态，结构与默认首页一致：紧凑 Hero、辅助 Journey、教材条、醒目 2×2 四张功能卡。Hero 下方显示“继续学习：置信区间 · 已完成 3/5 步”。四卡内部出现最近活动：教学实验 3/5、期中卷 A 8 题 50 分、R 课程 1/39、Python 课程 6/43，并显示自动保存或更新时间。信息密度适中，状态嵌入原有卡片，不增加 Dashboard 式 KPI 卡或大型图表。

### 页面视觉稿生成 Prompt

```text
Create a high-fidelity desktop homepage for StatMind in a returning-user, active-learning state. Target users are university statistics learners. Preserve the exact homepage hierarchy: slim navigation, compact hero, supportive four-step Learning Journey, textbook strip, and a dominant 2×2 grid of four large workspace cards. Add a restrained continue-learning evidence line: “置信区间 · 已完成 3/5 步”. Each large card must show one realistic recent activity: simulation 3/5 steps, exam draft “期中考试卷 A” with 8 questions and 50 points, R lesson 1/39 with autosave, Python lesson 6/43 with saved output. Include thin progress lines and timestamps, not KPI charts. Visual style: mature academic education SaaS, cool off-white background, white cards, academic blue primary, learning green reserved for success, subtle borders, minimal shadows, 8–12px radius, Chinese serif only for the hero and neutral sans-serif for UI. Avoid replacing the four cards with a journey, heavy dashboards, analytics charts, excessive badges, gradients, glass effects, giant headings, poster styling, and decorative illustration.
```

---

### 页面名称

StatMind 产品总入口首页

### 场景名称

空状态 / 首次使用状态：选择第一个学习入口

### 场景目标

让第一次进入的用户理解四个工作空间之间的关系，并从任意入口开始；空状态应说明下一步，而不是显示空白或虚构进度。

### 页面布局结构

沿用完整首页结构。Hero 下加入一条浅绿新手提示；Journey 展示四步但无完成高亮；四张卡仍保持 2×2，并显示资源规模和“尚未开始”。

### 顶部区域内容

导航右侧显示“访客模式”或新账户头像。Hero 下的新手提示为：“第一次使用？可以从一个概念实验开始，也可以直接进入 R / Python 练习。”右侧提供“查看 2 分钟导览”。

### 左侧区域内容

教学卡显示“推荐起点”“置信区间：为什么 95% 不是这一次的概率？”；R 卡显示“尚未开始”“先运行一个均值示例”。两卡均保留真实资源数量。

### 中间主区域内容

Journey 四步使用空心编号并配一句解释；教材条显示“从《现代基础统计学》第 0 章开始”。四张大卡的状态行统一为“尚未开始”，但每张给出一条具体推荐任务，不出现大面积空白插画。

### 右侧区域内容

组卷卡显示“尚无试卷草稿”“浏览 296 道已审核题目”；Python 卡显示“尚未开始”“运行第一个 DataFrame 示例”。右列 CTA 分别为“浏览题库”和“开始 Python 学习”。

### 页面中的关键卡片 / 列表 / 图表 / 组件

- 新手提示条与“查看导览”。
- 未激活的四步 Journey。
- 2×2 四张大入口卡，每张包含“尚未开始”和一个推荐起点。
- 教材起始章节快捷条。
- 无大型空状态插画，无轮播。

### 页面中的关键状态信息

“尚未开始”“推荐起点”“尚无试卷草稿”“R / Python 环境可用”。CTA 不因首次使用而禁用。

### 页面中的 CTA / 按钮

“从概念实验开始”“浏览题库”“开始 R 学习”“开始 Python 学习”“从第 0 章阅读”“查看 2 分钟导览”。

### 视觉风格重点

用浅绿提示、空心步骤和清晰推荐建立安全感；禁止吉祥物、大插画、彩色气泡和强游戏化。四卡要比新手提示更醒目。

### 文案语气

温和、具体、不假设用户背景。示例：“你不需要先学会编程”“先观察一次模拟，再读公式”。

### 适合生成视觉稿的完整页面描述

设计 StatMind 的首次使用首页。页面仍以 2×2 四张大功能卡为主，卡片分别通往统计教学、组卷、R 和 Python；每张显示真实资源数量、“尚未开始”和一个具体推荐起点。Hero 下方有一条轻量新手提示，Learning Journey 的四步均为空心未完成状态，教材条推荐从第 0 章开始。页面不使用空白大插画，所有空状态都提供下一步操作。

### 页面视觉稿生成 Prompt

```text
Create a high-fidelity first-use desktop homepage for StatMind, a university statistics education SaaS. Keep a slim top navigation, compact hero “在思考中学习统计”, a small onboarding notice, a supportive four-step Learning Journey with empty step markers, a textbook starter strip, and a visually dominant 2×2 grid of four large workspace cards. The cards are Statistics Simulation, Exam Builder, R Learning, and Python Learning. Each card must show its real resource count, the state “尚未开始”, one concrete recommended starter task, and an enabled CTA. Show 13 modules, 296 reviewed questions, 39 R labs, and 43 Python labs. Use calm onboarding copy and no large empty illustration. Style: academic, rational, restrained modern education SaaS; off-white and white surfaces, deep green, academic blue, thin borders, few shadows, 8–12px radius, Chinese serif hero with neutral sans-serif UI. Avoid removing or shrinking the four cards, gradients, mascots, gamification, poster-like marketing, heavy dashboards, glassmorphism, excessive decoration, and vague empty states without a next action.
```
## 2. 教材资源页

### 页面名称

《现代基础统计学》教材资源页

### 场景名称

默认状态：阅读第 2 章“数据的图形化描述”

### 场景目标

让学习者像使用 Notion 与 GitBook 一样阅读教材，并能在不离开当前章节的情况下找到对应模拟、R、Python 与题库资源。

### 页面布局结构

顶部 64px 全局栏；下方三栏阅读布局：左侧 248px 章节目录，中间 720–820px 教材正文，右侧 280px 本章工具与页面大纲。左、右栏可粘性停留，中栏独立滚动；正文最大行宽约 72 个中文字符。

### 顶部区域内容

左侧为返回首页与书名《现代基础统计学》；中间为全书搜索“搜索章节、概念或公式”；右侧显示“12 章”“阅读设置”“复制本页链接”。面包屑为“教材资源 / 第 2 章 / 2.1 频数分布与直方图”。

### 左侧区域内容

章节树按真实目录显示 00–11 章，包括“00 什么是统计学、01 抽样调查、02 数据的图形化描述、03 描述数据分布的数值特征……11 时间序列分析”。第 02 章展开，子节为“2.1 频数分布与直方图、2.2 箱线图、2.3 分布形态”。当前 2.1 使用浅绿背景、深绿左竖线和加粗文字；已读小节有勾选，未读项为空心圆。

### 中间主区域内容

正文顶部显示章号“02”、宋体标题“数据的图形化描述”、预计阅读 18 分钟、学习目标三条。正文按“问题引入—概念—示例—图形—解释”组织：一张学生成绩小数据表；一张直方图，横轴为成绩区间、纵轴为频数；图下有“读图提示”与可访问文本摘要；公式与定义使用窄边框块，不堆叠卡片。底部为“上一节 / 下一节”。

### 右侧区域内容

上方“本页大纲”列出学习目标、频数分布、直方图、分布形态、练习；滚动时当前标题以蓝色细线高亮。下方“关联工具”显示三个紧凑入口：模拟“改变组距观察直方图”、R“使用 hist() 绘图”、Python“使用 matplotlib.hist()”；再下方为“本章练习 6 题”和“保存笔记”。

### 页面中的关键卡片 / 列表 / 图表 / 组件

- 可折叠章节树与当前小节状态。
- 搜索、面包屑、阅读进度细线。
- 正文标题、学习目标、定义块、数据表。
- 教材风直方图及文字摘要。
- 右侧页面大纲与模拟 / R / Python / 题库入口。
- 上一节、下一节、保存笔记。

### 页面中的关键状态信息

“第 2 / 12 章”“本节预计 18 分钟”“阅读进度 0%”“3 个关联实验”“6 道本章练习”。当前章节、小节和右侧大纲项均有非颜色单一高亮。

### 页面中的 CTA / 按钮

“开始本节”“打开模拟”“在 R 中练习”“在 Python 中练习”“练习本章题目”“保存笔记”“下一节”。

### 视觉风格重点

减少章节大卡，建立连续文档阅读感。中栏白底、两侧极浅灰；正文图表像严谨教材而非 BI 图表。标题使用宋体，界面与正文说明使用无衬线；右栏工具入口是紧凑列表，不是三张彩色卡。

### 文案语气

像优秀教材编辑：准确、循序渐进、先观察再定义。示例：“先看形状，再讨论代表性数值”“组距会改变图形细节，但不会改变原始数据”。

### 适合生成视觉稿的完整页面描述

设计《现代基础统计学》的桌面端教材阅读页，采用 Notion + GitBook 式三栏结构。左侧是 00–11 章的真实章节树，第 02 章展开并高亮 2.1；中间是“数据的图形化描述”连续教材正文，含学习目标、学生成绩数据表、直方图、读图提示和定义；右侧是当前页面大纲、模拟、R、Python 与题库入口。页面以阅读为主，避免大量章节卡片。

### 页面视觉稿生成 Prompt

```text
Create a high-fidelity desktop textbook resource page for StatMind, aimed at university students studying introductory statistics. Use a Notion-and-GitBook-inspired three-column reading layout: a 248px sticky chapter tree on the left, a 720–820px continuous textbook article in the center, and a 280px sticky outline-and-tools rail on the right. Show the real chapter list 00–11, expand chapter 02 “数据的图形化描述”, and highlight subsection 2.1 with a pale-green row, forest-green left bar, and bold text. The center article must include chapter number 02, a Chinese serif title, three learning goals, a small student-score data table, an academic histogram with labeled axes and accessible text summary, definitions, interpretation notes, and previous/next navigation. The right rail must contain the current-page outline and compact links to a simulation, an R hist() lab, a Python matplotlib.hist() lab, and six practice questions. Style: calm academic education SaaS, white article surface, very light gray side rails, deep green and academic blue accents, thin borders, few shadows, 8–12px radius only where needed, readable serif headings and neutral sans-serif body. Avoid chapter-card grids, marketing hero sections, gradients, decorative illustrations, heavy dashboards, excessive cards, glassmorphism, and overly wide text lines.
```

---

### 页面名称

《现代基础统计学》教材资源页

### 场景名称

有数据 / 学习中状态：阅读、笔记与实验联动

### 场景目标

呈现学习者已经完成部分阅读、保存笔记并运行关联实验后的连续学习状态，使“教材—实验—代码—练习”形成可追踪证据链。

### 页面布局结构

保持三栏阅读布局。顶部增加细进度信息；左侧章节树显示完成状态；中栏定位到第 8 章回归分析中的当前段落；右栏显示工具运行记录与个人笔记。

### 顶部区域内容

面包屑为“教材资源 / 第 8 章 相关与回归分析 / 8.2 一元线性回归”。右侧显示“全书进度 46%”“刚刚保存”。顶部搜索保持可用，进度用 2px 深绿细线贯穿内容宽度。

### 左侧区域内容

00–07 章的已读部分显示绿色勾选；第 08 章展开。8.1“相关系数”已完成，8.2“一元线性回归”当前高亮，8.3“残差诊断”未开始。每项显示阅读状态和短时长，不显示游戏化积分。

### 中间主区域内容

当前段落标题“从散点图到回归直线”。先展示 12 个观测的散点图，再叠加学术蓝回归线；图旁不放 KPI，而在图下显示方程 `ŷ = 2.41 + 0.73x`、`R² = 0.68` 与一段解释。学习者选中的句子旁有窄边批注“相关不等于因果”。页面下方有一个两题微练习，第一题已完成，第二题待答。

### 右侧区域内容

“本页大纲”下增加“我的笔记”，显示一条带时间的笔记和“新增笔记”。“关联工具”显示运行状态：回归模拟“已完成”、R `lm()` 实验“输出已保存”、Python `statsmodels`“未开始”、章节题库“1/6 已完成”。

### 页面中的关键卡片 / 列表 / 图表 / 组件

- 完成 / 当前 / 未开始的章节树。
- 全书进度细线与自动保存状态。
- 散点图、回归线、方程和文字解释。
- 选中文本批注与个人笔记。
- 关联工具运行状态列表。
- 两题微练习及答案反馈。

### 页面中的关键状态信息

“全书进度 46%”“第 8 章进行中”“8.1 已完成”“回归模拟已完成”“R 输出已保存”“章节练习 1/6”“刚刚保存”。

### 页面中的 CTA / 按钮

“继续阅读”“新增笔记”“重新打开模拟”“查看 R 输出”“开始 Python 实验”“提交答案”“下一节：残差诊断”。

### 视觉风格重点

学习证据沿阅读流自然出现，避免顶部塞入多个指标卡。图表使用深绿点、学术蓝线、灰色网格；状态用图标和文字双重表达。批注像编辑器页边注，不做彩色便签墙。

### 文案语气

客观、解释导向。示例：“这条线概括的是平均变化趋势”“R² 描述拟合程度，不说明因果关系”。

### 适合生成视觉稿的完整页面描述

设计 StatMind 教材资源的学习中状态：三栏阅读页打开第 8 章 8.2 一元线性回归，左侧显示章节完成进度，中间正文展示散点图、回归线、方程和解释，并有一条“相关不等于因果”的页边批注；右侧显示个人笔记及模拟、R、Python、题库的完成状态。顶部仅用细进度线表示全书 46%，不出现 Dashboard 式指标卡。

### 页面视觉稿生成 Prompt

```text
Create a high-fidelity active-learning state for the StatMind statistics textbook resource page. Target users are university students. Keep the three-column GitBook-style layout: left chapter tree, center continuous article, right outline/tools/notes rail. Open chapter 08 “相关与回归分析”, highlight subsection 8.2 “一元线性回归”, and show completed, current, and not-started states with icons plus text. In the center show the section “从散点图到回归直线”, a 12-point scatterplot, an academic-blue regression line, equation “ŷ = 2.41 + 0.73x”, R² = 0.68, explanatory prose, a margin note “相关不等于因果”, and a two-question micro exercise. The right rail must show one saved note and linked-resource states: simulation completed, R lm() output saved, Python statsmodels not started, practice 1/6. Include a thin 46% reading-progress line and “刚刚保存”. Style: restrained academic SaaS, white and pale-gray surfaces, forest-green points, academic-blue line, thin borders, minimal shadows, readable Chinese serif headings and sans-serif UI. Avoid KPI card rows, thick dashboards, gradients, note-card clutter, oversized charts, decorative art, and gamification.
```

---

### 页面名称

《现代基础统计学》教材资源页

### 场景名称

空状态 / 首次使用状态：从目录建立阅读路径

### 场景目标

帮助第一次进入教材资源页的用户理解目录、正文和关联工具三栏各自用途，并给出一个明确起点；若资源暂不可用，也要解释原因和恢复动作。

### 页面布局结构

保持三栏骨架，左侧完整目录可浏览；中栏显示欢迎与推荐阅读路径；右侧显示工具说明。没有模态遮罩，不使用占满正文的大插画。

### 顶部区域内容

书名与搜索正常显示。顶部状态为“尚未开始阅读”；右侧提供“导入上次进度”次级入口（仅在存在可导入记录时出现）和“阅读设置”。

### 左侧区域内容

真实 00–11 章目录全部折叠，章号、标题与资源数可扫描。第 00 章“什么是统计学”带“推荐起点”文字和深绿轮廓；其余章节为空心状态。目录顶部提示“选择章节后，内容会在中间打开”。

### 中间主区域内容

显示窄幅欢迎区：标题“从一个问题开始学习统计”，说明教材由概念、图形、模拟和代码实验组成。下方不是卡片墙，而是一条三步起始路径：阅读第 0 章 → 打开第一个可视化 → 完成 3 道检查题。右侧或下方展示预计总资源“12 章 · 14 个可视化 · 39 个 R 实验 · 43 个 Python 实验”。

### 右侧区域内容

“如何使用本页”列出三点：左侧选章节、中间读内容、右侧打开工具。关联工具区显示占位文字“选择章节后显示对应实验”，并提供“查看全部资源目录”。若内容加载失败，则在此显示“重新加载”和离线说明，而不是空白。

### 页面中的关键卡片 / 列表 / 图表 / 组件

- 折叠的 00–11 章目录。
- 推荐起点和三步入门路径。
- 教材资源总量摘要。
- 右侧使用说明与工具占位。
- 可恢复的加载失败小提示。
- 不显示图表和大插画。

### 页面中的关键状态信息

“尚未开始阅读”“推荐起点”“未选择章节”“选择章节后显示对应实验”。加载失败时显示“内容暂未载入，目录仍可浏览”。

### 页面中的 CTA / 按钮

“从第 0 章开始”“浏览全部章节”“查看全部资源目录”“导入上次进度”“重新加载”。

### 视觉风格重点

空状态仍保留真实信息架构，让用户预见内容出现的位置。用细线流程和短说明代替插画；深绿只强调推荐起点和主 CTA。

### 文案语气

耐心、具体、不制造门槛。示例：“你可以按顺序阅读，也可以直接跳到需要的主题”“选择章节后，相关实验会出现在右侧”。

### 适合生成视觉稿的完整页面描述

设计 StatMind 教材资源首次使用页，保留左中右三栏。左侧展示折叠的 00–11 章真实目录并标记第 0 章为推荐起点；中间显示“从一个问题开始学习统计”和阅读—模拟—练习三步路径；右侧解释大纲、工具和实验入口将在选择章节后出现。页面给出明确 CTA，无大型插画和无意义空白。

### 页面视觉稿生成 Prompt

```text
Create a high-fidelity first-use empty state for the StatMind statistics textbook resource page. Target users are new university students. Preserve the three-column reading architecture: left real chapter tree from 00 to 11, center welcome-and-start path, right usage guidance and linked-tool placeholder. Keep all chapters collapsed and mark chapter 00 “什么是统计学” as “推荐起点” using outline, text, and a subtle green marker. In the center show “从一个问题开始学习统计” and a three-step linear path: read chapter 0, open the first visualization, complete three check questions. Show resource totals: 12 chapters, 14 visualizations, 39 R labs, 43 Python labs. In the right rail explain that outlines and experiments appear after selecting a chapter and provide “查看全部资源目录”. Style: calm academic education SaaS, white and pale-gray surfaces, academic blue primary, learning green reserved for completed states, thin borders, minimal shadows, 8–12px radius, Chinese serif title and neutral sans-serif UI. Avoid giant empty illustrations, card grids, vague placeholders, marketing slogans, gradients, glassmorphism, heavy dashboards, and disabled dead ends without a next action.
```

---

## 3. 统计教学平台 / 模拟实验页

### 页面名称

统计教学平台 · 置信区间模拟实验

### 场景名称

默认状态：实验准备与单次区间观察

### 场景目标

把当前 Dashboard 感较强的页面改造成科研实验工作台，让学习者先读懂问题、变量和实验步骤，再生成第一个样本。

### 页面布局结构

顶部 64px 实验栏；下方三栏工作台：左侧 230px 实验导航与步骤，中间自适应可视化 notebook，右侧 300px 参数控制与概念提示。页面使用细分隔线而非大圆角容器包裹所有内容。

### 顶部区域内容

左侧显示“统计教学平台 / 参数估计 / 置信区间”；中间显示实验标题“重复抽样中的置信区间”和一句研究问题“95% 置信区间为什么会覆盖总体均值约 95% 的次数？”；右侧为“重置实验”“实验说明”“返回资源目录”。

### 左侧区域内容

实验目录分“统计基本原理”和“统计模拟”，当前“参数估计 / 置信区间”使用浅绿背景、深绿竖线与实验图标。其下是四步步骤器：1 设置总体与置信水平（当前）、2 生成样本、3 构造区间、4 比较覆盖率。底部显示先修概念“抽样分布、标准误、临界值”。

### 中间主区域内容

顶部是一条 Evidence Line：“总体参数 μ=10 → 抽取 n=10 的样本 → 计算一个 95% 区间 → 判断是否覆盖 μ”。主图区域显示横轴“总体尺度 5–15”、纵轴“样本编号”，蓝色虚线标记真实均值 μ=10；尚未生成样本时不画虚假的坐标数据，而在图内显示小型线性图标和提示“生成第一个样本后，这里会出现区间”。图下方有三条实验观察问题。

### 右侧区域内容

参数按研究逻辑分组：总体设定（μ=10、σ=2）、抽样设定（样本量 n=10）、区间设定（置信水平 95%、σ 已知 / Z 区间）。控件包含数字输入、滑杆和选择框，每个字段有一句影响说明。下方固定主按钮“生成 1 个样本”，次按钮“连续生成 20 个”，再下方为“概念提示”和公式 `估计值 ± 临界值 × 标准误`。

### 页面中的关键卡片 / 列表 / 图表 / 组件

- 左侧实验树和四步步骤器。
- Evidence Line。
- 置信区间覆盖图空画布与真实均值参考线。
- μ、σ、n、置信水平、Z/t 区间参数控件。
- 公式、概念提示、观察问题。
- 生成、批量生成、重置按钮。

### 页面中的关键状态信息

“步骤 1/4”“样本数 0”“覆盖率 —”“μ=10”“σ=2”“n=10”“置信水平 95%”“尚未生成区间”。数值摘要紧靠图或参数，不做顶部四张 KPI 卡。

### 页面中的 CTA / 按钮

“生成 1 个样本”“连续生成 20 个”“重置实验”“查看实验说明”“下一步：观察区间”。

### 视觉风格重点

像 Observable + Jupyter 的科研 notebook：左侧导航稳定，中间图表最大，右侧控制紧凑。主图白底、细灰网格、学术蓝均值线；深绿用于操作与当前步骤。空图给出明确下一步而非保留巨型无解释坐标轴。

### 文案语气

研究问题驱动、准确但易懂。示例：“先生成一个样本，观察一次区间估计”“覆盖与否由重复抽样定义，不是对这一个区间赋予概率”。

### 适合生成视觉稿的完整页面描述

设计 StatMind 置信区间模拟实验的默认准备状态。页面为左侧实验导航、中间可视化 notebook、右侧参数控制的三栏科研工作台。左栏高亮“参数估计 / 置信区间”并显示四步实验流程；中间以 Evidence Line 解释 μ、样本、区间和覆盖关系，主图只显示 μ=10 的参考线与“生成第一个样本”空状态；右侧包含 μ=10、σ=2、n=10、95%、σ 已知等参数和生成按钮。取消顶部 KPI 卡排布。

### 页面视觉稿生成 Prompt

```text
Create a high-fidelity desktop scientific learning workspace for StatMind, aimed at university students learning confidence intervals. Use an Observable/Jupyter-inspired three-column layout: 230px left experiment navigation and four-step procedure, a large center visualization notebook, and a 300px right parameter-control rail. Highlight “参数估计 / 置信区间”. At the top show the research question about why 95% confidence intervals cover the true mean in about 95% of repeated samples. In the center include an evidence line “μ=10 → n=10 sample → 95% interval → coverage decision” and an empty confidence-interval plot with a blue dashed μ=10 reference line plus a clear message to generate the first sample. On the right include grouped controls for μ=10, σ=2, sample size n=10, confidence level 95%, and known-σ Z interval, with buttons “生成 1 个样本” and “连续生成 20 个”. Style: academic scientific SaaS, white and very pale gray, forest green controls, academic blue reference line, thin borders, minimal shadows, 8–12px radius. Avoid top KPI-card rows, giant empty axes, heavy dashboards, gradients, glassmorphism, decorative charts, neon colors, marketing layouts, and unexplained empty space.
```

---

### 页面名称

统计教学平台 · 置信区间模拟实验

### 场景名称

有数据 / 使用中状态：连续生成区间并观察覆盖

### 场景目标

让学习者在连续抽样过程中看见区间如何逐条累积、哪些未覆盖真实均值，以及覆盖率如何逐渐稳定。

### 页面布局结构

三栏结构不变。左栏步骤进入第 3 步；中栏主图占据约 70% 纵向空间，图下为解释与观察记录；右栏参数锁定并显示运行控制。

### 顶部区域内容

标题旁显示低干扰状态“正在生成 20 个样本 · 12/20”。右侧按钮改为“暂停”，并显示“自动记录开启”“刚刚保存”。顶部不使用全屏 Loading，只显示 2px 进度线。

### 左侧区域内容

步骤 1“设置参数”和步骤 2“生成样本”标记完成；步骤 3“比较区间”当前高亮；步骤 4“解释覆盖率”未完成。当前实验下显示小型运行记录：“批次 1 · 12 个区间”。

### 中间主区域内容

主图绘制 12 条水平置信区间，纵轴为样本 1–12，横轴为总体尺度。覆盖 μ=10 的区间为深绿线与圆点；未覆盖的两条为低饱和赭红并在端点旁显示“未覆盖”；蓝色虚线贯穿 μ=10。图右上角紧凑显示“10/12 覆盖 · 83.3%”，不是独立 KPI 卡。图下是最近一次样本摘要：样本均值 11.18、标准误 0.63、区间 [9.95, 12.41]、覆盖“是”。

### 右侧区域内容

运行期间参数字段只读并标注“暂停后可修改”。运行控制含速度“慢 / 标准 / 快”、暂停、单步生成。下方显示实时记录：“样本 12 / 20”“覆盖 10”“未覆盖 2”“当前覆盖率 83.3%”；概念提示提醒“小样本批次波动很正常”。

### 页面中的关键卡片 / 列表 / 图表 / 组件

- 逐条增长的水平置信区间图。
- 真实均值虚线、覆盖 / 未覆盖图例和文字标识。
- 批次进度、暂停、单步与速度控制。
- 最近样本的均值、标准误、上下界和覆盖判断。
- 观察记录输入“我注意到……”。

### 页面中的关键状态信息

“正在生成 12/20”“覆盖 10”“未覆盖 2”“83.3%”“最近区间 [9.95, 12.41]”“暂停后可修改参数”“已自动保存”。

### 页面中的 CTA / 按钮

“暂停”“继续”“单步生成”“记录观察”“清除本批次”“查看区间计算过程”。

### 视觉风格重点

动画只用于新生成的一条区间从淡到实，200–300ms；必须支持减少动态效果。未覆盖状态不可只靠红色，还要有断点标记与文字。图例、坐标和数据说明清晰，避免观赏性动画。

### 文案语气

客观、鼓励观察。示例：“当前批次较小，覆盖率会波动”“注意未覆盖区间的位置，而不是只看比例”。

### 适合生成视觉稿的完整页面描述

设计置信区间模拟的运行中状态。中间图上累积 12 条水平区间，10 条覆盖 μ=10、2 条未覆盖；覆盖用深绿，未覆盖用赭红加文字，学术蓝虚线标记真实均值。顶部显示 12/20，右栏参数锁定并提供暂停、单步和速度控制，图下显示最近样本均值、标准误、区间与覆盖判断。整体像真实科研教学工具，不像运营 Dashboard。

### 页面视觉稿生成 Prompt

```text
Create a high-fidelity active-running state for the StatMind confidence-interval simulation, for university statistics learners. Keep the three-column scientific workspace. In the center, show 12 accumulated horizontal confidence intervals on a labeled plot: 10 intervals cover the academic-blue dashed true mean μ=10 and use forest green; 2 do not cover and use muted rust plus explicit “未覆盖” labels. Show “10/12 覆盖 · 83.3%” inside the plot corner, not as a KPI card row. Under the plot show the latest sample: mean 11.18, standard error 0.63, interval [9.95, 12.41], covered yes. The top status is “正在生成 20 个样本 · 12/20”. The right rail has locked parameters, speed control, pause, step generation, and a compact live record. The left procedure highlights step 3 “比较区间”. Style: calm academic scientific SaaS, high chart legibility, white surfaces, pale gray canvas, deep green and academic blue, muted rust only for missed coverage, subtle borders, 8–12px radius, minimal shadow. Avoid dashboards, oversized metrics, color-only status, flashy animation, gradients, heavy card stacks, decorative illustrations, and marketing composition.
```

---

### 页面名称

统计教学平台 · 置信区间模拟实验

### 场景名称

完成状态：覆盖率稳定与解释结论

### 场景目标

在足够多次重复抽样后，引导学习者把图形证据转化为统计解释，并完成一次可记录的学习结论。

### 页面布局结构

三栏保持稳定。左栏高亮第 4 步；中栏上半部为 100 次区间概览，下半部为覆盖率轨迹与解释区；右栏从控制模式切换为“结果与比较”，参数仍可回看。

### 顶部区域内容

显示“实验完成 · 100 个样本”“结果已保存”。右侧主按钮为“完成解释”，次按钮为“再运行一组”“导出实验记录”。无庆祝动画。

### 左侧区域内容

四个步骤全部显示完成，当前第 4 步使用深绿竖线。运行记录列出“批次 1 · n=10 · 95% · 覆盖 94/100”，可选择“对比批次”。

### 中间主区域内容

上方置信区间图以滚动或缩略形式显示 100 条区间，6 条未覆盖明确标记；图旁显示“94/100 覆盖”。下方折线图展示覆盖率从前 10 次的大幅波动逐渐靠近 95%，附可访问摘要。解释区提出两问：“95% 描述什么？”“如果把置信水平改成 99%，区间宽度会怎样？”学习者填写结论，系统给出基于证据的反馈。

### 右侧区域内容

“本次设置”显示 μ=10、σ=2、n=10、95%、Z 区间；“结果摘要”显示覆盖 94、未覆盖 6、平均区间宽度 2.48。下方“比较设置”提供 90% / 95% / 99% 三个选项和“运行对比”，并提示预期权衡“更高置信水平通常意味着更宽区间”。

### 页面中的关键卡片 / 列表 / 图表 / 组件

- 100 条区间概览图。
- 覆盖率随样本次数变化的折线图。
- 图表文字摘要和图例。
- 参数 / 结果对照列表。
- 两个解释问题与结论输入。
- 批次比较和导出实验记录。

### 页面中的关键状态信息

“实验完成”“100 个样本”“94/100 覆盖”“未覆盖 6”“平均宽度 2.48”“结论待完成”“结果已保存”。

### 页面中的 CTA / 按钮

“完成解释”“检查结论”“再运行一组”“运行 99% 对比”“对比批次”“导出实验记录”“进入下一个实验”。

### 视觉风格重点

完成页强调证据和解释，不做领奖式成功页。两个图表使用相同颜色语义和精细网格；数字与解释相邻，避免孤立的大数字。结论输入区是页面最终焦点。

### 文案语气

科学、审慎。示例：“本批次 94% 不需要恰好等于 95%”“重复次数增加后，长期比例趋近设定的置信水平”。

### 适合生成视觉稿的完整页面描述

设计置信区间模拟完成状态：100 个样本中 94 个区间覆盖 μ=10。中间上半部显示 100 条区间概览，下半部显示覆盖率逐渐靠近 95% 的轨迹和两个解释问题；右栏列出本次参数、结果和 90/95/99% 对比入口；左栏四步全部完成。画面强调证据到解释的学习闭环，不做成功庆祝页。

### 页面视觉稿生成 Prompt

```text
Create a high-fidelity completed-state desktop UI for the StatMind confidence-interval experiment, aimed at university statistics students. Preserve the three-column scientific workspace. The left procedure shows all four steps completed and highlights “解释覆盖率”. The center contains a compact overview of 100 horizontal confidence intervals with six explicit misses, a second chart showing cumulative coverage stabilizing near 95%, accessible text summaries, and two interpretation questions with a conclusion input area. The result is 94 covered out of 100, six missed, average interval width 2.48. The right rail lists the exact settings μ=10, σ=2, n=10, 95%, known-σ Z interval, plus comparison options 90%, 95%, 99%. Include “完成解释”, “再运行一组”, and “导出实验记录”. Style: academic, precise, calm education SaaS; white/pale-gray surfaces, forest green and academic blue charts, muted rust for misses, thin borders, minimal shadows, 8–12px radius. Avoid celebratory graphics, KPI tiles, heavy dashboards, gradients, oversized numbers, flashy motion, decorative charts, and conclusions presented without evidence.
```

---

## 4. 统计学组卷系统

### 页面名称

StatMind 统计学组卷工作台

### 场景名称

默认状态：浏览题库并建立空试卷

### 场景目标

让教师快速理解“左侧筛选—中间选题—右侧组卷”的工作方式，并在浏览 296 道已审核题目的同时看见空试卷将如何形成。

### 页面布局结构

顶部 64px 产品栏；下方三栏工作区：左侧 240px 筛选器，中间自适应题库列表，右侧 340px 当前试卷。左右栏固定，中间滚动；右侧试卷底部操作吸附但不遮挡题目。

### 顶部区域内容

左侧为 StatMind 与“统计学组卷”；面包屑“课程 / 现代基础统计学 / 题库”；中间搜索“搜索题干、知识点或题目编号”；右侧显示“296 道已审核”“保存草稿”“导出试卷”和账户入口。导出在空试卷时禁用，并有原因提示。

### 左侧区域内容

筛选器按“章节、题型、难度、知识点、来源、使用状态”分组。章节使用 00–11 的教材目录；题型包括单选、多选、判断、计算、简答；难度为基础、中等、进阶；来源为自建、课程、共享；使用状态为未使用、已使用。每组可折叠，底部“重置筛选”。

### 中间主区域内容

标题“题库”，显示“296 道题 · 当前 1–20”。顶部有排序、密度切换和“已选 0 题”。紧凑题目行展示：复选框、编号 `STAT-0108`、题型“计算题”、两行题干摘要、章节“08 相关与回归分析”、知识点“一元线性回归”、难度“中等”、分值“8 分”、历史使用“2 次”、右端“加入试卷”。展开行可预览答案与解析，但默认收起。

### 右侧区域内容

标题“当前试卷”；名称输入“未命名试卷”；摘要为 0 题、0 分、预计 0 分钟。中部空状态使用小型文档线性图标，文案“从题库加入题目后，试卷结构会显示在这里”，并列出题型结构、分值与顺序将出现的位置。底部“预览试卷”“导出试卷”禁用，“保存空草稿”为次级操作。

### 页面中的关键卡片 / 列表 / 图表 / 组件

- 全局题库搜索和排序。
- 六组可折叠筛选器。
- 题目紧凑列表、复选框、元数据标签和解析抽屉。
- 空试卷名称、题量、总分、预计时长。
- 空状态说明与禁用原因 Tooltip。
- 不使用复杂图表。

### 页面中的关键状态信息

“296 道已审核”“当前显示 20 道”“已选 0 题”“当前试卷 0 题 / 0 分 / 0 分钟”“导出需至少加入 1 道题”。

### 页面中的 CTA / 按钮

“加入试卷”“批量加入”“重置筛选”“预览答案”“保存草稿”“预览试卷”“导出试卷”。

### 视觉风格重点

中间题库是视觉主轴；左栏以极浅灰分组，右栏用极浅绿顶部标识强调当前试卷。题目行采用分隔线而非每题一张厚卡。标签数量受控，难度同时有文字。

### 文案语气

教师工作语气，专业直接。示例：“按章节、知识点和难度定位题目”“加入题目后自动计算总分与预计用时”。

### 适合生成视觉稿的完整页面描述

设计 StatMind 桌面端统计学组卷工作台默认状态。顶部有课程面包屑、搜索和 296 道已审核状态；左栏是章节、题型、难度、知识点、来源与使用状态筛选；中栏为紧凑题库列表，每题含编号、题型、题干、章节、知识点、难度、分值和加入操作；右栏为空的当前试卷，显示 0 题、0 分、0 分钟和明确下一步。页面像成熟教师生产工具，不像卡片 Dashboard。

### 页面视觉稿生成 Prompt

```text
Create a high-fidelity desktop UI for StatMind, an academic statistics exam-building SaaS for university professors and teaching assistants. Use a fixed top bar and a three-column workspace: 240px left filters, wide center question bank, 340px right current-paper panel. Show “296 道已审核”. Left filters must include real textbook chapters 00–11, question type, difficulty, knowledge point, source, and usage status. The center list shows 20 compact question rows with checkbox, ID such as STAT-0108, type, two-line stem, chapter, topic, difficulty, points, historical use count, and “加入试卷”. The right panel is an empty unnamed paper with 0 questions, 0 points, 0 minutes, an explanatory empty state, and disabled preview/export with a reason. Style: restrained academic education SaaS, white and pale-gray surfaces, academic blue primary, learning green reserved for reviewed and completed states, thin dividers, minimal shadows, 8–12px radius, readable neutral sans-serif. Avoid card-per-question clutter, colorful tags, gradients, heavy dashboards, marketing hero layouts, oversized illustrations, glassmorphism, decorative charts, and unexplained disabled actions.
```

---

### 页面名称

StatMind 统计学组卷工作台

### 场景名称

有数据 / 使用中状态：筛选题目并编排期中试卷

### 场景目标

帮助教师在明确筛选条件后批量选题，并实时控制题型结构、难度、总分与预计答题时间。

### 页面布局结构

三栏框架不变。左栏显示已启用条件；中栏进入批量选择模式；右栏展示可排序的完整试卷结构。顶部增加轻量自动保存状态。

### 顶部区域内容

搜索框中为“假设检验”；状态显示“已应用 4 个筛选条件 · 匹配 36 道题”“草稿刚刚保存”。右侧按钮为“预览试卷”和深绿“导出试卷”。

### 左侧区域内容

当前筛选条件以可移除行显示：题型“计算题”、知识点“假设检验”、难度“中等”、分值“5–10 分”。下面显示推荐结构“基础 40% / 应用 40% / 综合 20%”，使用细比例条与文字。底部为“清除全部”和“保存为常用筛选”。

### 中间主区域内容

批量工具栏显示“36 道匹配 · 已选 8 题”，含全选当前页与批量加入。题目行突出匹配词，每行增加历史正确率或使用次数；已加入的题目用浅绿底、勾选和“已加入”三重状态，右端按钮变为“移出”。列表支持按难度、分值、更新时间排序。

### 右侧区域内容

试卷名“统计学基础 · 期中考试卷 A”；摘要“8 题 · 50 分 · 预计 45 分钟”。结构列表按“一、选择题；二、计算题；三、简答题”分组，每道显示序号、题号、分值、拖拽把手和移除。下方细比例条表示题型与难度构成，并提示“还需 50 分达到 100 分目标”。

### 页面中的关键卡片 / 列表 / 图表 / 组件

- 可移除筛选条件与常用筛选。
- 批量操作栏、选中 / 已加入状态。
- 可展开题目行与历史数据。
- 试卷题目分组、拖拽排序、删除。
- 总分、预计时长、题型和难度细比例条。
- 自动保存状态。

### 页面中的关键状态信息

“匹配 36 道”“已选 8 题”“期中考试卷 A”“8 题 / 50 分 / 45 分钟”“草稿刚刚保存”“还需 50 分达到目标”。

### 页面中的 CTA / 按钮

“批量加入”“移出试卷”“清除全部”“保存常用筛选”“预览试卷”“导出试卷”“调整目标”。

### 视觉风格重点

操作反馈明显但克制：浅绿行、勾选和状态文字共同表达已加入。右栏信息密度较高但通过分组标题和分隔线组织；拖拽把手、移除按钮有清晰 Hover / Focus。

### 文案语气

强调控制感和下一步。示例：“36 道题匹配当前条件”“还需 50 分达到目标总分”“拖动题目调整顺序”。

### 适合生成视觉稿的完整页面描述

设计 StatMind 组卷系统的正在组卷状态。左栏显示四个筛选条件；中栏显示 36 道结果、8 道已选，已加入题目使用浅绿底与勾选；右栏是“期中考试卷 A”，按题型分组列出 8 道题，显示 50 分和 45 分钟，支持拖拽排序并提示距 100 分目标还差 50 分。顶部显示自动保存，预览和导出可用。

### 页面视觉稿生成 Prompt

```text
Create a high-fidelity active exam-assembly state for StatMind, targeting university statistics instructors. Keep the three-column workspace. The left rail shows four removable filters: 计算题, 假设检验, 中等, 5–10 分, plus a restrained recommended-composition bar. The center shows 36 matching questions, an 8-question bulk selection, compact metadata rows, highlighted search terms, and clear “已加入” states using pale-green row background, check icon, and text. The right paper is named “统计学基础 · 期中考试卷 A”, contains 8 questions, 50 points, estimated 45 minutes, grouped into 选择题, 计算题, 简答题, with drag handles, point values, and remove controls. Show a target message “还需 50 分达到 100 分目标” and “草稿刚刚保存”. Style: calm professional academic SaaS, moderate density, thin borders, few shadows, forest green selected states, academic blue metadata, 8–12px radius. Avoid heavy dashboard cards, colorful tag clouds, large charts, gradients, glassmorphism, excessive shadows, marketing styling, and ambiguous selection feedback.
```

---

### 页面名称

StatMind 统计学组卷工作台

### 场景名称

空状态 / 首次使用状态：开始第一份试卷或恢复无结果

### 场景目标

降低首次组卷门槛，并在筛选无结果时解释原因和提供可执行恢复动作；两种空状态共用稳定的三栏骨架。

### 页面布局结构

顶部与三栏结构保持不变。首次使用时中栏显示三步引导；筛选无结果时中栏显示当前条件和调整建议；右栏始终保留空试卷结构预览。

### 顶部区域内容

搜索为空时显示“搜索题干、知识点或题目编号”。顶部提供“从模板开始”和“导入题库”；保存、预览、导出按状态合理禁用，并在 Hover / Focus 时解释原因。

### 左侧区域内容

首次使用时只展开“章节、题型、难度”三个常用筛选，并提示“先选一个章节，再按难度缩小范围”。无结果时显示当前条件“假设检验 / 进阶 / 1–3 分”，每项可移除，并提供“扩大分值范围”“清除筛选”。

### 中间主区域内容

首次使用标题“从题库选择题目，开始组卷”，下方三步为：1 选择课程与知识点；2 勾选题目加入试卷；3 预览并导出。主 CTA“浏览全部题目”，次 CTA“从模板开始”。无结果变体标题“没有找到匹配题目”，显示条件摘要与建议：“移除一个条件、扩大分值范围或查看全部题目”。不使用大型人物插画。

### 右侧区域内容

未命名试卷显示 0 题、0 分、0 分钟。空区域用细虚线勾勒未来的题型分组位置，说明“添加题目后，这里会自动计算结构与总分”。提供“先浏览题库”文本入口。

### 页面中的关键卡片 / 列表 / 图表 / 组件

- 三步首次组卷流程。
- 无结果条件摘要和恢复建议。
- 常用筛选、清除与扩大范围。
- 空试卷结构预览与禁用原因。
- 从模板开始、导入题库。
- 不使用图表。

### 页面中的关键状态信息

“首次组卷”“当前试卷还没有题目”“0 题 / 0 分 / 0 分钟”“没有找到匹配题目”“已应用 3 个条件”。

### 页面中的 CTA / 按钮

“浏览全部题目”“从模板开始”“导入题库”“清除全部筛选”“扩大分值范围”“查看全部题目”“先浏览题库”。

### 视觉风格重点

空状态有视觉中心但不空洞：使用编号流程、线性文档图标和清晰 CTA。首次使用强调方法，无结果强调调整条件；两者视觉语义不同。

### 文案语气

耐心、无责备、明确。示例：“当前条件没有匹配结果”“可以先减少一个条件，再逐步缩小范围”。

### 适合生成视觉稿的完整页面描述

设计 StatMind 组卷系统首次使用 / 无结果状态。三栏骨架保持完整：左栏展示常用筛选或当前无结果条件，中栏显示三步组卷引导或“没有找到匹配题目”与恢复建议，右栏显示未命名空试卷、0 题、0 分、0 分钟和未来结构的位置。提供浏览题库、模板、清除筛选和扩大范围等具体操作。

### 页面视觉稿生成 Prompt

```text
Create a high-fidelity first-use and no-results state for the StatMind statistics exam builder, aimed at university instructors. Preserve the three-column workspace. In the first-use version, the left rail opens only common filters; the center shows a compact three-step guide—choose chapter/topic, add questions, preview/export—with “浏览全部题目” and “从模板开始”; the right rail shows an unnamed empty paper with 0 questions, 0 points, 0 minutes and a subtle structural placeholder. Include a no-results variant with active filters “假设检验 / 进阶 / 1–3 分”, the message “没有找到匹配题目”, and actions to remove filters, expand score range, or view all questions. Style: helpful restrained academic education SaaS, white and pale gray, deep green primary, academic blue secondary, line icons, thin borders, minimal shadows, 8–12px radius. Avoid oversized empty illustrations, vague dead ends, marketing hero styling, gradients, glassmorphism, thick dashboards, excessive cards, and disabled controls without explanations.
```

---

## 5. R 学习页面

### 页面名称

StatMind R 语言学习 IDE

### 场景名称

默认状态：保存一组成绩并计算均值

### 场景目标

让初学者在同一屏内明确 Lesson Goal、观察 Example、编辑 Code，并知道 Output 与 Explanation 将出现在哪里，形成完整而不拥挤的学习 IDE。

### 页面布局结构

顶部 64px 课程栏；下方三栏：左侧 236px 课程目录，中间自适应 notebook 学习流，右侧 320px AI 助教与运行工具。中栏按 Goal → Example → Task → Code → Output → Explanation → Check 纵向组织；暗色编辑器高度约 280px，不占满页面。

### 顶部区域内容

左侧为“STATMIND · R LAB / R 语言编程工作室”；中间显示“第 1 课 · 对象与向量”“1 / 39 已完成”的细进度线；右侧为“R 4.3 · Ready”“已保存”“返回主界面”和语言切换。

### 左侧区域内容

课程按“01 R 编程基础、02 数据与图形、03 统计分析”分组。当前课“01 保存一组成绩并计算均值”使用浅绿背景、深绿左线和 `Current` 文字；已完成项为勾选，未开始项为空心圆。每课显示短目标，如 `c()`、`mean()`；底部为“1 / 39 课程完成”。

### 中间主区域内容

Lesson Goal：创建向量并计算平均值。Example 展示 `scores <- c(72, 81, 76, 90, 85)` 与五名学生成绩小表。Task 明确要求“将 scores 的均值保存为 average_score”。Code 区为深炭色 R 编辑器，预填注释和 `average_score <-`，有行号、运行当前单元和重置。Output 区为空时写“运行代码后，结果会显示在这里”。Explanation 解释赋值符 `<-`、向量 `c()` 和 `mean()`；Check 问“哪个对象保存了最终均值？”

### 右侧区域内容

上方 AI 助教显示本课目标、快捷按钮“解释 `<-`”“给我一个提示”“检查变量名”和输入框。下方为 `Console / Plot / Environment / 检查结果` 标签；默认 Console 显示“R 会话已就绪”，Environment 显示空对象提示，Plot 为“本课暂不需要图形”。

### 页面中的关键卡片 / 列表 / 图表 / 组件

- 39 课课程树与进度。
- Lesson Goal、Example、Task、Code、Output、Explanation、Check 区块。
- 五行成绩数据表。
- 暗色 R 编辑器与运行单元按钮。
- AI 助教快捷提示。
- Console、Environment、Plot、检查结果标签。

### 页面中的关键状态信息

“第 1 / 39 课”“R 4.3 · Ready”“代码已保存”“任务未完成”“尚无输出”“检查结果待运行”。

### 页面中的 CTA / 按钮

“运行代码”“检查答案”“重置本课”“给我一个提示”“解释 `<-`”“查看参考解法”“下一课”。

### 视觉风格重点

中栏 notebook 是视觉主角。编辑器使用深炭灰而非纯黑，语法色低饱和；左右栏较淡。Goal、Task、Explanation 通过细色条区分，不做一排同权卡片。文字尺寸达到可读水平，修复当前超小字体和巨大空白。

### 文案语气

像严谨助教：短句、具体、无炫技。示例：“先创建向量，再把计算结果保存到新对象”“需要提示时，我们只给下一步”。

### 适合生成视觉稿的完整页面描述

设计一张 1440×900 的 StatMind R 学习 IDE。左侧为 39 课课程目录并高亮“保存一组成绩并计算均值”；中间按 Goal、Example、Task、Code、Output、Explanation、Check 排列，包含五名学生成绩表和深色 R 编辑器，代码待补全 `average_score <-`；右侧是 AI 助教与 Console / Plot / Environment / 检查结果。顶部显示 R 4.3 Ready、1/39 和已保存。页面是教学 IDE，不是普通代码编辑器。

### 页面视觉稿生成 Prompt

```text
Create a high-fidelity 1440×900 desktop learning IDE for StatMind, aimed at university beginners learning statistics with R. Use a three-column layout: 236px course syllabus on the left, a wide center notebook, and a 320px AI Tutor/tools rail on the right. Highlight lesson “保存一组成绩并计算均值” as lesson 1 of 39. The center must follow this exact learning sequence: Lesson Goal, Example, Task, Code, Output, Explanation, Check. Include a five-row exam score table, a dark-charcoal R editor with line numbers and the incomplete code “average_score <-”, an empty output placeholder, explanations of c(), <-, and mean(), and one check question. The right rail includes AI Tutor and tabs Console, Plot, Environment, 检查结果; show R 4.3 Ready and Saved. Style: mature academic education SaaS, white/pale-gray surfaces, academic blue primary, learning green for success and run-ready states, dark muted editor, thin borders, few shadows, 8–12px radius, readable Chinese sans-serif and JetBrains Mono code. Avoid tiny text, giant unused space, full-screen editor, gradients, glassmorphism, heavy dashboards, neon syntax colors, card clutter, marketing layouts, and game-like badges.
```

---

### 页面名称

StatMind R 语言学习 IDE

### 场景名称

有数据 / 使用中状态：代码成功运行并获得解释

### 场景目标

让学习者把已运行代码、控制台输出、变量环境和系统解释关联起来，并明确本课是否通过。

### 页面布局结构

保持三栏。中栏自动滚动到 Code、Output 与 Explanation；右栏打开 Environment 或检查结果；左栏当前课仍稳定高亮，不因输出出现而跳动。

### 顶部区域内容

运行时显示“正在执行…”与停止按钮；完成后显示“0.6s 完成”“刚刚自动保存”。课程细进度从未完成更新为“1 / 39 已完成”，下一课入口可用。

### 左侧区域内容

当前课左侧由进行中圆点变为绿色勾选，并显示“已通过”。下一课“认识 RStudio 与可复现脚本”获得浅色“Next”标识。目录底部显示“本节 1 个任务已完成”。

### 中间主区域内容

编辑器显示完整代码：`scores <- c(72, 81, 76, 90, 85)`、`average_score <- mean(scores)`、`average_score`。Output 以等宽文本显示 `[1] 80.8`，旁边小型解释“R 用 [1] 标记这一行的第一个输出位置”。Explanation 说明平均值含义并展示计算式 `(72+81+76+90+85)/5 = 80.8`。Check 显示绿色细边“通过：对象 average_score 已存在且值正确”，不使用彩纸动画。

### 右侧区域内容

Environment 高亮，表格列出 `scores · num [1:5]` 和 `average_score · num 80.8`；Console 显示三条命令；AI 助教给出解释：“你先创建向量，再用 mean() 计算并保存结果。”检查结果显示“2/2 条件通过：对象名正确、数值正确”。

### 页面中的关键卡片 / 列表 / 图表 / 组件

- 完整 R 代码、运行状态与执行时长。
- Output `[1] 80.8`。
- Environment 对象表与 Console 历史。
- 算术展开解释。
- 两项自动检查与通过状态。
- 下一课导航。

### 页面中的关键状态信息

“0.6s 完成”“输出 80.8”“2/2 条件通过”“对象已创建”“刚刚自动保存”“本课已完成”。

### 页面中的 CTA / 按钮

“再次运行”“查看 Environment”“解释结果”“重置代码”“进入下一课”“保存到学习记录”。

### 视觉风格重点

成功反馈使用深绿细边、勾选和文字三重表达，不使用庆祝动画。数值输出用中等字号等宽字，不做大数字卡。Console 与编辑器保持暗色系，Environment 与 Explanation 使用浅色。

### 文案语气

客观、解释导向。示例：“结果是 80.8”“对象名和数值均符合任务要求”“现在可以继续下一课”。

### 适合生成视觉稿的完整页面描述

设计 StatMind R 学习 IDE 的成功运行状态。中栏深色编辑器包含 scores 向量、mean() 和 average_score，Output 显示 `[1] 80.8`，Explanation 展开平均值计算，Check 显示 2/2 条件通过；右栏 Environment 列出 scores 与 average_score，Console 显示执行命令；左栏本课变为已通过并提示下一课。反馈克制、清晰、可追溯。

### 页面视觉稿生成 Prompt

```text
Create a high-fidelity active-success state for the StatMind R learning IDE. Target users are beginner university statistics students. Preserve the three-column learning layout. In the center dark R editor show scores <- c(72, 81, 76, 90, 85), average_score <- mean(scores), and average_score. Below it show Output “[1] 80.8”, an explanation of the [1] marker, the arithmetic mean calculation, and a restrained success check “2/2 条件通过”. In the right Environment tab list scores as num [1:5] and average_score as num 80.8; show executed commands in Console and an AI explanation. The left syllabus marks lesson 1/39 complete and identifies the next lesson. Include “0.6s 完成” and autosaved status. Style: calm academic education SaaS, white/pale-gray surfaces, forest green success, academic blue explanation, dark charcoal editor, muted syntax colors, thin borders, minimal shadows, 8–12px radius. Avoid confetti, oversized result numbers, dashboard cards, neon code colors, gradients, glassmorphism, heavy animation, excessive whitespace, and gamification.
```

---

### 页面名称

StatMind R 语言学习 IDE

### 场景名称

空状态 / 首次使用与可恢复错误：启动 R 会话

### 场景目标

降低第一次使用 R 环境的陌生感；若用户将 `scores` 误写为 `score`，清楚说明原因并提供可执行修复，而不把页面变成报错屏。

### 页面布局结构

三栏骨架不变。首次进入时，中栏 Goal 与 Example 可读，Code 下显示环境启动提示；错误发生后，同一区域原位呈现 Error explanation 与 Fix checklist。右栏在 AI 助教、Console、Environment 之间联动。

### 顶部区域内容

首次使用显示“R 会话尚未启动”“需要初始化”，主按钮“启动 R 会话”，次按钮“运行示例”。错误变体显示“运行已停止 · Object not found”，并提供“再次运行”“打开帮助”。红色仅用于局部状态。

### 左侧区域内容

当前课标记“Getting started”，下方显示四步小清单：启动会话、运行示例、修改任务、检查答案。首次状态第 1 步高亮；错误状态第 3 步显示低饱和赭红圆点和“需要处理”。

### 中间主区域内容

首次状态编辑器预填 `scores <- c(72, 81, 76, 90, 85)` 与 `mean(scores)`，下方说明“代码将在独立 R 会话中运行”。错误变体将错误行 `mean(score)` 用柔和红棕背景高亮；Console 摘要 `Error: object 'score' not found`；Explanation 写“R 找不到名为 score 的对象，当前环境中存在 scores”；Fix checklist 为“检查拼写、先运行数据单元、在 Environment 中查看对象”，并提供“应用建议：改为 scores”。

### 右侧区域内容

AI 助教首次欢迎：“我可以带你完成第一次运行”，快捷项“什么是 R 对象”“如何运行代码”。错误时提示“你是否想使用环境中已有的 scores？”并提供“定位错误行”“解释这个错误”。Environment 首次为空，错误时显示可用对象 `scores`；Console 显示错误和发生时间。

### 页面中的关键卡片 / 列表 / 图表 / 组件

- 启动 R 会话提示与四步清单。
- 预填示例代码。
- 错误行局部高亮、Console 错误摘要。
- 问题—原因—下一步的解释结构。
- Fix checklist 与应用建议。
- Environment 可用对象列表。

### 页面中的关键状态信息

“R 会话尚未启动”“环境中暂无对象”“运行已停止”“Object not found”“发现可用对象 scores”“建议修复可用”。

### 页面中的 CTA / 按钮

“启动 R 会话”“运行示例”“应用建议”“再次运行”“定位错误行”“解释这个错误”“检查修复”。

### 视觉风格重点

首次引导用浅蓝 / 浅绿窄提示，不使用遮罩式引导。错误仅在错误行、边框和状态点使用低饱和红橙；主要修复按钮仍为深绿。始终传达可恢复和用户可控。

### 文案语气

耐心、无责备、具体。示例：“R 找不到这个对象”“当前环境中有一个名称接近的 scores”“检查后再次运行”。

### 适合生成视觉稿的完整页面描述

设计 StatMind R 学习 IDE 的首次启动与可恢复错误状态。左栏显示 Getting started 四步；中栏暗色编辑器预填示例，首次状态提示启动独立 R 会话，错误变体高亮 `mean(score)` 并说明环境中存在 `scores`；右栏 AI 助教、Console 和 Environment 给出一致的修复证据。页面只在局部使用低饱和红橙，主行动为启动会话或应用建议。

### 页面视觉稿生成 Prompt

```text
Create a high-fidelity first-use and recoverable-error state for the StatMind R learning IDE, aimed at beginner university students. Preserve the three-column layout. The left syllabus includes a four-step Getting Started checklist. In the center show a prefilled dark R editor and a calm “R 会话尚未启动” setup notice with “启动 R 会话”. Include an error variant where mean(score) is locally highlighted and the Console says “Error: object 'score' not found”; explain that the Environment contains scores, and show a fix checklist plus “应用建议：改为 scores”. The right rail includes AI Tutor, Console, and Environment with consistent evidence. Use muted red-orange only for the local error indicator and forest green for the repair action. Style: restrained academic educational software, white and pale-gray surfaces, deep green, academic blue, dark charcoal editor, thin borders, minimal shadows, 8–12px radius. Avoid full-screen red alerts, blameful copy, modal onboarding overlays, gradients, glassmorphism, dashboards, neon syntax, marketing styling, and dead-end error messages.
```

---

## 6. Python 学习页面

### 页面名称

StatMind Python 数据科学学习 IDE

### 场景名称

默认状态：筛选数据并按组汇总

### 场景目标

让学习者理解 pandas 数据筛选与 `groupby()` 的统计意图，并在同一页面完成示例、代码、输出预测和解释，而不是只面对普通编辑器。

### 页面布局结构

顶部 64px 课程栏；下方三栏：左侧 236px 课程目录，中间自适应 notebook 学习流，右侧 320px AI 助教与 Python 工具。中栏按 Lesson Goal → Dataset → Example → Task → Code → Output → Explanation → Check 排列；编辑器和输出采用上下结构，便于建立因果对应。

### 顶部区域内容

左侧为“STATMIND · PY LAB / Python 数据科学工作室”；中间为“第 6 课 · pandas 数据整理”“6 / 43 已完成”的细进度线；右侧显示“Python 3.12 · Ready”“内核已连接”“已保存”和返回入口。

### 左侧区域内容

课程分为“01 Python 基础、02 NumPy、03 pandas、04 可视化、05 统计建模”。当前课“筛选数据并汇总分组”以浅蓝绿背景、深蓝左线和 Current 文字高亮。已完成项为勾选，未开始为空心圆；每项副标题显示 `query()`、`groupby()`、`agg()` 等关键方法。

### 中间主区域内容

Lesson Goal：“筛选及格学生，并比较不同班级的平均成绩。”Dataset 显示 `scores.csv` 前 6 行，字段为 `student_id`、`class_name`、`score`、`passed`。Example 演示 `df[df['passed']]`。Task 要求使用 `groupby('class_name')['score'].mean()`。深炭色 Python 编辑器预填 import 和数据读取，保留两处可编辑空行。Output 为空时显示预计结果结构“班级索引 + mean_score 列”；Explanation 解释布尔筛选、分组和聚合的顺序；Check 要求先预测哪一班均值更高。

### 右侧区域内容

AI 助教显示快捷项“解释 groupby”“只给一个提示”“查看 DataFrame 形状”。工具标签为 `Console / Variables / Data / Plot / 检查结果`。默认 Data 标签显示 `scores.csv · 30 rows × 4 columns` 和字段类型；Variables 显示 `df · DataFrame`；Plot 提示“运行汇总代码后可生成比较图”。

### 页面中的关键卡片 / 列表 / 图表 / 组件

- 43 课课程树与进度。
- Goal、Dataset、Example、Task、Code、Output、Explanation、Check。
- 6 行 pandas 数据预览表。
- 暗色 Python 编辑器、单元运行与内核状态。
- Data / Variables / Console / Plot 标签。
- 输出结构预览与预测题。

### 页面中的关键状态信息

“第 6 / 43 课”“Python 3.12 · Ready”“内核已连接”“30 rows × 4 columns”“任务未完成”“尚无输出”“代码已保存”。

### 页面中的 CTA / 按钮

“运行单元”“运行全部”“检查答案”“解释 groupby”“只给一个提示”“查看数据”“重置本课”。

### 视觉风格重点

Python 页与 R 页共享学习 IDE 架构，但用学术蓝作为次强调并增加 Data / Variables 工具。代码编辑器深炭灰、语法色低饱和；DataFrame 表格紧凑但可读。拒绝把页面做成通用 VS Code 克隆。

### 文案语气

先讲数据问题，再讲 API。示例：“先筛选需要比较的记录，再按班级汇总”“观察每一步如何改变 DataFrame”。

### 适合生成视觉稿的完整页面描述

设计一张 1440×900 的 StatMind Python 学习 IDE。左侧是 43 课目录并高亮“筛选数据并汇总分组”；中间按 Goal、Dataset、Example、Task、Code、Output、Explanation、Check 排列，展示 30×4 的 scores.csv、六行数据预览和深色 pandas 编辑器；右侧为 AI 助教及 Console、Variables、Data、Plot、检查结果。顶部显示 Python 3.12 Ready、内核已连接和 6/43。

### 页面视觉稿生成 Prompt

```text
Create a high-fidelity 1440×900 desktop learning IDE for StatMind, aimed at university students learning statistics with Python and pandas. Use a three-column layout: 236px course syllabus, wide center notebook, 320px AI Tutor and tools rail. Highlight lesson 6/43 “筛选数据并汇总分组”. The center must follow Lesson Goal, Dataset, Example, Task, Code, Output, Explanation, Check. Show scores.csv with 30 rows and four columns—student_id, class_name, score, passed—a six-row data preview, a boolean-filter example, and a dark Python editor with an incomplete groupby('class_name')['score'].mean() task. The right rail has tabs Console, Variables, Data, Plot, 检查结果 and shows Python 3.12 Ready, kernel connected, df DataFrame. Style: modern restrained academic education SaaS, white/pale-gray surfaces, academic blue primary, learning green reserved for successful runs, dark charcoal editor, low-saturation syntax, thin borders, few shadows, 8–12px radius, readable sans-serif and JetBrains Mono. Avoid a generic VS Code clone, full-screen editor, tiny text, giant unused space, gradients, glassmorphism, heavy dashboards, neon syntax colors, marketing styling, and card clutter.
```

---

### 页面名称

StatMind Python 数据科学学习 IDE

### 场景名称

有数据 / 使用中状态：生成分组结果与比较图

### 场景目标

让学习者把代码、DataFrame 输出、图表和统计解释联系起来，并能验证结果是否满足任务要求。

### 页面布局结构

保持三栏。中栏聚焦 Code、Output、Plot、Explanation；右栏默认打开 Variables 或 Plot；左栏显示本课任务进行中或完成。

### 顶部区域内容

运行时显示“正在执行单元 3/4”；完成后为“1.2s 完成”“内核空闲”“刚刚自动保存”。主按钮由“运行全部”切换为“再次运行”，可提供“停止”但不使用大型 Loading。

### 左侧区域内容

当前课显示“代码已运行 · 检查待完成”；完成检查后变为绿色勾选。其下列出本课两个任务：筛选通过、分组汇总，前者完成，后者当前。

### 中间主区域内容

代码完整显示：筛选 `passed_df = df[df['passed']]`，再 `summary = passed_df.groupby('class_name', as_index=False)['score'].mean()` 并重命名为 `mean_score`。Output 渲染三行表：A 班 82.4、B 班 78.9、C 班 85.1。Plot 为水平条形图，C 班最高；条形使用深绿，当前 Hover 的 C 班使用学术蓝轮廓并显示精确值 85.1。Explanation 说明“图表来自同一 summary 表，C 班均值最高，但样本量仍需同时检查”。Check 显示“数据筛选正确、分组字段正确、输出列正确”。

### 右侧区域内容

Variables 表显示 `df 30×4`、`passed_df 24×4`、`summary 3×2`；Data 标签可切换查看三个表；Plot 标签显示图表缩略图与“打开大图”；Console 显示执行时间和无警告状态；AI 助教提供“解释为什么要 as_index=False”。

### 页面中的关键卡片 / 列表 / 图表 / 组件

- 完整 pandas 代码与运行时状态。
- 三行 summary DataFrame 输出。
- 班级平均成绩水平条形图与 Hover 精确值。
- Variables 形状变化证据链。
- 三项自动检查。
- AI 对统计限制的解释。

### 页面中的关键状态信息

“1.2s 完成”“24 条记录通过筛选”“summary 3×2”“C 班 85.1”“3/3 条件通过”“内核空闲”“刚刚自动保存”。

### 页面中的 CTA / 按钮

“再次运行”“打开大图”“查看 summary”“解释结果”“检查答案”“进入下一课”“保存图表”。

### 视觉风格重点

Output 表与 Plot 上下相邻，避免结果散落。条形图具有轴标签、零基线、数值和文字摘要，不能只靠颜色。结果数字保持中等字号，避免 BI 大屏感。

### 文案语气

准确、提醒统计边界。示例：“C 班的样本均值最高”“比较均值前，也要查看各组样本量与分布”。

### 适合生成视觉稿的完整页面描述

设计 StatMind Python IDE 的成功运行状态。中间深色编辑器展示 pandas 筛选与 groupby 代码，下面输出 A 82.4、B 78.9、C 85.1 的 summary 表及水平条形图；Explanation 提醒检查样本量；右栏 Variables 显示 df 30×4、passed_df 24×4、summary 3×2，检查结果为 3/3 通过。左栏任务状态更新但布局稳定。

### 页面视觉稿生成 Prompt

```text
Create a high-fidelity active-success state for the StatMind Python learning IDE, targeting university statistics students. Preserve the three-column learning layout. In the center dark editor show pandas filtering into passed_df and groupby aggregation into summary. Below it render a three-row DataFrame result: A 82.4, B 78.9, C 85.1, followed by an accessible horizontal bar chart where C is highest and a hovered C bar shows 85.1 with an academic-blue outline. Add an explanation that group sample sizes and distributions should also be checked, and a restrained “3/3 条件通过” state. In the right Variables tab show df 30×4, passed_df 24×4, summary 3×2; include Data, Plot, Console and AI Tutor tabs. Show “1.2s 完成”, kernel idle, and autosaved. Style: academic educational SaaS, white/pale-gray surfaces, forest green bars, academic blue hover, dark editor, thin borders, minimal shadows, 8–12px radius. Avoid BI-dashboard composition, oversized KPI numbers, color-only chart meaning, confetti, gradients, glassmorphism, neon syntax, decorative charts, and marketing visuals.
```

---

### 页面名称

StatMind Python 数据科学学习 IDE

### 场景名称

空状态 / 首次使用与错误恢复：连接内核并修复缺失列

### 场景目标

帮助首次使用者理解 Python 内核、数据文件和运行单元；若代码引用不存在的 `class` 列，系统应指出可用字段并提供可验证修复。

### 页面布局结构

保持三栏学习 IDE。首次状态在 Dataset 与 Code 之间出现轻量环境引导；错误状态在 Output 原位显示错误、字段证据与 Fix checklist，不跳转到单独错误页。

### 顶部区域内容

首次状态显示“Python 内核未连接”“需要初始化”，主按钮“连接 Python 内核”，次按钮“载入示例数据”。错误变体显示“单元执行停止 · KeyError”，右侧为“再次运行”“查看数据列”。

### 左侧区域内容

当前课显示 Getting started，小清单为：连接内核、载入 `scores.csv`、运行示例、完成任务。首次第 1 步高亮；错误时“完成任务”显示“需要处理”。课程目录仍可浏览，不被遮罩锁死。

### 中间主区域内容

首次状态显示数据权限说明：“示例数据仅在当前学习会话中处理”，并预填 `import pandas as pd`、`df = pd.read_csv('scores.csv')`。错误变体高亮 `df.groupby('class')['score'].mean()`；Output 显示 `KeyError: 'class'`；Explanation 写“数据中没有 class 列，可用字段包括 student_id、class_name、score、passed”；Fix checklist 为“查看列名、使用 class_name、再次运行”，主修复为“应用建议：class → class_name”。

### 右侧区域内容

AI 助教首次提供“什么是内核”“如何运行单元”；错误时提示“你要找的分组字段可能是 class_name”。Data 标签显示四个列名并高亮 `class_name`；Variables 显示 `df` 已加载；Console 显示 KeyError 和发生时间；检查结果显示“1 个问题待解决”。

### 页面中的关键卡片 / 列表 / 图表 / 组件

- 内核连接与示例数据引导。
- Getting started 四步。
- KeyError 错误行局部高亮。
- 可用列名证据列表。
- 问题—原因—修复 checklist。
- 应用建议、再次运行和查看数据。

### 页面中的关键状态信息

“内核未连接”“scores.csv 尚未载入”“KeyError: 'class'”“发现字段 class_name”“1 个问题待解决”“建议修复可用”。

### 页面中的 CTA / 按钮

“连接 Python 内核”“载入示例数据”“运行示例”“应用建议”“再次运行”“查看数据列”“解释 KeyError”。

### 视觉风格重点

首次引导不遮盖 IDE。错误使用低饱和红橙局部强调，Data 标签用蓝色轮廓突出正确字段，深绿按钮执行修复。错误解释必须包含来自真实数据表的证据。

### 文案语气

耐心、事实导向、无责备。示例：“当前数据中没有 class 列”“可以使用已存在的 class_name”“应用后再次运行以验证”。

### 适合生成视觉稿的完整页面描述

设计 StatMind Python IDE 的首次连接与可恢复 KeyError 状态。左栏显示四步 Getting started；中栏首次提示连接内核和载入 scores.csv，错误变体高亮 `groupby('class')` 并显示 `KeyError: 'class'`，列出真实可用字段并建议改为 `class_name`；右栏 Data、Variables、Console 与 AI 助教提供一致证据。页面保持可操作，修复动作清晰。

### 页面视觉稿生成 Prompt

```text
Create a high-fidelity first-use and recoverable-error state for the StatMind Python learning IDE, aimed at beginner university students. Preserve the three-column learning architecture. The left syllabus contains a four-step Getting Started checklist. In the center include a calm “Python 内核未连接” setup notice, buttons to connect the kernel and load scores.csv, and prefilled pandas import code. Include an error variant where df.groupby('class')['score'].mean() is locally highlighted and Output says “KeyError: 'class'”. Show evidence that the available columns are student_id, class_name, score, passed, and provide a fix checklist plus “应用建议：class → class_name”. The right rail includes AI Tutor, Data, Variables, Console, and 检查结果; highlight class_name in the Data tab. Style: restrained academic education SaaS, white/pale-gray surfaces, forest green repair action, academic blue data evidence, muted red-orange local error, dark charcoal editor, thin borders, minimal shadows, 8–12px radius. Avoid full-screen alerts, blameful copy, modal onboarding, gradients, glassmorphism, heavy dashboards, neon code colors, marketing poster layout, and dead-end errors without a verified next step.
```

---

## 视觉稿生成与评审顺序

1. 先生成首页默认状态，确认品牌、字体、色彩、2×2 四卡层级。
2. 再生成教材默认状态，确认三栏阅读网格与正文尺度。
3. 生成置信区间使用中状态，确认科研工作台与图表语法。
4. 生成组卷使用中状态，确认高密度教师工作流。
5. 分别生成 R、Python 默认与成功状态，确认共享 IDE 架构及语言差异。
6. 最后生成所有首次 / 错误状态，统一引导、禁用原因和可恢复反馈。

每张视觉稿评审时同时检查：四级文字层级、44px 点击区域、键盘焦点、状态是否只靠颜色、空状态是否给出下一步、图表是否有轴 / 图例 / 文字摘要，以及是否误用了渐变、玻璃、厚重阴影或 Dashboard 式指标卡。

---
