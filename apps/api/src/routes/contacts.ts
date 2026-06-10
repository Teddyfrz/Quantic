import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { prisma } from "../lib/prisma.js";
import { toContact } from "../lib/serialize.js";

const createSchema = z.object({
  name: z.string().min(1).max(120),
  email: z.string().email().nullable().optional().or(z.literal("")),
  phone: z.string().max(40).nullable().optional(),
  company: z.string().max(120).nullable().optional(),
  type: z.string().max(60).nullable().optional(),
  note: z.string().max(4000).nullable().optional(),
});
const updateSchema = z.object({
  name: z.string().min(1).max(120).optional(),
  email: z.string().email().nullable().optional().or(z.literal("")),
  phone: z.string().max(40).nullable().optional(),
  company: z.string().max(120).nullable().optional(),
  type: z.string().max(60).nullable().optional(),
  note: z.string().max(4000).nullable().optional(),
});

// Normalise "" -> null pour les champs optionnels.
function clean<T extends Record<string, unknown>>(data: T): T {
  const out = { ...data };
  for (const k of Object.keys(out)) {
    if (out[k] === "") (out as Record<string, unknown>)[k] = null;
  }
  return out;
}

export async function contactRoutes(app: FastifyInstance): Promise<void> {
  app.addHook("onRequest", app.authenticate);

  // ?q= recherche nom / email / entreprise.
  app.get("/contacts", async (req, reply) => {
    const { q } = req.query as { q?: string };
    const contacts = await prisma.contact.findMany({
      where: {
        userId: req.user.sub,
        ...(q
          ? {
              OR: [
                { name: { contains: q } },
                { email: { contains: q } },
                { company: { contains: q } },
              ],
            }
          : {}),
      },
      orderBy: { name: "asc" },
    });
    return reply.send({ contacts: contacts.map(toContact) });
  });

  app.post("/contacts", async (req, reply) => {
    const parsed = createSchema.safeParse(req.body);
    if (!parsed.success) {
      return reply.code(400).send({ error: "bad_request", message: "Données invalides." });
    }
    const data = clean(parsed.data);
    const contact = await prisma.contact.create({
      data: {
        userId: req.user.sub,
        name: data.name as string,
        email: (data.email as string | null) ?? null,
        phone: (data.phone as string | null) ?? null,
        company: (data.company as string | null) ?? null,
        type: (data.type as string | null) ?? null,
        note: (data.note as string | null) ?? null,
      },
    });
    return reply.code(201).send({ contact: toContact(contact) });
  });

  app.patch("/contacts/:id", async (req, reply) => {
    const { id } = req.params as { id: string };
    const parsed = updateSchema.safeParse(req.body);
    if (!parsed.success) {
      return reply.code(400).send({ error: "bad_request", message: "Données invalides." });
    }
    const existing = await prisma.contact.findFirst({ where: { id, userId: req.user.sub } });
    if (!existing) {
      return reply.code(404).send({ error: "not_found", message: "Contact introuvable." });
    }
    const contact = await prisma.contact.update({ where: { id }, data: clean(parsed.data) });
    return reply.send({ contact: toContact(contact) });
  });

  app.delete("/contacts/:id", async (req, reply) => {
    const { id } = req.params as { id: string };
    const existing = await prisma.contact.findFirst({ where: { id, userId: req.user.sub } });
    if (!existing) {
      return reply.code(404).send({ error: "not_found", message: "Contact introuvable." });
    }
    await prisma.contact.delete({ where: { id } });
    return reply.code(204).send();
  });
}
