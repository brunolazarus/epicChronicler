import "@chronicler/core"; // validate env before anything else
import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { serve } from "@hono/node-server";
import { OpenAPIHono } from "@hono/zod-openapi";
import { apiReference } from "@scalar/hono-api-reference";
import { cors } from "hono/cors";
import { logger } from "hono/logger";
import { env } from "@chronicler/core";
import routes from "./routes/index.js";
import { createTranscriptionWorker } from "./workers/transcription.js";
import { createChronicleWorker } from "./workers/chronicle.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const landingPage = readFileSync(join(__dirname, "static/index.html"), "utf-8");

const app = new OpenAPIHono();

app.use("*", logger());
app.use("*", cors());

app.route("/api/v1", routes);

app.doc("/openapi.json", {
  openapi: "3.0.0",
  info: {
    title: "Chronicler API",
    version: "1.0.0",
    description: "Chronicler — voice stories, AI-narrated legends",
  },
});

app.get("/doc", apiReference({ spec: { url: "/openapi.json" } }));

app.get("/", (c) => c.html(landingPage));

app.notFound((c) => c.json({ error: "Not found" }, 404));

const transcriptionWorker = createTranscriptionWorker();
const chronicleWorker = createChronicleWorker();
console.log("✅ Web workers started: transcription, chronicle");

async function shutdown() {
  console.log("Shutting down API...");
  await Promise.all([transcriptionWorker.close(), chronicleWorker.close()]);
  process.exit(0);
}
process.on("SIGTERM", shutdown);
process.on("SIGINT", shutdown);

serve({ fetch: app.fetch, port: env.PORT }, (info) => {
  console.log(`✅ Chronicler API running on http://localhost:${info.port}`);
  console.log(`   Web app  → http://localhost:${info.port}/`);
  console.log(`   API docs → http://localhost:${info.port}/doc`);
});
