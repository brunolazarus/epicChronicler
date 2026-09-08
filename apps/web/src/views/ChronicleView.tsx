import { useEffect, useRef, useState, type CSSProperties } from 'react'
import { Card } from '@/components/ui/card.js'
import { PlayIcon, PauseIcon } from '@/lib/icons.js'
import { EmptyStateShell } from './EmptyStateShell.js'
import { getFlavourTheme } from '../theme.js'

interface FlavourSummary { key: string; name: string; description: string }

const WAVE_BAR_COUNT = 44

// Placeholder amplitudes from the design handoff — replace when the pipeline returns real ones.
const WAVE_HEIGHTS = Array.from({ length: WAVE_BAR_COUNT }, (_, i) => {
  const amp = 0.32 + 0.68 * Math.abs(Math.sin(i * 0.9) * Math.cos(i * 0.37) + 0.25 * Math.sin(i * 2.1))
  return Math.max(4, Math.round(amp * 30))
})

function formatTime(seconds: number) {
  if (!Number.isFinite(seconds) || seconds <= 0) return '0:00'
  return `${Math.floor(seconds / 60)}:${String(Math.floor(seconds % 60)).padStart(2, '0')}`
}

function stagger(index: number) {
  return {
    'data-stagger': index,
    style: { '--stagger-index': index } as CSSProperties,
  }
}

function countWords(text: string | null) {
  return text ? text.trim().split(/\s+/).filter(Boolean).length : 0
}

