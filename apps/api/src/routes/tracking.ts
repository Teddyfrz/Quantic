import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { prisma } from "../lib/prisma.js";
import { toTracking } from "../lib/serialize.js";

const scale = z.number().int().min(1).max(5).nullable().optional();

const upsertSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  mental: scale,
  energy: scale,
  stress: scale,
  sleepHours: z.number().min(0).max(24).nullable().optional(),
  reflection: z.string().max(4000).nullable().optional(),
});

function dayDate(ymd: string): Date {
  return new Date(ymd + "T00:00:00.000Z");
}

export async function trackingRoutes(app: FastifyInstance): Promise<void> {
  app.addHook("onRequest", app.authenticate);

  // Historique : ?days=7 (par défaut 7) renvoie les entrées des N derniers jours.
  app.get("/tracking", async (req, reply) => {
    const { days } = req.query as { days?: string };
    const n = Math.min(Math.max(Number(days) || 7, 1), 365);
    const since = new Date();
    since.setUTCHours(0, 0, 0, 0);
    since.setUTCDate(since.getUTCDate() - (n - 1));
    const entries = await prisma.trackingEntry.findMany({
      where: { userId: req.user.sub, date: { gte: since } },
      orderBy: { date: "asc" },
    });
    return reply.send({ entries: entries.map(toTracking) });
  });

  // Entrée d'un jour précis (utile pour pré-remplir).
  app.get("/tracking/:date", async (req, reply) => {
    const { date } = req.params as { date: string };
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return reply.code(400).send({ error: "bad_request", message: "Date invalide." });
    }
    const entry = await prisma.trackingEntry.findUnique({
      where: { userId_date: { userId: req.user.sub, date: dayDate(date) } },
    });
    return reply.send({ entry: entry ? toTracking(entry) : null });
  });

  // Création / mise à jour de l'entrée du jour (upsert).
  app.post("/tracking", async (req, reply) => {
    const parsed = upsertSchema.safeParse(req.body);
    if (!parsed.success) {
      return reply.code(400).send({ error: "bad_request", message: "Données invalides." });
    }
    const { date, mental, energy, stress, sleepHours, reflection } = parsed.data;
    const data = {
      mental: mental ?? null,
      energy: energy ?? null,
      stress: stress ?? null,
      sleepHours: sleepHours ?? null,
      reflection: reflection ?? null,
    };
    const entry = await prisma.trackingEntry.upsert({
      where: { userId_date: { userId: req.user.sub, date: dayDate(date) } },
      create: { userId: req.user.sub, date: dayDate(date), ...data },
      update: data,
    });
    return reply.send({ entry: toTracking(entry) });
  });
}
