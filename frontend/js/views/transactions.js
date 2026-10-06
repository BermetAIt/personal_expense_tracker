import {
  categoriesFor,
  categoryColor,
  currentIsoDate,
  escapeHtml,
  formatAmount,
  formatDate,
  formatMonth,
} from "../helpers.js?v=3";

function renderMonthSwitcher(month) {
  return `<div class="month-switcher" aria-label="Выбранный месяц">
    <button type="button" data-action="month-shift" data-shift="-1" aria-label="Предыдущий месяц">‹</button>
    <span>${formatMonth(month)}</span>
    <button type="button" data-action="month-shift" data-shift="1" aria-label="Следующий месяц">›</button>
  </div>`;
}

function renderCategoryChips(state) {
  return categoriesFor(state.transactionType).map((category) => `<button type="button" class="chip ${state.category === category ? "active" : ""}" data-action="choose-category" data-category="${category}">
    <i class="chip-dot" style="background:${categoryColor(category)}"></i>${category}
  </button>`).join("");
}

export function renderTransactionList(transactions, search = "") {
  if (!transactions.length) {
    return `<div class="empty-state"><svg width="64" viewBox="0 0 72 64" role="img" aria-label="Пустой список"><ellipse cx="36" cy="48" rx="22" ry="8" fill="var(--ln)"/><ellipse cx="36" cy="38" rx="22" ry="8" fill="var(--ac2)" stroke="var(--ln)"/><ellipse cx="36" cy="28" rx="22" ry="8" fill="var(--ac)"/></svg>${statefulEmptyMessage(search)}</div>`;
  }
  const groups = transactions.reduce((byDay, transaction) => {
    (byDay[transaction.transaction_date] ||= []).push(transaction);
    return byDay;
  }, {});
  return Object.entries(groups).map(([day, items]) => {
    const expenseTotal = items
      .filter((transaction) => transaction.type === "expense")
      .reduce((sum, transaction) => sum + Number(transaction.amount), 0);
    return `<section aria-label="${escapeHtml(formatDate(day))}">
      <div class="day-heading"><span>${escapeHtml(formatDate(day))}</span><span>${expenseTotal ? `−${formatAmount(expenseTotal)}` : ""}</span></div>
      ${items.map((transaction) => `<article class="transaction-row">
        <span class="avatar" style="background:${categoryColor(transaction.category)}">${escapeHtml(transaction.category[0])}</span>
        <div class="transaction-name">${escapeHtml(transaction.category)}${transaction.note ? `<small>${escapeHtml(transaction.note)}</small>` : ""}</div>
        <div class="row-actions">
          <button type="button" data-action="edit-transaction" data-id="${transaction.id}" aria-label="Изменить: ${escapeHtml(transaction.category)}">изменить</button>
          <button type="button" data-action="delete-transaction" data-id="${transaction.id}" aria-label="Удалить: ${escapeHtml(transaction.category)}">удалить</button>
        </div>
        <b class="transaction-amount ${transaction.type === "income" ? "income" : ""}">${transaction.type === "income" ? "+" : "−"}${formatAmount(transaction.amount)}</b>
      </article>`).join("")}
    </section>`;
  }).join("");
}

function statefulEmptyMessage(search) {
  return search
    ? "<p>Ничего не найдено.</p>"
    : "<p>За этот месяц записей нет.<br>Добавьте первую запись.</p>";
}