export function ChronicleView({ chronicleText, audioKey, transcript, flavours, selectedFlavour, retellAs, jobOutcome, restart, jobId = '—' }: {
  chronicleText: string | null
  audioKey: string | null
  transcript: string
  flavours: FlavourSummary[]
  selectedFlavour: string | null
  retellAs: (key: string) => void
  jobOutcome: 'expired' | 'failed' | null
  restart: () => void
  jobId?: string
}) {
  const audioRef = useRef<HTMLAudioElement>(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)

  useEffect(() => {
    const el = audioRef.current
    if (!el) return
    // a src swap keeps the same element, so re-seed from it rather than showing the old track's state
    setIsPlaying(!el.paused)
    setCurrentTime(el.currentTime)
    setDuration(Number.isFinite(el.duration) ? el.duration : 0)
    const onPlay = () => setIsPlaying(true)
    const onPause = () => setIsPlaying(false)
    const onTime = () => setCurrentTime(el.currentTime)
    const onMeta = () => setDuration(Number.isFinite(el.duration) ? el.duration : 0)
    el.addEventListener('play', onPlay)
    el.addEventListener('pause', onPause)
    el.addEventListener('ended', onPause)
    el.addEventListener('timeupdate', onTime)
    el.addEventListener('loadedmetadata', onMeta)
    return () => {
      el.removeEventListener('play', onPlay)
      el.removeEventListener('pause', onPause)
      el.removeEventListener('ended', onPause)
      el.removeEventListener('timeupdate', onTime)
      el.removeEventListener('loadedmetadata', onMeta)
    }
  }, [audioKey])

  if (jobOutcome) {
    return <EmptyStateShell kind={jobOutcome === 'expired' ? 'expired' : 'generic'} jobId={jobId} onPrimary={restart} />
  }

  const theme = getFlavourTheme(selectedFlavour ?? 'medieval')
  const wordCount = countWords(chronicleText)
  // the accent rule is reserved for the closing line, so only the last block is the payoff
  const blocks = chronicleText?.trim() ? chronicleText.trim().split(/\n\s*\n/) : ['Your chronicle will appear here…']
  const payoff = blocks.length > 1 ? blocks[blocks.length - 1] : ''
  const leadParas = blocks.length > 1 ? blocks.slice(0, -1) : blocks
  const playerIndex = payoff ? 3 : 2
  const progress = duration > 0 ? currentTime / duration : 0

  function togglePlay() {
    const el = audioRef.current
    if (!el) return
    // play() rejects under autoplay policy and is unimplemented in jsdom
    if (el.paused) el.play()?.catch(() => {})
    else el.pause()
  }

  return (
    <div className="mx-auto my-[60px] max-w-[1080px] px-6 md:px-12">
      <Card className="overflow-hidden bg-surface shadow-[0_16px_40px_rgba(0,0,0,.45)]">
        {/* py-2.5 is load-bearing: --ring-top in index.css lands the travelling marker on the 34px
            slot below, and was measured against a 10px header padding. */}
        <div className="flex items-center gap-6 border-b border-line bg-panel-raised px-6 py-2.5 font-mono text-[11.5px]">
          {/* self-start, not centred: the marker must stay 10px below the card edge even if the
              strip grows taller than the slot on a narrow viewport */}
          <div className="h-[34px] w-[34px] flex-none self-start" aria-hidden />
          {/* -mb-2.5 pb-2.5 pushes the underline past the strip's padding onto the bottom border */}
          <div className="-mb-2.5 flex items-center self-stretch whitespace-nowrap pb-2.5 text-fg shadow-[inset_0_-2px_0_0_var(--accent)]">
            transcript + chronicle
          </div>
          <div aria-disabled className="hidden items-center self-stretch text-fg-muted sm:flex">audio</div>
          <div aria-disabled className="hidden items-center self-stretch text-fg-muted sm:flex">share</div>
          {/* min-w-0 + break-all: the API's job id is a full randomUUID(), and a flex item will not
              shrink below min-content on its own — without these it overflows the card's clipped edge */}
          <div className="ml-auto hidden min-w-0 items-center self-stretch break-all text-right text-fg-faint sm:flex">
            {selectedFlavour ?? 'medieval'} · job {jobId}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-[320px_1fr]">
          <div className="border-b border-line bg-panel p-6 md:border-b-0 md:border-r">
            <div className="mb-[18px] font-mono text-[10.5px] uppercase tracking-[.14em] text-fg-faint">What you said</div>
            <div className="whitespace-pre-wrap font-mono text-xs leading-[1.7] text-fg-muted">{transcript}</div>
            <div className="mt-6 border-t border-line pt-[18px] font-mono text-[11px] leading-[1.7] text-fg-muted">
              transcript · {countWords(transcript)} words
            </div>
          </div>

          <div className="px-6 py-7 md:px-[34px]">
            <div {...stagger(0)} className="stagger-block mb-[22px]">
              <div className="flex items-baseline justify-between gap-4">
                <div className="font-mono text-[10.5px] uppercase tracking-[.16em] text-accent">{theme.name}</div>
                <span className="flex-none font-mono text-[11px] text-fg-muted">
                  {duration > 0 ? `${formatTime(duration)} · ${wordCount} words` : `${wordCount} words`}
                </span>
              </div>
              <div className="mt-[11px] h-px bg-[linear-gradient(90deg,var(--accent),transparent)]" />
            </div>

            <div data-testid="chronicle-text">
              <div {...stagger(1)} className="stagger-block flex flex-col gap-4">
                {leadParas.map((para, i) => (
                  <p key={i} className="whitespace-pre-wrap text-[15px] leading-[1.8] text-fg-muted">{para}</p>
                ))}
              </div>
              {payoff && (
                <p {...stagger(2)} className="stagger-block mt-4 whitespace-pre-wrap border-l-2 border-accent pl-4 text-[15px] leading-[1.8] text-fg">
                  {payoff}
                </p>
              )}
            </div>

            <div className="mt-[26px] flex flex-wrap items-center gap-2">
              <span className="mr-1 text-[11.5px] text-fg-muted">Tell it again as</span>
              {flavours.map((f) => {
                const t = getFlavourTheme(f.key)
                const on = f.key === selectedFlavour
                return (
                  <div
                    key={f.key}
                    data-testid={`retell-${f.key}`}
                    data-flavour={f.key}
                    role="button"
                    tabIndex={0}
                    onClick={() => retellAs(f.key)}
                    onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); retellAs(f.key) } }}
                    className={[
                      'cursor-pointer rounded-full px-[13px] py-[7px] text-xs',
                      on ? 'border border-accent bg-accent-ghost text-fg' : 'border border-line-muted bg-transparent text-fg-muted',
                    ].join(' ')}
                  >
                    {t.short}
                  </div>
                )
              })}
            </div>
          </div>
        </div>

        {audioKey && (
          <div {...stagger(playerIndex)} className="stagger-block flex items-center gap-[18px] border-t border-line bg-panel-raised px-6 py-4">
            <audio ref={audioRef} data-testid="tts-player" src={`/api/v1/pipeline/audio/${audioKey}`} className="hidden" />
            <button
              type="button"
              data-testid="btn-playpause"
              onClick={togglePlay}
              aria-label={isPlaying ? 'Pause narration' : 'Play narration'}
              className="flex h-9 w-9 flex-none cursor-pointer items-center justify-center rounded-full border border-accent bg-accent-ghost text-accent shadow-[0_0_22px_var(--accent-soft)]"
            >
              {isPlaying ? <PauseIcon size={15} /> : <PlayIcon size={15} />}
            </button>
            <div className="flex h-[30px] flex-1 items-center gap-[2.5px]">
              {WAVE_HEIGHTS.map((height, i) => (
                <div
                  key={i}
                  data-wavebar
                  className="flex-1 rounded-[1px]"
                  style={{ height, background: i / WAVE_BAR_COUNT < progress ? 'var(--accent)' : '#3f424d' }}
                />
              ))}
            </div>
            <span className="flex-none font-mono text-[11.5px] text-fg-muted">
              {formatTime(currentTime)} / {formatTime(duration)}
            </span>
          </div>
        )}
      </Card>
    </div>
  )
}
