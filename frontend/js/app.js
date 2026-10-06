import { api } from "./api.js";
import {
	categoriesFor,
	categoryColor,
	escapeHtml,
	formatMonth,
	icon,
	navItems,
	shiftMonth,
} from "./helpers.js?v=3";
import { state } from "./state.js";
import { renderAuth } from "./views/auth.js?v=3";
import { renderBudget } from "./views/budget.js?v=3";
import { renderSettings } from "./views/settings.js?v=3";
import { renderStatistics } from "./views/statistics.js?v=3";
import { countUp, renderTransactionList, renderTransactions } from "./views/transactions.js?v=3";

const root = document.querySelector("#app");
let registering = false;
let toastTimer;
let searchTimer;

function setTheme() {
	const theme = localStorage.getItem("money-tracker-theme");
	if (theme === "light" || theme === "dark") document.documentElement.dataset.theme = theme;
	else delete document.documentElement.dataset.theme;
}

function renderNavigation() {
	return navItems.map(([key, label, path]) => `<button type="button" class="nav-link ${state.page === key ? "active" : ""}" data-action="navigate" data-page="${key}" aria-current="${state.page === key ? "page" : "false"}">${icon(path)}<span>${label}</span></button>`).join("");
}

function renderShell(content = "<div class='loading'>Загрузка…</div>") {
	const firstName = escapeHtml(state.user?.display_name?.[0] || "?");
	root.innerHTML = `<div class="shell">
		<aside class="sidebar"><div class="logo"><span class="logo-mark" aria-hidden="true">₸</span>Money Tracker</div>
			<nav class="nav" aria-label="Основная навигация">${renderNavigation()}</nav>
			<div class="profile-chip"><span class="avatar" style="background:#7b4fa0">${firstName}</span><div>${escapeHtml(state.user?.display_name || "Пользователь")}<small>личный профиль</small></div></div>
		</aside>
		<main class="content" id="page-content">${content}</main>
	</div><nav class="mobile-nav" aria-label="Основная навигация">${renderNavigation()}</nav><div class="toast" id="toast" role="status" aria-live="polite"></div>`;
}

function showAuth(message = "") {
	root.innerHTML = renderAuth(registering, message);
}

function showPageError(message) {
	const content = document.querySelector("#page-content");
	if (content) content.innerHTML = `<div class="page-header"><h1>Не удалось загрузить данные</h1></div><section class="card" role="alert">${escapeHtml(message)}</section>`;
}

async function loadPageData() {
	if (state.page === "tx") {
		[state.transactions, state.summary, state.budget] = await Promise.all([
			api.transactions({ month: state.month, q: state.search }),
			api.summary(state.month),
			api.budget(),
		]);
	} else if (state.page === "ch") {
		[state.categories, state.days] = await Promise.all([
			api.byCategory(state.month, state.statsType),
			api.byDay(state.month, state.statsType),
		]);
		state.categories = state.categories.map((category) => ({
			...category,
			color: categoryColor(category.category),
		}));
	} else if (state.page === "bd") {
		state.budget = await api.budget();
	}
}

async function renderPage() {
	const content = document.querySelector("#page-content");
	if (!content) return;
	content.innerHTML = `<div class="loading">Загрузка…</div>`;
	try {
		await loadPageData();
		content.innerHTML = ({
			tx: () => renderTransactions(state),
			ch: () => renderStatistics(state),
			bd: () => renderBudget(state),
			st: () => renderSettings(state),
		})[state.page]();
		if (state.page === "tx") countUp();
	} catch (error) {
		if (error.status === 401) {
			api.clearToken();
			state.user = null;
			showAuth();
			return;
		}
		showPageError(error.message);
	}
}

async function enterApp() {
	try {
		state.user = await api.me();
		renderShell();
		await renderPage();
	} catch {
		api.clearToken();
		state.user = null;
		showAuth();
	}
}

function showToast(message) {
	const toast = document.querySelector("#toast");
	if (!toast) return;
	toast.textContent = message;
	toast.classList.add("visible");
	clearTimeout(toastTimer);
	toastTimer = setTimeout(() => toast.classList.remove("visible"), 1900);
}

setTheme();
if (api.hasToken()) enterApp();
else showAuth();

