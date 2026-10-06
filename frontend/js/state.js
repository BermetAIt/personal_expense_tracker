const now = new Date();

export const state = {
  user: null,
  page: "tx",
  month: `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`,
  transactionType: "expense",
  category: "",
  editingId: null,
  search: "",
  statsType: "expense",
  transactions: [],
  summary: null,
  budget: null,
  categories: [],
  days: [],
  loading: false,
};