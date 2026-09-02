// Vercel detects Fastify applications from a root-level entrypoint.
// The server module remains the single bootstrap path for local and hosted runs.
import './server/index.mjs'
