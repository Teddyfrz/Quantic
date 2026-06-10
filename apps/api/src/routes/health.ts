import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { prisma } from "../lib/prisma.js";
import { toHealth, toSport } from "../lib/serialize.js";

const ymd = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
function dayDate(s: string): Date {
  return new Date(s + "T00:00:00.000Z");
}

const upsertHealthSchema = z.object({
  date: ymd,
  weight: z.number().min(0).max(500).nullable().optional(),
  water: z.number().int().min(0).max(20000).nullable().optional(),
  waterGoal: z.number().int().min(0).max(20000).nullable().optional(),
  bodyFeeling: z.string().max(500).nullable().optional(),
  note: z.string().max(2000).nullable().optional(),
});

const intensity = z.enum(["low", "medium", "high"]);
const createSportSchema = z.object({
  date: ymd,
  activity: z.string().min(1).max(120),
  durationMin: z.number().int().min(1).max(1440),
  intensity: intensity.nullable().optional(),
  note: z.string().max(1000).nullable().optional(),
});
const updateSportSchema = z.object({
  date: ymd.optional(),
  activity: z.string().min(1).max(120).optional(),
  durationMin: z.number().int().min(1).max(1440).optional(),
  intensity: intensity.nullable().optional(),
  note: z.string().max(1000).nullable().optional(),
});

export async function healthRoutes(app: FastifyInstance): Promise<void> {
  app.addHook("onRequest", app.authenticate);

  // --- Entrées santé quotidiennes (poids / eau / ressenti) ---
  app.get("/health-entries", async (req, reply) => {
    const { days } = req.query as { days?: string };
    const n = Math.min(Math.max(Number(days) || 30, 1), 365);
    const since = new Date();
    since.setUTCHours(0, 0, 0, 0);
    since.setUTCDate(since.getUTCDate() - (n - 1));
    const entries = await prisma.healthEntry.findMany({
      where: { userId: req.user.sub, date: { gte: since } },
      orderBy: { date: "asc" },
    });
    return reply.send({ entries: entries.map(toHealth) });
  });

  app.post("/health-entries", async (req, reply) => {
    const parsed = upsertHealthSchema.safeParse(req.body);
    if (!parsed.success) {
      return reply.code(400).send({ error: "bad_request", message: "Données invalides." });
    }
    const { date, weight, water, waterGoal, bodyFeeling, note } = parsed.data;
    const data = {
      weight: weight ?? null,
      water: water ?? null,
      waterGoal: waterGoal ?? null,
      bodyFeeling: bodyFeeling ?? null,
      note: note ?? null,
    };
    const entry = await prisma.healthEntry.upsert({
      where: { userId_date: { userId: req.user.sub, date: dayDate(date) } },
      create: { userId: req.user.sub, date: dayDate(date), ...data },
      update: data,
    });
    return reply.send({ entry: toHealth(entry) });
  });

  // --- Séances de sport ---
  app.get("/sport-sessions", async (req, reply) => {
    const { days } = req.query as { days?: string };
    const n = Math.min(Math.max(Number(days) || 30, 1), 365);
    const since = new Date();
    since.setUTCHours(0, 0, 0, 0);
    since.setUTCDate(since.getUTCDate() - (n - 1));
    const sessions = await prisma.sportSession.findMany({
      where: { userId: req.user.sub, date: { gte: since } },
      orderBy: { date: "desc" },
    });
    return reply.send({ sessions: sessions.map(toSport) });
  });

  app.post("/sport-sessions", async (req, reply) => {
    const parsed = createSportSchema.safeParse(req.body);
    if (!parsed.success) {
      return reply.code(400).send({ error: "bad_request", message: "Données invalides." });
    }
    const { date, activity, durationMin, intensity: int, note } = parsed.data;
    const session = await prisma.sportSession.create({
      data: {
        userId: req.user.sub,
        date: dayDate(date),
        activity,
        durationMin,
        intensity: int ?? null,
        note: note ?? null,
      },
    });
    return reply.code(201).send({ session: toSport(session) });
  });

  app.patch("/sport-sessions/:id", async (req, reply) => {
    const { id } = req.params as { id: string };
    const parsed = updateSportSchema.safeParse(req.body);
    if (!parsed.success) {
      return reply.code(400).send({ error: "bad_request", message: "Données invalides." });
    }
    const existing = await prisma.sportSession.findFirst({ where: { id, userId: req.user.sub } });
    if (!existing) {
      return reply.code(404).send({ error: "not_found", message: "Séance introuvable." });
    }
    const { date, ...rest } = parsed.data;
    const session = await prisma.sportSession.update({
      where: { id },
      data: { ...rest, ...(date ? { date: dayDate(date) } : {}) },
    });
    return reply.send({ session: toSport(session) });
  });

  app.delete("/sport-sessions/:id", async (req, reply) => {
    const { id } = req.params as { id: string };
    const existing = await prisma.sportSession.findFirst({ where: { id, userId: req.user.sub } });
    if (!existing) {
      return reply.code(404).send({ error: "not_found", message: "Séance introuvable." });
    }
    await prisma.sportSession.delete({ where: { id } });
    return reply.code(204).send();
  });
}
