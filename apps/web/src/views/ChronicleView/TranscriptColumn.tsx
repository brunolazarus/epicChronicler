import { countWords } from './format.js'

export function TranscriptColumn({ transcript }: { transcript: string }) {
  return (
    <div className="border-b border-line bg-panel p-6 md:border-b-0 md:border-r">
      <div className="mb-[18px] font-mono text-[10.5px] uppercase tracking-[.14em] text-fg-faint">What you said</div>
      <div className="whitespace-pre-wrap font-mono text-xs leading-[1.7] text-fg-muted">{transcript}</div>
      <div className="mt-6 border-t border-line pt-[18px] font-mono text-[11px] leading-[1.7] text-fg-muted">
        transcript · {countWords(transcript)} words
      </div>
    </div>
  )
}
