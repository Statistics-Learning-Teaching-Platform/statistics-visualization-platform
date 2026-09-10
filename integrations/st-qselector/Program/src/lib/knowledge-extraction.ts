import "server-only";
import { callStatAi } from "@/lib/ai-client";
import {
  conservativeStatAiTokenCount,
  statAiInputByteBudget,
  truncateStatAiUtf8,
} from "@/lib/ai-context-budget";

export const KNOWLEDGE_MAX_OUTPUT_TOKENS = 2_048;
export const KNOWLEDGE_SYSTEM_PROMPT = "You extract assessable statistics knowledge points from teaching material. Return JSON only with this schema: {\"concepts\":[{\"id\":\"...\",\"label\":\"...\",\"confidence\":0.0,\"evidence\":\"...\"}]}. Labels must be concise English statistics concepts, confidence is 0..1, evidence briefly cites the supplied text. Merge duplicates and return no more than 16 concepts. Do not wrap the JSON in Markdown.";
export const MAX_AI_KNOWLEDGE_INPUT_BYTES = statAiInputByteBudget(
  KNOWLEDGE_SYSTEM_PROMPT,
  KNOWLEDGE_MAX_OUTPUT_TOKENS,
);

function utf8Prefix(value: string, maxBytes: number): string {
  return truncateStatAiUtf8(value, maxBytes, "");
}

function utf8Suffix(value: string, maxBytes: number): string {
  const reversed = utf8Prefix(Array.from(value).reverse().join(""), maxBytes);
  return Array.from(reversed).reverse().join("");
}

/** Sample the beginning, middle, and end without overflowing an 8K context model. */
export function boundedKnowledgeSample(text: string): string {
  if (conservativeStatAiTokenCount(text) <= MAX_AI_KNOWLEDGE_INPUT_BYTES) return text;
  const characters = Array.from(text);
  const third = Math.ceil(characters.length / 3);
  const middleMarker = "\n\n[courseware middle sample]\n\n";
  const finalMarker = "\n\n[courseware final sample]\n\n";
  const sampleBytes = MAX_AI_KNOWLEDGE_INPUT_BYTES
    - conservativeStatAiTokenCount(middleMarker)
    - conservativeStatAiTokenCount(finalMarker);
  const headBytes = Math.floor(sampleBytes / 3);
  const middleBytes = Math.floor(sampleBytes / 3);
  const tailBytes = sampleBytes - headBytes - middleBytes;
  const head = utf8Prefix(characters.slice(0, third).join(""), headBytes);
  const center = Math.floor(characters.length / 2);
  const middleLeftBytes = Math.floor(middleBytes / 2);
  const middle = `${utf8Suffix(characters.slice(0, center).join(""), middleLeftBytes)}${utf8Prefix(
    characters.slice(center).join(""),
    middleBytes - middleLeftBytes,
  )}`;
  const tail = utf8Suffix(characters.slice(-third).join(""), tailBytes);
  return `${head}${middleMarker}${middle}${finalMarker}${tail}`;
}

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

export async function aiKnowledgeExtraction(text: string, requestSignal: AbortSignal | undefined, model: string): Promise<ExtractedKnowledgePoint[] | null> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 55_000);
  try {
    const content = await callStatAi({
      signal: requestSignal ? AbortSignal.any([requestSignal, controller.signal]) : controller.signal,
      model,
      maxOutputTokens: KNOWLEDGE_MAX_OUTPUT_TOKENS,
      systemPrompt: KNOWLEDGE_SYSTEM_PROMPT,
      input: boundedKnowledgeSample(text),
    });
    const start = content.indexOf("{");
    const end = content.lastIndexOf("}");
    if (start < 0 || end <= start) throw new Error("AI 没有返回有效 JSON");
    const parsed = JSON.parse(content.slice(start, end + 1)) as { concepts?: unknown };
    const concepts = validConcepts(parsed.concepts);
    if (!concepts.length) throw new Error("AI 返回的知识点格式不正确");
    return concepts;
  } finally {
    clearTimeout(timeout);
  }
}
