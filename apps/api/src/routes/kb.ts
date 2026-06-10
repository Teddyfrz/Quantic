import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { prisma } from "../lib/prisma.js";
import { toKbCategory, toKbPage } from "../lib/serialize.js";

const categorySchema = z.object({ name: z.string().min(1).max(120) });

const createPageSchema = z.object({
  title: z.string().min(1).max(200),
  content: z.string().max(50000).optional(),
  categoryId: z.string().nullable().optional(),
});
const updatePageSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  content: z.string().max(50000).optional(),
  categoryId: z.string().nullable().optional(),
});

async function assertCategoryOwnership(userId: string, categoryId: string | null | undefined): Promise<boolean> {
  if (!categoryId) return true;
  const c = await prisma.kbCategory.findFirst({ where: { id: categoryId, userId } });
  return Boolean(c);
}

export async function kbRoutes(app: FastifyInstance): Promise<void> {
  app.addHook("onRequest", app.authenticate);

  // --- Catégories ---
  app.get("/kb/categories", async (req, reply) => {
    const cats = await prisma.kbCategory.findMany({
      where: { userId: req.user.sub },
      orderBy: { name: "asc" },
    });
    return reply.send({ categories: cats.map(toKbCategory) });
  });

  app.post("/kb/categories", async (req, reply) => {
    const parsed = categorySchema.safeParse(req.body);
    if (!parsed.success) {
      return reply.code(400).send({ error: "bad_request", message: "Données invalides." });
    }
    const cat = await prisma.kbCategory.create({
      data: { userId: req.user.sub, name: parsed.data.name },
    });
    return reply.code(201).send({ category: toKbCategory(cat) });
  });

  app.patch("/kb/categories/:id", async (req, reply) => {
    const { id } = req.params as { id: string };
    const parsed = categorySchema.safeParse(req.body);
    if (!parsed.success) {
      return reply.code(400).send({ error: "bad_request", message: "Données invalides." });
    }
    const existing = await prisma.kbCategory.findFirst({ where: { id, userId: req.user.sub } });
    if (!existing) {
      return reply.code(404).send({ error: "not_found", message: "Catégorie introuvable." });
    }
    const cat = await prisma.kbCategory.update({ where: { id }, data: { name: parsed.data.name } });
    return reply.send({ category: toKbCategory(cat) });
  });

  // Supprime la catégorie ; les pages sont détachées (categoryId -> null).
  app.delete("/kb/categories/:id", async (req, reply) => {
    const { id } = req.params as { id: string };
    const existing = await prisma.kbCategory.findFirst({ where: { id, userId: req.user.sub } });
    if (!existing) {
      return reply.code(404).send({ error: "not_found", message: "Catégorie introuvable." });
    }
    await prisma.kbCategory.delete({ where: { id } });
    return reply.code(204).send();
  });

  // --- Pages ---
  // ?categoryId= filtre par catégorie ; ?q= recherche titre + contenu.
  app.get("/kb/pages", async (req, reply) => {
    const { categoryId, q } = req.query as { categoryId?: string; q?: string };
    const pages = await prisma.kbPage.findMany({
      where: {
        userId: req.user.sub,
        ...(categoryId ? { categoryId } : {}),
        ...(q
          ? {
              OR: [
                { title: { contains: q } },
                { content: { contains: q } },
              ],
            }
          : {}),
      },
      orderBy: { updatedAt: "desc" },
    });
    return reply.send({ pages: pages.map(toKbPage) });
  });

  app.get("/kb/pages/:id", async (req, reply) => {
    const { id } = req.params as { id: string };
    const page = await prisma.kbPage.findFirst({ where: { id, userId: req.user.sub } });
    if (!page) {
      return reply.code(404).send({ error: "not_found", message: "Page introuvable." });
    }
    return reply.send({ page: toKbPage(page) });
  });

  app.post("/kb/pages", async (req, reply) => {
    const parsed = createPageSchema.safeParse(req.body);
    if (!parsed.success) {
      return reply.code(400).send({ error: "bad_request", message: "Données invalides." });
    }
    const { title, content, categoryId } = parsed.data;
    if (!(await assertCategoryOwnership(req.user.sub, categoryId))) {
      return reply.code(400).send({ error: "invalid_category", message: "Catégorie invalide." });
    }
    const page = await prisma.kbPage.create({
      data: {
        userId: req.user.sub,
        title,
        content: content ?? "",
        categoryId: categoryId ?? null,
      },
    });
    return reply.code(201).send({ page: toKbPage(page) });
  });

  app.patch("/kb/pages/:id", async (req, reply) => {
    const { id } = req.params as { id: string };
    const parsed = updatePageSchema.safeParse(req.body);
    if (!parsed.success) {
      return reply.code(400).send({ error: "bad_request", message: "Données invalides." });
    }
    const existing = await prisma.kbPage.findFirst({ where: { id, userId: req.user.sub } });
    if (!existing) {
      return reply.code(404).send({ error: "not_found", message: "Page introuvable." });
    }
    const { categoryId, ...rest } = parsed.data;
    if (categoryId !== undefined && !(await assertCategoryOwnership(req.user.sub, categoryId))) {
      return reply.code(400).send({ error: "invalid_category", message: "Catégorie invalide." });
    }
    const page = await prisma.kbPage.update({
      where: { id },
      data: { ...rest, ...(categoryId !== undefined ? { categoryId } : {}) },
    });
    return reply.send({ page: toKbPage(page) });
  });

  app.delete("/kb/pages/:id", async (req, reply) => {
    const { id } = req.params as { id: string };
    const existing = await prisma.kbPage.findFirst({ where: { id, userId: req.user.sub } });
    if (!existing) {
      return reply.code(404).send({ error: "not_found", message: "Page introuvable." });
    }
    await prisma.kbPage.delete({ where: { id } });
    return reply.code(204).send();
  });
}
