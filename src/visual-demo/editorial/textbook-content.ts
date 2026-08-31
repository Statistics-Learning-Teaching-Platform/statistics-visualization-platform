export type TextbookDemoChapterNumber = string;

export interface TextbookReadingSection {
  slug: string;
  number: string;
  kicker: string;
  title: string;
  paragraphs: string[];
  callout?: {
    label: string;
    title: string;
    body: string;
  };
  equation?: {
    label: string;
    left: string;
    operator: string;
    right: string;
    note: string;
  };
  figure?: "sampling" | "difference";
}

export interface TextbookExercise {
  number: string;
  question: string;
  hint: string;
  answer: string;
}

export interface TextbookResource {
  type: "experiment" | "r" | "python" | "questions";
  title: string;
  detail: string;
  href: string;
}

export interface TextbookDemoChapter {
  number: TextbookDemoChapterNumber;
  title: string;
  subtitleLines: [string, string];
  lead: string;
  meta: string[];
  objectives: string[];
  sections: TextbookReadingSection[];
  lab: {
    title: string;
    question: string;
    explanation: string;
    center: number;
    sigma: number;
    axisMin: number;
    axisMax: number;
    axisLabel: string;
    valueLabel: string;
  };
  resources: TextbookResource[];
  exercises: TextbookExercise[];
}

