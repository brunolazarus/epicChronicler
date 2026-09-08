import { useEffect, useRef, type ReactNode } from "react";
import { StepBoundary } from "./views/StepBoundary.js";
import { SceneBand } from "./views/SceneBand.js";
import { RecordRing } from "./views/RecordRing.js";
import { PipelineStrip } from "./views/PipelineStrip.js";
import { NoticeCard } from "./views/NoticeCard.js";
import { HeroCopyGrid } from "./views/HeroCopyGrid.js";
import { LandingView } from "./views/LandingView.js";
import { ReviewStep } from "./views/ReviewStep.js";
import { ProcessingView } from "./views/ProcessingView.js";
import { ChronicleView } from "./views/ChronicleView.js";
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

function Flow() {
  const p = useChroniclePresenter();
  const theme = getFlavourTheme(p.selectedFlavour ?? "medieval");
  const scrollTop = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // optional call: jsdom does not implement scrollIntoView
    scrollTop.current?.scrollIntoView?.({ block: "start" });
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
      <ReviewStep
        transcript={p.transcript}
        setTranscript={p.setTranscript}
        confirmTranscript={p.confirmTranscript}
      />
    );
  } else if (p.stage === "processing") {
    card = <ProcessingView stages={p.stages} flavourKey={theme.key} voice={theme.voice} />;
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

      <div className="relative">
        <div className="bg-abyss">
          <SceneBand flavourKey={theme.key} stage={sceneStage}>
            {p.stage === "landing" && <HeroCopyGrid onUploadClick={p.openFilePicker} />}
          </SceneBand>
        </div>

        <div data-testid="ring-wrapper" className="pointer-events-none absolute inset-x-0 top-0 z-20">
          <div
            className="pointer-events-auto absolute"
            style={{
              left: "var(--ring-left)",
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

        <div className="relative z-10">{card}</div>
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
