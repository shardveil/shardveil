import { Hono } from 'hono';
import { serve } from '@hono/node-server';
import { env } from './config/env';

const app = new Hono();

app.get('/', (c) => c.text('ShardVeil API'));

app.get('/health', (c) =>
  c.json({
    status: 'ok',
    uptime: process.uptime(),
    version: process.env['npm_package_version'] ?? '0.0.1',
  }),
);

serve({ fetch: app.fetch, port: env.PORT }, () => {
  console.log(`ShardVeil API listening on http://localhost:${env.PORT}`);
});
