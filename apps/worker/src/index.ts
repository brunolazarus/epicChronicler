import "@chronicler/core"; // validate env before anything else
import { createTranscriptionWorker } from "./workers/transcription.js";
import { createChronicleWorker } from "./workers/chronicle.js";
import { createPipelineWorker } from "./workers/pipeline.js";

const transcriptionWorker = createTranscriptionWorker();
const chronicleWorker = createChronicleWorker();
const pipelineWorker = createPipelineWorker();

console.log("✅ Workers running: transcription, chronicle, pipeline");

async function shutdown() {
  console.log("Shutting down workers…");
  await Promise.all([transcriptionWorker.close(), chronicleWorker.close(), pipelineWorker.close()]);
  process.exit(0);
}

process.on("SIGTERM", shutdown);
process.on("SIGINT", shutdown);
