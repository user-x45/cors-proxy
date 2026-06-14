export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const targetUrl = url.searchParams.get('url');

    if (!targetUrl) {
      return new Response('エラー: "url" パラメータが必要です。', {
        status: 400,
        headers: { 'Access-Control-Allow-Origin': '*' }
      });
    }

    if (request.method === 'OPTIONS') {
      return new Response(null, {
        status: 204,
        headers: {
          'Access-Control-Allow-Origin': '*',
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
      const xmlText = await response.text();

      const newHeaders = new Headers(response.headers);
      newHeaders.set('Access-Control-Allow-Origin', '*');
      newHeaders.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
      newHeaders.set('Access-Control-Allow-Headers', '*');

      const isAtom = xmlText.includes('<feed') || xmlText.includes('<entry');
      const itemRegex = isAtom ? /<entry[\s\S]*?<\/entry>/g : /<item[\s\S]*?<\/item>/g;
      const dateRegex = isAtom ? /<(?:updated|published)[^>]*>([\s\S]*?)<\/(?:updated|published)>/ : /<(?:pubDate|dc:date)[^>]*>([\s\S]*?)<\/(?:pubDate|dc:date)>/;

      const items = xmlText.match(itemRegex) || [];
      
      const parsedItems = items.map(item => {
        const dateMatch = item.match(dateRegex);
        const dateStr = dateMatch ? dateMatch[1].trim() : '';
        const timestamp = dateStr ? new Date(dateStr).getTime() : 0;
        return { item, timestamp };
      });

      parsedItems.sort((a, b) => b.timestamp - a.timestamp);

      const top20Items = parsedItems.slice(0, 20).map(x => x.item).join('\n');

      let finalXml = '';
      const firstItemIndex = xmlText.search(itemRegex);

      if (firstItemIndex !== -1) {
        const header = xmlText.substring(0, firstItemIndex);
        
        const lastItemMatch = [...xmlText.matchAll(itemRegex)].pop();
        const lastItemEndIndex = lastItemMatch.index + lastItemMatch[0].length;
        const footer = xmlText.substring(lastItemEndIndex);

        finalXml = header + top20Items + footer;
      } else {
        finalXml = xmlText;
      }

      return new Response(finalXml, {
        status: response.status,
        statusText: response.statusText,
        headers: newHeaders,
      });

    } catch (error) {
      return new Response(`プロキシ通信エラー: ${error.message}`, {
        status: 500,
        headers: { 'Access-Control-Allow-Origin': '*' }
      });
    }
  },
};
