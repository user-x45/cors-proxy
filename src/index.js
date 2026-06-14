export default {
  async fetch(request, env, ctx) {
    // 1. リクエストURLから、転送先（ターゲット）のURLを取り出す
    const url = new URL(request.url);
    const targetUrl = url.searchParams.get('url');

    // 転送先URLがない場合はエラーを返す
    if (!targetUrl) {
      return new Response('エラー: "url" パラメータが必要です。', { 
        status: 400,
        headers: { 'Access-Control-Allow-Origin': '*' } // エラー時もCORSを許可
      });
    }

    // 2. OPTIONSメソッド（プリフライトリクエスト）が来たら、CORS許可ヘッダーだけを即座に返す
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
      // 3. 実際にターゲットのURLへリクエストを飛ばす（中継）
      // 元のリクエストのメソッドやヘッダー、ボディを引き継ぐ
      const modifiedRequest = new Request(targetUrl, {
        method: request.method,
        headers: request.headers,
        body: request.body,
      });

      const response = await fetch(modifiedRequest);

      // 4. 返ってきたレスポンスに「CORS許可ヘッダー」を合体させてブラウザに返す
      const newHeaders = new Headers(response.headers);
      newHeaders.set('Access-Control-Allow-Origin', '*');
      newHeaders.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
      newHeaders.set('Access-Control-Allow-Headers', '*');

      return new Response(response.body, {
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
