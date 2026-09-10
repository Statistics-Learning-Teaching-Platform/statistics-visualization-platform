import type { Language } from "@stats-viz/shared/i18n";
import type { TextbookChapterResources } from "../../course/resourceCatalog";
import type { ConceptExplanation } from "../../data/knowledgeMaps";
import type { KnowledgeMapNode } from "./knowledgeMapLayout";

type ConceptExplanationSectionProps = {
  node: KnowledgeMapNode | null;
  entry: TextbookChapterResources;
  chapter: { title: string; lead?: string };
  chapterNumber: string;
  language: Language;
};

function chapterIntroduction(
  chapter: ConceptExplanationSectionProps["chapter"],
  entry: TextbookChapterResources,
  language: Language,
): ConceptExplanation {
  return {
    summary:
      chapter.lead ??
      entry.topics[0]?.summary[language] ??
      (language === "zh"
        ? "统计学把问题、数据与证据连接起来，帮助我们形成有边界的判断。"
        : "Statistics connects questions, data, and evidence so that we can make bounded judgments."),
    paragraphs: [
      language === "zh"
        ? "先从章节骨架开始，再选择一个知识模块逐步展开。每一个概念都与它的前置条件、方法和证据相连。"
        : "Start with the chapter skeleton, then open one knowledge branch at a time. Each concept connects to its prerequisites, methods, and evidence.",
    ],
    keyPoints: [
      language === "zh"
        ? "点击一级模块，查看它的核心概念。"
        : "Open a primary module to see its core concepts.",
      language === "zh"
        ? "有加号的节点还可以继续展开。"
        : "A plus sign means that a node can be opened further.",
    ],
  };
}

function selectedExplanation(
  node: KnowledgeMapNode,
  entry: TextbookChapterResources,
  language: Language,
): ConceptExplanation {
  const topic = node.topicId ? entry.topics.find((item) => item.id === node.topicId) : undefined;
  return (
    node.explanation ?? {
      summary:
        node.description ??
        topic?.summary[language] ??
        (language === "zh"
          ? "这个知识点连接本章中的相关概念。"
          : "This concept connects related ideas in the chapter."),
    }
  );
}

export function ConceptExplanationSection({
  node,
  entry,
  chapter,
  chapterNumber,
  language,
}: ConceptExplanationSectionProps) {
  const explanation = node
    ? selectedExplanation(node, entry, language)
    : chapterIntroduction(chapter, entry, language);
  const title = node?.label ?? chapter.title;
  const englishLabel = node?.englishLabel;
  return (
    <section
      className="knowledge-map-explanation"
      aria-labelledby="knowledge-map-explanation-title"
    >
      <div className="knowledge-map-explanation__copy">
        <p className="chapter-hub-eyebrow">
          {node ? "CONCEPT EXPLANATION" : `CHAPTER ${chapterNumber} · INTRODUCTION`}
        </p>
        <h3 id="knowledge-map-explanation-title">{title}</h3>
        {englishLabel && <p className="knowledge-map-explanation__english">{englishLabel}</p>}
        <p className="knowledge-map-explanation__summary">{explanation.summary}</p>
        {explanation.paragraphs?.map((paragraph) => (
          <p className="knowledge-map-explanation__paragraph" key={paragraph}>
            {paragraph}
          </p>
        ))}
        {explanation.intuition && (
          <div className="knowledge-map-explanation__block">
            <strong>{language === "zh" ? "直觉" : "Intuition"}</strong>
            <p>{explanation.intuition}</p>
          </div>
        )}
        {explanation.example && (
          <div className="knowledge-map-explanation__block">
            <strong>{language === "zh" ? "例子" : "Example"}</strong>
            <p>{explanation.example}</p>
          </div>
        )}
        {explanation.formula && (
          <div
            className="knowledge-map-explanation__formula"
            aria-label={language === "zh" ? "公式" : "Formula"}
          >
            {explanation.formula}
          </div>
        )}
      </div>
      {explanation.keyPoints && explanation.keyPoints.length > 0 && (
        <div className="knowledge-map-explanation__key-points">
          <p className="chapter-hub-eyebrow">{language === "zh" ? "关键理解" : "Key points"}</p>
          <ul>
            {explanation.keyPoints.map((point) => (
              <li key={point}>{point}</li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}
