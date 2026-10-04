# GrokAgent Frontend

Next.js 15 web application for GrokAgent — an AI agent platform with persistent sandboxed Linux desktop, memory, skills, and tools.

## Stack
- Next.js 15 (App Router, TypeScript)
- Tailwind CSS & Lucide Icons
- Zustand for global state
- WebSocket client for streaming agent tool execution & text
- Embedded noVNC canvas for live agent desktop view

## Quick Start

```bash
# 1. Install dependencies
npm install

# 2. Configure environment
# NEXT_PUBLIC_API_URL=http://localhost:8080/api/v1
# NEXT_PUBLIC_WS_URL=ws://localhost:8080/api/v1/ws

# 3. Run development server
npm run dev
```

Open http://localhost:3000 in your browser.
