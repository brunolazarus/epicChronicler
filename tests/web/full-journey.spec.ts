import { test, expect } from '@playwright/test'

test('full journey: flavour, upload, transcript, generate, playback', async ({ page }) => {
  test.setTimeout(30_000) // browser overhead + two poll waits; global config timeout (15s) is tuned for the API-only project

  await page.goto('/')

  // the record ring is ONE element across the flow — capture it on landing, prove identity later
  const ringHandleLanding = await page.getByTestId('ring-wrapper').elementHandle()

  await page.getByTestId('carousel-chip-medieval').click()

  await page.getByTestId('audio-file').setInputFiles('tests/fixtures/sample.mp3')

  // transcript now shows read-only by default
  await expect(page.getByText(/we got lost on the trail/i)).toBeVisible({ timeout: 10_000 })

  const ringHandleConfirm = await page.getByTestId('ring-wrapper').elementHandle()
  expect(await ringHandleLanding!.evaluate((a, b) => a === b, ringHandleConfirm)).toBe(true)

  await page.getByTestId('btn-generate').click()

  await expect(page.getByTestId('chronicle-text')).toHaveText(
    "Here follows the chronicle of the fellowship's ascent, as testified before this scribe by Alex and Sam.",
    { timeout: 10_000 },
  )

  const ringHandleResult = await page.getByTestId('ring-wrapper').elementHandle()
  expect(await ringHandleLanding!.evaluate((a, b) => a === b, ringHandleResult)).toBe(true)

  // the <audio> is hidden behind the custom player bar, so it is attached but never visible
  await expect(page.getByTestId('btn-playpause')).toBeVisible()

  const player = page.getByTestId('tts-player')
  await expect(player).toBeAttached()

  const src = await player.getAttribute('src')
  expect(src).toMatch(/^\/api\/v1\/pipeline\/audio\/tts-.*\.mp3$/)

  const audioRes = await page.request.get(src!)
  expect(audioRes.status()).toBe(200)
  expect(audioRes.headers()['content-type']).toBe('audio/mpeg')
})
