import { escapeHtml } from "../helpers.js?v=3";

export function renderSettings(state) {
  const theme = document.documentElement.dataset.theme || "system";
  const themeLabel = theme === "system" ? "Системная тема" : theme === "dark" ? "Тёмная тема" : "Светлая тема";
  return `<header class="page-header"><div><small>Профиль и данные</small><h1>Настройки</h1></div></header>
    <div style="display:grid;gap:14px;max-width:560px">
      <section class="card"><h2>Профиль</h2>
        <form id="profile-form" novalidate><label for="display-name">Имя</label><input id="display-name" maxlength="30" value="${escapeHtml(state.user?.display_name || "")}" required>
          <div class="inline-error" id="profile-error" role="alert"></div><div class="button-row"><button class="button primary" type="submit">Сохранить</button></div>
        </form>
      </section>
      <section class="card"><h2>Данные</h2><div class="button-row" style="margin-top:0">
        <button class="button" type="button" data-action="export-csv">Экспорт CSV</button>
        <button class="button" type="button" data-action="demo-data">Демо-данные</button>
        <button class="button danger" type="button" data-action="delete-all">Удалить всё</button>
      </div></section>
      <section class="card"><h2>Оформление</h2><div class="button-row" style="margin-top:0">
        <button class="button" type="button" data-action="toggle-theme" aria-label="Текущая тема: ${themeLabel}. Изменить тему">${themeLabel}: изменить</button>
      </div></section>
      <section class="card"><h2>Сеанс</h2><button class="button" type="button" data-action="logout">Выйти из аккаунта</button></section>
    </div>`;
}