import { useRef, useState } from 'react'
import { getFlavourTheme } from '../theme.js'
import { buildScene } from '../scenes.js'
import { RecordRing } from './RecordRing.js'
import { NarratorCarousel } from './NarratorCarousel.js'
import { NoticeCard } from './NoticeCard.js'

const MCP_URL = 'https://epicchronicler-production.up.railway.app/mcp'
const GITHUB_URL = 'https://github.com/brunolazarus/epicChronicler'

const SAMPLE_CHRONICLE = `Here follows the chronicle of the Siege of the Flatpack Throne, as testified before this scribe by Marco and Júlia.

On a Saturday eve, the two companions undertook a quest of no small peril: the assembly of a bookshelf delivered in a box of cardboard, its instructions rendered in a tongue neither could decipher. Marco, ever bold, seized the Allen key as a knight seizes his sword and declared the battle begun.

Three hours did the siege endure. Twice was a shelf mounted backward and twice undone. Júlia, keeper of patience, discovered at the eleventh hour that an entire bag of fasteners had been overlooked — a revelation that nearly ended the fellowship there and then. Yet triumph came at last: the throne stood upright, bearing its full weight of books without complaint, and the companions toasted their victory with cold pizza, as is tradition among those who have suffered together.

Let it be remembered: no furniture was harmed beyond repair, and the friendship, like the bookshelf, held.`

interface FlavourSummary {
  key: string
  name: string
  description: string
}

interface UploadValidationError {
  code: 'too-large' | 'unsupported-format'
  detail: string
}

