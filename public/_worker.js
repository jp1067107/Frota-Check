export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const path = url.pathname;

    try {
      // 1. Fetch from Cloudflare ASSETS
      const response = await env.ASSETS.fetch(request);

      // 2. Disable HTML Fallback for Static Assets
      // If asset is not found and it's a known static file extension, return 404
      if (response.status === 404) {
        if (path.match(/\.(js|png|jpg|jpeg|svg|webmanifest|css|json|ico)$/i)) {
          return new Response('Not Found', { status: 404 });
        }
        
        // SPA Fallback for navigation requests
        return env.ASSETS.fetch(new Request(new URL('/', request.url)));
      }

      // 3. Fix Binary Delivery for PNGs
      if (path.endsWith('.png')) {
        // Ensure it's read as an arrayBuffer, preventing UTF-8 corruption
        const buffer = await response.arrayBuffer();
        return new Response(buffer, {
          status: response.status,
          headers: {
            ...Object.fromEntries(response.headers),
            'Content-Type': 'image/png',
          },
        });
      }

      // 4. Ensure Manifest has correct Content-Type
      if (path.endsWith('manifest.webmanifest')) {
        return new Response(await response.text(), {
          status: response.status,
          headers: {
            ...Object.fromEntries(response.headers),
            'Content-Type': 'application/manifest+json',
          },
        });
      }

      return response;
    } catch (e) {
      return new Response('Internal Server Error', { status: 500 });
    }
  }
};
