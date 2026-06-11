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
import { ListToolsRequestSchema, CallToolRequestSchema } from '@modelcontextprotocol/sdk/types.js'
import { transcribeToolDefinition, handleTranscribe } from './tools/transcribe.js'
import { chronicleToolDefinition, handleChronicle } from './tools/chronicle.js'
import { voiceToChronicleToolDefinition, handleVoiceToChronicle } from './tools/voice-to-chronicle.js'

function createMCPServer() {
  const server = new Server(
    { name: 'chronicler', version: '0.1.0' },
    { capabilities: { tools: {} } },
  )

  server.setRequestHandler(ListToolsRequestSchema, async () => ({
    tools: [voiceToChronicleToolDefinition, transcribeToolDefinition, chronicleToolDefinition],
  }))

  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const { name, arguments: args } = request.params

    try {
      let result: unknown

      if (name === 'voice_to_chronicle') {
        result = await handleVoiceToChronicle(args ?? {})
      } else if (name === 'transcribe_voice') {
        result = await handleTranscribe(args ?? {})
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

  const httpServer = createServer((req: IncomingMessage, res: ServerResponse) => {
    const url = req.url ?? ''
    const method = req.method ?? 'GET'

    if ((url === '/' || url === '/health') && method === 'GET') {
      res.writeHead(200, { 'Content-Type': 'application/json' })
      res.end(JSON.stringify({ status: 'ok' }))
      return
    }

    if (url === '/' || url === '/mcp' || url.startsWith('/mcp?')) {
      if (!checkAuth(req, res)) return

      // Smithery scanner sends Accept: application/json only; SDK requires both.
      // Hono (used internally by the transport) reads rawHeaders, not headers.
      const rawHeaders = req.rawHeaders as string[]
      const acceptIdx = rawHeaders.findIndex(h => h.toLowerCase() === 'accept')
      if (acceptIdx === -1) {
        rawHeaders.push('Accept', 'application/json, text/event-stream')
      } else if (!rawHeaders[acceptIdx + 1]?.includes('text/event-stream')) {
        rawHeaders[acceptIdx + 1] = 'application/json, text/event-stream'
      }

      const chunks: Buffer[] = []
      req.on('data', (chunk: Buffer) => chunks.push(chunk))
      req.on('end', async () => {
        let body: unknown
        try {
          body = JSON.parse(Buffer.concat(chunks).toString())
        } catch {
          body = undefined
        }

        const server = createMCPServer()
        const transport = new StreamableHTTPServerTransport({ sessionIdGenerator: undefined, enableJsonResponse: true })
        try {
          await server.connect(transport)
          await transport.handleRequest(req, res, body)
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
      })
      return
    }

    res.writeHead(404, { 'Content-Type': 'application/json' })
    res.end(JSON.stringify({ error: 'Not found' }))
  })

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
