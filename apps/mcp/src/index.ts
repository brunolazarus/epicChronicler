import '@chronicler/core' // validate env before anything else

process.on('uncaughtException', (err) => {
  console.error('uncaughtException:', err)
})
process.on('unhandledRejection', (reason) => {
  console.error('unhandledRejection:', reason)
})
import { createServer, IncomingMessage, ServerResponse } from 'node:http'
import { Server } from '@modelcontextprotocol/sdk/server/index.js'
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js'
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js'
import { ListToolsRequestSchema, CallToolRequestSchema, ListResourcesRequestSchema, ListPromptsRequestSchema } from '@modelcontextprotocol/sdk/types.js'
import { chronicleToolDefinition, handleChronicle } from './tools/chronicle.js'
import { createAudioUploadToolDefinition, handleCreateAudioUpload } from './tools/create-audio-upload.js'
import { processAudioToolDefinition, handleProcessAudio, getAudioJobToolDefinition, handleGetAudioJob } from './tools/process-audio.js'
import { createPipelineWorker } from './workers/pipeline.js'

const ALL_TOOLS = [
  createAudioUploadToolDefinition,
  processAudioToolDefinition,
  getAudioJobToolDefinition,
  chronicleToolDefinition,
]

function createMCPServer() {
  const server = new Server(
    { name: 'chronicler', version: '0.2.0' },
    { capabilities: { tools: {}, resources: {}, prompts: {} } },
  )

  server.setRequestHandler(ListToolsRequestSchema, async () => ({ tools: ALL_TOOLS }))
  server.setRequestHandler(ListResourcesRequestSchema, async () => ({ resources: [] }))
  server.setRequestHandler(ListPromptsRequestSchema, async () => ({ prompts: [] }))

  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const { name, arguments: args } = request.params

    try {
      let result: unknown

      if (name === 'create_audio_upload') {
        result = await handleCreateAudioUpload(args ?? {})
      } else if (name === 'process_audio') {
        result = await handleProcessAudio(args ?? {})
      } else if (name === 'get_audio_job') {
        result = await handleGetAudioJob(args ?? {})
      } else if (name === 'generate_chronicle') {
        result = await handleChronicle(args ?? {})
      } else {
        throw new Error(`Unknown tool: ${name}`)
      }

      return {
        content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
      }
    } catch (err) {
      return {
        content: [{ type: 'text', text: `Error: ${err instanceof Error ? err.message : String(err)}` }],
        isError: true,
      }
    }
  })

  return server
}

const PORT = process.env['PORT'] ? parseInt(process.env['PORT'], 10) : null
const MCP_API_KEY = process.env['MCP_API_KEY']

if (PORT) {
  // ---------------------------------------------------------------------------
  // HTTP transport — remote clients (Railway, Smithery)
  // ---------------------------------------------------------------------------

  function checkAuth(req: IncomingMessage, res: ServerResponse): boolean {
    if (!MCP_API_KEY) return true
    const authHeader = req.headers['authorization'] ?? ''
    const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : authHeader
    if (token !== MCP_API_KEY) {
      res.writeHead(401, { 'Content-Type': 'application/json' })
      res.end(JSON.stringify({ error: 'Unauthorized' }))
      return false
    }
    return true
  }

  const httpServer = createServer(async (req: IncomingMessage, res: ServerResponse) => {
    const url = req.url ?? ''
    const method = req.method ?? 'GET'

    if ((url === '/' || url === '/health') && method === 'GET') {
      res.writeHead(200, { 'Content-Type': 'application/json' })
      res.end(JSON.stringify({ status: 'ok' }))
      return
    }

    if (url === '/.well-known/mcp/server-card.json' && method === 'GET') {
      res.writeHead(200, { 'Content-Type': 'application/json' })
      res.end(JSON.stringify({
        serverInfo: { name: 'chronicler', version: '0.2.0' },
        tools: ALL_TOOLS,
      }))
      return
    }

    if (url === '/' || url === '/mcp' || url.startsWith('/mcp?')) {
      if (!checkAuth(req, res)) return

      const chunks: Buffer[] = []
      await new Promise<void>((resolve) => {
        req.on('data', (chunk: Buffer) => chunks.push(chunk))
        req.on('end', () => resolve())
      })
      const rawBody = Buffer.concat(chunks)
      ;(req as unknown as Record<string, unknown>).rawBody = rawBody
      let parsedBody: unknown
      try { parsedBody = JSON.parse(rawBody.toString()) } catch { parsedBody = undefined }
      const server = createMCPServer()
      const transport = new StreamableHTTPServerTransport({ sessionIdGenerator: undefined, enableJsonResponse: true })
      try {
        await server.connect(transport)
        await transport.handleRequest(req, res, parsedBody)
        res.on('close', () => {
          transport.close()
          server.close()
        })
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : String(err)
        console.error('MCP HTTP transport error:', err)
        if (!res.headersSent) {
          res.writeHead(500, { 'Content-Type': 'application/json' })
          res.end(JSON.stringify({ error: message }))
        }
      }
      return
    }

    res.writeHead(404, { 'Content-Type': 'application/json' })
    res.end(JSON.stringify({ error: 'Not found' }))
  })

  const pipelineWorker = createPipelineWorker()
  console.error('✅ MCP pipeline worker started')

  async function shutdown() {
    console.error('Shutting down MCP...')
    await pipelineWorker.close()
    httpServer.close()
    process.exit(0)
  }
  process.on('SIGTERM', shutdown)
  process.on('SIGINT', shutdown)

  httpServer.listen(PORT, '0.0.0.0', () => {
    console.error(`✅ Chronicler MCP HTTP server listening on port ${PORT} (path /mcp)`)
  })
} else {
  // ---------------------------------------------------------------------------
  // Stdio transport — local clients (Claude Desktop, Cursor direct)
  // ---------------------------------------------------------------------------

  const server = createMCPServer()
  const transport = new StdioServerTransport()
  await server.connect(transport)
  console.error('✅ Chronicler MCP server running on stdio')
}
