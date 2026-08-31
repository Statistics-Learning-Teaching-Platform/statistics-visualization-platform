/**
 * Cloudflare Pages caches /assets/* with `immutable` for a year, and it keys
 * edge entries partly by Sec-Fetch-Dest. During a deployment's propagation
 * window a brand-new hashed asset can be answered with the SPA fallback
 * (index.html), and that text/html response then sticks for browser module
 * fetches — the app dies with "Expected a JavaScript module script" until
 * the entry expires or is purged. The SPA shell is never a valid asset, so
 * answer 404 (no-store) instead and let the caller retry once propagation
 * completes.
 */

interface PagesEventContext {
	request: Request;
	next: () => Promise<Response>;
}

export const onRequest = async (context: PagesEventContext): Promise<Response> => {
	const response = await context.next();
	const contentType = response.headers.get("content-type") ?? "";
	if (contentType.includes("text/html")) {
		return new Response("asset not found", {
			status: 404,
			headers: { "Cache-Control": "no-store" },
		});
	}
	return response;
};
