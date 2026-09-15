import { Textarea } from '@/components/ui/textarea.js'
import { PencilSimpleIcon } from '@/lib/icons.js'

export function TranscriptPanel({ editing, startEditing, transcript, setTranscript, recordingLabel, wordCount }: {
  editing: boolean
  startEditing: () => void
  transcript: string
  setTranscript: (text: string) => void
  recordingLabel: string | null
  wordCount: number
}) {
  return (
    <div
      className={`overflow-hidden rounded-lg border bg-surface ${
        editing ? 'border-accent shadow-[0_0_0_3px_var(--accent-ghost)]' : 'border-line'
      }`}
    >
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-line px-[14px] py-2.5">
        <span
          className={`font-mono text-[9.5px] uppercase tracking-[.14em] ${editing ? 'text-accent' : 'text-fg-muted'}`}
        >
          {editing ? 'EDITING' : 'WHAT YOU SAID'}
        </span>
        {editing ? (
          <span className="text-[11.5px] text-fg-muted">plain text — punctuation and line breaks are yours</span>
        ) : (
          <button
            type="button"
            data-testid="btn-edit-transcript"
            onClick={startEditing}
            className="inline-flex cursor-pointer items-center gap-2 rounded-full border border-line-muted px-[12px] py-[5px] text-[11.5px] font-medium text-fg-soft hover:text-fg"
          >
            <PencilSimpleIcon size={13} />
            Edit
          </button>
        )}
      </div>

      {editing ? (
        <Textarea
          data-testid="transcript"
          rows={7}
          value={transcript}
          onChange={(e) => setTranscript(e.target.value)}
          className="rounded-none border-0 bg-transparent px-[14px] py-[15px] text-[12.5px] leading-[1.75] text-fg caret-accent"
        />
      ) : (
        <div className="flex flex-col gap-[11px] px-[14px] py-[15px] font-mono text-[12.5px] leading-[1.75] text-fg-soft">
          {transcript.split('\n').filter((line) => line.trim()).map((line, i) => (
            <div key={i}>{line}</div>
          ))}
        </div>
      )}

      <div className="flex flex-wrap items-center gap-2 border-t border-line px-[14px] py-2.5 font-mono text-[11px] text-fg-muted">
        {recordingLabel && <span>{recordingLabel}</span>}
        <span className="ml-auto">{wordCount} words</span>
      </div>
    </div>
  )
}
