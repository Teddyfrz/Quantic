import type { FastifyInstance } from "fastify";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { prisma } from "../lib/prisma.js";
import { toUser } from "../lib/serialize.js";

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

const registerSchema = z.object({
  name: z.string().min(2).max(60),
  email: z.string().email(),
  password: z.string().min(8).max(128),
  invitationCode: z.string().min(1),
});

export async function authRoutes(app: FastifyInstance): Promise<void> {
  // Connexion
  app.post("/auth/login", async (req, reply) => {
    const parsed = loginSchema.safeParse(req.body);
    if (!parsed.success) {
      return reply.code(400).send({ error: "bad_request", message: "Données invalides." });
    }
    const { email, password } = parsed.data;

    const user = await prisma.user.findUnique({ where: { email: email.toLowerCase() } });
    if (!user || !(await bcrypt.compare(password, user.password))) {
      return reply.code(401).send({ error: "invalid_credentials", message: "Email ou mot de passe incorrect." });
    }

    const token = app.jwt.sign({ sub: user.id, role: user.role as "user" | "admin" });
    return reply.send({ token, user: toUser(user) });
  });

  // Inscription par code d'invitation
  app.post("/auth/register", async (req, reply) => {
    const parsed = registerSchema.safeParse(req.body);
    if (!parsed.success) {
      return reply.code(400).send({ error: "bad_request", message: "Données invalides." });
    }
    const { name, email, password, invitationCode } = parsed.data;
    const normalizedEmail = email.toLowerCase();

    const existing = await prisma.user.findUnique({ where: { email: normalizedEmail } });
    if (existing) {
      return reply.code(409).send({ error: "email_taken", message: "Cet email est déjà utilisé." });
    }

    const invite = await prisma.invitationCode.findUnique({ where: { code: invitationCode } });
    if (!invite) {
      return reply.code(400).send({ error: "invalid_code", message: "Code d'invitation introuvable." });
    }
    if (!invite.isActive) {
      return reply.code(400).send({ error: "code_disabled", message: "Ce code d'invitation est désactivé." });
    }
    if (invite.expiresAt && invite.expiresAt.getTime() < Date.now()) {
      return reply.code(400).send({ error: "code_expired", message: "Ce code d'invitation a expiré." });
    }
    if (invite.usedCount >= invite.maxUses) {
      return reply.code(400).send({ error: "code_exhausted", message: "Ce code d'invitation a atteint sa limite d'utilisations." });
    }

    const hashed = await bcrypt.hash(password, 10);

    const user = await prisma.$transaction(async (tx) => {
      const created = await tx.user.create({
        data: { name, email: normalizedEmail, password: hashed, role: "user" },
      });
      await tx.invitationCode.update({
        where: { id: invite.id },
        data: {
          usedCount: { increment: 1 },
          isActive: invite.usedCount + 1 >= invite.maxUses ? false : invite.isActive,
        },
      });
      return created;
    });

    const token = app.jwt.sign({ sub: user.id, role: user.role as "user" | "admin" });
    return reply.code(201).send({ token, user: toUser(user) });
  });

  // Profil courant
  app.get("/auth/me", { onRequest: [app.authenticate] }, async (req, reply) => {
    const user = await prisma.user.findUnique({ where: { id: req.user.sub } });
    if (!user) {
      return reply.code(404).send({ error: "not_found", message: "Utilisateur introuvable." });
    }
    return reply.send({ user: toUser(user) });
  });

  // Mise à jour des infos de compte (nom)
  const updateMeSchema = z.object({ name: z.string().min(2).max(60) });
  app.patch("/auth/me", { onRequest: [app.authenticate] }, async (req, reply) => {
    const parsed = updateMeSchema.safeParse(req.body);
    if (!parsed.success) {
      return reply.code(400).send({ error: "bad_request", message: "Nom invalide (2 à 60 caractères)." });
    }
    const user = await prisma.user.update({
      where: { id: req.user.sub },
      data: { name: parsed.data.name.trim() },
    });
    return reply.send({ user: toUser(user) });
  });
}
