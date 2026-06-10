import { useEffect, useState, type FormEvent } from "react";
import type { Transaction, FinanceOverview, TransactionType } from "@quantic/shared";
import { api, ApiException } from "../lib/api";
import { formatDate } from "../lib/labels";

function todayKey(): string {
  return new Date().toISOString().slice(0, 10);
}
function eur(n: number): string {
  return n.toLocaleString("fr-FR", { style: "currency", currency: "EUR" });
}

export function FinanceView() {
  const [overview, setOverview] = useState<FinanceOverview | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Nouvelle transaction
  const [amount, setAmount] = useState("");
  const [type, setType] = useState<TransactionType>("expense");
  const [category, setCategory] = useState("");
  const [date, setDate] = useState(todayKey());
  const [busy, setBusy] = useState(false);

  // Nouveau budget
  const [budgetCat, setBudgetCat] = useState("");
  const [budgetAmount, setBudgetAmount] = useState("");
  const [budgetBusy, setBudgetBusy] = useState(false);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const [o, t] = await Promise.all([api.financeOverview(), api.listTransactions()]);
      setOverview(o);
      setTransactions(t.transactions);
    } catch (err) {
      setError(err instanceof ApiException ? err.message : "Chargement impossible.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const addTx = async (e: FormEvent) => {
    e.preventDefault();
    if (!amount || !category.trim()) return;
    setBusy(true);
    setError(null);
    try {
      await api.createTransaction({ amount: Number(amount), type, category: category.trim(), date });
      setAmount("");
      setCategory("");
      await load();
    } catch (err) {
      setError(err instanceof ApiException ? err.message : "Ajout impossible.");
    } finally {
      setBusy(false);
    }
  };

  const removeTx = async (id: string) => {
    await api.deleteTransaction(id);
    await load();
  };

  const addBudget = async (e: FormEvent) => {
    e.preventDefault();
    if (!budgetAmount) return;
    setBudgetBusy(true);
    setError(null);
    try {
      await api.createBudget({ category: budgetCat.trim() || null, amount: Number(budgetAmount) });
      setBudgetCat("");
      setBudgetAmount("");
      await load();
    } catch (err) {
      setError(err instanceof ApiException ? err.message : "Ajout impossible.");
    } finally {
      setBudgetBusy(false);
    }
  };

  const removeBudget = async (id: string) => {
    await api.deleteBudget(id);
    await load();
  };

  if (loading) {
    return (
      <div>
        <div className="page-header"><h1>Finance</h1></div>
        <div className="loading-state">Chargement…</div>
      </div>
    );
  }

  const maxCat = overview && overview.byCategory.length ? overview.byCategory[0].total : 0;

  return (
    <div>
      <div className="page-header">
        <h1>Finance</h1>
        <p>Solde, transactions et budgets du mois.</p>
      </div>

      {error && <div className="alert alert-error" style={{ marginBottom: 18 }}>{error}</div>}

      {/* Solde + KPIs */}
      {overview && (
        <div className="stat-grid" style={{ marginBottom: 18 }}>
          <div className="stat">
            <div className="k">Solde</div>
            <div className="v">{eur(overview.balance)}</div>
          </div>
          <div className="stat">
            <div className="k">Revenus du mois</div>
            <div className="v" style={{ color: "#7fd0a0" }}>{eur(overview.monthIncome)}</div>
          </div>
          <div className="stat">
            <div className="k">Dépenses du mois</div>
            <div className="v" style={{ color: "#d99a9a" }}>{eur(overview.monthExpense)}</div>
          </div>
        </div>
      )}

      <div className="dash-grid">
        {/* Transactions */}
        <div className="card">
          <div className="card-title"><h2>Transactions</h2></div>
          <form className="row" onSubmit={addTx} style={{ gap: 8, flexWrap: "wrap", marginBottom: 16 }}>
            <input className="input" style={{ width: 110 }} type="number" step={0.01} min={0} placeholder="Montant" value={amount} onChange={(e) => setAmount(e.target.value)} />
            <select className="select" value={type} onChange={(e) => setType(e.target.value as TransactionType)}>
              <option value="expense">Dépense</option>
              <option value="income">Revenu</option>
            </select>
            <input className="input" style={{ flex: 1, minWidth: 120 }} placeholder="Catégorie" value={category} onChange={(e) => setCategory(e.target.value)} />
            <input className="input" style={{ width: 150 }} type="date" value={date} onChange={(e) => setDate(e.target.value)} />
            <button className="btn btn-primary" type="submit" disabled={busy || !amount || !category.trim()}>Ajouter</button>
          </form>

          {transactions.length === 0 ? (
            <div className="empty-state" style={{ padding: "20px 0" }}>Aucune transaction.</div>
          ) : (
            <table className="table">
              <thead>
                <tr><th>Date</th><th>Catégorie</th><th>Type</th><th style={{ textAlign: "right" }}>Montant</th><th></th></tr>
              </thead>
              <tbody>
                {transactions.slice(0, 20).map((t) => (
                  <tr key={t.id}>
                    <td>{formatDate(t.date)}</td>
                    <td style={{ color: "var(--text-primary)" }}>{t.category}</td>
                    <td>{t.type === "income" ? "Revenu" : "Dépense"}</td>
                    <td style={{ textAlign: "right", color: t.type === "income" ? "#7fd0a0" : "#d99a9a" }}>
                      {t.type === "income" ? "+" : "−"}{eur(t.amount)}
                    </td>
                    <td style={{ textAlign: "right" }}>
                      <button className="btn btn-ghost" onClick={() => removeTx(t.id)}>Suppr.</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        <div className="stack">
          {/* Budgets */}
          <div className="card">
            <div className="card-title"><h2>Budgets du mois</h2></div>
            <form className="row" onSubmit={addBudget} style={{ gap: 8, flexWrap: "wrap", marginBottom: 14 }}>
              <input className="input" style={{ flex: 1, minWidth: 100 }} placeholder="Catégorie (vide = global)" value={budgetCat} onChange={(e) => setBudgetCat(e.target.value)} />
              <input className="input" style={{ width: 110 }} type="number" step={0.01} min={0} placeholder="Montant" value={budgetAmount} onChange={(e) => setBudgetAmount(e.target.value)} />
              <button className="btn btn-ghost" type="submit" disabled={budgetBusy || !budgetAmount}>+</button>
            </form>

            {!overview || overview.budgets.length === 0 ? (
              <div className="empty-state" style={{ padding: "16px 0" }}>Aucun budget défini.</div>
            ) : (
              <div className="stack" style={{ gap: 14 }}>
                {overview.budgets.map((b) => {
                  const pct = b.amount > 0 ? Math.min((b.used / b.amount) * 100, 100) : 0;
                  const over = b.remaining < 0;
                  return (
                    <div key={b.id}>
                      <div className="row between" style={{ fontSize: 13, marginBottom: 6 }}>
                        <span>{b.category ?? "Global"}</span>
                        <span className="row" style={{ gap: 10 }}>
                          <span className={over ? "" : "text-muted"} style={over ? { color: "#d99a9a" } : undefined}>
                            {eur(b.used)} / {eur(b.amount)}
                          </span>
                          <button className="btn btn-ghost" style={{ padding: "2px 8px", fontSize: 11 }} onClick={() => removeBudget(b.id)}>×</button>
                        </span>
                      </div>
                      <div className="progress">
                        <span style={{ width: `${pct}%`, background: over ? "#d99a9a" : undefined }} />
                      </div>
                      <div className="text-muted" style={{ fontSize: 11, marginTop: 4 }}>
                        {over ? `Dépassement de ${eur(-b.remaining)}` : `Reste ${eur(b.remaining)}`}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Lecture analytique : dépenses par catégorie */}
          <div className="card">
            <div className="card-title"><h2>Dépenses par catégorie</h2></div>
            {!overview || overview.byCategory.length === 0 ? (
              <div className="empty-state" style={{ padding: "16px 0" }}>Aucune dépense ce mois-ci.</div>
            ) : (
              <div className="stack" style={{ gap: 10 }}>
                {overview.byCategory.map((c) => (
                  <div key={c.category}>
                    <div className="row between" style={{ fontSize: 13, marginBottom: 5 }}>
                      <span>{c.category}</span>
                      <span className="text-muted">{eur(c.total)}</span>
                    </div>
                    <div className="progress">
                      <span style={{ width: `${maxCat ? (c.total / maxCat) * 100 : 0}%` }} />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
