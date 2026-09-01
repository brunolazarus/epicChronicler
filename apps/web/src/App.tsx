import { type ReactNode } from "react";
import { StepBoundary } from "./views/StepBoundary.js";
import { LandingView } from "./views/LandingView.js";
import { ReviewStep } from "./views/ReviewStep.js";
import { ProcessingView } from "./views/ProcessingView.js";
import { ChronicleView } from "./views/ChronicleView.js";
import { useChroniclePresenter } from "./presenters/useChroniclePresenter.js";
import { getFlavourTheme } from "./theme.js";

function Flow() {
  const {
    audioKey,
    chronicleText,
    clearMicError,
    confirmTranscript,
    flavours,
    generateError,
    jobOutcome,
    micError,
    restart,
    retellAs,
    retryGenerate,
    selectedFlavour,
    selectFlavour,
    setMicError,
    setTranscript,
    stage,
    stages,
    transcript,
    transcriptionMs,
    tryUploadAudio,
    uploadError,
    uploadStatus,
    uploadValidationError,
  } = useChroniclePresenter();
  const theme = getFlavourTheme(selectedFlavour ?? "medieval");

  let screen: ReactNode;
  if (stage === "landing") {
    screen = (
      <LandingView
        flavours={flavours}
        selectedFlavour={selectedFlavour}
        selectFlavour={selectFlavour}
        micError={micError}
        setMicError={setMicError}
        clearMicError={clearMicError}
        tryUploadAudio={tryUploadAudio}
        uploadValidationError={uploadValidationError}
        uploadStatus={uploadStatus}
        uploadError={uploadError}
      />
    );
  } else if (stage === "review") {
    screen = (
      <ReviewStep
        transcript={transcript}
        setTranscript={setTranscript}
        confirmTranscript={confirmTranscript}
      />
    );
  } else if (stage === "processing") {
    screen = (
      <ProcessingView
        stages={stages}
        transcriptionMs={transcriptionMs}
        flavourKey={theme.key}
        voice={theme.voice}
        generateError={generateError}
        onRetry={retryGenerate}
      />
    );
  } else {
    screen = (
      <ChronicleView
        chronicleText={chronicleText}
        audioKey={audioKey}
        transcript={transcript}
        flavours={flavours}
        selectedFlavour={selectedFlavour}
        retellAs={retellAs}
        jobOutcome={jobOutcome}
        restart={restart}
      />
    );
  }

  return (
    <div
      data-flavour={selectedFlavour ?? "medieval"}
      className="min-h-screen bg-surface text-fg"
    >
      {screen}
    </div>
  );
}

export default function App() {
  return (
    <StepBoundary
      fallback={<div className="p-12 text-fg-muted">Loading…</div>}
    >
      <Flow />
    </StepBoundary>
  );
}
