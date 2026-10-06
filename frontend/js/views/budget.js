import { escapeHtml, formatAmount, formatMonth } from "../helpers.js?v=3";

export function renderBudget(state) {
  const today = new Date();
  const month = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}`;
  const budget = state.budget || { monthly_limit: 0, spent: 0, remaining: 0, exceeded: false };
  const limit = Number(budget.monthly_limit || 0);
  const spent = Number(budget.spent || 0);
  const remaining = Number(budget.remaining || 0);
  const progress = limit > 0 ? Math.min(spent / limit * 100, 100) : 0;
  return `<header class="page-header"><div><small>${escapeHtml(formatMonth(month))}</small><h1>Бюджет</h1></div></header>
    <section class="card" style="max-width:560px">
      <h2>Месячный лимит</h2>
      <form id="budget-form" novalidate>
        <label class="sr-only" for="budget-limit">Месячный лимит</label>
        <div style="display:flex;gap:8px"><input id="budget-limit" type="number" inputmode="decimal" min="0" max="999999999.99" step="0.01" placeholder="Например, 20000" value="${limit || ""}">
          <button class="button primary" type="submit">Сохранить</button></div>
        <div class="inline-error" id="budget-error" role="alert"></div>
      </form>
      ${limit > 0 ? `<div class="progress" aria-label="Использовано ${Math.round(progress)}% лимита"><i style="width:${progress}%;background:${budget.exceeded ? "var(--dg)" : "var(--ac)"}"></i></div>
        <div style="display:flex;justify-content:space-between;flex-wrap:wrap;gap:6px"><span>Потрачено <b>${formatAmount(spent)}</b> из ${formatAmount(limit)}</span>
          <span style="color:${budget.exceeded ? "var(--dg)" : "inherit"}">${budget.exceeded ? "Превышение" : "Осталось"} <b>${formatAmount(Math.abs(remaining))}</b></span></div>`
        : `<p style="color:var(--mu)">Лимит не задан. Потрачено в этом месяце: ${formatAmount(spent)}.</p>`}
    </section>`;
}