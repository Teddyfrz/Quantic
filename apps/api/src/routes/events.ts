import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { prisma } from "../lib/prisma.js";
import { toEvent } from "../lib/serialize.js";

const createSchema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().max(2000).nullable().optional(),
  startAt: z.string().datetime(),
  endAt: z.string().datetime().nullable().optional(),
  allDay: z.boolean().optional(),
  projectId: z.string().nullable().optional(),
});
const updateSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  description: z.string().max(2000).nullable().optional(),
  startAt: z.string().datetime().optional(),
  endAt: z.string().datetime().nullable().optional(),
  allDay: z.boolean().optional(),
  projectId: z.string().nullable().optional(),
});

async function assertProjectOwnership(userId: string, projectId: string | null | undefined): Promise<boolean> {
  if (!projectId) return true;
  const p = await prisma.project.findFirst({ where: { id: projectId, userId } });
  return Boolean(p);
}

export async function eventRoutes(app: FastifyInstance): Promise<void> {
  app.addHook("onRequest", app.authenticate);

  // ?from=&to= bornent la fenêtre affichée (sur startAt).
  app.get("/events", async (req, reply) => {
    const { from, to } = req.query as { from?: string; to?: string };
    const events = await prisma.calendarEvent.findMany({
      where: {
        userId: req.user.sub,
        ...(from || to
          ? {
              startAt: {
                ...(from ? { gte: new Date(from) } : {}),
                ...(to ? { lte: new Date(to) } : {}),
              },
            }
          : {}),
      },
      orderBy: { startAt: "asc" },
    });
    return reply.send({ events: events.map(toEvent) });
  });

  app.post("/events", async (req, reply) => {
    const parsed = createSchema.safeParse(req.body);
    if (!parsed.success) {
      return reply.code(400).send({ error: "bad_request", message: "Données invalides." });
    }
    const { title, description, startAt, endAt, allDay, projectId } = parsed.data;
    if (!(await assertProjectOwnership(req.user.sub, projectId))) {
      return reply.code(400).send({ error: "invalid_project", message: "Projet invalide." });
    }
    const event = await prisma.calendarEvent.create({
      data: {
        userId: req.user.sub,
        title,
        description: description ?? null,
        startAt: new Date(startAt),
        endAt: endAt ? new Date(endAt) : null,
        allDay: allDay ?? true,
        projectId: projectId ?? null,
      },
    });
    return reply.code(201).send({ event: toEvent(event) });
  });

  app.patch("/events/:id", async (req, reply) => {
    const { id } = req.params as { id: string };
    const parsed = updateSchema.safeParse(req.body);
    if (!parsed.success) {
      return reply.code(400).send({ error: "bad_request", message: "Données invalides." });
    }
    const existing = await prisma.calendarEvent.findFirst({ where: { id, userId: req.user.sub } });
    if (!existing) {
      return reply.code(404).send({ error: "not_found", message: "Événement introuvable." });
    }
    const { startAt, endAt, projectId, ...rest } = parsed.data;
    if (projectId !== undefined && !(await assertProjectOwnership(req.user.sub, projectId))) {
      return reply.code(400).send({ error: "invalid_project", message: "Projet invalide." });
    }
    const event = await prisma.calendarEvent.update({
      where: { id },
      data: {
        ...rest,
        ...(startAt !== undefined ? { startAt: new Date(startAt) } : {}),
        ...(endAt !== undefined ? { endAt: endAt ? new Date(endAt) : null } : {}),
        ...(projectId !== undefined ? { projectId } : {}),
      },
    });
    return reply.send({ event: toEvent(event) });
  });

  app.delete("/events/:id", async (req, reply) => {
    const { id } = req.params as { id: string };
    const existing = await prisma.calendarEvent.findFirst({ where: { id, userId: req.user.sub } });
    if (!existing) {
      return reply.code(404).send({ error: "not_found", message: "Événement introuvable." });
    }
    await prisma.calendarEvent.delete({ where: { id } });
    return reply.code(204).send();
  });
}
