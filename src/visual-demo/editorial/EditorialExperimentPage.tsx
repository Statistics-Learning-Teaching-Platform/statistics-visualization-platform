import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Slider } from "@/components/ui/slider";
import { ArrowRightIcon, PlayIcon, RotateCcwIcon } from "lucide-react";
import { useMemo, useState } from "react";
import {
	EditorialDemoShell,
	ExperimentPanel,
	FigureFrame,
	PageIntro,
} from "./EditorialPrimitives";
import { type IntervalRow, intervalRows } from "./demo-data";

function ConfidenceIntervalPlot({
	rows,
	confidence,
}: {
	rows: IntervalRow[];
	confidence: number;
}) {
	const x = (value: number) => 82 + ((value - 6.5) / 7.5) * 638;

	return (
		<svg
			viewBox="0 0 800 520"
			role="img"
			aria-labelledby="ci-plot-title ci-plot-description"
		>
			<title id="ci-plot-title">重复抽样产生的置信区间</title>
			<desc id="ci-plot-description">
				已生成 {rows.length} 个 {confidence}% 置信区间。实线区间覆盖总体均值
				10，虚线并带叉号的区间未覆盖。
			</desc>
			<g className="ci-plot__grid">
				{[7, 8, 9, 10, 11, 12, 13].map((tick) => (
					<g key={tick}>
						<path d={`M${x(tick)} 54V458`} />
						<text x={x(tick)} y="490" textAnchor="middle">
							{tick}
						</text>
					</g>
				))}
				<path d="M82 458H720" className="ci-plot__axis" />
			</g>
			<g className="ci-plot__reference">
				<path d={`M${x(10)} 38V458`} />
				<text x={x(10) + 12} y="40">
					真实均值 μ = 10
				</text>
			</g>
			<g className="ci-plot__rows">
				{rows.map((row, index) => {
					const y = 82 + index * 31;
					return (
						<g key={row.id} className={row.covered ? undefined : "is-missed"}>
							<text x="54" y={y + 4} textAnchor="end">
								{String(row.id).padStart(2, "0")}
							</text>
							<path d={`M${x(row.low)} ${y}H${x(row.high)}`} />
							<path
								d={`M${x(row.low)} ${y - 6}V${y + 6}M${x(row.high)} ${y - 6}V${y + 6}`}
							/>
							<circle cx={x(row.mean)} cy={y} r="5" />
							{row.covered ? null : (
								<>
									<path
										d={`M${x(row.high) + 8} ${y - 5}l10 10M${x(row.high) + 18} ${y - 5}l-10 10`}
									/>
									<text x={x(row.high) + 26} y={y + 4}>
										未覆盖
									</text>
								</>
							)}
						</g>
					);
				})}
			</g>
			<text className="ci-plot__axis-title" x="402" y="516" textAnchor="middle">
				总体尺度
			</text>
		</svg>
	);
}

const experimentItems = [
	["01", "概率分布"],
	["02", "抽样"],
	["03", "中心极限定理"],
	["04", "参数估计"],
	["05", "置信区间"],
	["06", "假设检验"],
	["07", "方差分析"],
	["08", "回归分析"],
];

