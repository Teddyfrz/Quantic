import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { prisma } from "../lib/prisma.js";
import { toNote } from "../lib/serialize.js";

const createSchema = z.object({
  title: z.string().min(1).max(200),
  content: z.string().max(20000).optional(),
  projectId: z.string().nullable().optional(),
});

const updateSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  content: z.string().max(20000).optional(),
  projectId: z.string().nullable().optional(),
});

async function assertProjectOwnership(userId: string, projectId: string | null | undefined): Promise<boolean> {
  if (!projectId) return true;
  const p = await prisma.project.findFirst({ where: { id: projectId, userId } });
  return Boolean(p);
}

export async function noteRoutes(app: FastifyInstance): Promise<void> {
  app.addHook("onRequest", app.authenticate);

  // Liste (filtre optionnel ?projectId= ; ?limit= pour le dashboard)
  app.get("/notes", async (req, reply) => {
    const { projectId, limit } = req.query as { projectId?: string; limit?: string };
    const take = limit ? Math.min(Math.max(Number(limit) || 0, 1), 50) : undefined;
    const notes = await prisma.note.findMany({
      where: {
        userId: req.user.sub,
        ...(projectId ? { projectId } : {}),
      },
      orderBy: { updatedAt: "desc" },
      ...(take ? { take } : {}),
    });
    return reply.send({ notes: notes.map(toNote) });
  });

  // Détail
  app.get("/notes/:id", async (req, reply) => {
    const { id } = req.params as { id: string };
    const note = await prisma.note.findFirst({ where: { id, userId: req.user.sub } });
    if (!note) {
      return reply.code(404).send({ error: "not_found", message: "Note introuvable." });
    }
    return reply.send({ note: toNote(note) });
  });

  // Création
  app.post("/notes", async (req, reply) => {
    const parsed = createSchema.safeParse(req.body);
    if (!parsed.success) {
      return reply.code(400).send({ error: "bad_request", message: "Données invalides." });
    }
    const { title, content, projectId } = parsed.data;
    if (!(await assertProjectOwnership(req.user.sub, projectId))) {
      return reply.code(400).send({ error: "invalid_project", message: "Projet invalide." });
    }
    const note = await prisma.note.create({
      data: {
        userId: req.user.sub,
        title,
        content: content ?? "",
        projectId: projectId ?? null,
      },
    });
    return reply.code(201).send({ note: toNote(note) });
  });

  // Mise à jour
  app.patch("/notes/:id", async (req, reply) => {
    const { id } = req.params as { id: string };
    const parsed = updateSchema.safeParse(req.body);
    if (!parsed.success) {
      return reply.code(400).send({ error: "bad_request", message: "Données invalides." });
    }
    const existing = await prisma.note.findFirst({ where: { id, userId: req.user.sub } });
    if (!existing) {
      return reply.code(404).send({ error: "not_found", message: "Note introuvable." });
    }
    const { projectId, ...rest } = parsed.data;
    if (projectId !== undefined && !(await assertProjectOwnership(req.user.sub, projectId))) {
      return reply.code(400).send({ error: "invalid_project", message: "Projet invalide." });
    }
    const note = await prisma.note.update({
      where: { id },
      data: { ...rest, ...(projectId !== undefined ? { projectId } : {}) },
    });
    return reply.send({ note: toNote(note) });
  });

  // Suppression
  app.delete("/notes/:id", async (req, reply) => {
    const { id } = req.params as { id: string };
    const existing = await prisma.note.findFirst({ where: { id, userId: req.user.sub } });
    if (!existing) {
      return reply.code(404).send({ error: "not_found", message: "Note introuvable." });
    }
    await prisma.note.delete({ where: { id } });
    return reply.code(204).send();
  });
}
