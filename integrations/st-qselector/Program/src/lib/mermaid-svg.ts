type DomPurifyApi = typeof import("dompurify")["default"];

/** Strict Mermaid still returns untrusted SVG; guard the inserted markup. */
export function sanitizeMermaidSvg(purifier: DomPurifyApi, value: string): string | null {
  const sanitized = purifier.sanitize(value, {
    USE_PROFILES: { svg: true, svgFilters: true },
    FORBID_TAGS: ["a", "animate", "animateMotion", "animateTransform", "embed", "foreignObject", "iframe", "image", "object", "script", "set"],
    FORBID_ATTR: ["href", "xlink:href", "formaction"],
    RETURN_TRUSTED_TYPE: false,
  });
  if (
    typeof sanitized !== "string"
    || !/^\s*<svg\b/i.test(sanitized)
    || /<(?:script|foreignObject|iframe|object|embed|a)\b|\son[a-z]+\s*=|(?:href|xlink:href)\s*=/i.test(sanitized)
    // DOMPurify does not filter CSS imports/URLs. This small chart subset
    // needs neither CSS escapes nor imports; only local SVG paint references.
    || /\\|@import\b/i.test(sanitized)
    || [...sanitized.matchAll(/url\(([^)]*)\)/gi)].some((match) =>
      !/^(["']?)#[a-z_][\w:.-]*\1$/i.test(match[1].trim()))
  ) {
    return null;
  }
  return sanitized;
}
