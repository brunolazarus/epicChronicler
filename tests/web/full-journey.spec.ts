import { test, expect } from '@playwright/test'

test('full journey: upload, transcript, flavour, generate, playback', async ({ page }) => {
  test.setTimeout(30_000) // browser overhead + two poll waits; global config timeout (15s) is tuned for the API-only project

  await page.goto('/')

  await page.locator('#audio-file').setInputFiles('tests/fixtures/sample.mp3')

  await expect(page.locator('#transcript')).toHaveValue(
    "Alex said: we got lost on the trail for two hours before finding the summit marker. Sam said: worth it for the view, even though my feet are still recovering.",
    { timeout: 10_000 },
  )

  await page.getByText('Medieval Chronicler').click()

  await page.locator('#btn-generate').click()

  await expect(page.locator('#chronicle-text')).toHaveText(
    "Here follows the chronicle of the fellowship's ascent, as testified before this scribe by Alex and Sam.",
    { timeout: 10_000 },
  )

  const player = page.locator('#tts-player')
  await expect(player).toBeVisible()

  const src = await player.getAttribute('src')
  expect(src).toMatch(/^\/api\/v1\/pipeline\/audio\/tts-.*\.mp3$/)

  const audioRes = await page.request.get(src!)
  expect(audioRes.status()).toBe(200)
  expect(audioRes.headers()['content-type']).toBe('audio/mpeg')
})
