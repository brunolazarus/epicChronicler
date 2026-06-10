import "@chronicler/core"; // validate env before anything else
import { createTranscriptionWorker } from "./workers/transcription.js";
import { createChronicleWorker } from "./workers/chronicle.js";

const transcriptionWorker = createTranscriptionWorker();
const chronicleWorker = createChronicleWorker();

console.log("✅ Workers running: transcription, chronicle");

async function shutdown() {
  console.log("Shutting down workers…");
  await Promise.all([transcriptionWorker.close(), chronicleWorker.close()]);
  process.exit(0);
}

process.on("SIGTERM", shutdown);
process.on("SIGINT", shutdown);
