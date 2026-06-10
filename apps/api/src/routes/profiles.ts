import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { prisma } from "../lib/prisma.js";
import type { Profile as PrismaProfile, User as PrismaUser } from "@prisma/client";
import type { PublicProfile, MyProfile, Role, PresenceStatus, ProfileVisibility } from "@quantic/shared";

// data URL image (redimensionnée côté client) — limite ~2,5 Mo de chaîne.
const dataUrl = z
  .string()
  .max(2_500_000)
  .regex(/^data:image\/(png|jpe?g|webp);base64,/)
  .nullable()
  .optional();

const updateSchema = z.object({
  handle: z.string().regex(/^[a-zA-Z0-9_.]{2,30}$/).nullable().optional().or(z.literal("")),
  bio: z.string().max(600).nullable().optional(),
  status: z.enum(["available", "focus", "away", "offline"]).optional(),
  statusText: z.string().max(80).nullable().optional(),
  location: z.string().max(80).nullable().optional(),
  avatarColor: z.string().regex(/^[0-5]$/).optional(),
  avatarUrl: dataUrl,
  bannerUrl: dataUrl,
  links: z.array(z.string().max(200)).max(8).optional(),
  visibility: z.enum(["private", "members"]).optional(),
});

function parseLinks(raw: string): string[] {
  try {
    const v = JSON.parse(raw);
    return Array.isArray(v) ? v.filter((x) => typeof x === "string") : [];
  } catch {
    return [];
  }
}

function toPublic(p: PrismaProfile, u: Pick<PrismaUser, "id" | "name" | "role" | "createdAt">): PublicProfile {
  return {
    userId: u.id,
    name: u.name,
    role: u.role as Role,
    memberSince: u.createdAt.toISOString(),
    handle: p.handle,
    bio: p.bio,
    status: p.status as PresenceStatus,
    statusText: p.statusText,
    location: p.location,
    avatarColor: p.avatarColor,
    avatarUrl: p.avatarUrl,
    bannerUrl: p.bannerUrl,
    links: parseLinks(p.links),
  };
}

async function ensureProfile(userId: string) {
  const existing = await prisma.profile.findUnique({ where: { userId } });
  if (existing) return existing;
  return prisma.profile.create({ data: { userId } });
}

export async function profileRoutes(app: FastifyInstance): Promise<void> {
  app.addHook("onRequest", app.authenticate);

  // Mon profil (création auto si absent)
  app.get("/me/profile", async (req, reply) => {
    const profile = await ensureProfile(req.user.sub);
    const user = await prisma.user.findUniqueOrThrow({ where: { id: req.user.sub } });
    const mine: MyProfile = {
      ...toPublic(profile, user),
      visibility: profile.visibility as ProfileVisibility,
    };
    return reply.send({ profile: mine });
  });

  // Mise à jour de mon profil
  app.put("/me/profile", async (req, reply) => {
    const parsed = updateSchema.safeParse(req.body);
    if (!parsed.success) {
      return reply.code(400).send({ error: "bad_request", message: "Données invalides." });
    }
    await ensureProfile(req.user.sub);
    const data = parsed.data;
    const handle = data.handle === "" ? null : data.handle;

    if (handle) {
      const taken = await prisma.profile.findFirst({
        where: { handle, userId: { not: req.user.sub } },
      });
      if (taken) {
        return reply.code(409).send({ error: "handle_taken", message: "Cet identifiant est déjà pris." });
      }
    }

    const profile = await prisma.profile.update({
      where: { userId: req.user.sub },
      data: {
        ...(data.handle !== undefined ? { handle } : {}),
        ...(data.bio !== undefined ? { bio: data.bio } : {}),
        ...(data.status !== undefined ? { status: data.status } : {}),
        ...(data.statusText !== undefined ? { statusText: data.statusText } : {}),
        ...(data.location !== undefined ? { location: data.location } : {}),
        ...(data.avatarColor !== undefined ? { avatarColor: data.avatarColor } : {}),
        ...(data.avatarUrl !== undefined ? { avatarUrl: data.avatarUrl } : {}),
        ...(data.bannerUrl !== undefined ? { bannerUrl: data.bannerUrl } : {}),
        ...(data.links !== undefined ? { links: JSON.stringify(data.links) } : {}),
        ...(data.visibility !== undefined ? { visibility: data.visibility } : {}),
      },
    });
    const user = await prisma.user.findUniqueOrThrow({ where: { id: req.user.sub } });
    const mine: MyProfile = { ...toPublic(profile, user), visibility: profile.visibility as ProfileVisibility };
    return reply.send({ profile: mine });
  });

  // Annuaire : profils visibles par les membres (?q= recherche)
  app.get("/profiles", async (req, reply) => {
    const { q } = req.query as { q?: string };
    const profiles = await prisma.profile.findMany({
      where: {
        visibility: "members",
        ...(q
          ? {
              OR: [
                { handle: { contains: q } },
                { location: { contains: q } },
                { user: { name: { contains: q } } },
              ],
            }
          : {}),
      },
      include: { user: { select: { id: true, name: true, role: true, createdAt: true } } },
      orderBy: { updatedAt: "desc" },
    });
    return reply.send({ profiles: profiles.map((p) => toPublic(p, p.user)) });
  });

  // Détail d'un profil membre (ou le sien)
  app.get("/profiles/:userId", async (req, reply) => {
    const { userId } = req.params as { userId: string };
    const profile = await prisma.profile.findUnique({
      where: { userId },
      include: { user: { select: { id: true, name: true, role: true, createdAt: true } } },
    });
    if (!profile || (profile.visibility !== "members" && userId !== req.user.sub)) {
      return reply.code(404).send({ error: "not_found", message: "Profil introuvable." });
    }
    return reply.send({ profile: toPublic(profile, profile.user) });
  });
}
