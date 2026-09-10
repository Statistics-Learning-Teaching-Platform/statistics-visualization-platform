export type TrustedProxyMode = "cloudflare" | "x-forwarded-for";

function normalizedAddress(value: string | null | undefined): string | null {
  const address = value?.trim();
  return address ? address : null;
}

export function resolveClientAddress(headers: Headers, mode: string | undefined): string {
  if (mode === "cloudflare") {
    return normalizedAddress(headers.get("cf-connecting-ip")) ?? "unknown";
  }
  if (mode === "x-forwarded-for") {
    return normalizedAddress(headers.get("x-forwarded-for")?.split(",", 1)[0]) ?? "unknown";
  }
  return "unknown";
}
