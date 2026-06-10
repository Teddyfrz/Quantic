import Fastify from "fastify";
import cors from "@fastify/cors";
import { env } from "./lib/env.js";
import { registerAuth } from "./plugins/auth.js";
import { authRoutes } from "./routes/auth.js";
import { adminRoutes } from "./routes/admin.js";
import { projectRoutes } from "./routes/projects.js";
import { taskRoutes } from "./routes/tasks.js";
import { noteRoutes } from "./routes/notes.js";
import { kbRoutes } from "./routes/kb.js";
import { eventRoutes } from "./routes/events.js";
import { contactRoutes } from "./routes/contacts.js";
import { trackingRoutes } from "./routes/tracking.js";
import { healthRoutes } from "./routes/health.js";
import { financeRoutes } from "./routes/finance.js";
import { profileRoutes } from "./routes/profiles.js";
import { searchRoutes } from "./routes/search.js";

async function main(): Promise<void> {
  const app = Fastify({ logger: true });

  await app.register(cors, { origin: true });
  await registerAuth(app);

  // Santé de l'API (utilisée par Settings > Stats API)
  app.get("/health", async () => ({
    status: "ok" as const,
    version: env.version,
    time: new Date().toISOString(),
  }));

  await app.register(authRoutes);
  await app.register(adminRoutes);
  await app.register(projectRoutes);
  await app.register(taskRoutes);
  await app.register(noteRoutes);
  await app.register(kbRoutes);
  await app.register(eventRoutes);
  await app.register(contactRoutes);
  await app.register(trackingRoutes);
  await app.register(healthRoutes);
  await app.register(financeRoutes);
  await app.register(profileRoutes);
  await app.register(searchRoutes);

  try {
    await app.listen({ port: env.port, host: env.host });
    app.log.info(`Quantic API en écoute sur http://${env.host}:${env.port}`);
  } catch (err) {
    app.log.error(err);
    process.exit(1);
  }
}

void main();
