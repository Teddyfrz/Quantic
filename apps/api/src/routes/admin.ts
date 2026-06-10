import type { FastifyInstance } from "fastify";
import { randomBytes } from "node:crypto";
import { statSync } from "node:fs";
import { join } from "node:path";
import { z } from "zod";
import { prisma } from "../lib/prisma.js";
import { toUser, toInvitation } from "../lib/serialize.js";
import type { AdminStatEntry } from "@quantic/shared";

const createInviteSchema = z.object({
  maxUses: z.number().int().min(1).max(1000).optional(),
  expiresAt: z.string().datetime().nullable().optional(),
});

function generateCode(): string {
  // Code lisible : QNT-XXXXXX
  return "QNT-" + randomBytes(4).toString("hex").toUpperCase();
}

export async function adminRoutes(app: FastifyInstance): Promise<void> {
  // Toutes les routes admin sont protégées par le rôle admin.
  app.addHook("onRequest", app.requireAdmin);

  // Statistiques de la base de données
  app.get("/admin/stats", async (_req, reply) => {
    const [
      users, admins, invites, activeInvites,
      projects, tasks, doneTasks, notes, kbCategories, kbPages, events, contacts,
      tracking, health, sport, transactions, budgets, profiles,
    ] = await Promise.all([
      prisma.user.count(),
      prisma.user.count({ where: { role: "admin" } }),
      prisma.invitationCode.count(),
      prisma.invitationCode.count({ where: { isActive: true } }),
      prisma.project.count(),
      prisma.task.count(),
      prisma.task.count({ where: { status: "done" } }),
      prisma.note.count(),
      prisma.kbCategory.count(),
      prisma.kbPage.count(),
      prisma.calendarEvent.count(),
      prisma.contact.count(),
      prisma.trackingEntry.count(),
      prisma.healthEntry.count(),
      prisma.sportSession.count(),
      prisma.transaction.count(),
      prisma.budget.count(),
      prisma.profile.count(),
    ]);

    const entries: AdminStatEntry[] = [
      { group: "Comptes", label: "Utilisateurs", count: users },
      { group: "Comptes", label: "Administrateurs", count: admins },
      { group: "Comptes", label: "Profils", count: profiles },
      { group: "Comptes", label: "Codes d'invitation", count: invites },
      { group: "Productivité", label: "Projets", count: projects },
      { group: "Productivité", label: "Tâches", count: tasks },
      { group: "Productivité", label: "Tâches terminées", count: doneTasks },
      { group: "Productivité", label: "Notes", count: notes },
      { group: "Productivité", label: "Catégories KB", count: kbCategories },
      { group: "Productivité", label: "Pages KB", count: kbPages },
      { group: "Productivité", label: "Événements", count: events },
      { group: "Productivité", label: "Contacts", count: contacts },
      { group: "Personnel", label: "Entrées de suivi", count: tracking },
      { group: "Personnel", label: "Entrées santé", count: health },
      { group: "Personnel", label: "Séances de sport", count: sport },
      { group: "Personnel", label: "Transactions", count: transactions },
      { group: "Personnel", label: "Budgets", count: budgets },
    ];
    const totalRows = entries.reduce((acc, e) => acc + e.count, 0);

    let dbSizeBytes: number | null = null;
    try {
      dbSizeBytes = statSync(join(process.cwd(), "prisma", "quantic.db")).size;
    } catch {
      dbSizeBytes = null;
    }

    return reply.send({
      entries,
      totalRows,
      users,
      admins,
      activeInvites,
      dbSizeBytes,
      generatedAt: new Date().toISOString(),
    });
  });

  // Liste des utilisateurs
  app.get("/admin/users", async (_req, reply) => {
    const users = await prisma.user.findMany({ orderBy: { createdAt: "desc" } });
    return reply.send({ users: users.map(toUser) });
  });

  // Changer le rôle d'un utilisateur (pas le sien)
  const roleSchema = z.object({ role: z.enum(["user", "admin"]) });
  app.patch("/admin/users/:id/role", async (req, reply) => {
    const { id } = req.params as { id: string };
    const parsed = roleSchema.safeParse(req.body);
    if (!parsed.success) {
      return reply.code(400).send({ error: "bad_request", message: "Rôle invalide." });
    }
    if (id === req.user.sub) {
      return reply.code(400).send({ error: "self_role", message: "Vous ne pouvez pas modifier votre propre rôle." });
    }
    const existing = await prisma.user.findUnique({ where: { id } });
    if (!existing) {
      return reply.code(404).send({ error: "not_found", message: "Utilisateur introuvable." });
    }
    const user = await prisma.user.update({ where: { id }, data: { role: parsed.data.role } });
    return reply.send({ user: toUser(user) });
  });

  // Supprimer un utilisateur (pas le sien). Ses données sont supprimées en cascade.
  app.delete("/admin/users/:id", async (req, reply) => {
    const { id } = req.params as { id: string };
    if (id === req.user.sub) {
      return reply.code(400).send({ error: "self_delete", message: "Vous ne pouvez pas supprimer votre propre compte." });
    }
    const existing = await prisma.user.findUnique({ where: { id } });
    if (!existing) {
      return reply.code(404).send({ error: "not_found", message: "Utilisateur introuvable." });
    }
    await prisma.user.delete({ where: { id } });
    return reply.code(204).send();
  });

  // Liste des codes d'invitation
  app.get("/admin/invitations", async (_req, reply) => {
    const invites = await prisma.invitationCode.findMany({ orderBy: { createdAt: "desc" } });
    return reply.send({ invitations: invites.map(toInvitation) });
  });

  // Création d'un code d'invitation
  app.post("/admin/invitations", async (req, reply) => {
    const parsed = createInviteSchema.safeParse(req.body ?? {});
    if (!parsed.success) {
      return reply.code(400).send({ error: "bad_request", message: "Données invalides." });
    }
    const { maxUses, expiresAt } = parsed.data;

    const invite = await prisma.invitationCode.create({
      data: {
        code: generateCode(),
        createdByUserId: req.user.sub,
        maxUses: maxUses ?? 1,
        expiresAt: expiresAt ? new Date(expiresAt) : null,
      },
    });
    return reply.code(201).send({ invitation: toInvitation(invite) });
  });

  // Désactiver un code d'invitation
  app.patch("/admin/invitations/:id/disable", async (req, reply) => {
    const { id } = req.params as { id: string };
    const existing = await prisma.invitationCode.findUnique({ where: { id } });
    if (!existing) {
      return reply.code(404).send({ error: "not_found", message: "Code introuvable." });
    }
    const invite = await prisma.invitationCode.update({
      where: { id },
      data: { isActive: false },
    });
    return reply.send({ invitation: toInvitation(invite) });
  });

  // Supprimer un code d'invitation
  app.delete("/admin/invitations/:id", async (req, reply) => {
    const { id } = req.params as { id: string };
    const existing = await prisma.invitationCode.findUnique({ where: { id } });
    if (!existing) {
      return reply.code(404).send({ error: "not_found", message: "Code introuvable." });
    }
    await prisma.invitationCode.delete({ where: { id } });
    return reply.code(204).send();
  });
}
