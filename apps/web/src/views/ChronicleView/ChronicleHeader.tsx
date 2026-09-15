export function ChronicleHeader({ selectedFlavour, jobId, markerRef }: {
  selectedFlavour: string | null
  jobId: string
  markerRef?: React.Ref<HTMLDivElement>
}) {
  return (
    <div className="flex items-center gap-6 border-b border-line bg-panel-raised px-6 py-2.5 font-mono text-[11.5px]">
      {/* the travelling record ring parks here — App.tsx measures this slot. self-start, not
          centred: the marker must stay at the top of the header even if the tab strip wraps
          taller than the slot on a narrow viewport */}
      <div ref={markerRef} className="h-[34px] w-[34px] flex-none self-start" aria-hidden />
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
  )
}
