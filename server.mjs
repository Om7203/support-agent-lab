import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname, join, normalize, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { runAgent } from './src/graph.mjs';

const root = fileURLToPath(new URL('./web/', import.meta.url));
const types = { '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.mjs': 'text/javascript; charset=utf-8' };
const maxBody = 8_192;

export function createApp() {
  return createServer(async (request, response) => {
    const requestId = crypto.randomUUID();
    const send = (status, body, type = 'application/json; charset=utf-8') => {
      response.writeHead(status, { 'content-type': type, 'x-content-type-options': 'nosniff', 'cache-control': 'no-store', 'x-request-id': requestId });
      response.end(type.startsWith('application/json') ? JSON.stringify(body) : body);
    };
    try {
      const url = new URL(request.url, 'http://localhost');
      if (request.method === 'GET' && url.pathname === '/health') return send(200, { status: 'ok' });
      if (request.method === 'POST' && url.pathname === '/api/chat') {
        let raw = '';
        for await (const chunk of request) {
          raw += chunk;
          if (raw.length > maxBody) return send(413, { error: 'Request too large.' });
        }
        let payload;
        try { payload = JSON.parse(raw); } catch { return send(400, { error: 'Invalid JSON.' }); }
        try { return send(200, await runAgent(payload.question)); }
        catch (error) { return send(400, { error: error.message }); }
      }
      if (request.method !== 'GET') return send(405, { error: 'Method not allowed.' });
      const relative = url.pathname === '/' ? 'index.html' : decodeURIComponent(url.pathname.slice(1));
      const file = normalize(join(root, relative));
      if (!file.startsWith(root) || !types[extname(file)]) return send(404, { error: 'Not found.' });
      try { return send(200, await readFile(file), types[extname(file)]); }
      catch { return send(404, { error: 'Not found.' }); }
    } catch (error) {
      console.error(JSON.stringify({ level: 'error', requestId, message: error.message }));
      return send(500, { error: 'Internal server error.' });
    }
  });
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  const port = Number(process.env.PORT || 3000);
  createApp().listen(port, '127.0.0.1', () => console.log(`Support Agent Lab: http://127.0.0.1:${port}`));
}
