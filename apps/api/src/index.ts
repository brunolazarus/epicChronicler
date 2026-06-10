import "@chronicler/core"; // validate env before anything else
import { serve } from "@hono/node-server";
import { OpenAPIHono } from "@hono/zod-openapi";
import { apiReference } from "@scalar/hono-api-reference";
import { cors } from "hono/cors";
import { logger } from "hono/logger";
import { env } from "@chronicler/core";
import pipelineRoutes from "./routes/pipeline.js";

const app = new OpenAPIHono();

app.use("*", logger());
app.use("*", cors());

app.route("/pipeline", pipelineRoutes);

app.doc("/openapi.json", {
  openapi: "3.0.0",
  info: {
    title: "Chronicler API",
    version: "0.0.1",
    description: "AI Pipeline Service — Phase 0",
  },
});

app.get("/doc", apiReference({ spec: { url: "/openapi.json" } }));

app.get("/", (c) => c.html(TEST_RIG_HTML));

app.notFound((c) => c.json({ error: "Not found" }, 404));

serve({ fetch: app.fetch, port: env.PORT }, (info) => {
  console.log(`✅ Chronicler API running on http://localhost:${info.port}`);
  console.log(`   Test rig → http://localhost:${info.port}/`);
  console.log(`   API docs  → http://localhost:${info.port}/doc`);
});

