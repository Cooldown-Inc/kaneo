export default {
  async fetch(request, env, ctx): Promise<Response> {
    // Serve static files first
    try {
      // @ts-ignore – this is provided by Wrangler when you use [site]
      return await env.ASSETS.fetch(request);
    } catch (_) {
      // If the asset isn't found, fall back to index.html (SPA)
      const url = new URL(request.url);
      const indexUrl = new URL("/index.html", url.origin);

      // Reuse the same host but force path to index.html
      const indexRequest = new Request(indexUrl.toString(), request);
      // @ts-ignore
      return await env.ASSETS.fetch(indexRequest);
    }
  },
};

