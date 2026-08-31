export type KnowledgeNodeVariant =
	| "root"
	| "concept"
	| "method"
	| "formula"
	| "note";

export type KnowledgeRelation =
	| "contains"
	| "leadsTo"
	| "dependsOn"
	| "compare"
	| "transform"
	| "infer";

export interface ConceptExplanation {
	summary: string;
	paragraphs?: string[];
	keyPoints?: string[];
	example?: string;
	formula?: string;
	intuition?: string;
}

export interface KnowledgeNode {
	id: string;
	label: string;
	englishLabel?: string;
	description?: string;
	level: 0 | 1 | 2 | 3;
	variant?: KnowledgeNodeVariant;
	children?: string[];
	explanation?: ConceptExplanation;
	/** Existing topic id, used to attach the chapter's real resources. */
	topicId?: string;
}

export interface KnowledgeEdge {
	id: string;
	source: string;
	target: string;
	relation?: KnowledgeRelation;
	label?: string;
}

export interface ChapterKnowledgeMap {
	chapter: string;
	title: string;
	subtitle: string;
	nodes: KnowledgeNode[];
	edges: KnowledgeEdge[];
}

type NodeSeed = Omit<KnowledgeNode, "level" | "children"> & {
	children?: NodeSeed[];
	edgeRelation?: KnowledgeRelation;
	edgeLabel?: string;
};

type ChapterSeed = Omit<ChapterKnowledgeMap, "nodes" | "edges"> & {
	root: NodeSeed;
	extraEdges?: KnowledgeEdge[];
};

const node = (
	id: string,
	label: string,
	options: Omit<NodeSeed, "id" | "label"> = {},
): NodeSeed => ({ id, label, variant: "concept", ...options });

function buildChapterMap(seed: ChapterSeed): ChapterKnowledgeMap {
	const nodes: KnowledgeNode[] = [];
	const edges: KnowledgeEdge[] = [];

	const walk = (current: NodeSeed, level: 0 | 1 | 2 | 3, parent?: NodeSeed, inheritedTopicId?: string) => {
		const { children, edgeRelation, edgeLabel, ...nodeData } = current;
		const resolvedTopicId = nodeData.topicId ?? inheritedTopicId ?? parent?.topicId;
		nodes.push({
			...nodeData,
			children: children?.map((child) => child.id),
			topicId: resolvedTopicId,
			level,
		});
		if (parent) {
			edges.push({
				id: `${parent.id}-${current.id}`,
				source: parent.id,
				target: current.id,
				relation: edgeRelation ?? "contains",
				label: edgeLabel,
			});
		}
		for (const child of children ?? []) {
			walk(child, Math.min(3, level + 1) as 0 | 1 | 2 | 3, current, resolvedTopicId);
		}
	};

	walk(seed.root, 0);
	return {
		chapter: seed.chapter,
		title: seed.title,
		subtitle: seed.subtitle,
		nodes,
		edges: [...edges, ...(seed.extraEdges ?? [])],
	};
}

