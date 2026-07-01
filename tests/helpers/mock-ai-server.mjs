import { createServer } from 'node:http'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const __dirname = dirname(fileURLToPath(import.meta.url))
const fixturesDir = join(__dirname, '..', 'fixtures')

const transcription = JSON.parse(readFileSync(join(fixturesDir, 'transcription.json'), 'utf-8'))
const chronicle = JSON.parse(readFileSync(join(fixturesDir, 'chronicle.json'), 'utf-8'))
const ttsAudio = readFileSync(join(fixturesDir, 'tts.mp3'))

const PORT = process.env.MOCK_AI_PORT ? Number(process.env.MOCK_AI_PORT) : 4010

const routes = {
  '/audio/transcriptions': () => ({ status: 200, contentType: 'application/json', body: JSON.stringify(transcription) }),
  '/chat/completions': () => ({ status: 200, contentType: 'application/json', body: JSON.stringify(chronicle) }),
  '/audio/speech': () => ({ status: 200, contentType: 'audio/mpeg', body: ttsAudio }),
}

const server = createServer((req, res) => {
  req.on('data', () => {}) // drain the request body; fixture responses don't inspect it
  req.on('end', () => {
    const handler = req.method === 'POST' ? routes[req.url] : undefined
    const response = handler
      ? handler()
      : { status: 404, contentType: 'application/json', body: JSON.stringify({ error: 'not found in mock-ai-server' }) }

    res.writeHead(response.status, { 'Content-Type': response.contentType })
    res.end(response.body)
  })
})

server.listen(PORT, () => {
  console.log(`[mock-ai-server] listening on http://localhost:${PORT}`)
})