export function EditorialExperimentPage() {
	const [sampleSize, setSampleSize] = useState(10);
	const [confidence, setConfidence] = useState(95);
	const [visibleCount, setVisibleCount] = useState(8);
	const experimentRows = useMemo(() => {
		const zScore = confidence === 90 ? 1.645 : confidence === 99 ? 2.576 : 1.96;
		const standardError = 2 / Math.sqrt(sampleSize);
		const samplingScale = Math.sqrt(10 / sampleSize);

		return intervalRows.map((row) => {
			const mean = 10 + (row.mean - 10) * samplingScale;
			const margin = zScore * standardError;
			const low = mean - margin;
			const high = mean + margin;
			return {
				...row,
				mean,
				low,
				high,
				covered: low <= 10 && high >= 10,
			};
		});
	}, [sampleSize, confidence]);
	const visibleRows = experimentRows.slice(0, visibleCount);
	const covered = visibleRows.filter((row) => row.covered).length;
	const coverage = visibleCount
		? ((covered / visibleCount) * 100).toFixed(1)
		: "0.0";
	const latest = visibleRows.at(-1);
	const evidenceLine = useMemo(
		() =>
			`总体 μ = 10 → 抽取 n = ${sampleSize} 的样本 → 构造 ${confidence}% 区间 → 判断是否覆盖`,
		[sampleSize, confidence],
	);

	return (
		<EditorialDemoShell current="experiment" mode="workspace">
			<main id="main-content" className="ed-lab-page">
				<aside className="ed-lab-sidebar">
					<div className="ed-rail-heading">
						<p className="ed-kicker">Laboratory Index</p>
						<h2>统计实验室</h2>
					</div>
					<nav aria-label="实验目录">
						{experimentItems.map(([number, title]) => (
							<a
								key={number}
								href={
									number === "05" ? "#experiment-stage" : "/teaching-platform"
								}
								data-current={number === "05" || undefined}
							>
								<span>{number}</span>
								<strong>{title}</strong>
							</a>
						))}
					</nav>
					<section className="ed-procedure">
						<p className="ed-kicker">Procedure</p>
						<ol>
							<li data-state="complete">
								<span>1</span>设定总体
							</li>
							<li data-state="complete">
								<span>2</span>重复抽样
							</li>
							<li data-state="current">
								<span>3</span>比较区间
							</li>
							<li>
								<span>4</span>解释覆盖率
							</li>
						</ol>
					</section>
				</aside>

				<section className="ed-lab-stage" id="experiment-stage">
					<PageIntro
						index="05"
						eyebrow="Parameter Estimation · Confidence Interval"
						title="重复抽样中的置信区间"
						description="核心问题：为什么 95% 置信区间会在长期重复抽样中覆盖真实均值约 95% 的次数？"
						action={{
							label: "打开真实实验",
							href: "/teaching-platform#confidence-interval",
						}}
					/>

					<div className="ed-evidence-rule">
						<span>Evidence line</span>
						<p>{evidenceLine}</p>
					</div>

					<ExperimentPanel
						number="A"
						label="Observation"
						title="让区间累积，观察覆盖与遗漏"
					>
						<div className="ed-lab-summary">
							<div>
								<span>已生成</span>
								<strong>{visibleCount}</strong>
								<small>个样本</small>
							</div>
							<div>
								<span>覆盖</span>
								<strong>{covered}</strong>
								<small>个区间</small>
							</div>
							<div>
								<span>观察覆盖率</span>
								<strong>{coverage}%</strong>
								<small>当前结果</small>
							</div>
						</div>
						<FigureFrame
							number="L.05"
							title="重复样本对应不同区间"
							description={`当前 ${visibleCount} 个 ${confidence}% 区间中有 ${covered} 个覆盖 μ = 10。虚线区间和叉号共同标识未覆盖，含义不依赖颜色。`}
						>
							{visibleCount ? (
								<ConfidenceIntervalPlot
									rows={visibleRows}
									confidence={confidence}
								/>
							) : (
								<div className="ed-empty-figure">
									<span>μ = 10</span>
									<p>生成第一个样本后，区间会沿这条总体参照线出现。</p>
								</div>
							)}
						</FigureFrame>
						<div className="ed-observation-notes">
							<p>
								<span>01</span>未覆盖的区间是否集中在参照线的某一侧？
							</p>
							<p>
								<span>02</span>增加样本量后，单个区间的宽度如何变化？
							</p>
							<p>
								<span>03</span>为什么 12 次实验的覆盖率不必恰好等于 95%？
							</p>
						</div>
					</ExperimentPanel>
				</section>

				<aside className="ed-parameter-rail">
					<div className="ed-rail-heading">
						<p className="ed-kicker">Parameters</p>
						<h2>实验参数</h2>
					</div>
					<div className="ed-parameter-field">
						<div>
							<label htmlFor="sample-size-slider">样本量</label>
							<output htmlFor="sample-size-slider">n = {sampleSize}</output>
						</div>
						<Slider
							id="sample-size-slider"
							value={sampleSize}
							onValueChange={(value) => setSampleSize(value as number)}
							min={5}
							max={50}
							step={5}
							aria-label="样本量"
						/>
						<p>样本量越大，样本均值的标准误越小。</p>
					</div>
					<Separator />
					<div className="ed-parameter-field">
						<label htmlFor="confidence-level">置信水平</label>
						<select
							id="confidence-level"
							value={confidence}
							onChange={(event) => setConfidence(Number(event.target.value))}
						>
							<option value="90">90%</option>
							<option value="95">95%</option>
							<option value="99">99%</option>
						</select>
						<p>更高的置信水平需要更宽的区间。</p>
					</div>
					<Separator />
					<div className="ed-method-note">
						<span>Method</span>
						<strong>σ 已知 · Z 区间</strong>
						<p>总体均值 μ = 10，总体标准差 σ = 2。</p>
					</div>
					<div className="ed-parameter-actions">
						<Button
							onClick={() =>
								setVisibleCount((count) => Math.min(count + 1, 12))
							}
						>
							<PlayIcon data-icon="inline-start" />
							生成 1 个样本
						</Button>
						<Button variant="outline" onClick={() => setVisibleCount(12)}>
							显示全部 12 个
						</Button>
						<Button variant="ghost" onClick={() => setVisibleCount(0)}>
							<RotateCcwIcon data-icon="inline-start" />
							重置实验
						</Button>
					</div>
					<div className="ed-latest-sample">
						<p className="ed-kicker">Latest Sample</p>
						{latest ? (
							<dl>
								<div>
									<dt>样本均值</dt>
									<dd>{latest.mean.toFixed(2)}</dd>
								</div>
								<div>
									<dt>置信区间</dt>
									<dd>
										[{latest.low.toFixed(2)}, {latest.high.toFixed(2)}]
									</dd>
								</div>
								<div>
									<dt>是否覆盖</dt>
									<dd>{latest.covered ? "是" : "否"}</dd>
								</div>
							</dl>
						) : (
							<p>尚未生成样本。</p>
						)}
					</div>
					<a className="ed-inline-link" href="/visual-demo/catalog">
						返回教材解释
						<ArrowRightIcon aria-hidden="true" />
					</a>
				</aside>
			</main>
		</EditorialDemoShell>
	);
}
