const expenseCategories = [
  "Shopping", "Food", "Phone", "Entertainment", "Education", "Beauty", "Sports", "Social",
  "Transportation", "Clothing", "Car", "Alcohol", "Cigarettes", "Electronics", "Travel",
  "Health", "Pets", "Repairs", "Housing", "Home", "Gifts", "Donations", "Lottery", "Snacks",
  "Kids", "Vegetables", "Fruits",
];
const incomeCategories = ["Salary", "Scholarship", "Freelance", "Gift", "Other"];
const fixedColors = {
  Food: "--cat-food", Health: "--cat-health", Transportation: "--cat-transportation",
  Shopping: "--cat-shopping", Education: "--cat-education", Beauty: "--cat-beauty",
};
const palette = ["--cat-1", "--cat-2", "--cat-3", "--cat-4", "--cat-5", "--cat-6", "--cat-7"];

export const categoriesFor = (type) => type === "expense" ? expenseCategories : incomeCategories;
export const escapeHtml = (value = "") => String(value).replace(/[&<>"']/g, (character) => ({
  "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
}[character]));
export const formatAmount = (value) => Number(value || 0).toLocaleString("en-US", { maximumFractionDigits: 2 });
export const categoryColor = (category) => {
  const variable = fixedColors[category]
    || palette[[...category].reduce((sum, character) => sum + character.charCodeAt(0), 0) % palette.length];
  return getComputedStyle(document.documentElement).getPropertyValue(variable).trim();
};
export const formatMonth = (month) => {
  const [year, number] = month.split("-").map(Number);
  const names = ["Январь", "Февраль", "Март", "Апрель", "Май", "Июнь", "Июль", "Август", "Сентябрь", "Октябрь", "Ноябрь", "Декабрь"];
  return `${names[number - 1]} ${year}`;
};
export const shiftMonth = (month, amount) => {
  const [year, number] = month.split("-").map(Number);
  const date = new Date(year, number - 1 + amount, 1);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
};
export const formatDate = (value, options = { weekday: "long", day: "numeric", month: "long" }) =>
  new Date(`${value}T00:00:00`).toLocaleDateString("ru-RU", options);
export const currentIsoDate = () => {
  const date = new Date();
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
};
export const icon = (path, size = 19) => `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="${path}"/></svg>`;
export const navItems = [
  ["tx", "Транзакции", "M4 6h16M4 12h16M4 18h10"],
  ["ch", "Статистика", "M12 3v9h9A9 9 0 1 1 12 3z"],
  ["bd", "Бюджет", "M3 7h18v12H3zM3 7l3-3h12l3 3M16 13h2"],
  ["st", "Настройки", "M5 8h14M5 16h14M9 5v6M15 13v6"],
];