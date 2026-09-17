import { useEffect, useLayoutEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";
import { StepBoundary } from "./views/StepBoundary.js";
import { SceneBand } from "./views/SceneBand.js";
import { RecordRing } from "./views/RecordRing/index.js";
import { PipelineStrip } from "./views/PipelineStrip.js";
import { NoticeCard } from "./views/NoticeCard.js";
import { HeroCopyGrid } from "./views/HeroCopyGrid.js";
import { LandingView } from "./views/LandingView.js";
import { ConfirmView } from "./views/ConfirmView/index.js";
import { ProcessingView } from "./views/ProcessingView.js";
import { ChronicleView } from "./views/ChronicleView/index.js";
import { useChroniclePresenter } from "./presenters/useChroniclePresenter.js";
import { getFlavourTheme } from "./theme.js";

const MCP_URL = "https://epicchronicler-production.up.railway.app/mcp";
const GITHUB_URL = "https://github.com/brunolazarus/epicChronicler";

function TopBar() {
  return (
    <header className="mx-auto flex max-w-[1280px] items-center justify-between px-6 py-5 md:px-12">
      <div className="flex items-center gap-2.5">
        <div className="h-[9px] w-[9px] rounded-[2px] bg-accent shadow-[0_0_12px_var(--accent)]" />
        <span className="text-[13px] font-medium uppercase tracking-[.13em] text-fg">Chronicler</span>
      </div>
      <nav className="hidden items-center gap-6 sm:flex">
        <a href="#how-it-works" className="text-[12.5px] text-fg-muted no-underline">How it works</a>
        <a href={MCP_URL} target="_blank" rel="noopener noreferrer" className="text-[12.5px] text-fg-muted no-underline">MCP server</a>
        <a href={GITHUB_URL} target="_blank" rel="noopener noreferrer" className="text-[12.5px] text-fg-muted no-underline">GitHub</a>
      </nav>
    </header>
  );
}

// Layout offset of `node` inside `ancestor`. Deliberately not getBoundingClientRect: the card
// mounts with a `card-in` translateY, and a rect read mid-animation would bake that 20px in.
function offsetWithin(node: HTMLElement, ancestor: HTMLElement) {
  let top = 0;
  let left = 0;
  for (let el: HTMLElement | null = node; el && el !== ancestor; el = el.offsetParent as HTMLElement | null) {
    top += el.offsetTop;
    left += el.offsetLeft;
  }
  return { top, left };
}

function Flow() {
  const p = useChroniclePresenter();
  const theme = getFlavourTheme(p.selectedFlavour ?? "medieval");
  const scrollTop = useRef<HTMLDivElement>(null);
  const shellRef = useRef<HTMLDivElement>(null);
  const ringWrapperRef = useRef<HTMLDivElement>(null);
  const markerRef = useRef<HTMLDivElement>(null);
  const [markerPos, setMarkerPos] = useState<{ top: number; left: number } | null>(null);

  useEffect(() => {
    // optional call: jsdom does not implement scrollIntoView
    scrollTop.current?.scrollIntoView?.({ block: "start" });
  }, [p.stage]);

  // Past landing the ring parks in each card header's 34px slot. Measuring that slot rather than
  // hardcoding an offset is what keeps the marker in the header when the card grows underneath it
  // — a failed pipeline stage adds a detail box that pushes everything below it down.
  useLayoutEffect(() => {
    if (p.stage === "landing") {
      setMarkerPos(null);
      return;
    }
    const shell = shellRef.current;
    if (!shell) return;

    const measure = () => {
      const slot = markerRef.current;
      const wrapper = ringWrapperRef.current;
      // the expired/failed card has no slot: hold the last position instead of snapping back
      if (!slot || !wrapper) return;
      const a = offsetWithin(slot, shell);
      const next = { top: a.top - wrapper.offsetTop, left: a.left - wrapper.offsetLeft };
      setMarkerPos((prev) => (prev && prev.top === next.top && prev.left === next.left ? prev : next));
    };

    measure();
    if (typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver(measure);
    observer.observe(shell);
    return () => observer.disconnect();
  }, [p.stage]);

  const sceneStage = p.stage === "review" ? "confirm" : p.stage;
  const ringSlot = p.stage === "landing" ? (p.isRecording ? "timer" : "hero") : "marker";
  const showUploadNotice = p.stage === "landing" && p.uploadNotice != null;
  // both error cards need more room than the ring box, and neither may animate into place
  const ringShowsError = showUploadNotice || (p.stage === "landing" && p.micError);
  const pipelineVisible = p.stage !== "landing";
  const pipelineCollapsed = p.stage === "result";

  let card: ReactNode;
  if (p.stage === "landing") {
    card = (
      <LandingView
        flavours={p.flavours}
        selectedFlavour={p.selectedFlavour}
        selectFlavour={p.selectFlavour}
      />
    );
  } else if (p.stage === "review") {
    card = (
      <ConfirmView
        transcript={p.transcript}
        setTranscript={p.setTranscript}
        confirmTranscript={p.confirmTranscript}
        selectedFlavour={p.selectedFlavour ?? "medieval"}
        selectFlavour={p.selectFlavour}
        flavours={p.flavours}
        recordingLabel={p.recordingLabel}
        wordCount={p.transcriptWordCount}
        markerRef={markerRef}
      />
    );
  } else if (p.stage === "processing") {
    card = <ProcessingView stages={p.stages} flavourKey={theme.key} voice={theme.voice} markerRef={markerRef} />;
  } else {
    card = (
      <ChronicleView
        chronicleText={p.chronicleText}
        audioKey={p.audioKey}
        transcript={p.transcript}
        flavours={p.flavours}
        selectedFlavour={p.selectedFlavour}
        retellAs={p.retellAs}
        jobOutcome={p.jobOutcome}
        restart={p.restart}
        retryGenerate={p.retryGenerate}
        jobId={p.jobId ?? "—"}
        markerRef={markerRef}
      />
    );
  }

  return (
    <div
      ref={scrollTop}
      data-flavour={p.selectedFlavour ?? "medieval"}
      data-stage={p.stage}
      data-recording={p.isRecording ? "true" : undefined}
      data-ring-error={ringShowsError ? "true" : undefined}
      className="min-h-screen bg-surface text-fg"
      style={
        markerPos
          ? ({ "--ring-top": `${markerPos.top}px`, "--ring-left": `${markerPos.left}px` } as CSSProperties)
          : undefined
      }
    >
      <input
        ref={p.fileInputRef}
        type="file"
        data-testid="audio-file"
        accept="audio/*"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) p.tryUploadAudio(file);
        }}
      />

      <div className="bg-abyss">
        <TopBar />
      </div>

      <div ref={shellRef} className="relative">
        <div className="bg-abyss">
          <SceneBand flavourKey={theme.key} stage={sceneStage}>
            {p.stage === "landing" && <HeroCopyGrid onUploadClick={p.openFilePicker} />}
          </SceneBand>
        </div>

        <div ref={ringWrapperRef} data-testid="ring-wrapper" className="pointer-events-none absolute inset-x-0 top-0 z-20">
          <div
            className="pointer-events-auto absolute"
            style={{
              // --ring-left is tuned for the ring box; the error card is far wider, so on its own
              // it runs off the right edge. Clamp so the card keeps a 24px gutter: 444 = its
              // 420px max width + that gutter, and the max() keeps it on-screen below 468px wide.
              left: ringShowsError
                ? "min(var(--ring-left), max(24px, calc(100vw - 444px)))"
                : "var(--ring-left)",
              top: "var(--ring-top)",
              width: ringShowsError ? "min(420px, calc(100vw - 48px))" : "var(--ring-size)",
              height: ringShowsError ? "auto" : "var(--ring-size)",
              transition: ringShowsError
                ? "none"
                : "left var(--dur-ring) var(--ease), top var(--dur-ring) var(--ease), width var(--dur-ring) var(--ease), height var(--dur-ring) var(--ease)",
            }}
          >
            {showUploadNotice && p.uploadNotice ? (
              <NoticeCard
                title={p.uploadNotice.title}
                body={p.uploadNotice.body}
                detail={p.uploadNotice.detail}
                fileName={p.uploadNotice.fileName}
                value={p.uploadNotice.value}
                limit={p.uploadNotice.limit}
                primaryLabel="Choose another file"
                onPrimary={p.openFilePicker}
                secondaryLabel="Record instead"
                onSecondary={p.clearUploadError}
              />
            ) : (
              <RecordRing
                slot={ringSlot}
                micError={p.stage === "landing" && p.micError}
                isRecording={p.isRecording}
                elapsedLabel={p.elapsedLabel}
                pipelineLive={p.stage === "processing"}
                onStart={p.startRecording}
                onStop={p.stopRecording}
                onUploadInstead={p.openFilePicker}
                onRetryMic={p.clearMicError}
              />
            )}
          </div>
        </div>

        {pipelineVisible && (
          <div
            className="mx-auto max-w-[760px] px-6 md:px-12"
            style={{
              paddingTop: pipelineCollapsed ? 0 : 40,
              transition: "padding-top var(--dur-scene) var(--ease)",
            }}
          >
            <PipelineStrip
              stages={p.stages}
              transcriptionMs={p.transcriptionMs}
              generateError={p.generateError}
              onRetry={p.retryGenerate}
              collapsed={pipelineCollapsed}
            />
          </div>
        )}

        <div key={p.stage} className="motion-card relative z-10">{card}</div>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <StepBoundary fallback={<div className="p-12 text-fg-muted">Loading…</div>}>
      <Flow />
    </StepBoundary>
  );
}
