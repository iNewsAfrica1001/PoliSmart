# Digital Literacy AI Coach Production Guide

This project is a production-ready frontend and Node.js service package for a Digital Literacy training and education platform. It includes a responsive React application, Express API, Socket.IO live classroom, generative AI coaching endpoint, assessment grading, governance views, health checks, and container deployment files.

## Runtime Shape

- Serves the Vite-built React app from `dist`
- Exposes `/api/*` REST endpoints
- Runs Socket.IO for live classroom collaboration
- Provides health, readiness, and process metrics endpoints
- Applies production security headers, request IDs, JSON limits, and rate limits
- Uses local fallback AI coaching when `LLM_API_KEY` is not configured

## Production Environment

```bash
NODE_ENV=production
HOST=0.0.0.0
PORT=4000
PUBLIC_APP_URL=https://literacy-ai.example.edu
CLIENT_ORIGIN=https://literacy-ai.example.edu
JWT_SECRET=<at-least-32-characters>
PERSISTENCE_MODE=memory
DATABASE_URL=postgresql://...
REDIS_URL=redis://...
LLM_API_KEY=<provider-key>
```

## Required Workflow

1. Student inputs a question, draft, source URL, assignment/rubric, learning goal, and data-sensitivity context.
2. AI produces scaffolded coaching, source-quality prompts, citation guidance, confidence, risk label, and next activity.
3. Student views coaching immediately unless it is high-risk or disputed.
4. Professor views flagged chats, low-confidence answers, assessment gaps, and repeated misconceptions.
5. Admin views anonymized incidents, usage, privacy events, latency, cost, accessibility, and model-quality reports.
6. If AI is wrong, the answer is labeled disputed, routed to professor review, corrected, logged, and added to the evaluation set.
7. Performance is measured with learning gains, helpfulness, citation quality, hallucination rate, review agreement, escalation rate, latency, uptime, cost, accessibility, and privacy incidents.

## Verification

```bash
npm run verify:prod
npm run verify:running
```

## Remaining Backend Work For Full Institutional Launch

- Replace `server/data/store.js` with a PostgreSQL repository using the Prisma schema.
- Add authenticated session/JWT enforcement on protected routes.
- Persist chat transcripts, review cases, audit events, and assessment submissions.
- Connect a real LLM provider with moderation, retrieval, prompt logging, and evaluation controls.
- Add CI browser tests for student, professor, and admin flows.
