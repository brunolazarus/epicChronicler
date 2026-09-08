import { useState } from 'react'
import { Card } from '@/components/ui/card.js'
import { Textarea } from '@/components/ui/textarea.js'
import { Button } from '@/components/ui/button.js'
import { PencilSimpleIcon } from '@/lib/icons.js'
import { getFlavourTheme } from '../theme.js'

export function ConfirmView({ transcript, setTranscript, confirmTranscript, selectedFlavour, recordingLabel, wordCount }: {
  transcript: string
  setTranscript: (text: string) => void
  confirmTranscript: () => void
  selectedFlavour: string
  recordingLabel: string | null
  wordCount: number
}) {
  const [editing, setEditing] = useState(false)
  const [snapshot, setSnapshot] = useState('')
  const theme = getFlavourTheme(selectedFlavour)

  function startEditing() {
    setSnapshot(transcript)
    setEditing(true)
  }

  function discard() {
    setTranscript(snapshot)
    setEditing(false)
  }

  return (
    <div className="mx-auto mb-16 max-w-[760px] px-6 md:mb-20 md:px-12">
      <Card className="overflow-hidden shadow-[0_16px_40px_rgba(0,0,0,.45)]">
        {/* py-2.5 is load-bearing: --ring-top in index.css lands the travelling marker on the 34px
            slot below, and was measured against a 10px header padding. */}
        <div className="flex flex-wrap items-center gap-x-[13px] gap-y-2 border-b border-line bg-panel-raised px-[22px] py-2.5">
          <div className="h-[34px] w-[34px] flex-none" aria-hidden />
          <span className="font-mono text-[12.5px] font-medium uppercase tracking-[.1em]">CHECK THE TRANSCRIPT</span>
          <span className="ml-auto font-mono text-[11px] text-fg-muted">step 2 of 3</span>
        </div>

        <div className="bg-panel px-[22px] pb-[22px] pt-5">
          <p className="mb-4 max-w-[480px] text-[13.5px] leading-[1.65] text-fg-soft">
            This is what we heard. Fix any names or places we got wrong — the narrator works from this
            text, so a wrong name stays wrong in the legend.
          </p>

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

          <div className="mt-[18px] flex flex-wrap items-center gap-x-[13px] gap-y-3">
            <Button
              data-testid="btn-generate"
              onClick={confirmTranscript}
              disabled={!transcript.trim()}
              className="border-accent bg-accent-ghost shadow-[0_0_26px_var(--accent-soft)]"
            >
              Tell it as {theme.name} <span className="text-accent">→</span>
            </Button>

            {editing ? (
              <>
                <Button onClick={() => setEditing(false)} className="border-accent bg-transparent">
                  Save changes
                </Button>
                <Button variant="ghost" onClick={discard}>
                  Discard
                </Button>
                <span className="ml-auto text-[12.5px] text-fg-muted">Nothing runs while you type</span>
              </>
            ) : (
              <span className="text-[12.5px] text-fg-muted">Looks right? This starts the rewrite.</span>
            )}
          </div>
        </div>
      </Card>
    </div>
  )
}