root.addEventListener("click", async (event) => {
	const target = event.target.closest("[data-action]");
	if (!target) return;
	const { action } = target.dataset;
	if (action === "auth-toggle") {
		registering = target.dataset.registering === "true";
		showAuth();
	}
	if (action === "navigate") {
		state.page = target.dataset.page;
		renderShell();
		await renderPage();
	}
	if (action === "month-shift") {
		state.month = shiftMonth(state.month, Number(target.dataset.shift));
		await renderPage();
	}
	if (action === "transaction-type") {
		state.transactionType = target.dataset.type;
		state.category = "";
		document.querySelectorAll("[data-action='transaction-type']").forEach((button) => {
			button.classList.toggle("active", button.dataset.type === state.transactionType);
		});
		const chips = document.querySelector(".chips");
		if (chips) chips.innerHTML = categoriesFor(state.transactionType).map((category) => `<button type="button" class="chip" data-action="choose-category" data-category="${category}"><i class="chip-dot" style="background:${categoryColor(category)}"></i>${category}</button>`).join("");
	}
	if (action === "choose-category") {
		state.category = target.dataset.category;
		document.querySelectorAll("[data-action='choose-category']").forEach((button) => {
			button.classList.toggle("active", button.dataset.category === state.category);
		});
	}
	if (action === "cancel-edit") {
		state.editingId = null;
		state.category = "";
		await renderPage();
	}
	if (action === "edit-transaction") {
		const transaction = state.transactions.find((item) => item.id === Number(target.dataset.id));
		if (!transaction) return;
		state.editingId = transaction.id;
		state.transactionType = transaction.type;
		state.category = transaction.category;
		await renderPage();
	}
	if (action === "delete-transaction") {
		if (!window.confirm("Удалить запись?")) return;
		try {
			await api.deleteTransaction(Number(target.dataset.id));
			await renderPage();
			showToast("Запись удалена");
		} catch (error) {
			showToast(error.message);
		}
	}
	if (action === "stats-type") {
		state.statsType = target.dataset.type;
		await renderPage();
	}
	if (action === "export-csv") {
		try {
			const blob = await api.downloadCsv();
			const url = URL.createObjectURL(blob);
			const link = document.createElement("a");
			link.href = url;
			link.download = "transactions.csv";
			link.click();
			URL.revokeObjectURL(url);
			showToast("Экспорт готов");
		} catch (error) {
			showToast(error.message);
		}
	}
	if (action === "demo-data") {
		try {
			await api.addDemoData();
			state.page = "tx";
			renderShell();
			await renderPage();
			showToast("Демо-данные добавлены");
		} catch (error) {
			showToast(error.message);
		}
	}
	if (action === "delete-all") {
		if (!window.confirm("Удалить все записи и бюджет?")) return;
		try {
			await api.deleteAllData();
			state.editingId = null;
			state.category = "";
			state.search = "";
			await renderPage();
			showToast("Данные удалены");
		} catch (error) {
			showToast(error.message);
		}
	}
	if (action === "toggle-theme") {
		const current = document.documentElement.dataset.theme || "system";
		const next = current === "system" ? "light" : current === "light" ? "dark" : "system";
		if (next === "system") {
			localStorage.removeItem("money-tracker-theme");
			delete document.documentElement.dataset.theme;
		} else {
			localStorage.setItem("money-tracker-theme", next);
			document.documentElement.dataset.theme = next;
		}
		await renderPage();
	}
	if (action === "logout") {
		api.clearToken();
		state.user = null;
		showAuth();
	}
});

root.addEventListener("input", (event) => {
	if (event.target.id !== "transaction-search") return;
	state.search = event.target.value;
	clearTimeout(searchTimer);
	searchTimer = setTimeout(async () => {
		try {
			state.transactions = await api.transactions({ month: state.month, q: state.search });
			const list = document.querySelector("#transaction-list");
			if (list) list.innerHTML = renderTransactionList(state.transactions, state.search);
		} catch (error) {
			showToast(error.message);
		}
	}, 220);
});

root.addEventListener("submit", async (event) => {
	if (event.target.id !== "auth-form") return;
	event.preventDefault();
	const form = new FormData(event.target);
	const credentials = {
		email: String(form.get("email")).trim(),
		password: String(form.get("password")),
	};
	const displayName = String(form.get("display_name") || "").trim();
	if (!credentials.email || !credentials.password || (registering && !displayName)) {
		document.querySelector("#auth-error").textContent = "Заполните все обязательные поля.";
		return;
	}
	try {
		state.user = registering
			? await api.register({ ...credentials, display_name: displayName })
			: await api.login(credentials);
		state.page = "tx";
		await enterApp();
	} catch (error) {
		document.querySelector("#auth-error").textContent = error.status === 401
			? "Неверная почта или пароль."
			: error.status === 400 ? "Эта почта уже зарегистрирована." : error.message;
	}
});

root.addEventListener("submit", async (event) => {
	if (event.target.id === "transaction-form") {
		event.preventDefault();
		const error = document.querySelector("#transaction-error");
		const form = new FormData(event.target);
		const amount = Number(form.get("amount"));
		const transactionDate = String(form.get("transaction_date") || "");
		if (!state.category) error.textContent = "Выберите категорию.";
		else if (!Number.isFinite(amount)) error.textContent = "Введите сумму.";
		else if (amount <= 0) error.textContent = "Сумма должна быть больше нуля.";
		else if (amount >= 1_000_000_000) error.textContent = "Слишком большая сумма.";
		else if (!transactionDate) error.textContent = "Укажите дату.";
		else {
			error.textContent = "";
			const payload = {
				type: state.transactionType,
				category: state.category,
				amount: amount.toFixed(2),
				transaction_date: transactionDate,
				note: String(form.get("note") || "").trim(),
			};
			try {
				if (state.editingId) await api.updateTransaction(state.editingId, payload);
				else await api.createTransaction(payload);
				state.month = transactionDate.slice(0, 7);
				state.editingId = null;
				state.category = "";
				await renderPage();
				showToast("Запись сохранена");
			} catch (requestError) {
				error.textContent = requestError.status === 422
					? "Проверьте сумму, дату и категорию."
					: requestError.message;
			}
		}
	}
	if (event.target.id === "budget-form") {
		event.preventDefault();
		const error = document.querySelector("#budget-error");
		const amount = Number(document.querySelector("#budget-limit").value);
		if (!Number.isFinite(amount) || amount < 0 || amount >= 1_000_000_000) {
			error.textContent = "Введите сумму от 0 до 999 999 999,99.";
			return;
		}
		try {
			await api.saveBudget(amount.toFixed(2));
			await renderPage();
			showToast("Бюджет сохранён");
		} catch (requestError) {
			error.textContent = requestError.message;
		}
	}
	if (event.target.id === "profile-form") {
		event.preventDefault();
		const error = document.querySelector("#profile-error");
		const displayName = document.querySelector("#display-name").value.trim();
		if (!displayName) {
			error.textContent = "Укажите имя.";
			return;
		}
		try {
			state.user = await api.updateProfile(displayName);
			renderShell();
			await renderPage();
			showToast("Изменения сохранены");
		} catch (requestError) {
			error.textContent = requestError.message;
		}
	}
});