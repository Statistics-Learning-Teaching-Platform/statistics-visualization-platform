import type { ReactNode } from "react";
import ReactMarkdown, {
  defaultUrlTransform,
  type Components,
  type UrlTransform,
} from "react-markdown";
import rehypeHighlight from "rehype-highlight";
import rehypeKatex from "rehype-katex";
import rehypeSanitize from "rehype-sanitize";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import "highlight.js/styles/github-dark.css";
import "katex/dist/katex.min.css";

const LANGUAGE_CLASS = /(?:^|\s)language-([^\s]+)/u;

/**
 * Keep model-authored URLs inside react-markdown's conservative protocol
 * allowlist. Images are deliberately disabled below, but returning null for
 * their source also prevents a future component change from silently adding
 * third-party tracking requests.
 */
export const transformTutorUrl: UrlTransform = (url, key) =>
  key === "src" ? null : defaultUrlTransform(url);

const markdownComponents: Components = {
  a: ({ node: _node, href, children, ...props }) => {
    const external = typeof href === "string" && /^(?:https?:)?\/\//iu.test(href);
    return (
      <a
        {...props}
        href={href}
        {...(external ? { rel: "nofollow noopener noreferrer", target: "_blank" } : {})}
      >
        {children}
      </a>
    );
  },
  code: ({ node: _node, className, children, ...props }) => {
    const language = className?.match(LANGUAGE_CLASS)?.[1];
    return (
      <code {...props} className={className} data-language={language}>
        {children}
      </code>
    );
  },
  // A remote Markdown image can make the learner's browser contact an
  // arbitrary host. Preserve useful alt text without issuing that request.
  img: ({ node: _node, alt }) => (
    <span className="ed-tutor-markdown__image-placeholder" role="note">
      {alt ? `[Image: ${alt}]` : "[Image]"}
    </span>
  ),
};

export function TutorMarkdown({
  children,
  variant = "prose",
}: {
  children: string;
  variant?: "code" | "prose";
}): ReactNode {
  return (
    <div
      className={`ed-tutor-markdown ed-tutor-markdown--${variant}`}
      data-format="markdown"
    >
      <ReactMarkdown
        components={markdownComponents}
        rehypePlugins={[
          rehypeSanitize,
          [rehypeKatex, { maxExpand: 500, maxSize: 10, strict: "error", trust: false }],
          [
            rehypeHighlight,
            {
              aliases: {
                bash: ["sh", "zsh"],
                javascript: ["js", "jsx"],
                python: ["py"],
                r: ["rscript"],
                typescript: ["ts", "tsx"],
              },
              detect: false,
              plainText: ["text", "txt", "plaintext", "mermaid"],
            },
          ],
        ]}
        remarkPlugins={[[remarkGfm, { singleTilde: false }], remarkMath]}
        skipHtml
        urlTransform={transformTutorUrl}
      >
        {children}
      </ReactMarkdown>
    </div>
  );
}

export default TutorMarkdown;
