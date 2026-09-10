import {
  conservativeStatAiTokenCount,
  truncateStatAiJsonString,
} from "@/lib/ai-context-budget";

interface PaperGenerationSeed {
  concept: string;
  origin: "variant" | "generated";
  variantKind?: "parameter" | "context";
  chapterId: string;
  seed: null | {
    type: string;
    difficulty: number;
    content: string;
    answer: string | null;
  };
}

interface PaperVerificationDraft {
  concept?: string;
  type?: string;
  difficulty?: number;
  chapterId?: string;
  content?: string;
  answer?: string;
  visualizations?: unknown;
}

function assertWithinInputBudget(input: string, maximumBytes: number): string {
  if (conservativeStatAiTokenCount(input) > maximumBytes) {
    throw new Error("AI paper prompt exceeds its context budget");
  }
  return input;
}

export function formatPaperGenerationInput(options: {
  targetDifficulty: number;
  allowedTypes: readonly string[];
  seeds: readonly PaperGenerationSeed[];
  maximumBytes: number;
}): string {
  const jobs = options.seeds.map((seed, index) => ({
    index,
    concept: truncateStatAiJsonString(seed.concept, 180),
    origin: seed.origin,
    variantKind: seed.variantKind,
    chapterId: seed.chapterId,
    seed: seed.seed ? {
      type: seed.seed.type,
      difficulty: seed.seed.difficulty,
      content: truncateStatAiJsonString(seed.seed.content, 240),
      answer: truncateStatAiJsonString(seed.seed.answer ?? "", 240),
    } : null,
  }));
  return assertWithinInputBudget(JSON.stringify({
    targetDifficulty: options.targetDifficulty,
    allowedTypes: options.allowedTypes,
    jobs,
  }), options.maximumBytes);
}

export function formatPaperVerificationInput(
  drafts: readonly PaperVerificationDraft[],
  maximumBytes: number,
): string {
  const questions = drafts.map((item, index) => ({
    index,
    concept: item.concept,
    type: item.type,
    difficulty: item.difficulty,
    chapterId: item.chapterId,
    content: item.content,
    answer: item.answer,
    visualizations: item.visualizations,
  }));
  return assertWithinInputBudget(JSON.stringify({ questions }), maximumBytes);
}
