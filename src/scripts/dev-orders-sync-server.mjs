import fs from 'fs';
import http from 'http';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = Number(process.env.DEV_ORDERS_SYNC_PORT || '3011');
const HOST = process.env.DEV_ORDERS_SYNC_HOST || '0.0.0.0';
const SYNC_PATH = '/api/dev/orders-sync';
const CONFIG_SYNC_PATH = '/api/dev/config-sync';
const STORE_FILE = path.resolve(__dirname, '../.dev-data/orders-sync.json');
const CONFIG_STORE_FILE = path.resolve(__dirname, '../.dev-data/config-sync.json');

function ensureStoreDir() {
  fs.mkdirSync(path.dirname(STORE_FILE), { recursive: true });
}

function readPayload() {
  try {
    return JSON.parse(fs.readFileSync(STORE_FILE, 'utf-8'));
  } catch {
    return { orders: null, updatedAt: null };
  }
}

function writePayload(payload) {
  ensureStoreDir();
  fs.writeFileSync(STORE_FILE, JSON.stringify(payload, null, 2), 'utf-8');
}

function readConfigPayload() {
  try {
    return JSON.parse(fs.readFileSync(CONFIG_STORE_FILE, 'utf-8'));
  } catch {
    return { config: null, updatedAt: null };
  }
}

function writeConfigPayload(payload) {
  ensureStoreDir();
  fs.writeFileSync(CONFIG_STORE_FILE, JSON.stringify(payload, null, 2), 'utf-8');
}

const server = http.createServer((req, res) => {
  const requestUrl = req.url ? new URL(req.url, `http://127.0.0.1:${PORT}`) : null;
  if (!requestUrl || ![SYNC_PATH, CONFIG_SYNC_PATH].includes(requestUrl.pathname)) {
    res.statusCode = 404;
    res.end('Not Found');
    return;
  }

  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,PUT,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store');

  if (req.method === 'OPTIONS') {
    res.statusCode = 204;
    res.end();
    return;
  }

  if (req.method === 'GET') {
    res.statusCode = 200;
    res.end(JSON.stringify(
      requestUrl.pathname === CONFIG_SYNC_PATH
        ? readConfigPayload()
        : readPayload(),
    ));
    return;
  }

  if (req.method === 'PUT') {
    const chunks = [];
    req.on('data', chunk => chunks.push(chunk));
    req.on('end', () => {
      try {
        const raw = Buffer.concat(chunks).toString('utf-8') || '{}';
        const parsed = JSON.parse(raw);

        if (requestUrl.pathname === CONFIG_SYNC_PATH) {
          if (!parsed.config || typeof parsed.config !== 'object' || Array.isArray(parsed.config)) {
            res.statusCode = 400;
            res.end(JSON.stringify({ error: 'config must be an object' }));
            return;
          }

          writeConfigPayload({
            config: parsed.config,
            updatedAt: typeof parsed.updatedAt === 'string' ? parsed.updatedAt : new Date().toISOString(),
          });
          res.statusCode = 200;
          res.end(JSON.stringify({ ok: true }));
          return;
        }

        if (!Array.isArray(parsed.orders)) {
          res.statusCode = 400;
          res.end(JSON.stringify({ error: 'orders must be an array' }));
          return;
        }

        writePayload({
          orders: parsed.orders,
          updatedAt: typeof parsed.updatedAt === 'string' ? parsed.updatedAt : new Date().toISOString(),
        });
        res.statusCode = 200;
        res.end(JSON.stringify({ ok: true }));
      } catch (error) {
        res.statusCode = 400;
        res.end(JSON.stringify({
          error: error instanceof Error ? error.message : 'invalid payload',
        }));
      }
    });
    return;
  }

  res.statusCode = 405;
  res.end(JSON.stringify({ error: 'method not allowed' }));
});

server.on('error', error => {
  console.error(`[dev-orders-sync] failed to listen on ${HOST}:${PORT}`);
  console.error(error);
  process.exit(1);
});

server.listen(PORT, HOST, () => {
  console.log(`[dev-orders-sync] listening on http://${HOST}:${PORT}${SYNC_PATH}`);
  console.log(`[dev-config-sync] listening on http://${HOST}:${PORT}${CONFIG_SYNC_PATH}`);
});
