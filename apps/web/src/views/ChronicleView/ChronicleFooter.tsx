import { Button } from '@/components/ui/button.js'

export function ChronicleFooter({ audioKey, onRestart }: {
  audioKey: string | null
  onRestart: () => void
}) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border-t border-line bg-panel-raised px-6 py-4">
      <p className="text-[11.5px] text-fg-muted">
        Nothing here is saved — this chronicle disappears when you leave. Download the audio to keep it.
      </p>
      <div className="flex flex-wrap items-center gap-2">
        {audioKey && (
          <a
            href={`/api/v1/pipeline/audio/${audioKey}`}
            download
            className="inline-flex items-center rounded-full border border-line-muted px-[13px] py-[7px] text-xs text-fg-soft no-underline hover:text-fg"
          >
            Download audio
          </a>
        )}
        <Button variant="outline" size="sm" onClick={onRestart}>Start a new story</Button>
      </div>
    </div>
  )
}
