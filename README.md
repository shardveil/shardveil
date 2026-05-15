# ShardVeil

> Blockchain card game on Arbitrum with on-chain battles, tournaments, and trading.

![CI](https://github.com/zdnemz/shardveil/actions/workflows/ci.yml/badge.svg)
![Status](https://img.shields.io/badge/status-pre--alpha-orange)

---

## Quickstart

Get `pnpm dev` running in under 5 minutes.

### 1. Clone & Install

```bash
git clone https://github.com/zdnemz/shardveil.git
cd shardveil/app
pnpm install
```

### 2. Set Up Services

```bash
pnpm services:up
```

This starts PostgreSQL (localhost:5432) and Redis (localhost:6379) via Docker.  
Default credentials: `shardveil` / `shardveil`

### 3. Start Development Server

```bash
pnpm dev
```

This starts all apps concurrently:

- **Frontend:** http://localhost:3000 (Next.js 15 with App Router)
- **API:** http://localhost:3001 (Hono.js backend)

---

## Repository Structure

```
shardveil/app/
├── apps/
│   ├── web/                    # Frontend (Next.js 15, @shardveil/web)
│   │   ├── app/                # App Router pages
│   │   ├── components/         # React components
│   │   └── package.json
│   │
│   └── api/                    # Backend API (Hono.js, @shardveil/api)
│       ├── src/
│       │   ├── routes/         # Hono route handlers
│       │   ├── services/       # Business logic
│       │   ├── middleware/     # Auth, validation, error handling
│       │   ├── workers/        # Background jobs (BullMQ)
│       │   └── index.ts        # Server entry
│       └── package.json
│
├── packages/
│   ├── shared/                 # Types, constants, utils (@shardveil/shared)
│   │   ├── src/
│   │   │   ├── types/          # Shared TypeScript types
│   │   │   ├── constants.ts    # Shared constants
│   │   │   └── utils/          # Utility functions
│   │   └── package.json
│   │
│   ├── contracts/              # Smart contract ABIs (@shardveil/contracts)
│   │   ├── abi/                # Contract ABIs (JSON)
│   │   ├── addresses.ts        # Deployed contract addresses
│   │   └── package.json
│   │
│   └── config/                 # Shared configs (@shardveil/config)
│       ├── eslint.js
│       ├── prettier.js
│       ├── tailwind.js
│       ├── tsconfig.json
│       └── package.json
│
├── docker-compose.yml          # PostgreSQL + Redis services
├── .env.example                # Environment variables template
├── package.json                # Root workspace config
├── pnpm-workspace.yaml         # Workspace definition
└── turbo.json                  # Turborepo config
```

### Key Files

- **`pnpm-workspace.yaml`**: Defines monorepo workspaces (apps + packages)
- **`turbo.json`**: Turborepo build & dev task pipeline
- **`.nvmrc`**: Node version (20 LTS)
- **`docker-compose.yml`**: PostgreSQL 16 + Redis 7 for local dev

---

## Environment Variables

Configuration is managed via `.env` (local) or host secret managers (production).

Copy `.env.example` to `.env` and fill in your values:

```bash
cp .env.example .env
```

**Key variables:**

- `NODE_ENV`: `development`, `staging`, or `production`
- `DATABASE_URL`: PostgreSQL connection string (format in `.env.example`)
- `REDIS_URL`: Redis connection string
- `JWT_SECRET`: Secret for signing JWTs
- `CORS_ORIGINS`: Comma-separated allowed origins for API requests
- `ETH_RPC_URL`: Ethereum RPC endpoint (optional for local dev)
- `LOG_LEVEL`: `debug`, `info`, `warn`, or `error`

See `.env.example` for all variables and defaults.

---

## Running Services

### Start Services

```bash
pnpm services:up
```

Brings up PostgreSQL and Redis in Docker. Runs in background.

### View Logs

```bash
pnpm services:logs
```

### Stop Services

```bash
pnpm services:down
```

---

## Running Tests

```bash
pnpm test
```

Runs all tests in the monorepo via Turborepo.

**Test frameworks:**

- **Frontend:** Vitest (unit) + Playwright (E2E)
- **Backend:** Jest (unit) + integration tests

**Run specific suite:**

```bash
pnpm test --filter=@shardveil/web
pnpm test --filter=@shardveil/api
```

**Watch mode:**

```bash
pnpm test -- --watch
```

---

## Deployment

### Staging & Production

Deployment configuration and launch readiness procedures are documented in **`../plans/22-launch.md`**.

Key deployment targets:

- **Frontend:** Vercel (auto-deployed from `main` and `staging` branches)
- **API:** Railway or Render (managed PostgreSQL + Redis)
- **Smart Contracts:** Arbitrum Sepolia (staging) and Arbitrum One (production)

---

## Development Commands

| Command              | Purpose                       |
| -------------------- | ----------------------------- |
| `pnpm dev`           | Start all apps in dev mode    |
| `pnpm build`         | Build all apps for production |
| `pnpm lint`          | Run ESLint on all code        |
| `pnpm typecheck`     | TypeScript type checking      |
| `pnpm format`        | Format code with Prettier     |
| `pnpm test`          | Run all tests                 |
| `pnpm clean`         | Remove build artifacts        |
| `pnpm services:up`   | Start PostgreSQL + Redis      |
| `pnpm services:down` | Stop services                 |
| `pnpm services:logs` | View service logs             |

---

## Prerequisites

- **Node.js 20 LTS** (check `.nvmrc`)
- **pnpm 9** (`npm install -g pnpm@9`)
- **Docker + Docker Compose** (for services)

---

## Tech Stack

- **Monorepo:** pnpm workspaces + Turborepo
- **Frontend:** Next.js 15 (App Router), TypeScript, Tailwind CSS v3
- **Backend:** Hono.js, Prisma ORM, BullMQ workers
- **Database:** PostgreSQL 16
- **Cache:** Redis 7
- **Blockchain:** Arbitrum (Sepolia testnet + One mainnet)
- **Smart Contracts:** Solidity (10 core + 4 Phase 2A contracts)

---

## Troubleshooting

### `pnpm dev` fails to start

1. Ensure services are running: `pnpm services:up`
2. Check `.env` is set up: `cp .env.example .env`
3. Verify Node version: `node --version` (should be 20.x)

### Database connection errors

1. Verify PostgreSQL is running: `docker ps | grep postgres`
2. Check connection string in `.env` matches `docker-compose.yml`
3. View logs: `pnpm services:logs`

### Port already in use

Ensure these ports are free:

- 3000 (frontend)
- 3001 (API)
- 5432 (PostgreSQL)
- 6379 (Redis)

---

## Contributing

- Follow [Conventional Commits](https://www.conventionalcommits.org/) for commit messages
- Run `pnpm lint` and `pnpm typecheck` before committing
- All PRs must pass CI pipeline (GitHub Actions)

---

## License

Proprietary — All rights reserved.
