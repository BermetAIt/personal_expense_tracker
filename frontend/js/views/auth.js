import { escapeHtml } from "../helpers.js?v=3";

export function renderAuth(registering = false, error = "") {
  return `<section class="auth-page"><form class="auth-card card" id="auth-form" novalidate>
    <div class="logo"><span class="logo-mark" aria-hidden="true">₸</span>Money Tracker</div>
    <h1>${registering ? "Создать аккаунт" : "С возвращением"}</h1>
    <p>${registering ? "Начните вести личные финансы" : "Войдите в свой профиль"}</p>
    ${registering ? `<label for="auth-name">Имя</label><input id="auth-name" name="display_name" autocomplete="name" maxlength="30" required>` : ""}
    <label for="auth-email">Электронная почта</label>
    <input id="auth-email" name="email" type="email" autocomplete="email" required>
    <label for="auth-password">Пароль</label>
    <input id="auth-password" name="password" type="password" autocomplete="${registering ? "new-password" : "current-password"}" minlength="8" maxlength="72" required>
    <div class="inline-error" id="auth-error" role="alert">${escapeHtml(error)}</div>
    <div class="button-row"><button class="button primary" type="submit">${registering ? "Зарегистрироваться" : "Войти"}</button></div>
    <button class="text-button" type="button" data-action="auth-toggle" data-registering="${!registering}">
      ${registering ? "Уже есть аккаунт? Войти" : "Нет аккаунта? Зарегистрироваться"}
    </button>
  </form></section>`;
}