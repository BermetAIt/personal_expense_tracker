import { escapeHtml, formatAmount, formatMonth } from "../helpers.js?v=3";

function renderMonthSwitcher(month) {
  return `<div class="month-switcher" aria-label="Выбранный месяц">
    <button type="button" data-action="month-shift" data-shift="-1" aria-label="Предыдущий месяц">‹</button>
    <span>${formatMonth(month)}</span>
    <button type="button" data-action="month-shift" data-shift="1" aria-label="Следующий месяц">›</button>
  </div>`;
}

function renderDonut(categories) {
  const radius = 70;
  const circumference = 2 * Math.PI * radius;
  let offset = 0;
  const circles = categories.map((item, index) => {
    const arc = Number(item.percentage) / 100 * circumference;
    const circle = `<circle cx="100" cy="100" r="${radius}" fill="none" stroke="${item.color}" stroke-width="28" stroke-dasharray="${Math.max(arc - 1.5, 0)} ${circumference}" stroke-dashoffset="${-offset}" transform="rotate(-90 100 100)" style="--circumference:${circumference};animation:draw .9s ${index * .05}s both"/>`;
    offset += arc;
    return circle;
  }).join("");
  const total = categories.reduce((sum, item) => sum + Number(item.total), 0);
  return `<svg viewBox="0 0 200 200" width="100%" style="max-width:240px" role="img" aria-label="Круговая диаграмма распределения: ${categories.map((item) => `${escapeHtml(item.category)} ${Number(item.percentage).toFixed(1)}%`).join(", ")}">
    ${circles}<text x="100" y="99" text-anchor="middle" fill="currentColor" font-size="24" font-family="Fraunces,serif" font-weight="500">${formatAmount(total)}</text>
    <text x="100" y="120" text-anchor="middle" fill="var(--mu)" font-size="11">всего</text>
  </svg>`;
}

function renderCategoryRows(categories) {
  const max = Math.max(...categories.map((item) => Number(item.total)), 1);
  return categories.map((item, index) => `<div class="category-row">
    <span><i class="category-dot" style="background:${item.color}"></i>${escapeHtml(item.category)}</span>
    <div class="category-bar"><i style="width:${Number(item.total) / max * 100}%;background:${item.color};animation-delay:${index * .06}s"></i></div>
    <span style="text-align:right">${formatAmount(item.total)}</span>
    <span class="percentage" style="text-align:right;color:var(--mu)">${Number(item.percentage).toFixed(1)}%</span>
  </div>`).join("");
}

function renderDailyChart(days, type) {
  const max = Math.max(...days.map((item) => Number(item.total)), 1);
  const width = 600 / Math.max(days.length, 1);
  const bars = days.map((item, index) => {
    const total = Number(item.total);
    const height = total ? Math.max(total / max * 95, 2) : 0;
    const x = index * width + 2;
    const y = 110 - height;
    const day = Number(item.day.slice(-2));
    return `<rect x="${x}" y="${y}" width="${Math.max(width - 4, 1)}" height="${height}" rx="2" fill="var(--ac)" style="transform-box:fill-box;transform-origin:bottom;animation:grow-y .7s ${index * .015}s both"><title>${day}: ${formatAmount(total)}</title></rect>`;
  }).join("");
  const labels = [1, Math.ceil(days.length / 2), days.length].map((day) => `<text x="${(day - 1) * width + width / 2}" y="126" text-anchor="middle" font-size="11" fill="var(--mu)">${day}</text>`).join("");
  return `<svg viewBox="0 0 600 130" width="100%" role="img" aria-label="${type === "expense" ? "Расходы" : "Доходы"} по дням месяца">${bars}${labels}</svg>`;
}

export function renderStatistics(state) {
  const title = state.statsType === "expense" ? "расходов" : "доходов";
  const categories = state.categories.map((item) => ({ ...item, color: item.color }));
  const total = categories.reduce((sum, item) => sum + Number(item.total), 0);
  let content = `<header class="page-header"><div><small>Куда уходят деньги</small><h1>Статистика</h1></div>${renderMonthSwitcher(state.month)}</header>
    <div class="tabs" role="tablist" aria-label="Тип операций">
      <button type="button" role="tab" aria-selected="${state.statsType === "expense"}" class="${state.statsType === "expense" ? "active" : ""}" data-action="stats-type" data-type="expense">Расходы</button>
      <button type="button" role="tab" aria-selected="${state.statsType === "income"}" class="${state.statsType === "income" ? "active" : ""}" data-action="stats-type" data-type="income">Доходы</button>
    </div>`;
  if (!categories.length) {
    return `${content}<section class="card empty-state">Нет данных за ${escapeHtml(formatMonth(state.month).toLowerCase())}</section>`;
  }
  const top = categories[0];
  content += `<div class="insight">Больше всего — <b>${escapeHtml(top.category)}</b>: ${formatAmount(top.total)} (${Math.round(Number(top.percentage))}% от ${title}).</div>
    <section class="card category-chart">${renderDonut(categories)}<div>${renderCategoryRows(categories)}</div></section>
    <section class="card" style="margin-top:16px"><h2>По дням</h2>${renderDailyChart(state.days, state.statsType)}</section>`;
  return content;
}