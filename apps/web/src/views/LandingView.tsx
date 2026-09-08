import { useRef, useState } from 'react'
import { Card } from '@/components/ui/card.js'
import { getFlavourTheme } from '../theme.js'
import { SceneBand } from './SceneBand.js'
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
    <div className="min-h-screen bg-abyss">
      <input
        ref={fileInputRef}
        type="file"
        data-testid="audio-file"
        accept="audio/*"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0]
          setUploadNoticeDismissed(false)
          if (file) tryUploadAudio(file)
        }}
      />

      <header className="mx-auto flex max-w-[1280px] items-center justify-between px-6 py-5 md:px-12">
        <div className="flex items-center gap-2.5">
          <div className="h-[9px] w-[9px] rounded-[2px] bg-accent shadow-[0_0_12px_var(--accent)]" />
          <span className="text-[13px] font-medium uppercase tracking-[.13em] text-fg">Chronicler</span>
        </div>
        <nav className="hidden items-center gap-6 sm:flex">
          <a href="#how-it-works" className="text-[12.5px] text-fg-muted no-underline">How it works</a>
          <a href={MCP_URL} target="_blank" rel="noopener noreferrer" className="text-[12.5px] text-fg-muted no-underline">MCP server</a>
          <a href={GITHUB_URL} target="_blank" rel="noopener noreferrer" className="text-[12.5px] text-fg-muted no-underline">GitHub</a>
        </nav>
      </header>

      <SceneBand flavourKey={theme.key} stage="landing">
        <div className="relative grid grid-cols-1 items-center gap-10 px-6 py-14 md:h-full md:grid-cols-[1.15fr_.85fr] md:px-12 md:py-0">
          <div>
            <div className="mb-4 font-mono text-[11px] uppercase tracking-[.16em] text-accent">No login · nothing kept</div>
            <h1 className="m-0 max-w-[560px] text-[32px] font-medium leading-[1.04] tracking-[-.03em] text-fg [text-shadow:0_2px_26px_rgba(0,0,0,.85)] [text-wrap:balance] md:text-[52px]">
              Every night out is a legend waiting for a narrator.
            </h1>
            <p className="mt-5 max-w-[420px] text-base leading-[1.6] text-fg-dim">
              Talk for a minute. Slide below to choose who tells it back. English or Portuguese in — an English legend out, read aloud.
            </p>
            <p className="mt-3.5 text-[13.5px] text-fg-soft">
              or{' '}
              <button
                type="button"
                onClick={openFilePicker}
                className="cursor-pointer text-fg underline underline-offset-[3px]"
              >
                upload a file
              </button>
            </p>
          </div>

          <div className="flex justify-center">
            {micError ? (
              <RecordRing
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
      </SceneBand>

      <div className="mx-auto max-w-[1280px] px-6 md:px-12">
        <NarratorCarousel flavours={flavours} selectedFlavour={selectedFlavour} selectFlavour={selectFlavour} />
      </div>

      <div className="mx-auto mb-[60px] max-w-[1280px] px-6 md:px-12">
        <Card className="p-7" id="how-it-works">
          <div className="mb-4 font-mono text-[11px] uppercase tracking-[.14em] text-fg-faint">A story, told</div>
          <div className="whitespace-pre-wrap text-[15px] leading-[1.8] text-fg-dim">{SAMPLE_CHRONICLE}</div>
        </Card>
      </div>
    </div>
  )
}
