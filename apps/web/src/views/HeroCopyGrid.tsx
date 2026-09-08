export function HeroCopyGrid({ onUploadClick }: { onUploadClick: () => void }) {
  return (
    <div className="relative grid grid-cols-1 items-center gap-10 px-6 py-14 md:h-full md:grid-cols-[1.15fr_.85fr] md:px-12 md:py-0">
      <div>
        <div className="mb-4 font-mono text-[11px] uppercase tracking-[.16em] text-accent">No login · nothing kept</div>
        <h1 className="m-0 max-w-[560px] text-[32px] font-medium leading-[1.04] tracking-[-.03em] text-fg [text-shadow:0_2px_26px_rgba(0,0,0,.85)] [text-wrap:balance] md:text-[52px]">
          Every night out is a legend waiting for a narrator.
        </h1>
        <p className="mt-5 max-w-[420px] text-base leading-[1.6] text-fg-dim">
          Talk for a minute. Slide below to choose who tells it back. English or Portuguese in — an English legend out, read aloud.
        </p>
        <p className="mt-3.5 text-[13.5px] text-fg-soft">
          or{' '}
          <button
            type="button"
            onClick={onUploadClick}
            className="cursor-pointer text-fg underline underline-offset-[3px]"
          >
            upload a file
          </button>
        </p>
      </div>
    </div>
  )
}
