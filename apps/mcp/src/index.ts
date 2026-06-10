import '@chronicler/core' // validate env before anything else
import { Server } from '@modelcontextprotocol/sdk/server/index.js'
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js'
import { ListToolsRequestSchema, CallToolRequestSchema } from '@modelcontextprotocol/sdk/types.js'
import { transcribeToolDefinition, handleTranscribe } from './tools/transcribe.js'
import { chronicleToolDefinition, handleChronicle } from './tools/chronicle.js'
import { voiceToChronicleToolDefinition, handleVoiceToChronicle } from './tools/voice-to-chronicle.js'

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

const transport = new StdioServerTransport()
await server.connect(transport)
console.error('✅ Chronicler MCP server running')
