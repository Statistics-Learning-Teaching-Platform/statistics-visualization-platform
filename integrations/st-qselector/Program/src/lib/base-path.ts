export const BASE_PATH = "/st-qselector";

export function withBasePath(pathname: string): string {
  const normalized = pathname.startsWith("/") ? pathname : `/${pathname}`;
  return `${BASE_PATH}${normalized}`;
}