export const textbookDemoChapters: Record<string, TextbookDemoChapter> = {
  "06": {
    number: "06",
    title: "样本的统计推断",
    subtitleLines: ["从一个样本出发，", "理解未知总体参数的不确定性。"],
    lead: "我们通常只能看到总体的一小部分。统计推断要做的，不是把样本当成确定答案，而是说明这个答案可能波动多少，以及结论能够可靠到什么程度。",
    meta: ["预计阅读 24 分钟", "1 个交互实验", "4 道检查题"],
    objectives: [
      "区分点估计、标准误与区间估计所回答的问题。",
      "用抽样分布解释样本量为什么会改变估计精度。",
      "用重复抽样的语言准确解释 95% 置信水平。",
    ],
    sections: [
      {
        slug: "sample-to-population",
        number: "01",
        kicker: "From sample to population",
        title: "一个样本，如何承担总体判断？",
        paragraphs: [
          "统计问题常常从一个看似简单的数字开始：一组学生的平均成绩、一项调查的支持比例，或一次实验的平均响应时间。这个数字描述了样本，却不自动等于总体。",
          "推断的第一步，是把观察到的统计量视为一次可能结果。我们关心的不只是它离真实参数有多近，还关心换一批样本时，它会怎样变化。",
        ],
        callout: {
          label: "关键思想",
          title: "估计值不是终点，而是推断的起点",
          body: "一个没有不确定性说明的样本均值，只告诉我们这一次看见了什么；标准误与区间才告诉我们这份证据有多稳定。",
        },
      },
      {
        slug: "sampling-variation",
        number: "02",
        kicker: "Sampling variation",
        title: "统计量不是一个固定答案",
        paragraphs: [
          "从同一总体重复抽取等量样本，每次都会得到稍有不同的样本均值。把这些可能的均值排列起来，就得到样本均值的抽样分布。",
          "抽样分布的中心仍然靠近总体均值，但它的宽窄由样本量决定。样本越大，极端结果越少，估计也越稳定。",
        ],
        figure: "sampling",
      },
      {
        slug: "standard-error",
        number: "03",
        kicker: "Standard error",
        title: "标准误：把波动变成可比较的尺度",
        paragraphs: [
          "标准误是统计量抽样分布的标准差。它把“样本结果会变”这件事压缩成一个数，因此可以比较不同样本量、不同测量条件下的估计精度。",
          "当观测彼此独立时，样本量增加会让分母中的平方根变大。精度因此改善，但不是线性改善：想把标准误减半，通常需要约四倍样本。",
        ],
        equation: {
          label: "样本均值标准误公式",
          left: "SE( x̄ )",
          operator: "=",
          right: "s / √n",
          note: "实际分析中通常用样本标准差 s 估计总体标准差",
        },
      },
      {
        slug: "building-an-interval",
        number: "04",
        kicker: "Interval construction",
        title: "从一个点，展开为一段有依据的范围",
        paragraphs: [
          "区间估计以点估计为中心，再向两侧加入由临界值和标准误共同决定的误差界。临界值表达希望达到的置信水平，标准误表达当前数据的精度。",
          "更高的置信水平意味着更保守的范围；更大的样本量意味着更精确的范围。区间宽度因此同时反映我们要求多稳妥，以及手中的证据有多充分。",
        ],
        callout: {
          label: "构造原则",
          title: "估计值 ± 临界值 × 标准误",
          body: "区间不是凭经验画出的上下界。中心、尺度和置信要求各自承担不同角色，缺少任何一个都无法解释区间。",
        },
      },
      {
        slug: "confidence-meaning",
        number: "05",
        kicker: "Correct interpretation",
        title: "95% 说的是方法，而不是参数会移动",
        paragraphs: [
          "如果重复抽取许多同样大小的样本，并用相同方法构造 95% 置信区间，那么长期来看，约 95% 的区间会覆盖真实参数。",
          "参数在抽样之前和之后都保持不变；改变的是由不同样本构造出的区间。因此，完成计算后更准确的表达是“这套方法具有 95% 的长期覆盖率”。",
        ],
        callout: {
          label: "避免误读",
          title: "不是“参数有 95% 概率落在这个区间里”",
          body: "经典置信区间中的参数是固定未知量。95% 描述构造区间的方法在重复抽样中的表现。",
        },
      },
    ],
    lab: {
      title: "改变样本量，观察区间如何收窄",
      question: "在置信水平不变时，样本量如何改变估计精度？",
      explanation: "选择不同样本量。图中的中心保持不变，标准误和误差界会随 n 增大而下降。",
      center: 10,
      sigma: 2,
      axisMin: 8,
      axisMax: 12,
      axisLabel: "总体均值尺度",
      valueLabel: "估计中心",
    },
    resources: [
      {
        type: "experiment",
        title: "置信区间模拟",
        detail: "重复抽样并观察长期覆盖率",
        href: "/visual-demo/experiment",
      },
      {
        type: "r",
        title: "R 编程复现",
        detail: "用 qt() 与标准误构造区间",
        href: "/visual-demo/r",
      },
      {
        type: "python",
        title: "Python 编程复现",
        detail: "用 scipy.stats 计算临界值",
        href: "/visual-demo/python",
      },
    ],
    exercises: [
      {
        number: "01",
        question: "样本量从 25 增加到 100，标准误大约变为原来的多少？",
        hint: "比较 √25 与 √100。",
        answer: "变为原来的 1/2。样本量扩大 4 倍，标准误缩小为 1/√4。",
      },
      {
        number: "02",
        question: "把置信水平从 95% 提高到 99%，区间通常会怎样变化？",
        hint: "更高覆盖要求需要更大的临界值。",
        answer: "区间会变宽。更大的临界值增加误差界，以换取更高的长期覆盖率。",
      },
      {
        number: "03",
        question: "为什么不能说“总体均值有 95% 概率在已计算的区间内”？",
        hint: "区分固定参数与随机区间。",
        answer: "经典框架下参数固定、区间随样本改变。95% 描述方法在重复抽样中的覆盖表现。",
      },
      {
        number: "04",
        question: "区间很窄，是否一定说明研究结论可信？",
        hint: "精度与研究设计质量不是同一个概念。",
        answer: "不一定。窄区间只说明随机误差较小，系统偏差、测量质量和抽样代表性仍需单独判断。",
      },
    ],
  },
  "07": {
    number: "07",
    title: "总体均值的比较",
    subtitleLines: ["从观察到的差异出发，", "判断两个总体是否真的不同。"],
    lead: "两组样本均值几乎总会不同。真正需要回答的是：这份差异是否大到难以仅由抽样波动解释，以及它在实际问题中是否足够重要。",
    meta: ["预计阅读 22 分钟", "1 个交互实验", "4 道检查题"],
    objectives: [
      "区分独立样本与配对样本的研究结构。",
      "用差值的标准误描述两组均值比较的不确定性。",
      "同时报告区间、效应大小与问题情境。",
    ],
    sections: [
      {
        slug: "observed-difference",
        number: "01",
        kicker: "Observed difference",
        title: "看见差异，不等于证明总体不同",
        paragraphs: [
          "即使两个总体均值完全相同，从两组独立样本算出的均值也很少恰好一致。观察差异包含可能的总体差异，也包含两组各自的抽样波动。",
          "比较问题因此不是问“样本均值是否相等”，而是问“观察到的差异相对于它本来会有的波动，究竟有多大”。",
        ],
        callout: {
          label: "核心问题",
          title: "差异需要一个不确定性尺度",
          body: "只有把均值差与它的标准误放在一起，才能判断结果是常见波动，还是值得进一步解释的证据。",
        },
      },
      {
        slug: "difference-distribution",
        number: "02",
        kicker: "Difference distribution",
        title: "把两组波动合并到同一条差值尺度",
        paragraphs: [
          "独立样本均值差的抽样分布，以总体均值差为中心。两组数据都会贡献不确定性，因此差值的方差由两部分共同构成。",
          "当任一组样本较小或离散程度较大时，差值分布都会更宽。只增加另一组的样本，无法完全消除这部分不确定性。",
        ],
        figure: "difference",
      },
      {
        slug: "difference-standard-error",
        number: "03",
        kicker: "Combined uncertainty",
        title: "差值的标准误来自两组证据",
        paragraphs: [
          "两组相互独立时，各自均值的方差可以相加。平方根把合并后的方差重新带回原始测量单位，形成均值差的标准误。",
          "公式也揭示了设计策略：若资源有限，把新增样本优先分配给变异更大或样本更少的一组，通常更能改善比较精度。",
        ],
        equation: {
          label: "独立样本均值差标准误公式",
          left: "SE( x̄₁ − x̄₂ )",
          operator: "=",
          right: "√( s₁²/n₁ + s₂²/n₂ )",
          note: "独立样本、允许两组方差与样本量不同",
        },
      },
      {
        slug: "paired-or-independent",
        number: "04",
        kicker: "Study structure",
        title: "先判断研究结构，再选择计算方法",
        paragraphs: [
          "若两组来自不同个体，通常按独立样本处理；若同一对象前后测量，或个体之间有明确匹配关系，则应先形成每一对的差值。",
          "配对设计利用个体内部的可比性，常能减少无关差异。但错误地把配对数据当成独立数据，会丢失结构信息并扭曲标准误。",
        ],
        callout: {
          label: "判断线索",
          title: "问清楚“每个观测和谁对应”",
          body: "统计方法由数据如何产生决定。变量名称相同，并不意味着两组观测相互独立。",
        },
      },
      {
        slug: "effect-and-evidence",
        number: "05",
        kicker: "Effect and evidence",
        title: "统计显著之外，还要解释差异有多大",
        paragraphs: [
          "大样本可以让很小的差异达到统计显著，但这不自动意味着差异具有教学、医学或业务价值。均值差的点估计与置信区间保留了原始单位，更适合解释实际意义。",
          "完整报告应同时说明研究结构、两组描述统计量、均值差及其区间，并把结论限定在抽样设计与测量质量允许的范围内。",
        ],
        callout: {
          label: "报告原则",
          title: "先给效应，再谈证据强度",
          body: "“差多少”与“证据有多稳定”是两个问题。均值差回答前者，标准误、区间与检验回答后者。",
        },
      },
    ],
    lab: {
      title: "增加每组样本量，观察差值区间",
      question: "相同的均值差，在不同样本量下会得到怎样的证据强度？",
      explanation:
        "中心代表观察到的两组均值差。样本量增加时，区间围绕同一中心收窄，更容易排除零差异。",
      center: 2.4,
      sigma: 3.2,
      axisMin: -2,
      axisMax: 7,
      axisLabel: "总体均值差尺度",
      valueLabel: "观察差值",
    },
    resources: [
      {
        type: "experiment",
        title: "两总体均值模拟",
        detail: "观察效应大小与抽样波动",
        href: "/visual-demo/experiment",
      },
      {
        type: "r",
        title: "R 编程复现",
        detail: "用 t.test() 比较独立样本",
        href: "/visual-demo/r",
      },
      {
        type: "python",
        title: "Python 编程复现",
        detail: "用 scipy 比较两组均值",
        href: "/visual-demo/python",
      },
    ],
    exercises: [
      {
        number: "01",
        question: "两组样本均值不相等，为什么仍不能直接断言总体均值不同？",
        hint: "样本统计量本身会波动。",
        answer:
          "即使总体均值相同，随机抽样也会产生样本均值差。必须用差值的标准误衡量这份差异是否超出常见波动。",
      },
      {
        number: "02",
        question: "同一批学生培训前后的成绩，应使用独立样本还是配对方法？",
        hint: "每名学生的前测和后测能够一一对应。",
        answer: "使用配对方法。先计算每名学生的前后差值，再对差值进行单样本推断。",
      },
      {
        number: "03",
        question: "均值差的 95% 置信区间包含 0，最谨慎的结论是什么？",
        hint: "区间保留了哪些与数据相容的总体差异？",
        answer: "数据仍与零差异相容；现有样本不足以排除总体均值相同，但这不等于证明两者完全相同。",
      },
      {
        number: "04",
        question: "为什么统计显著的结果还需要报告实际效应大小？",
        hint: "显著性会随样本量变化。",
        answer:
          "显著性主要反映效应相对于标准误的大小。效应量与区间才能说明差异在原始情境中是否重要。",
      },
    ],
  },
};
