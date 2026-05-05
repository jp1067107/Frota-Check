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

      // 3. Fix Binary Delivery for Images (PNG, JPG, ICO, SVG)
      if (path.match(/\.(png|jpg|jpeg|ico)$/i)) {
        // Ensure it's read as an arrayBuffer, preventing UTF-8 corruption
        const buffer = await response.arrayBuffer();
        
        const newHeaders = new Headers(response.headers);
        if (path.endsWith('.png')) newHeaders.set('Content-Type', 'image/png');
        if (path.endsWith('.ico')) newHeaders.set('Content-Type', 'image/x-icon');
        if (path.match(/\.jpe?g$/i)) newHeaders.set('Content-Type', 'image/jpeg');

        return new Response(buffer, {
          status: response.status,
          headers: newHeaders,
        });
      }

      // 4. Ensure Manifest has correct Content-Type
      if (path.endsWith('manifest.webmanifest')) {
        const text = await response.text();
        const newHeaders = new Headers(response.headers);
        newHeaders.set('Content-Type', 'application/manifest+json');
        
        return new Response(text, {
          status: response.status,
          headers: newHeaders,
        });
      }

      return response;
    } catch (e) {
      return new Response('Internal Server Error', { status: 500 });
    }
  }
};
