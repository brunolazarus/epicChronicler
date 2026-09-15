export function CarouselHeader({ currentName }: { currentName: string }) {
  return (
    <div className="mb-4 flex items-baseline justify-between">
      <div className="font-mono text-[11px] uppercase tracking-[.14em] text-fg-faint">Narrator</div>
      <div className="text-xs text-fg-soft">{currentName}</div>
    </div>
  )
}
