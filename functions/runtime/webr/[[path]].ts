/**
 * webR ships R as an Emscripten WebAssembly build whose worker evaluates JS
 * shims through eval() while R boots. The portal's document CSP
 * (public/_headers) deliberately forbids 'unsafe-eval', and a _headers rule
 * cannot relax it for a subtree: Pages concatenates headers from every
 * matching rule, and two CSPs are enforced as their intersection.
 *
 * A dedicated worker loaded from a URL inherits the CSP delivered with the
 * worker *script's own response*, so replacing the header here — only on the
 * webr runtime files — relaxes exactly the worker scope and nothing else.
 * The R.wasm itself still only needs 'wasm-unsafe-eval', which is included.
 */

interface PagesEventContext {
	request: Request;
	next: () => Promise<Response>;
}

const WEBR_WORKER_CSP =
	"script-src 'self' 'wasm-unsafe-eval' 'unsafe-eval'; connect-src 'self'";

export const onRequest = async (context: PagesEventContext): Promise<Response> => {
	const response = await context.next();
	const contentType = response.headers.get("content-type") ?? "";
	if (contentType.includes("text/html")) {
		// The SPA fallback must never masquerade as a runtime file: serving
		// index.html from a worker-script URL breaks loading AND lets the
		// fallback get edge-cached under the long /runtime/* cache rules
		// (Cloudflare keys include Sec-Fetch-Dest, so a fallback cached for
		// a worker fetch sticks for browsers while plain probes look fine).
		return new Response("runtime asset not found", {
			status: 404,
			headers: { "Cache-Control": "no-store" },
		});
	}
	const headers = new Headers(response.headers);
	headers.set("Content-Security-Policy", WEBR_WORKER_CSP);
	// Lets Emscripten's LazyFiles range-chunk the vfs archives instead of
	// force-downloading each whole file when it probes for a length.
	headers.set("Accept-Ranges", "bytes");
	return new Response(response.body, {
		status: response.status,
		statusText: response.statusText,
		headers,
	});
};
