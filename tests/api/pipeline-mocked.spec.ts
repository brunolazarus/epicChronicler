import { test, expect } from '@playwright/test'

test('generate chronicle end-to-end through mocked LLM + TTS', async ({ request }) => {
  const generateRes = await request.post('/api/v1/pipeline/generate', {
    data: {
      transcripts: [
        { speaker: 'Alex', text: 'We got lost on the trail for two hours before finding the summit.' },
        { speaker: 'Sam', text: 'Worth it for the view, even if my feet are still recovering.' },
      ],
      flavour: 'medieval',
    },
  })
  expect(generateRes.status()).toBe(200)
  const { jobId } = await generateRes.json()

  let result: { text: string; audioKey: string } | null = null
  for (let i = 0; i < 20; i++) {
    const pollRes = await request.get(`/api/v1/pipeline/jobs/${jobId}`)
    const body = await pollRes.json()
    if (body.status === 'completed') {
      result = body.result
      break
    }
    if (body.status === 'failed') throw new Error(`job failed: ${body.error}`)
    await new Promise((r) => setTimeout(r, 250))
  }

  expect(result).not.toBeNull()
  expect(result!.text).toBe(
    "Here follows the chronicle of the fellowship's ascent, as testified before this scribe by Alex and Sam.",
  )
  expect(result!.audioKey).toMatch(/^tts-.*\.mp3$/)
})
