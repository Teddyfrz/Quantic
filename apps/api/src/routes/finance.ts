import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { prisma } from "../lib/prisma.js";
import { toTransaction, toBudget } from "../lib/serialize.js";
import type { BudgetStatus, CategorySpend } from "@quantic/shared";

const ymd = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
const txType = z.enum(["income", "expense"]);

const createTxSchema = z.object({
  amount: z.number().positive().max(1_000_000_000),
  type: txType,
  category: z.string().min(1).max(80),
  date: ymd,
  note: z.string().max(1000).nullable().optional(),
});
const updateTxSchema = z.object({
  amount: z.number().positive().max(1_000_000_000).optional(),
  type: txType.optional(),
  category: z.string().min(1).max(80).optional(),
  date: ymd.optional(),
  note: z.string().max(1000).nullable().optional(),
});

const createBudgetSchema = z.object({
  category: z.string().min(1).max(80).nullable().optional(),
  amount: z.number().positive().max(1_000_000_000),
});
const updateBudgetSchema = z.object({
  category: z.string().min(1).max(80).nullable().optional(),
  amount: z.number().positive().max(1_000_000_000).optional(),
});

function monthBounds(): { start: Date; end: Date } {
  const now = new Date();
  const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
  const end = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1));
  return { start, end };
}

export async function financeRoutes(app: FastifyInstance): Promise<void> {
  app.addHook("onRequest", app.authenticate);

  // --- Transactions ---
  app.get("/transactions", async (req, reply) => {
    const txs = await prisma.transaction.findMany({
      where: { userId: req.user.sub },
      orderBy: { date: "desc" },
    });
    return reply.send({ transactions: txs.map(toTransaction) });
  });

  app.post("/transactions", async (req, reply) => {
    const parsed = createTxSchema.safeParse(req.body);
    if (!parsed.success) {
      return reply.code(400).send({ error: "bad_request", message: "Données invalides." });
    }
    const { amount, type, category, date, note } = parsed.data;
    const tx = await prisma.transaction.create({
      data: { userId: req.user.sub, amount, type, category, date: new Date(date + "T00:00:00.000Z"), note: note ?? null },
    });
    return reply.code(201).send({ transaction: toTransaction(tx) });
  });

  app.patch("/transactions/:id", async (req, reply) => {
    const { id } = req.params as { id: string };
    const parsed = updateTxSchema.safeParse(req.body);
    if (!parsed.success) {
      return reply.code(400).send({ error: "bad_request", message: "Données invalides." });
    }
    const existing = await prisma.transaction.findFirst({ where: { id, userId: req.user.sub } });
    if (!existing) {
      return reply.code(404).send({ error: "not_found", message: "Transaction introuvable." });
    }
    const { date, ...rest } = parsed.data;
    const tx = await prisma.transaction.update({
      where: { id },
      data: { ...rest, ...(date ? { date: new Date(date + "T00:00:00.000Z") } : {}) },
    });
    return reply.send({ transaction: toTransaction(tx) });
  });

  app.delete("/transactions/:id", async (req, reply) => {
    const { id } = req.params as { id: string };
    const existing = await prisma.transaction.findFirst({ where: { id, userId: req.user.sub } });
    if (!existing) {
      return reply.code(404).send({ error: "not_found", message: "Transaction introuvable." });
    }
    await prisma.transaction.delete({ where: { id } });
    return reply.code(204).send();
  });

  // --- Budgets ---
  app.get("/budgets", async (req, reply) => {
    const budgets = await prisma.budget.findMany({ where: { userId: req.user.sub } });
    return reply.send({ budgets: budgets.map(toBudget) });
  });

  app.post("/budgets", async (req, reply) => {
    const parsed = createBudgetSchema.safeParse(req.body);
    if (!parsed.success) {
      return reply.code(400).send({ error: "bad_request", message: "Données invalides." });
    }
    const budget = await prisma.budget.create({
      data: { userId: req.user.sub, category: parsed.data.category ?? null, amount: parsed.data.amount },
    });
    return reply.code(201).send({ budget: toBudget(budget) });
  });

  app.patch("/budgets/:id", async (req, reply) => {
    const { id } = req.params as { id: string };
    const parsed = updateBudgetSchema.safeParse(req.body);
    if (!parsed.success) {
      return reply.code(400).send({ error: "bad_request", message: "Données invalides." });
    }
    const existing = await prisma.budget.findFirst({ where: { id, userId: req.user.sub } });
    if (!existing) {
      return reply.code(404).send({ error: "not_found", message: "Budget introuvable." });
    }
    const budget = await prisma.budget.update({ where: { id }, data: parsed.data });
    return reply.send({ budget: toBudget(budget) });
  });

  app.delete("/budgets/:id", async (req, reply) => {
    const { id } = req.params as { id: string };
    const existing = await prisma.budget.findFirst({ where: { id, userId: req.user.sub } });
    if (!existing) {
      return reply.code(404).send({ error: "not_found", message: "Budget introuvable." });
    }
    await prisma.budget.delete({ where: { id } });
    return reply.code(204).send();
  });

  // --- Lecture analytique ---
  app.get("/finance/overview", async (req, reply) => {
    const userId = req.user.sub;
    const { start, end } = monthBounds();

    const [all, monthTxs, budgets] = await Promise.all([
      prisma.transaction.findMany({ where: { userId } }),
      prisma.transaction.findMany({ where: { userId, date: { gte: start, lt: end } } }),
      prisma.budget.findMany({ where: { userId } }),
    ]);

    const balance = all.reduce((acc, t) => acc + (t.type === "income" ? t.amount : -t.amount), 0);
    const monthIncome = monthTxs.filter((t) => t.type === "income").reduce((a, t) => a + t.amount, 0);
    const monthExpense = monthTxs.filter((t) => t.type === "expense").reduce((a, t) => a + t.amount, 0);

    const catMap = new Map<string, number>();
    for (const t of monthTxs) {
      if (t.type !== "expense") continue;
      catMap.set(t.category, (catMap.get(t.category) ?? 0) + t.amount);
    }
    const byCategory: CategorySpend[] = [...catMap.entries()]
      .map(([category, total]) => ({ category, total }))
      .sort((a, b) => b.total - a.total);

    const budgetStatus: BudgetStatus[] = budgets.map((b) => {
      const used =
        b.category === null
          ? monthExpense
          : catMap.get(b.category) ?? 0;
      return {
        id: b.id,
        category: b.category,
        amount: b.amount,
        used,
        remaining: Math.round((b.amount - used) * 100) / 100,
      };
    });

    return reply.send({
      balance: Math.round(balance * 100) / 100,
      monthIncome: Math.round(monthIncome * 100) / 100,
      monthExpense: Math.round(monthExpense * 100) / 100,
      byCategory,
      budgets: budgetStatus,
    });
  });
}
