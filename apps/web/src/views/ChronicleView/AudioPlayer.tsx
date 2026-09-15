import { useEffect, useRef, useState } from 'react'
import { PlayIcon, PauseIcon } from '@/lib/icons.js'
import { formatTime, stagger } from './format.js'

const WAVE_BAR_COUNT = 44

// Placeholder amplitudes from the design handoff — replace when the pipeline returns real ones.
const WAVE_HEIGHTS = Array.from({ length: WAVE_BAR_COUNT }, (_, i) => {
  const amp = 0.32 + 0.68 * Math.abs(Math.sin(i * 0.9) * Math.cos(i * 0.37) + 0.25 * Math.sin(i * 2.1))
  return Math.max(4, Math.round(amp * 30))
})

export function AudioPlayer({ audioKey, staggerIndex, onDurationChange }: {
  audioKey: string
  staggerIndex: number
  onDurationChange: (duration: number) => void
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
    const seedDuration = Number.isFinite(el.duration) ? el.duration : 0
    setDuration(seedDuration)
    onDurationChange(seedDuration)
    const onPlay = () => setIsPlaying(true)
    const onPause = () => setIsPlaying(false)
    const onTime = () => setCurrentTime(el.currentTime)
    const onMeta = () => {
      const d = Number.isFinite(el.duration) ? el.duration : 0
      setDuration(d)
      onDurationChange(d)
    }
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

  const progress = duration > 0 ? currentTime / duration : 0

  function togglePlay() {
    const el = audioRef.current
    if (!el) return
    // play() rejects under autoplay policy and is unimplemented in jsdom
    if (el.paused) el.play()?.catch(() => {})
    else el.pause()
  }

  return (
    <div {...stagger(staggerIndex)} className="stagger-block flex items-center gap-[18px] border-t border-line bg-panel-raised px-6 py-4">
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
  )
}
