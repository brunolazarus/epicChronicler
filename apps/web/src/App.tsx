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

  if (stage === "landing") {
    return (
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
  }
  if (stage === "review") {
    return (
      <ReviewStep
        transcript={transcript}
        setTranscript={setTranscript}
        confirmTranscript={confirmTranscript}
      />
    );
  }
  if (stage === "processing") {
    return (
      <ProcessingView
        stages={stages}
        accent={theme.accent}
        transcriptionMs={transcriptionMs}
        flavourKey={theme.key}
        voice={theme.voice}
        generateError={generateError}
        onRetry={retryGenerate}
      />
    );
  }
  return (
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

export default function App() {
  return (
    <StepBoundary
      fallback={<div style={{ padding: 48, color: "#9397ab" }}>Loading…</div>}
    >
      <Flow />
    </StepBoundary>
  );
}
