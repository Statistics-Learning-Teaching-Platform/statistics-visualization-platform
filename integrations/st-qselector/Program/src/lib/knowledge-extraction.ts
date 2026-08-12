import "server-only";

export interface ExtractedKnowledgePoint {
  id: string;
  label: string;
  confidence: number;
  evidence: string;
}

const TAXONOMY = [
  { label: "descriptive statistics", terms: ["descriptive statistics", "mean", "median", "variance", "standard deviation", "stem-and-leaf", "histogram"] },
  { label: "probability and conditional probability", terms: ["probability", "conditional probability", "bayes", "independence"] },
  { label: "probability distributions", terms: ["probability distribution", "binomial", "poisson", "normal distribution", "random variable"] },
  { label: "sampling and sampling distributions", terms: ["sampling", "sampling distribution", "standard error", "random sample"] },
  { label: "central limit theorem", terms: ["central limit theorem", "clt"] },
  { label: "point estimation", terms: ["point estimate", "estimator", "bias", "maximum likelihood"] },
  { label: "confidence intervals", terms: ["confidence interval", "margin of error", "confidence level"] },
  { label: "hypothesis testing", terms: ["hypothesis test", "null hypothesis", "alternative hypothesis", "p-value", "type i error", "type ii error", "statistical power"] },
  { label: "correlation and linear regression", terms: ["correlation", "linear regression", "least squares", "residual", "r-squared"] },
  { label: "analysis of variance", terms: ["anova", "analysis of variance", "f test"] },
  { label: "resampling and bootstrap", terms: ["bootstrap", "permutation test", "resampling"] },
  { label: "monte carlo and simulation", terms: ["monte carlo", "simulation", "random sampling", "mcmc", "metropolis", "gibbs"] },
] as const;

function slug(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9\u4e00-\u9fff]+/g, "-").replace(/^-|-$/g, "");
}

export function localKnowledgeExtraction(text: string): ExtractedKnowledgePoint[] {
  const source = text.toLowerCase();
  const matched = TAXONOMY.map((entry) => {
    const hits = entry.terms.filter((term) => source.includes(term));
    return { entry, hits };
  })
    .filter(({ hits }) => hits.length > 0)
    .sort((a, b) => b.hits.length - a.hits.length)
    .slice(0, 12)
    .map(({ entry, hits }) => ({
      id: slug(entry.label),
      label: entry.label,
      confidence: Math.min(0.95, 0.58 + hits.length * 0.1),
      evidence: `匹配到：${hits.slice(0, 3).join("、")}`,
    }));

  if (matched.length) return matched;
  const seen = new Set<string>();
  return text
    .split(/\n+/)
    .map((line) => line.replace(/^[-#*\d.\s]+/, "").trim())
    .filter((line) => line.length >= 4 && line.length <= 80)
    .filter((line) => {
      const key = line.toLowerCase().replace(/[^\p{L}\p{N}]+/gu, "");
      if (!key || seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .slice(0, 8)
    .map((label, index) => ({ id: slug(label) || `topic-${index + 1}`, label, confidence: 0.45, evidence: "根据课件标题候选提取" }));
}

function validConcepts(value: unknown): ExtractedKnowledgePoint[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((item, index) => {
      if (!item || typeof item !== "object") return null;
      const record = item as Record<string, unknown>;
      const label = typeof record.label === "string" ? record.label.trim() : "";
      if (!label) return null;
      const confidence = typeof record.confidence === "number" ? record.confidence : 0.7;
      return {
        id: typeof record.id === "string" && record.id.trim() ? record.id.trim() : slug(label) || `topic-${index + 1}`,
        label,
        confidence: Math.max(0, Math.min(1, confidence)),
        evidence: typeof record.evidence === "string" ? record.evidence.trim().slice(0, 180) : "AI 根据课件内容提取",
      };
    })
    .filter((item): item is ExtractedKnowledgePoint => Boolean(item))
    .slice(0, 16);
}

export async function aiKnowledgeExtraction(text: string): Promise<ExtractedKnowledgePoint[] | null> {
  const apiKey = process.env.OPENAI_API_KEY?.trim();
  if (!apiKey) return null;
  const baseUrl = (process.env.OPENAI_BASE_URL?.trim() || "https://api.openai.com/v1").replace(/\/$/, "");
  const model = process.env.OPENAI_MODEL?.trim() || "gpt-4.1-mini";
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 35_000);
  try {
    const response = await fetch(`${baseUrl}/chat/completions`, {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      signal: controller.signal,
      body: JSON.stringify({
        model,
        temperature: 0.1,
        response_format: { type: "json_object" },
        messages: [
          {
            role: "system",
            content: "You extract assessable statistics knowledge points from teaching material. Return JSON only: {concepts:[{id,label,confidence,evidence}]}. Labels must be concise English concepts, confidence is 0..1, evidence briefly cites the supplied text. Merge duplicates and return no more than 16 concepts.",
          },
          { role: "user", content: text.slice(0, 60_000) },
        ],
      }),
    });
    if (!response.ok) throw new Error(`AI 服务返回 ${response.status}`);
    const payload = await response.json() as { choices?: Array<{ message?: { content?: string } }> };
    const content = payload.choices?.[0]?.message?.content;
    if (!content) throw new Error("AI 没有返回知识点");
    const parsed = JSON.parse(content) as { concepts?: unknown };
    const concepts = validConcepts(parsed.concepts);
    if (!concepts.length) throw new Error("AI 返回的知识点格式不正确");
    return concepts;
  } finally {
    clearTimeout(timeout);
  }
}