function renderSummary(state) {
  const summary = state.summary || { balance: 0, income: 0, expenses: 0 };
  const budget = state.budget || { monthly_limit: 0 };
  const limit = Number(budget.monthly_limit || 0);
  const expenses = Number(summary.expenses || 0);
  const income = Number(summary.income || 0);
  const percentage = limit > 0 ? Math.min(100, expenses / limit * 100) : 0;
  const split = income + expenses ? income / (income + expenses) * 100 : 0;
  const budgetText = limit <= 0
    ? "Лимит не задан"
    : expenses > limit ? `Превышение ${formatAmount(expenses - limit)}` : `Осталось ${formatAmount(limit - expenses)}`;
  const circumference = 2 * Math.PI * 30;
  return `<section class="top-grid" aria-label="Сводка за месяц">
    <div class="hero">
      <small>Баланс за ${escapeHtml(formatMonth(state.month).toLowerCase())}</small>
      <div class="hero-value"><span data-count-to="${Number(summary.balance || 0)}">0</span></div>
      <div class="split-bar" aria-label="Соотношение доходов и расходов"><i style="width:${split}%"></i></div>
      <div class="hero-legend"><span>Доходы<b data-count-to="${income}">0</b></span><span>Расходы<b data-count-to="${expenses}">0</b></span></div>
    </div>
    <div class="card budget-summary">
      <svg width="80" height="80" viewBox="0 0 80 80" role="img" aria-label="Использовано ${limit > 0 ? Math.round(expenses / limit * 100) : 0}% бюджета">
        <circle cx="40" cy="40" r="30" fill="none" stroke="var(--bg)" stroke-width="9"/>
        <circle cx="40" cy="40" r="30" fill="none" stroke="${limit > 0 && expenses >= limit ? "var(--dg)" : "var(--ac)"}" stroke-width="9" stroke-linecap="round" stroke-dasharray="${Math.min(percentage, 100) / 100 * circumference} ${circumference}" transform="rotate(-90 40 40)" style="--circumference:${circumference};animation:draw .9s both"/>
        <text x="40" y="45" text-anchor="middle" font-size="14" font-weight="700" fill="currentColor">${limit > 0 ? `${Math.round(expenses / limit * 100)}%` : "–"}</text>
      </svg>
      <div><b>Месячный бюджет</b><div style="color:var(--mu);font-size:14px;margin:2px 0 6px">${budgetText}</div>
        <button class="text-button" type="button" data-action="navigate" data-page="bd">${limit > 0 ? "Изменить" : "Задать лимит"} →</button>
      </div>
    </div>
  </section>`;
}

export function renderTransactions(state) {
  const hour = new Date().getHours();
  const greeting = hour < 5 ? "Доброй ночи" : hour < 12 ? "Доброе утро" : hour < 18 ? "Добрый день" : "Добрый вечер";
  const editing = state.transactions.find((item) => item.id === state.editingId);
  const transaction = editing || { amount: "", transaction_date: currentIsoDate(), note: "" };
  return `<header class="page-header">
    <div><small>${escapeHtml(new Date().toLocaleDateString("ru-RU", { weekday: "long", day: "numeric", month: "long" }))}</small><h1>${greeting}, ${escapeHtml(state.user?.display_name || "")}</h1></div>
    ${renderMonthSwitcher(state.month)}
  </header>
  ${renderSummary(state)}
  <div class="columns">
    <form class="card" id="transaction-form" novalidate>
      <h2>${editing ? "Редактирование" : "Новая запись"}</h2>
      <div class="segment" aria-label="Тип транзакции">
        <button type="button" class="${state.transactionType === "expense" ? "active" : ""}" data-action="transaction-type" data-type="expense">Расход</button>
        <button type="button" class="${state.transactionType === "income" ? "active" : ""}" data-action="transaction-type" data-type="income">Доход</button>
      </div>
      <span class="field-label">Категория</span><div class="chips">${renderCategoryChips(state)}</div>
      <label for="transaction-amount">Сумма</label><input id="transaction-amount" name="amount" type="number" inputmode="decimal" min="0.01" max="999999999.99" step="0.01" placeholder="0" value="${escapeHtml(transaction.amount)}" required>
      <label for="transaction-date">Дата</label><input id="transaction-date" name="transaction_date" type="date" value="${escapeHtml(transaction.transaction_date)}" required>
      <label for="transaction-note">Заметка</label><input id="transaction-note" name="note" maxlength="80" placeholder="Например, обед в столовой" value="${escapeHtml(transaction.note || "")}">
      <div class="inline-error" id="transaction-error" role="alert"></div>
      <div class="button-row" style="margin-top:6px"><button class="button primary" type="submit">${editing ? "Сохранить" : "Добавить"}</button>
        ${editing ? `<button class="button" type="button" data-action="cancel-edit">Отмена</button>` : ""}
      </div>
    </form>
    <section class="card" aria-label="Транзакции за выбранный месяц">
      <div class="filter-row"><label class="sr-only" for="transaction-search">Поиск по заметке или категории</label><input id="transaction-search" type="search" placeholder="Поиск по заметке или категории" value="${escapeHtml(state.search)}" autocomplete="off"></div>
      <div id="transaction-list">${renderTransactionList(state.transactions, state.search)}</div>
    </section>
  </div>`;
}

export function countUp() {
  document.querySelectorAll("[data-count-to]").forEach((element) => {
    const target = Number(element.dataset.countTo);
    if (matchMedia("(prefers-reduced-motion: reduce)").matches) {
      element.textContent = formatAmount(target);
      return;
    }
    const started = performance.now();
    const frame = (time) => {
      const progress = Math.min(1, (time - started) / 650);
      element.textContent = formatAmount(target * (1 - (1 - progress) ** 3));
      if (progress < 1) requestAnimationFrame(frame);
    };
    requestAnimationFrame(frame);
  });
}