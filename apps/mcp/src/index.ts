import '@chronicler/core' // validate env before anything else
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
    if (authHeader !== `Bearer ${MCP_API_KEY}`) {
      res.writeHead(401, { 'Content-Type': 'application/json' })
      res.end(JSON.stringify({ error: 'Unauthorized' }))
      return false
    }
    return true
  }

  const server = createMCPServer()
  const httpTransport = new StreamableHTTPServerTransport({ sessionIdGenerator: undefined })
  await server.connect(httpTransport)

  const httpServer = createServer((req: IncomingMessage, res: ServerResponse) => {
    const url = req.url ?? ''

    if (url === '/' || url === '/health') {
      res.writeHead(200, { 'Content-Type': 'application/json' })
      res.end(JSON.stringify({ status: 'ok' }))
      return
    }

    if (url === '/mcp' || url.startsWith('/mcp?')) {
      if (!checkAuth(req, res)) return
      httpTransport.handleRequest(req, res).catch((err: unknown) => {
        console.error('MCP HTTP transport error:', err)
        if (!res.headersSent) {
          res.writeHead(500, { 'Content-Type': 'application/json' })
          res.end(JSON.stringify({ error: 'Internal server error' }))
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
