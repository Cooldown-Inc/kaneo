export default {
  async fetch(request, env, ctx): Promise<Response> {
    // Check if ASSETS binding is available (may not be in dev mode with Vite plugin)
    // @ts-ignore – this is provided by Wrangler when you use [site]
    if (!env.ASSETS) {
      // In development, Vite handles static assets directly
      // Return 404 to let Vite dev server handle the request
      return new Response("Not found", { status: 404 });
    }

    // Try to fetch the requested asset
    // @ts-ignore – this is provided by Wrangler when you use [site]
    const asset = await env.ASSETS.fetch(request);
    
    // If the asset exists (not 404), return it
    if (asset.status !== 404) {
      return asset;
    }

    // If asset not found, serve index.html for SPA routing
    // The not_found_handling: "single-page-application" in wrangler.jsonc
    // should handle this, but we'll also do it here as a fallback
    const url = new URL(request.url);
    const indexRequest = new Request(`${url.origin}/index.html`, request);
    // @ts-ignore
    return await env.ASSETS.fetch(indexRequest);
  },
};

