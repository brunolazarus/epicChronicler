import { Card } from '@/components/ui/card.js'
import { Textarea } from '@/components/ui/textarea.js'
import { Button } from '@/components/ui/button.js'

export function ReviewStep({ transcript, setTranscript, confirmTranscript }: {
  transcript: string
  setTranscript: (text: string) => void
  confirmTranscript: () => void
}) {
  return (
    <div className="mx-auto my-16 max-w-[760px] px-6 md:my-20 md:px-12">
      <Card className="px-[26px] py-7">
        <div className="mb-4 font-mono text-[11px] uppercase tracking-[.14em] text-fg-faint">What you said</div>
        <Textarea
          data-testid="transcript"
          rows={6}
          value={transcript}
          onChange={(e) => setTranscript(e.target.value)}
        />
        <Button
          data-testid="btn-generate"
          variant="outline"
          onClick={confirmTranscript}
          disabled={!transcript.trim()}
          className="mt-4"
        >
          Tell the story
        </Button>
      </Card>
    </div>
  )
}