export function LandingView({
  flavours,
  selectedFlavour,
  selectFlavour,
  micError,
  setMicError,
  clearMicError,
  tryUploadAudio,
  uploadValidationError,
  uploadStatus,
  uploadError,
}: {
  flavours: FlavourSummary[]
  selectedFlavour: string | null
  selectFlavour: (key: string) => void
  micError: boolean
  setMicError: (blocked: boolean) => void
  clearMicError: () => void
  tryUploadAudio: (file: File) => void
  uploadValidationError: UploadValidationError | null
  uploadStatus: 'idle' | 'uploading' | 'transcribing' | 'done' | 'error'
  uploadError: string | null
}) {
  const theme = getFlavourTheme(selectedFlavour ?? 'medieval')
  const scene = buildScene(theme.key)

  const [isRecording, setIsRecording] = useState(false)
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const chunksRef = useRef<Blob[]>([])
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [uploadNoticeDismissed, setUploadNoticeDismissed] = useState(false)

  async function startRecording() {
    setUploadNoticeDismissed(false)
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      chunksRef.current = []
      const recorder = new MediaRecorder(stream)
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data)
      }
      recorder.onstop = () => {
        stream.getTracks().forEach((t) => t.stop())
        const mimeType = recorder.mimeType || 'audio/webm'
        const ext = mimeType.split('/')[1].split(';')[0]
        const blob = new Blob(chunksRef.current, { type: mimeType })
        tryUploadAudio(new File([blob], `recording.${ext}`, { type: mimeType }))
        setIsRecording(false)
      }
      recorder.start()
      mediaRecorderRef.current = recorder
      setIsRecording(true)
    } catch {
      setMicError(true)
    }
  }

  function stopRecording() {
    mediaRecorderRef.current?.stop()
  }

  function openFilePicker() {
    setUploadNoticeDismissed(false)
    fileInputRef.current?.click()
  }

  const notice = uploadValidationError
    ? uploadValidationError.code === 'too-large'
      ? {
          title: 'That file is too large',
          body: 'Chronicler takes recordings up to 25 MB — around 25 minutes of speech. Trim the file, or record directly in the browser instead.',
          detail: uploadValidationError.detail,
        }
      : {
          title: "That format isn't supported",
          body: 'Chronicler reads webm, mp3, m4a, wav and ogg. Convert the file, or record directly in the browser instead.',
          detail: uploadValidationError.detail,
        }
    : uploadStatus === 'error'
      ? {
          title: "That recording couldn't be transcribed",
          body: 'Something went wrong turning your recording into text. Try uploading it again, or record a new one.',
          detail: uploadError ?? 'unknown error',
        }
      : null

  const showNotice = !micError && !!notice && !uploadNoticeDismissed

  return (
    <div style={{ background: '#0a0b10', minHeight: '100vh' }}>
      <input
        ref={fileInputRef}
        type="file"
        data-testid="audio-file"
        accept="audio/*"
        style={{ display: 'none' }}
        onChange={(e) => {
          const file = e.target.files?.[0]
          setUploadNoticeDismissed(false)
          if (file) tryUploadAudio(file)
        }}
      />

      <header
        style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '20px 48px', maxWidth: 1280, margin: '0 auto',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 9, height: 9, borderRadius: 2, background: theme.accent, boxShadow: `0 0 12px ${theme.accent}` }} />
          <span style={{ fontFamily: 'Inter, sans-serif', fontWeight: 500, fontSize: 13, letterSpacing: '.13em', textTransform: 'uppercase', color: '#e9e9ed' }}>
            Chronicler
          </span>
        </div>
        <nav style={{ display: 'flex', alignItems: 'center', gap: 24 }}>
          <a href="#how-it-works" style={{ fontFamily: 'Inter, sans-serif', fontSize: '12.5px', color: '#9397ab', textDecoration: 'none' }}>
            How it works
          </a>
          <a href={MCP_URL} target="_blank" rel="noopener noreferrer" style={{ fontFamily: 'Inter, sans-serif', fontSize: '12.5px', color: '#9397ab', textDecoration: 'none' }}>
            MCP server
          </a>
          <a href={GITHUB_URL} target="_blank" rel="noopener noreferrer" style={{ fontFamily: 'Inter, sans-serif', fontSize: '12.5px', color: '#9397ab', textDecoration: 'none' }}>
            GitHub
          </a>
        </nav>
      </header>

      <div style={{ position: 'relative', height: 420, overflow: 'hidden', maxWidth: 1280, margin: '0 auto' }}>
        <div
          style={{
            position: 'absolute', left: '50%', top: '30%', width: 900, height: 300,
            transform: 'translate(-50%, -30%) scale(1.4)', transformOrigin: '50% 30%',
          }}
        >
          {scene.map((s, i) => (
            <div
              key={i}
              style={{
                position: 'absolute', left: s.l, top: s.t, width: s.w, height: s.h,
                background: s.bg, borderRadius: s.r, boxShadow: s.sh, transform: s.tf,
                opacity: s.o, filter: s.fl,
              }}
            />
          ))}
        </div>
        <div
          style={{
            position: 'absolute', inset: 0,
            background: 'linear-gradient(90deg, rgba(10,11,16,.88) 0%, rgba(10,11,16,.6) 46%, transparent 72%)',
          }}
        />
        <div
          style={{
            position: 'absolute', inset: 0,
            background: 'linear-gradient(180deg, transparent 60%, rgba(22,24,38,.85) 100%)',
          }}
        />

        <div
          style={{
            position: 'relative', height: '100%', display: 'grid',
            gridTemplateColumns: '1.15fr .85fr', alignItems: 'center', gap: 40,
            padding: '0 48px',
          }}
        >
          <div>
            <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 11, letterSpacing: '.16em', textTransform: 'uppercase', color: theme.accent, marginBottom: 16 }}>
              No login · nothing kept
            </div>
            <h1
              style={{
                fontFamily: 'Inter, sans-serif', fontWeight: 500, fontSize: 52, lineHeight: 1.04,
                letterSpacing: '-.03em', textWrap: 'balance', maxWidth: 560, margin: 0,
                textShadow: '0 2px 26px rgba(0,0,0,.85)', color: '#e9e9ed',
              }}
            >
              Every night out is a legend waiting for a narrator.
            </h1>
            <p style={{ fontFamily: 'Inter, sans-serif', fontSize: 16, lineHeight: 1.6, color: '#cfd3e5', maxWidth: 420, marginTop: 20 }}>
              Talk for a minute. Slide below to choose who tells it back. English or Portuguese in — an English legend out, read aloud.
            </p>
            <p style={{ fontFamily: 'Inter, sans-serif', fontSize: '13.5px', color: '#b2b6ca', marginTop: 14 }}>
              or{' '}
              <span
                role="button"
                onClick={openFilePicker}
                style={{ color: '#e9e9ed', textDecoration: 'underline', textUnderlineOffset: '3px', cursor: 'pointer' }}
              >
                upload a file
              </span>
            </p>
          </div>
          <div style={{ display: 'flex', justifyContent: 'center' }}>
            {micError ? (
              <RecordRing
                accent={theme.accent}
                micError
                isRecording={isRecording}
                onStart={startRecording}
                onStop={stopRecording}
                onUploadInstead={openFilePicker}
                onRetryMic={clearMicError}
              />
            ) : showNotice && notice ? (
              <NoticeCard
                title={notice.title}
                body={notice.body}
                detail={notice.detail}
                primaryLabel="Choose another file"
                onPrimary={openFilePicker}
                secondaryLabel="Record instead"
                onSecondary={() => setUploadNoticeDismissed(true)}
              />
            ) : (
              <RecordRing
                accent={theme.accent}
                micError={false}
                isRecording={isRecording}
                onStart={startRecording}
                onStop={stopRecording}
                onUploadInstead={openFilePicker}
                onRetryMic={clearMicError}
              />
            )}
          </div>
        </div>

        <div
          style={{
            position: 'absolute', right: 48, bottom: 14, textAlign: 'right',
            fontFamily: "'JetBrains Mono', monospace", fontSize: 10, letterSpacing: '.08em', color: 'rgba(233,233,237,.5)',
          }}
        >
          {theme.sceneLabel}
        </div>
      </div>

      <div style={{ maxWidth: 1280, margin: '0 auto', padding: '0 48px' }}>
        <NarratorCarousel flavours={flavours} selectedFlavour={selectedFlavour} selectFlavour={selectFlavour} />
      </div>

      <div
        id="how-it-works"
        style={{
          background: '#131424', border: '1px solid #292b31', borderRadius: 14, padding: 28,
          maxWidth: 1280, margin: '0 auto 60px', boxSizing: 'border-box',
        }}
      >
        <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 11, letterSpacing: '.14em', textTransform: 'uppercase', color: '#595d6c', marginBottom: 16 }}>
          A story, told
        </div>
        <div
          style={{
            whiteSpace: 'pre-wrap', fontFamily: 'Inter, sans-serif', fontSize: 15, lineHeight: 1.8, color: '#cfd3e5',
          }}
        >
          {SAMPLE_CHRONICLE}
        </div>
      </div>
    </div>
  )
}
