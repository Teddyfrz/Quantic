// Configuration centralisée, lue depuis les variables d'environnement.

export const env = {
  port: Number(process.env.PORT ?? 4000),
  host: process.env.HOST ?? "127.0.0.1",
  jwtSecret: process.env.JWT_SECRET ?? "quantic-dev-secret-change-me",
  version: "0.1.0",
} as const;
