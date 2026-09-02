// Vercel statically detects Fastify from a direct entrypoint import.
// The server module remains the single bootstrap path for local and hosted runs.
import Fastify from 'fastify'
import './server/index.mjs'

// Keep the direct import observable without constructing a second application.
void Fastify
