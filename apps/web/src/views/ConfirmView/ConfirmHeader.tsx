export function ConfirmHeader({ markerRef }: { markerRef?: React.Ref<HTMLDivElement> }) {
  return (
    <div className="flex flex-wrap items-center gap-x-[13px] gap-y-2 border-b border-line bg-panel-raised px-[22px] py-2.5">
      {/* the travelling record ring parks here — App.tsx measures this slot */}
      <div ref={markerRef} className="h-[34px] w-[34px] flex-none" aria-hidden />
      <span className="font-mono text-[12.5px] font-medium uppercase tracking-[.1em]">CHECK THE TRANSCRIPT</span>
      <span className="ml-auto font-mono text-[11px] text-fg-muted">step 2 of 3</span>
    </div>
  )
}
