// Seed initial : crée un compte admin et un premier code d'invitation.
// Usage : npm run seed -w @quantic/api

import bcrypt from "bcryptjs";
import { randomBytes } from "node:crypto";
import { prisma } from "./lib/prisma.js";

async function main(): Promise<void> {
  const email = "teddyfourez59600@gmail.com";
  const password = "Prosternity59168!";

  const hashed = await bcrypt.hash(password, 10);
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    await prisma.user.update({
      where: { email },
      data: { password: hashed, role: "admin" },
    });
    console.log("Compte admin mis à jour :", email);
  } else {
    await prisma.user.create({
      data: { name: "Admin", email, password: hashed, role: "admin" },
    });
    console.log("Compte admin créé :", email);
  }

  const code = "QNT-" + randomBytes(4).toString("hex").toUpperCase();
  const invite = await prisma.invitationCode.create({
    data: { code, maxUses: 5 },
  });
  console.log("Code d'invitation créé :", invite.code, "(5 utilisations)");
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (err) => {
    console.error(err);
    await prisma.$disconnect();
    process.exit(1);
  });
