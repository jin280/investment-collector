# Investment Collection

A full-stack application simulating a core insurance/pension data collection flow: provider connection, BankID authentication, real-time data collection, and investment display.

## Quick Start

```bash
# Terminal 1 — Backend
cd backend && npm install && npm run dev

# Terminal 2 — Frontend
cd frontend && npm install && npm run dev
```

Open http://localhost:5173, enter personnummer `199001011239`, and click **Connect Avanza**. On the BankID screen, click **Mock successful login** to simulate authentication, then view the investment results.

## Architecture

```
User → React Frontend → Express Backend → BankID Mock + Provider Adapter
         (Vite)           (Node.js)
```

**Flow:** Enter personnummer → BankID QR authentication → View investment data

### Backend (Clean/Layered Architecture)

```
backend/src/
├── domain/          # Pure business logic (types, errors, personnummer validation)
├── services/        # Application layer (BankID auth, collection orchestration)
├── providers/       # Adapter pattern for provider integrations
├── store/           # In-memory session repository (swappable for Redis/DB)
├── routes/          # Thin Express controllers
└── middleware/       # Global error handling
```

### Frontend

```
frontend/src/
├── components/      # StartCollection, BankIdAuth, InvestmentResults
├── hooks/           # useCollection (flow), useBankIdAuth (polling + QR)
├── api/             # Typed fetch wrappers with timeout handling
├── utils/           # Client-side personnummer validation
└── types/           # Shared TypeScript types
```

## Getting Started

### Prerequisites

- Node.js 18+
- npm

### Backend

```bash
cd backend
npm install
npm run dev
# Server on http://localhost:3001
```

### Frontend

```bash
cd frontend
npm install
npm run dev
# App on http://localhost:5173
```

### Verify Installation

After starting both services:

- Backend: http://localhost:3001 should be reachable (API only, no UI)
- Frontend: http://localhost:5173 should show the Investment Collection form
- Enter test personnummer `199001011239` and proceed through the flow

### Running Tests

```bash
# Backend
cd backend
npm test

# Frontend
cd frontend
npm test
```

**Backend tests**:
- **Unit tests**: personnummer validation (Luhn, formats, edge cases), BankID session state machine (create, QR rotation, state transitions, expiry), collection service orchestration, session store CRUD
- **Integration tests**: all 5 API endpoints via supertest (happy paths, error responses with correct HTTP status codes, full end-to-end flow)
- **Provider tests**: mock data shape validation, totalValue consistency

**Frontend tests**:
- **Component tests**: StartCollection, BankIdAuth, InvestmentResults, ErrorBoundary, ErrorMessage
- **Hook tests**: useCollection flow management, useBankIdAuth polling and status handling
- **API tests**: request/response handling, error mapping, network failures
- **Utility tests**: personnummer validation (Luhn, formats, edge cases)

### Environment Variables (optional)

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | `3001` | Backend server port |
| `CORS_ORIGIN` | `http://localhost:5173` | Allowed CORS origin (must match frontend dev server) |
| `VITE_API_URL` | `http://localhost:3001` | Backend URL (frontend) |

## API Reference

Endpoints mirror the real BankID API structure:

| Method | Path | Purpose |
|--------|------|---------|
| `POST` | `/api/collections/auth` | Start BankID session (body: `{ personalNumber }`) |
| `POST` | `/api/collections/collect` | Poll status + get QR data (body: `{ orderRef }`) |
| `POST` | `/api/collections/complete` | Mock successful authentication (body: `{ orderRef }`) |
| `POST` | `/api/collections/cancel` | Cancel pending session (body: `{ orderRef }`) |
| `GET` | `/api/collections/:orderRef/result` | Get investment data after auth |

## Design Decisions

- **BankID API structure**: Endpoints mirror `/rp/v6.0/auth`, `/collect`, `/cancel` from the real BankID specification. QR data uses HMAC-SHA256 rotation as per the BankID protocol.
- **Provider adapter pattern**: `providers/avanza/mockProvider.ts` implements a `Provider` interface, making it easy to add new providers (SEB, ICA, etc.).
- **Separated BankID and collection services**: BankID is an external auth service — keeping it separate from collection logic mirrors real architecture.
- **Domain layer has zero framework imports**: Business rules (personnummer validation, types, errors) are portable and testable without Express.
- **Session repository interface**: `sessionStore` implements a `SessionRepository` interface with a `clear()` method for test isolation, making it trivial to swap for Redis/PostgreSQL.
- **Discriminated union types**: The `CollectResult` type uses a discriminated union on `status`, ensuring type-safe responses for pending/complete/failed states.
- **Polling over WebSocket**: Simpler to implement and matches BankID's actual `/collect` polling pattern.
- **Client-side Luhn validation**: Instant feedback before hitting the server, with duplicate validation on the backend.
- **Ref-based callback stability**: `useBankIdAuth` stores the `onComplete` callback in a ref to prevent polling effect restarts when parent re-renders.
- **API request timeouts**: All frontend API calls use `AbortController` with a 15-second timeout to prevent indefinite hangs.

## Trade-offs

- **In-memory store**: Sessions are lost on restart. Acceptable for a demo; would use Redis in production.
- **Polling at 1s interval**: Simple and reliable. WebSocket would be better for production (less overhead, real-time).
- **Mock provider returns static data**: Real providers would make HTTP calls to external APIs.
- **Simplified state machine**: Sessions transition directly from `pending` to `complete` (or `failed`), without an explicit `authenticated` intermediate state. The real BankID flow has more granular hint codes (`outstandingTransaction` → `userSign` → `started`) before completion. A `userSign` enum value exists in the domain types for future use but is not currently surfaced in the mock flow.
- **Single mock authentication method**: The UI provides a "Mock successful login" button to simulate BankID authentication. In production, scanning the QR would trigger the status transition server-side. Adding an auto-complete timer (e.g. transition to `complete` after 10s) would simulate the scan-based flow without requiring a button click.

## AI Usage

This project was built with assistance from Claude Code (Anthropic's CLI tool). AI was used for code generation, architecture decisions, test writing, and documentation throughout the development process.

## What I'd Improve With More Time

- Integration / E2E tests (Playwright or Cypress for the full flow)
- WebSocket for real-time status updates instead of polling
- Persistent storage (Redis for sessions, PostgreSQL for results)
- Docker Compose for one-command startup
- Multiple provider adapters (SEB, Nordea) with provider selection UI
- Rate limiting and request validation middleware
- CI/CD pipeline with linting and type checking

## Troubleshooting

**Port 3001 or 5173 already in use:**
```bash
# Change backend port
PORT=3002 npm run dev
# Update frontend to match
VITE_API_URL=http://localhost:3002 npm run dev
```

**CORS errors in browser console:**
Ensure the backend is running and `CORS_ORIGIN` matches the frontend URL (default: `http://localhost:5173`).

**Node version issues:**
Verify your Node.js version: `node --version` (requires 18+). Install from [nodejs.org](https://nodejs.org) if needed.

## Test Personnummer

Use `199001011239` (passes Luhn validation) for testing.
