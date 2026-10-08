import express, { type NextFunction, type Request, type Response } from "express";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { extractForMessage, extractRequestSchema } from "./ai.js";
import { prisma } from "./db.js";

const app = express();
const clientDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "client");

app.use(express.json());

app.use((error: unknown, request: Request, response: Response, next: NextFunction) => {
  if (
    request.path.startsWith("/api/") &&
    error &&
    typeof error === "object" &&
    "type" in error &&
    error.type === "entity.parse.failed"
  ) {
    response.status(400).json({ error: "invalid_json" });
    return;
  }
  next(error);
});

function serializeMessage(message: { id: string; senderName: string; senderEmail: string; company: string; subject: string; body: string; createdAt: Date }) {
  return {
    id: message.id,
    senderName: message.senderName,
    senderEmail: message.senderEmail,
    company: message.company,
    subject: message.subject,
    body: message.body,
    createdAt: message.createdAt.toISOString(),
  };
}

async function handleMessages(_request: Request, response: Response, next: NextFunction) {
  try {
    const records = await prisma.message.findMany({
      orderBy: { createdAt: "desc" },
    });
    const messages = records.map(serializeMessage);
    response.json(messages);
  } catch (error) {
    next(error);
  }
}

app.get("/api/messages", handleMessages);
app.get("/api/messages/:messageId", async (request, response, next) => {
  try {
    const record = await prisma.message.findUnique({ where: { id: request.params.messageId } });
    if (!record) {
      response.status(404).json({ error: "message_not_found" });
      return;
    }
    response.json(serializeMessage(record));
  } catch (error) {
    next(error);
  }
});

app.get("/api/leads", async (_request, response, next) => {
  try {
    const leads = await prisma.lead.findMany({ orderBy: { createdAt: "asc" } });
    response.json(leads.map((lead) => ({ ...lead, createdAt: lead.createdAt.toISOString() })));
  } catch (error) {
    next(error);
  }
});

app.post("/api/ai/extract", async (request, response, next) => {
  try {
    const parsed = extractRequestSchema.safeParse(request.body);
    if (!parsed.success) {
      response.status(400).json({ error: "invalid_request", details: parsed.error.flatten() });
      return;
    }

    const message = await prisma.message.findUnique({ where: { id: parsed.data } });
    if (!message) {
      response.status(404).json({ error: "message_not_found" });
      return;
    }

    if (parsed.data === "message-failure") {
      response.status(500).json({ error: "EXTRACTION_FAILED" });
      return;
    }

    const extraction = extractForMessage(parsed.data);
    if (!extraction) {
      response.json({});
      return;
    }
    response.json(extraction);
  } catch (error) {
    next(error);
  }
});

app.use(express.static(clientDir));

app.use((request, response, next) => {
  if (request.method !== "GET" || request.path.startsWith("/api/")) {
    response.status(404).json({ error: "not_found" });
    return;
  }
  response.sendFile(path.join(clientDir, "index.html"), (error) => (error ? next(error) : undefined));
});

app.use((error: unknown, _request: Request, response: Response, _next: NextFunction) => {
  console.error(error);
  response.status(500).json({ error: "internal_server_error" });
});

export { app };
