# GrokAgent frontend

Next.js 16.3.8 / React 19.2.8 App Router UI for the separate GrokAgent backend.

## Local setup

Use Node.js 22.18+ (Node 22 is used by Docker):

```sh
npm ci
cp .env.example .env.local
npm run dev
```

Open http://localhost:3000. Start the backend separately; default REST and WebSocket endpoints are `http://localhost:8080/api/v1` and `ws://localhost:8080/api/v1/ws`. Register/sign in, create an agent, then start or reopen a conversation. New agents share one persistent computer per user; each agent retains separate memory. Backend CORS must allow the frontend origin. Public environment variables contain browser-visible addresses, never secrets.

## Features and contracts

- Shared navigation: agents, saved conversations, memory, skills, usage, and MCP settings. Administration is a separate app. The agent list resumes the latest saved conversation by default; use the + button to start a new one. User messages are saved before execution, so provider failures and reloads do not erase the prompt.
- Streaming Markdown and tool cards; assistant text continues after tool calls. Completion, errors and interruptions finalize streaming. Errors are visible, sends are disabled while busy/loading, and conversation state is isolated by user/conversation.
- Reconnect with backoff reloads persisted history before enabling sends; messages are never automatically resent. Backend must cancel disconnected runs or enforce one active run per conversation. There is no stream replay/resume protocol; interrupted responses can be incomplete.
- `GET /conversations/:id` returns `{id, agent_id, title}`; `GET /agents/:id` supplies the linked agent's status/noVNC port. Agent readiness is polled every five seconds, never inferred from another agent.
- Socket events: `text`, `tool_call`, `tool_result`, `done`, `error`, optional `approval`. Tool IDs (`tool_call_id`, `call_id`, or `id`) correlate results when supplied; older events use the most recent unmatched call. History supports `tool_call`, `tool_result` and legacy `tool` rows with `tool_name`, JSON input/text output in `content`, and optional `tool_call_id`.
- Permission requests are polled every two seconds and shown globally with full action text, Allow Once / Always allow / Deny, saving state, and retryable errors. Enforcement belongs to the backend: shell, Python, browser, file writes/deletes, and external MCP execution must wait for authorization there. The UI does not itself sandbox or authorize execution. “Always allow” scope/lifetime is backend-defined.
- Skills may omit `agent_id` for user-wide skills; the backend must accept a nullable agent association.

## Desktop and production deployment

`NEXT_PUBLIC_DESKTOP_BASE_URL` sets the browser-reachable desktop scheme/hostname (defaults to the API host when omitted). The agent's `novnc_port` is used with `/vnc.html?autoconnect=1&resize=scale`. Published ports must be reachable from the browser. For HTTPS deployments provide TLS for desktop ports as well; HTTP iframes are blocked by HTTPS pages. Desktop proxy authentication and port exposure must be secured at deployment; noVNC does not inherit the frontend login automatically.

There is one Next config (`next.config.ts`), with standalone output. Docker public URLs must be passed **at build time** because Next inlines them into browser bundles:

```sh
docker build -t grok-agent-frontend \
  --build-arg NEXT_PUBLIC_API_URL=https://api.example.com/api/v1 \
  --build-arg NEXT_PUBLIC_WS_URL=wss://api.example.com/api/v1/ws \
  --build-arg NEXT_PUBLIC_DESKTOP_BASE_URL=https://desktop.example.com .
docker run --rm -p 3000:3000 grok-agent-frontend
```

The runtime runs as the unprivileged `node` user and listens on `0.0.0.0:3000`. Reverse proxies must support WebSocket upgrades and sufficiently long timeouts. Public URL changes require rebuilding. Auth tokens currently persist in browser localStorage and are sent in the WebSocket query; use TLS, avoid logging query strings, and do not expose this service to untrusted users without production auth hardening.

For a local non-Docker build, run `npm run build && npm start`. Standalone packaging requires `.next/static` and `public` alongside the generated server (the Dockerfile copies them).

## Validation

```sh
npm run test       # Node built-in runner; streaming/history regression tests
npm run typecheck
npm run lint
npm run build
```

Tests do not require additional packages. They cover reducer behavior, not a live browser/backend or Docker environment. End-to-end approval enforcement, sandbox startup, MCP connectivity and desktop access require the running backend and infrastructure.
