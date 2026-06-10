import type { FastifyInstance } from "fastify";
import { prisma } from "../lib/prisma.js";
import type { SearchResult } from "@quantic/shared";

export async function searchRoutes(app: FastifyInstance): Promise<void> {
  app.addHook("onRequest", app.authenticate);

  // Recherche transverse (?q=) sur les modules de l'utilisateur.
  app.get("/search", async (req, reply) => {
    const { q } = req.query as { q?: string };
    const term = (q ?? "").trim();
    if (term.length < 1) return reply.send({ results: [] });
    const userId = req.user.sub;
    const take = 5;

    const [projects, tasks, notes, kbPages, contacts] = await Promise.all([
      prisma.project.findMany({
        where: { userId, name: { contains: term } },
        take,
        orderBy: { updatedAt: "desc" },
      }),
      prisma.task.findMany({
        where: { userId, OR: [{ title: { contains: term } }, { tags: { contains: term } }] },
        take,
        orderBy: { updatedAt: "desc" },
      }),
      prisma.note.findMany({
        where: { userId, OR: [{ title: { contains: term } }, { content: { contains: term } }] },
        take,
        orderBy: { updatedAt: "desc" },
      }),
      prisma.kbPage.findMany({
        where: { userId, OR: [{ title: { contains: term } }, { content: { contains: term } }] },
        take,
        orderBy: { updatedAt: "desc" },
      }),
      prisma.contact.findMany({
        where: { userId, OR: [{ name: { contains: term } }, { email: { contains: term } }, { company: { contains: term } }] },
        take,
        orderBy: { name: "asc" },
      }),
    ]);

    const results: SearchResult[] = [
      ...projects.map((p) => ({ kind: "project" as const, id: p.id, title: p.name, subtitle: "Projet" })),
      ...tasks.map((t) => ({ kind: "task" as const, id: t.id, title: t.title, subtitle: "Tâche" })),
      ...notes.map((n) => ({ kind: "note" as const, id: n.id, title: n.title, subtitle: "Note" })),
      ...kbPages.map((p) => ({ kind: "kbPage" as const, id: p.id, title: p.title, subtitle: "Base de connaissances" })),
      ...contacts.map((c) => ({ kind: "contact" as const, id: c.id, title: c.name, subtitle: c.company ?? "Contact" })),
    ];

    return reply.send({ results });
  });
}
