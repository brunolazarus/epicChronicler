import { Button } from '@/components/ui/button.js'

export function MicErrorNotice({
  onRetryMic,
  onUploadInstead,
}: {
  onRetryMic: () => void
  onUploadInstead: () => void
}) {
  return (
    <div className="w-[300px] max-w-full rounded-lg border border-error-line bg-abyss/60 px-4 py-[14px]">
      <div className="mb-1.5 text-[12.5px] font-medium text-error-fg">Your browser blocked the microphone</div>
      <p className="mb-3 text-xs text-fg-soft">
        Allow microphone access for this site in your browser settings, then try again.
      </p>
      <div className="flex gap-2">
        <Button variant="error" size="sm" data-error-control onClick={onRetryMic}>
          Try again
        </Button>
        <Button variant="ghost" size="sm" onClick={onUploadInstead}>Upload a file</Button>
      </div>
    </div>
  )
}