const chapterSeeds: Record<string, ChapterSeed> = {
	"00": {
		chapter: "00",
		title: "什么是统计学",
		subtitle: "从问题、数据与证据开始建立统计语言。",
		root: node("root", "什么是统计学", {
			variant: "root",
			englishLabel: "What is statistics?",
			description: "区分总体、样本、参数、统计量以及描述与推断。",
			children: [
				node("statistics-foundations", "统计问题", {
					topicId: "statistics-foundations",
					description: "先说明研究对象与希望形成的判断。",
					children: [
						node("00-question", "研究对象", { variant: "concept" }),
						node("00-evidence", "证据边界", { variant: "note" }),
					],
				}),
				node("00-population-sample", "总体与样本", {
					topicId: "statistics-foundations",
					description: "总体是目标对象，样本是实际观察到的一部分。",
					children: [
						node("00-population", "总体", { variant: "concept" }),
						node("00-sample", "样本", { variant: "concept" }),
						node("00-sampling", "抽样", {
							variant: "method",
							englishLabel: "Sampling",
							explanation: {
								summary: "从总体中按照一定方法选择一部分观测单位形成样本的过程。",
								paragraphs: [
									"现实研究中，我们往往无法观察整个总体，因此需要从总体中选择部分个体进行研究。",
									"抽样的目标不是简单取得数据，而是获得能够代表总体的样本。",
								],
								keyPoints: ["样本来自总体", "抽样方法会影响代表性", "代表性会影响统计推断可靠性"],
								example: "如果希望研究某大学全部学生的平均睡眠时间，可以随机抽取 500 名学生进行调查。",
							},
						}),
						node("00-sample-data", "样本数据", { variant: "concept" }),
						node("00-representative", "代表性", { variant: "note" }),
					],
				}),
				node("data-and-variables", "数据与变量", {
					topicId: "data-and-variables",
					description: "识别观测单位、变量类型与数据结构。",
					children: [
						node("00-unit", "观测单位"),
						node("00-variable", "变量"),
						node("00-categorical", "分类变量", { variant: "method" }),
						node("00-numeric", "数值变量", { variant: "method" }),
					],
				}),
				node("00-parameter-statistic", "参数与统计量", {
					topicId: "statistics-foundations",
					description: "参数描述总体，统计量来自样本。",
					children: [
						node("00-parameter", "参数 Parameter", { variant: "concept" }),
						node("00-statistic", "统计量 Statistic", {
							variant: "concept",
							edgeRelation: "infer",
						}),
						node("00-compute-statistic", "计算统计量", { variant: "method" }),
					],
				}),
				node("00-description-inference", "描述与推断", {
					topicId: "statistics-foundations",
					description: "先描述数据中的模式，再从样本证据形成有边界的判断。",
					children: [
						node("00-descriptive", "描述统计", {
							description: "用图形与数值摘要压缩数据中的模式。",
							children: [
								node("00-graphics", "图形", { variant: "method" }),
								node("00-summary", "数值摘要", { variant: "method" }),
							],
						}),
						node("00-inference", "统计推断", {
							description: "从样本证据出发，对总体形成有边界的判断。",
							children: [
								node("00-estimation", "估计", { variant: "method" }),
								node("00-hypothesis", "假设检验", { variant: "method" }),
								node("00-uncertainty", "不确定性", { variant: "note" }),
								node("00-infer-population", "推断总体", { variant: "method" }),
							],
						}),
					],
				}),
			],
		}),
		extraEdges: [
			{ id: "00-question-population", source: "statistics-foundations", target: "00-population-sample", relation: "leadsTo" },
			{ id: "00-sample-data", source: "00-sample", target: "data-and-variables", relation: "leadsTo" },
			{ id: "00-data-statistic", source: "data-and-variables", target: "00-statistic", relation: "leadsTo" },
			{ id: "00-statistic-parameter", source: "00-statistic", target: "00-parameter", relation: "infer", label: "infer" },
			{ id: "00-estimate-infer", source: "00-estimation", target: "00-infer-population", relation: "infer" },
		],
	},
	"01": {
		chapter: "01",
		title: "抽样调查",
		subtitle: "抽样设计决定我们能够对总体说多少。",
		root: node("root", "抽样调查", {
			variant: "root",
			englishLabel: "Sampling survey",
			description: "从总体、抽样框和抽样方法理解代表性。",
			children: [
				node("01-population", "总体", {
					topicId: "sampling-methods",
					children: [node("01-target", "目标总体"), node("01-study", "研究对象")],
				}),
				node("01-frame", "抽样框", {
					topicId: "sampling-methods",
					children: [node("01-coverage", "覆盖范围"), node("01-list", "抽样名单")],
				}),
				node("sampling-methods", "抽样方法", {
					topicId: "sampling-methods",
					children: [
						node("01-probability", "概率抽样", {
							variant: "method",
							children: [
								node("01-simple", "简单随机抽样"),
								node("01-systematic", "系统抽样"),
								node("01-stratified", "分层抽样"),
								node("01-cluster", "整群抽样"),
							],
						}),
							node("01-nonprobability", "非概率抽样", {
								variant: "method",
								children: [node("01-convenience", "便利抽样"), node("01-voluntary", "自愿响应")],
							}),
							node("01-draw-sample", "抽取样本", {
								variant: "method",
								children: [
									node("01-sample-data", "样本数据"),
									node("01-infer-population", "推断总体", { variant: "method" }),
								],
							}),
						],
				}),
				node("01-error", "抽样误差", { topicId: "sampling-methods", variant: "note", children: [node("01-variation", "随机波动")] }),
				node("01-bias", "抽样偏差", { topicId: "sampling-methods", variant: "note", children: [node("01-undercoverage", "漏覆盖") ] }),
				node("01-representative", "代表性", {
					topicId: "sampling-methods",
					children: [node("01-reliability", "推断可靠性", { variant: "note" })],
				}),
				node("01-note", "随机 ≠ 随便", {
					variant: "note",
					topicId: "sampling-methods",
					description: "随机抽样不是随意挑选，而是让抽取机制可解释、可复现。",
					edgeRelation: "dependsOn",
				}),
			],
		}),
		extraEdges: [
			{ id: "01-population-frame", source: "01-population", target: "01-frame", relation: "leadsTo" },
			{ id: "01-frame-methods", source: "01-frame", target: "sampling-methods", relation: "leadsTo" },
			{ id: "01-sample-infer", source: "01-sample-data", target: "01-infer-population", relation: "infer" },
			{ id: "01-design-representative", source: "sampling-methods", target: "01-representative", relation: "leadsTo" },
			{ id: "01-bias-representative", source: "01-bias", target: "01-representative", relation: "dependsOn" },
		],
	},
	"02": {
		chapter: "02",
		title: "数据的图形化描述",
		subtitle: "让图形帮助我们发现分布、异常与比较关系。",
		root: node("root", "数据的图形化描述", {
			variant: "root",
			englishLabel: "Visual description of data",
			description: "从变量类型出发选择图形，再观察并解释分布。",
			children: [
				node("02-data", "数据", { topicId: "visual-encoding", children: [node("02-observation", "观测值"), node("02-table", "数据表")] }),
				node("visual-encoding", "变量类型", {
					topicId: "visual-encoding",
					children: [node("02-categorical", "分类变量"), node("02-numeric", "数值变量")],
				}),
				node("02-choose-graph", "选择图形", {
					topicId: "visual-encoding",
					variant: "method",
					children: [
						node("02-bar", "条形图"),
						node("02-pie", "饼图"),
						node("histograms", "直方图", { topicId: "histograms" }),
						node("02-box", "箱线图"),
						node("02-dot", "点图"),
						node("02-density", "密度图"),
					],
				}),
				node("02-distribution", "观察分布", {
					topicId: "histograms",
					children: [node("02-center", "中心"), node("02-spread", "离散"), node("02-skew", "偏态"), node("02-outlier", "异常值", { variant: "note" })],
				}),
				node("02-interpret", "解释数据", { topicId: "visual-encoding", variant: "note", children: [node("02-context", "回到问题情境", { variant: "note" })] }),
			],
		}),
		extraEdges: [
			{ id: "02-data-type", source: "02-data", target: "visual-encoding", relation: "leadsTo" },
			{ id: "02-type-graph", source: "visual-encoding", target: "02-choose-graph", relation: "leadsTo" },
			{ id: "02-graph-distribution", source: "02-choose-graph", target: "02-distribution", relation: "leadsTo" },
			{ id: "02-distribution-interpret", source: "02-distribution", target: "02-interpret", relation: "infer" },
		],
	},
	"03": {
		chapter: "03",
		title: "描述数据分布的数值特征",
		subtitle: "中心、离散与位置共同构成描述分布的语言。",
		root: node("root", "描述数据分布的数值特征", {
			variant: "root",
			englishLabel: "Numerical summaries of distributions",
			description: "用数值摘要描述数据的中心、离散、相对位置与异常。",
			children: [
				node("descriptive-statistics", "中心位置", {
				topicId: "descriptive-statistics",
				children: [node("03-mean", "Mean"), node("03-median", "Median"), node("03-mode", "Mode")],
			}),
				node("03-spread", "离散程度", {
					topicId: "descriptive-statistics",
				children: [node("03-range", "Range"), node("03-variance", "Variance"), node("03-sd", "Standard Deviation"), node("03-iqr", "IQR")],
			}),
				node("03-relative", "相对位置", {
					topicId: "descriptive-statistics",
				children: [node("03-quartile", "Quartile"), node("03-percentile", "Percentile")],
			}),
				node("03-outliers", "异常值", { topicId: "descriptive-statistics", variant: "note", children: [node("03-robust", "稳健描述", { variant: "method" })] }),
				node("standardization", "标准化", {
				topicId: "standardization",
				variant: "method",
				children: [node("03-zscore", "Z = (X − mean) / SD", { variant: "formula", edgeRelation: "transform" })],
			}),
			],
		}),
		extraEdges: [
			{ id: "03-raw-z", source: "03-mean", target: "03-zscore", relation: "transform", label: "transform" },
		],
	},
	"04": {
		chapter: "04",
		title: "随机事件与概率",
		subtitle: "用数学语言描述随机性、事件与不确定性。",
		root: node("root", "随机事件与概率", {
			variant: "root",
			englishLabel: "Random events and probability",
			description: "从随机试验、样本空间与事件走向概率计算。",
			children: [
				node("04-experiment", "随机试验", {
					topicId: "probability-foundations",
					variant: "method",
					children: [node("04-outcome", "随机结果"), node("04-space", "样本空间 Ω", { variant: "formula" })],
				}),
				node("probability-foundations", "事件", {
					topicId: "probability-foundations",
					children: [node("04-union", "并 A∪B", { variant: "formula" }), node("04-intersection", "交 A∩B", { variant: "formula" }), node("04-complement", "补 Aᶜ", { variant: "formula" }), node("04-disjoint", "互斥", { variant: "note" })],
				}),
				node("04-probability", "概率", {
					topicId: "probability-foundations",
					variant: "method",
					children: [node("04-addition", "加法公式", { variant: "formula" }), node("04-multiplication", "乘法公式", { variant: "formula" }), node("04-total", "全概率公式", { variant: "formula" })],
				}),
				node("04-conditional", "条件概率", {
					topicId: "probability-foundations",
					variant: "method",
					children: [node("04-conditional-formula", "P(A|B)", { variant: "formula" }), node("04-independent", "独立性", { variant: "note" })],
				}),
				node("04-random-variable", "随机变量 X", { topicId: "random-variables", variant: "concept", edgeRelation: "transform", children: [node("04-transform-result", "随机结果 → X", { variant: "formula", edgeRelation: "transform" })] }),
			],
		}),
		extraEdges: [
			{ id: "04-space-event", source: "04-space", target: "probability-foundations", relation: "leadsTo" },
			{ id: "04-event-probability", source: "probability-foundations", target: "04-probability", relation: "leadsTo" },
		],
	},
	"05": {
		chapter: "05",
		title: "随机变量与概率分布",
		subtitle: "比较离散分布的 PMF 与连续分布的 PDF。",
		root: node("root", "随机变量与概率分布", {
			variant: "root",
			englishLabel: "Random variables and probability distributions",
			description: "从随机变量的类型走向分布、期望与方差。",
			children: [
				node("05-random-variable", "随机变量", { topicId: "probability-distributions", children: [node("05-discrete", "离散型", { variant: "method" }), node("05-continuous", "连续型", { variant: "method" })] }),
				node("probability-distributions", "离散分布", {
				topicId: "probability-distributions",
				children: [node("05-bernoulli", "Bernoulli"), node("05-binomial", "Binomial"), node("05-poisson", "Poisson")],
			}),
				node("normal-distribution", "连续分布", {
					topicId: "normal-distribution",
					children: [node("05-uniform", "Uniform"), node("05-normal", "Normal", { variant: "method", children: [node("05-mu", "μ"), node("05-sigma", "σ"), node("05-normal-formula", "X ~ N(μ, σ²)", { variant: "formula", children: [node("05-z", "Z ~ N(0,1)", { variant: "formula", edgeRelation: "transform" })] })] })],
				}),
				node("05-expectation", "期望 E(X)", { topicId: "probability-distributions", variant: "formula" }),
				node("05-variance", "方差 Var(X)", { topicId: "probability-distributions", variant: "formula" }),
				node("t-distribution", "t 分布", { topicId: "t-distribution", children: [node("05-df", "自由度", { variant: "note" })] }),
			],
		}),
		extraEdges: [
			{ id: "05-discrete-branch", source: "05-random-variable", target: "probability-distributions", relation: "leadsTo" },
			{ id: "05-continuous-branch", source: "05-random-variable", target: "normal-distribution", relation: "leadsTo" },
		],
	},
	"06": {
		chapter: "06",
		title: "样本的统计推断",
		subtitle: "从样本走向总体，理解估计的不确定性。",
		root: node("root", "样本的统计推断", {
			variant: "root",
			englishLabel: "Statistical inference from samples",
			description: "抽样分布、标准误与中心极限定理连接样本和总体。",
			children: [
				node("06-population", "总体 Parameter", { topicId: "point-estimation", variant: "concept", children: [node("06-mu-sigma", "μ / σ", { variant: "formula" })] }),
				node("06-sample", "样本 Statistic", { topicId: "sampling-distributions", variant: "concept", children: [node("06-xbar-s", "x̄ / s", { variant: "formula" })] }),
				node("sampling-distributions", "抽样分布", {
				topicId: "sampling-distributions",
				children: [node("06-many-samples", "多个样本"), node("06-many-means", "多个 x̄")],
			}),
				node("central-limit-theorem", "中心极限定理", {
				topicId: "central-limit-theorem",
				variant: "method",
				children: [node("06-approx-normal", "Sample Mean → Approximately Normal", { variant: "formula", edgeRelation: "transform" })],
			}),
				node("06-se", "标准误 SE", { topicId: "sampling-distributions", variant: "formula", children: [node("06-n-up", "n ↑", { variant: "note" }), node("06-se-down", "SE ↓", { variant: "note" })] }),
				node("06-inference", "统计推断", { topicId: "point-estimation", variant: "method", children: [node("06-stable", "估计稳定性 ↑", { variant: "note" })] }),
			],
		}),
		extraEdges: [
			{ id: "06-population-sample", source: "06-population", target: "06-sample", relation: "compare" },
			{ id: "06-sample-distribution", source: "06-sample", target: "sampling-distributions", relation: "leadsTo" },
			{ id: "06-distribution-clt", source: "sampling-distributions", target: "central-limit-theorem", relation: "infer" },
			{ id: "06-clt-se", source: "central-limit-theorem", target: "06-se", relation: "leadsTo" },
			{ id: "06-se-inference", source: "06-se", target: "06-inference", relation: "leadsTo" },
		],
	},
	"07": {
		chapter: "07",
		title: "总体均值的比较",
		subtitle: "把研究问题转化为可检查的统计证据。",
		root: node("root", "总体均值的比较", {
			variant: "root",
			englishLabel: "Comparing population means",
			description: "从假设、检验统计量与 P-value 走向统计结论。",
			children: [
				node("07-question", "研究问题", { topicId: "hypothesis-testing", children: [node("07-one-sample", "单样本"), node("07-independent", "独立双样本"), node("07-paired", "配对样本")] }),
				node("hypothesis-testing", "H₀ / H₁", { topicId: "hypothesis-testing", variant: "method" }),
				node("07-statistic", "检验统计量", { topicId: "hypothesis-testing", variant: "formula" }),
				node("07-pvalue", "P-value", { topicId: "hypothesis-testing", variant: "formula" }),
				node("07-alpha", "α", { topicId: "hypothesis-testing", variant: "formula" }),
				node("type-i-type-ii-errors", "错误", { topicId: "type-i-type-ii-errors", variant: "note", children: [node("07-type-i", "Type I Error α", { variant: "formula" }), node("07-type-ii", "Type II Error β", { variant: "formula" })] }),
				node("07-power", "Power = 1 − β", { topicId: "type-i-type-ii-errors", variant: "formula" }),
				node("07-conclusion", "统计结论", { topicId: "hypothesis-testing", variant: "method" }),
			],
		}),
		extraEdges: [
			{ id: "07-q-h", source: "07-question", target: "hypothesis-testing", relation: "leadsTo" },
			{ id: "07-h-stat", source: "hypothesis-testing", target: "07-statistic", relation: "leadsTo" },
			{ id: "07-stat-p", source: "07-statistic", target: "07-pvalue", relation: "leadsTo" },
			{ id: "07-p-alpha", source: "07-pvalue", target: "07-alpha", relation: "compare" },
			{ id: "07-errors-power", source: "07-type-ii", target: "07-power", relation: "transform" },
			{ id: "07-alpha-conclusion", source: "07-alpha", target: "07-conclusion", relation: "infer" },
		],
	},
	"08": {
		chapter: "08",
		title: "相关与回归分析",
		subtitle: "从散点、相关与回归模型中读取关系证据。",
		root: node("root", "相关与回归分析", {
			variant: "root",
			englishLabel: "Correlation and regression",
			description: "相关描述共变，回归建立可解释的关系模型。",
			children: [
				node("08-two-vars", "两个定量变量", { topicId: "correlation", children: [node("08-x", "X · 解释变量", { variant: "concept" }), node("08-y", "Y · 响应变量", { variant: "concept" })] }),
				node("correlation", "散点图与 Correlation", { topicId: "correlation", variant: "method", children: [node("08-scatter", "散点图"), node("08-correlation", "Correlation")] }),
				node("linear-regression", "Linear Regression", { topicId: "linear-regression", variant: "method", children: [node("08-intercept", "β₀ · Intercept", { variant: "formula" }), node("08-slope", "β₁ · Slope", { variant: "formula" }), node("08-error", "ε · Random Error", { variant: "formula" })] }),
				node("08-equation", "Y = β₀ + β₁X + ε", { topicId: "linear-regression", variant: "formula" }),
				node("08-prediction", "ŷ", { topicId: "linear-regression", variant: "formula" }),
				node("08-residual", "Residual", { topicId: "linear-regression", variant: "method" }),
				node("08-diagnosis", "Model Diagnosis", { topicId: "linear-regression", variant: "method" }),
				node("08-causation", "Correlation ≠ Causation", { topicId: "correlation", variant: "note" }),
			],
		}),
		extraEdges: [
			{ id: "08-vars-scatter", source: "08-two-vars", target: "correlation", relation: "leadsTo" },
			{ id: "08-correlation-regression", source: "correlation", target: "linear-regression", relation: "leadsTo" },
			{ id: "08-model-equation", source: "linear-regression", target: "08-equation", relation: "transform" },
			{ id: "08-equation-prediction", source: "08-equation", target: "08-prediction", relation: "leadsTo" },
			{ id: "08-prediction-residual", source: "08-prediction", target: "08-residual", relation: "leadsTo" },
			{ id: "08-residual-diagnosis", source: "08-residual", target: "08-diagnosis", relation: "infer" },
			{ id: "08-correlation-causation", source: "correlation", target: "08-causation", relation: "dependsOn" },
		],
	},
	"09": {
		chapter: "09",
		title: "拟合优度检验与列联表分析",
		subtitle: "比较观察频数与期望频数，判断分类数据中的关系。",
		root: node("root", "拟合优度检验与列联表分析", {
			variant: "root",
			englishLabel: "Goodness of fit and contingency tables",
			description: "Observed 与 Expected 的差异构成 χ² 证据。",
			children: [
				node("09-observed", "Observed O", { topicId: "categorical-data", variant: "concept" }),
				node("09-expected", "Expected E", { topicId: "chi-square-test", variant: "concept" }),
				node("09-difference", "Difference", { topicId: "chi-square-test", variant: "method" }),
				node("chi-square-test", "χ² statistic", { topicId: "chi-square-test", variant: "formula", children: [node("09-formula", "χ² = Σ (O−E)² / E", { variant: "formula" })] }),
				node("09-pvalue", "P-value", { topicId: "chi-square-test", variant: "formula" }),
				node("09-goodness", "Goodness of Fit", { topicId: "chi-square-test", variant: "method", children: [node("09-one-cat", "一个分类变量")] }),
				node("09-independence", "Independence Test", { topicId: "chi-square-test", variant: "method", children: [node("09-two-cat", "两个分类变量"), node("09-table", "列联表", { variant: "concept" })] }),
			],
		}),
		extraEdges: [
			{ id: "09-observed-expected", source: "09-observed", target: "09-expected", relation: "compare" },
			{ id: "09-expected-difference", source: "09-expected", target: "09-difference", relation: "leadsTo" },
			{ id: "09-difference-chi", source: "09-difference", target: "chi-square-test", relation: "transform" },
			{ id: "09-chi-p", source: "chi-square-test", target: "09-pvalue", relation: "leadsTo" },
			{ id: "09-chi-goodness", source: "chi-square-test", target: "09-goodness", relation: "contains" },
			{ id: "09-chi-independence", source: "chi-square-test", target: "09-independence", relation: "contains" },
		],
	},
	"10": {
		chapter: "10",
		title: "不依赖于分布的统计推断",
		subtitle: "在分布假设较弱时，仍然构造可解释的证据。",
		root: node("root", "不依赖于分布的统计推断", {
			variant: "root",
			englishLabel: "Distribution-free inference",
			description: "Bootstrap 与 Permutation 从重抽样中构造分布与不确定性。",
			children: [
				node("10-nonparametric", "非参数方法", { topicId: "nonparametric-tests", variant: "method", children: [node("10-rank", "秩"), node("10-empirical", "经验分布")] }),
				node("bootstrap-and-permutation", "Bootstrap", { topicId: "bootstrap-and-permutation", variant: "method", children: [node("10-original", "Original Sample"), node("10-resample", "Resample WITH Replacement", { variant: "method" }), node("10-bootstrap-samples", "Bootstrap Samples"), node("10-bootstrap-stat", "Statistic", { variant: "formula" }), node("10-bootstrap-dist", "Bootstrap Distribution"), node("10-se-ci", "SE / CI", { variant: "formula" })] }),
				node("10-permutation", "Permutation", { topicId: "bootstrap-and-permutation", variant: "method", children: [node("10-null", "H₀", { variant: "formula" }), node("10-shuffle", "Shuffle Labels", { variant: "method" }), node("10-recalculate", "Recalculate Statistic", { variant: "formula" }), node("10-repeat", "Repeat"), node("10-null-dist", "Null Distribution"), node("10-p", "P-value", { variant: "formula" })] }),
			],
		}),
		extraEdges: [
			{ id: "10-bootstrap-original", source: "10-original", target: "10-resample", relation: "leadsTo" },
			{ id: "10-resample-samples", source: "10-resample", target: "10-bootstrap-samples", relation: "leadsTo" },
			{ id: "10-samples-stat", source: "10-bootstrap-samples", target: "10-bootstrap-stat", relation: "leadsTo" },
			{ id: "10-stat-dist", source: "10-bootstrap-stat", target: "10-bootstrap-dist", relation: "leadsTo" },
			{ id: "10-dist-ci", source: "10-bootstrap-dist", target: "10-se-ci", relation: "infer" },
			{ id: "10-permutation-null", source: "10-null", target: "10-shuffle", relation: "leadsTo" },
			{ id: "10-shuffle-recalc", source: "10-shuffle", target: "10-recalculate", relation: "leadsTo" },
			{ id: "10-recalc-repeat", source: "10-recalculate", target: "10-repeat", relation: "leadsTo" },
			{ id: "10-repeat-null", source: "10-repeat", target: "10-null-dist", relation: "leadsTo" },
			{ id: "10-null-p", source: "10-null-dist", target: "10-p", relation: "infer" },
		],
	},
	"11": {
		chapter: "11",
		title: "时间序列分析",
		subtitle: "在同一条时间轴上区分趋势、季节与随机波动。",
		root: node("root", "时间序列分析", {
			variant: "root",
			englishLabel: "Time-series analysis",
			description: "时间依赖让历史观测成为预测当前与未来的证据。",
			children: [
				node("time-series", "Time Series", { topicId: "time-series", variant: "method", children: [node("11-y-t", "Yₜ", { variant: "formula" }), node("11-y-lag", "Yₜ₋₁ / Yₜ₋₂", { variant: "formula", edgeRelation: "dependsOn" })] }),
				node("11-historical-data", "Historical Data", { topicId: "time-series", children: [node("11-temporal-pattern", "Temporal Pattern", { variant: "concept" })] }),
				node("time-trend", "Trend", { topicId: "time-series", children: [node("11-long-term", "长期方向")] }),
				node("11-seasonality", "Seasonality", { topicId: "time-series", children: [node("11-periodic", "周期性重复")] }),
				node("11-cycle", "Cycle", { topicId: "time-series", children: [node("11-expansion", "扩张与收缩")] }),
				node("11-noise", "Noise", { topicId: "time-series", variant: "note", children: [node("11-random", "随机波动")] }),
				node("11-autocorrelation", "Autocorrelation", { topicId: "time-series", variant: "method" }),
				node("11-forecasting", "Forecasting", { topicId: "time-series", variant: "method", children: [node("11-model", "Model", { variant: "method" }), node("11-forecast", "Forecast", { variant: "formula" })] }),
			],
		}),
		extraEdges: [
			{ id: "11-pattern-model", source: "11-temporal-pattern", target: "11-model", relation: "leadsTo" },
			{ id: "11-series-trend", source: "time-series", target: "time-trend", relation: "contains" },
			{ id: "11-series-seasonality", source: "time-series", target: "11-seasonality", relation: "contains" },
			{ id: "11-series-cycle", source: "time-series", target: "11-cycle", relation: "contains" },
			{ id: "11-series-noise", source: "time-series", target: "11-noise", relation: "contains" },
			{ id: "11-lag-autocorrelation", source: "11-y-lag", target: "11-autocorrelation", relation: "dependsOn" },
			{ id: "11-history-pattern", source: "time-series", target: "11-forecasting", relation: "leadsTo" },
		],
	},
};

export const knowledgeMaps: Record<string, ChapterKnowledgeMap> = Object.fromEntries(
	Object.entries(chapterSeeds).map(([chapter, seed]) => [chapter, buildChapterMap(seed)]),
);
