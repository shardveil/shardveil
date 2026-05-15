import { Hono } from 'hono';
import { serve } from '@hono/node-server';

const app = new Hono();

app.get('/', (c) => c.text('ShardVeil API'));

app.get('/health', (c) =>
  c.json({
    status: 'ok',
    uptime: process.uptime(),
    version: process.env['npm_package_version'] ?? '0.0.1',
  }),
);

const port = Number(process.env['PORT'] ?? 3001);

serve({ fetch: app.fetch, port }, () => {
  console.log(`ShardVeil API listening on http://localhost:${port}`);
});
