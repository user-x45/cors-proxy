export default {
  async fetch(request, env, ctx) {
    const allowedOrigin = 'https://portalite.f5.si/';
    const origin = request.headers.get('Origin');
    const referer = request.headers.get('Referer');

    const isAllowed = 
      (origin && origin.startsWith(allowedOrigin)) || 
      (referer && referer.startsWith(allowedOrigin));

    if (!isAllowed) {
      return new Response('エラー: アクセスが許可されていません。', {
        status: 403,
        headers: { 'Access-Control-Allow-Origin': allowedOrigin }
      });
    }

    const url = new URL(request.url);
    const targetUrl = url.searchParams.get('url');

    if (!targetUrl) {
      return new Response('エラー: "url" パラメータが必要です。', {
        status: 400,
        headers: { 'Access-Control-Allow-Origin': allowedOrigin }
      });
    }

    if (request.method === 'OPTIONS') {
      return new Response(null, {
        status: 204,
        headers: {
          'Access-Control-Allow-Origin': allowedOrigin,
          'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
          'Access-Control-Allow-Headers': '*',
          'Access-Control-Max-Age': '86400',
        },
      });
    }

    try {
      const modifiedRequest = new Request(targetUrl, {
        method: request.method,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          'Accept-Language': 'ja,en-US;q=0.9,en;q=0.8',
          'Cache-Control': 'no-cache',
        },
        body: request.method !== 'GET' && request.method !== 'HEAD' ? request.body : undefined,
      });

      const response = await fetch(modifiedRequest);

      const newHeaders = new Headers(response.headers);
      newHeaders.set('Access-Control-Allow-Origin', allowedOrigin);
      newHeaders.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
      newHeaders.set('Access-Control-Allow-Headers', '*');

      let itemCount = 0;
      let entryCount = 0;

      const rewriter = new HTMLRewriter()
        .on('item', {
          element(element) {
            itemCount++;
            if (itemCount > 20) {
              element.remove();
            }
          }
        })
        .on('entry', {
          element(element) {
            entryCount++;
            if (entryCount > 20) {
              element.remove();
            }
          }
        });

      const transformedResponse = rewriter.transform(response);

      return new Response(transformedResponse.body, {
        status: response.status,
        statusText: response.statusText,
        headers: newHeaders,
      });

    } catch (error) {
      return new Response(`プロキシ通信エラー: ${error.message}`, {
        status: 500,
        headers: { 'Access-Control-Allow-Origin': allowedOrigin }
      });
    }
  },
};
