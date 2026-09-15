import { Button } from '@/components/ui/button.js'

export function ActionBar({ confirmTranscript, transcript, flavourName, editing, setEditing, discard }: {
  confirmTranscript: () => void
  transcript: string
  flavourName: string
  editing: boolean
  setEditing: (editing: boolean) => void
  discard: () => void
}) {
  return (
    <div className="mt-[18px] flex flex-wrap items-center gap-x-[13px] gap-y-3">
      <Button
        data-testid="btn-generate"
        onClick={confirmTranscript}
        disabled={!transcript.trim()}
        className="border-accent bg-accent-ghost shadow-[0_0_26px_var(--accent-soft)]"
      >
        Tell it as {flavourName} <span className="text-accent">→</span>
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
  )
}