// ─── Phase 0 web test rig ────────────────────────────────────────────────────
// Throwaway HTML served directly from the API. Drives the full pipeline:
// upload audio → transcribe → select flavour → generate chronicle → play TTS.
const TEST_RIG_HTML = /* html */ `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Chronicler — Phase 0 Test Rig</title>
  <style>
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: system-ui, -apple-system, sans-serif;
      background: #0c0c0c;
      color: #ddd;
      padding: 2rem;
      max-width: 780px;
      margin: 0 auto;
      line-height: 1.5;
    }
    h1 { font-size: 1.4rem; font-weight: 700; }
    .subtitle { color: #555; font-size: 0.8rem; margin-bottom: 2.5rem; }
    .card {
      background: #161616;
      border: 1px solid #2a2a2a;
      border-radius: 10px;
      padding: 1.5rem;
      margin-bottom: 1rem;
    }
    .card.active { border-color: #3b82f6; }
    .card.done   { border-color: #22c55e; }
    .card.error  { border-color: #ef4444; }
    .card-label {
      font-size: 0.68rem;
      text-transform: uppercase;
      letter-spacing: 0.12em;
      color: #555;
      margin-bottom: 1rem;
    }
    input[type="file"] { color: #ccc; font-size: 0.875rem; }
    button {
      background: #3b82f6;
      color: #fff;
      border: none;
      padding: 0.5rem 1.2rem;
      border-radius: 6px;
      font-size: 0.85rem;
      cursor: pointer;
      margin-top: 0.75rem;
    }
    button:disabled { background: #2a2a2a; color: #555; cursor: not-allowed; }
    button:hover:not(:disabled) { background: #2563eb; }
    .bar { height: 3px; background: #222; border-radius: 2px; margin-top: 0.75rem; overflow: hidden; }
    .bar-fill { height: 100%; background: #3b82f6; width: 0; transition: width 0.25s; border-radius: 2px; }
    .status { font-size: 0.78rem; font-family: monospace; margin-top: 0.6rem; color: #555; }
    .status.ok   { color: #22c55e; }
    .status.err  { color: #ef4444; }
    .status.wait { color: #eab308; }
    textarea {
      width: 100%;
      background: #0c0c0c;
      border: 1px solid #2a2a2a;
      border-radius: 6px;
      color: #ddd;
      padding: 0.75rem;
      font-size: 0.85rem;
      resize: vertical;
      margin-top: 0.75rem;
    }
    .flavours { display: grid; grid-template-columns: 1fr 1fr; gap: 0.5rem; margin-top: 0.75rem; }
    .flavour {
      background: #0c0c0c;
      border: 1px solid #2a2a2a;
      border-radius: 8px;
      padding: 0.75rem;
      cursor: pointer;
      user-select: none;
    }
    .flavour:hover { border-color: #3b82f6; }
    .flavour.selected { border-color: #3b82f6; background: #0d1f3c; }
    .flavour-name { font-weight: 600; font-size: 0.85rem; }
    .flavour-desc { font-size: 0.73rem; color: #555; margin-top: 0.2rem; }
    .metrics {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(100px, 1fr));
      gap: 0.5rem;
      margin-top: 0.75rem;
    }
    .metric {
      background: #0c0c0c;
      border: 1px solid #2a2a2a;
      border-radius: 6px;
      padding: 0.6rem;
      text-align: center;
    }
    .metric-val { font-size: 1.1rem; font-weight: 700; color: #3b82f6; }
    .metric-lbl { font-size: 0.65rem; color: #555; text-transform: uppercase; letter-spacing: 0.06em; margin-top: 0.2rem; }
    .chronicle {
      margin-top: 0.75rem;
      white-space: pre-wrap;
      line-height: 1.7;
      font-size: 0.875rem;
      color: #ccc;
      background: #0c0c0c;
      border: 1px solid #2a2a2a;
      border-radius: 6px;
      padding: 1rem;
    }
    audio { width: 100%; margin-top: 0.75rem; }
  </style>
</head>
<body>
  <h1>Chronicler</h1>
  <p class="subtitle">Phase 0 — AI Pipeline Test Rig</p>

  <!-- Step 1 -->
  <div class="card active" id="card-upload">
    <div class="card-label">Step 1 — Upload Audio</div>
    <input type="file" id="audio-file" accept="audio/*">
    <button id="btn-upload" onclick="uploadAudio()">Upload &amp; Transcribe</button>
    <div class="bar"><div class="bar-fill" id="bar-transcription"></div></div>
    <div class="status" id="st-upload">Select an audio file to begin.</div>
  </div>

  <!-- Step 2 -->
  <div class="card" id="card-transcript">
    <div class="card-label">Step 2 — Transcript</div>
    <textarea id="transcript" rows="5" placeholder="Transcript will appear here…" oninput="updateGenerateBtn()"></textarea>
    <div class="metrics" id="metrics-transcription" style="display:none">
      <div class="metric">
        <div class="metric-val" id="m-transcription-ms">—</div>
        <div class="metric-lbl">Whisper ms</div>
      </div>
    </div>
  </div>

  <!-- Step 3 -->
  <div class="card" id="card-generate">
    <div class="card-label">Step 3 — Flavour &amp; Generate</div>
    <div class="flavours" id="flavour-list">Loading…</div>
    <button id="btn-generate" onclick="generateChronicle()" disabled>Generate Chronicle</button>
    <div class="bar"><div class="bar-fill" id="bar-chronicle"></div></div>
    <div class="status" id="st-generate">Choose a flavour above.</div>
  </div>

  <!-- Step 4 -->
  <div class="card" id="card-result">
    <div class="card-label">Step 4 — Chronicle</div>
    <div class="chronicle" id="chronicle-text">Chronicle will appear here…</div>
    <audio id="tts-player" controls style="display:none"></audio>
    <div class="metrics" id="metrics-chronicle" style="display:none">
      <div class="metric"><div class="metric-val" id="m-llm-ms">—</div><div class="metric-lbl">LLM ms</div></div>
      <div class="metric"><div class="metric-val" id="m-tts-ms">—</div><div class="metric-lbl">TTS ms</div></div>
      <div class="metric"><div class="metric-val" id="m-total-ms">—</div><div class="metric-lbl">Total ms</div></div>
      <div class="metric"><div class="metric-val" id="m-in-tok">—</div><div class="metric-lbl">In tokens</div></div>
      <div class="metric"><div class="metric-val" id="m-out-tok">—</div><div class="metric-lbl">Out tokens</div></div>
      <div class="metric"><div class="metric-val" id="m-cache-tok">—</div><div class="metric-lbl">Cache hit</div></div>
    </div>
  </div>

  <script>
    let selectedFlavour = null

    fetch('/pipeline/flavours')
      .then(r => r.json())
      .then(flavours => {
        document.getElementById('flavour-list').innerHTML = flavours.map(f => \`
          <div class="flavour" onclick="selectFlavour('\${f.key}', this)">
            <div class="flavour-name">\${f.name}</div>
            <div class="flavour-desc">\${f.description}</div>
          </div>
        \`).join('')
      })

    function selectFlavour(key, el) {
      selectedFlavour = key
      document.querySelectorAll('.flavour').forEach(e => e.classList.remove('selected'))
      el.classList.add('selected')
      updateGenerateBtn()
    }

    function updateGenerateBtn() {
      const hasTranscript = document.getElementById('transcript').value.trim().length > 0
      document.getElementById('btn-generate').disabled = !hasTranscript || !selectedFlavour
    }

    function setStatus(id, msg, cls = '') {
      const el = document.getElementById(id)
      el.textContent = msg
      el.className = 'status ' + cls
    }

    function setBar(id, pct) {
      document.getElementById(id).style.width = pct + '%'
    }

    function pollJob(jobId, barId) {
      return new Promise((resolve, reject) => {
        const iv = setInterval(async () => {
          const r = await fetch('/pipeline/jobs/' + jobId)
          const data = await r.json()
          if (data.progress) setBar(barId, data.progress)
          if (data.status === 'completed') { clearInterval(iv); setBar(barId, 100); resolve(data.result) }
          else if (data.status === 'failed') { clearInterval(iv); reject(new Error(data.error || 'Job failed')) }
        }, 600)
      })
    }

    async function uploadAudio() {
      const file = document.getElementById('audio-file').files[0]
      if (!file) return

      document.getElementById('btn-upload').disabled = true
      setStatus('st-upload', 'Uploading…', 'wait')
      setBar('bar-transcription', 0)

      const form = new FormData()
      form.append('audio', file)

      const { jobId } = await fetch('/pipeline/upload', { method: 'POST', body: form }).then(r => r.json())

      setStatus('st-upload', 'Transcribing with Whisper…', 'wait')

      try {
        const result = await pollJob(jobId, 'bar-transcription')
        document.getElementById('transcript').value = result.transcript
        document.getElementById('m-transcription-ms').textContent = result.transcriptionMs + 'ms'
        document.getElementById('metrics-transcription').style.display = 'grid'
        document.getElementById('card-transcript').className = 'card done'
        setStatus('st-upload', '✓ Transcription complete', 'ok')
        updateGenerateBtn()
      } catch (err) {
        setStatus('st-upload', '✗ ' + err.message, 'err')
        document.getElementById('card-upload').className = 'card error'
      } finally {
        document.getElementById('btn-upload').disabled = false
      }
    }

    async function generateChronicle() {
      const transcript = document.getElementById('transcript').value.trim()
      if (!transcript || !selectedFlavour) return

      document.getElementById('btn-generate').disabled = true
      setStatus('st-generate', 'Generating chronicle…', 'wait')
      setBar('bar-chronicle', 0)

      const { jobId } = await fetch('/pipeline/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          transcripts: [{ speaker: 'Narrator', text: transcript }],
          flavour: selectedFlavour,
        }),
      }).then(r => r.json())

      try {
        const result = await pollJob(jobId, 'bar-chronicle')
        document.getElementById('chronicle-text').textContent = result.text
        document.getElementById('m-llm-ms').textContent = result.llmMs + 'ms'
        document.getElementById('m-tts-ms').textContent = result.ttsMs + 'ms'
        document.getElementById('m-total-ms').textContent = result.totalMs + 'ms'
        document.getElementById('m-in-tok').textContent = result.inputTokens
        document.getElementById('m-out-tok').textContent = result.outputTokens
        document.getElementById('m-cache-tok').textContent = result.cacheReadTokens
        document.getElementById('metrics-chronicle').style.display = 'grid'

        const player = document.getElementById('tts-player')
        player.src = '/pipeline/audio/' + result.audioKey
        player.style.display = 'block'

        document.getElementById('card-result').className = 'card done'
        document.getElementById('card-generate').className = 'card done'
        setStatus('st-generate', '✓ Chronicle ready — press play', 'ok')
      } catch (err) {
        setStatus('st-generate', '✗ ' + err.message, 'err')
        document.getElementById('card-generate').className = 'card error'
      } finally {
        document.getElementById('btn-generate').disabled = false
      }
    }
  </script>
</body>
</html>`;
