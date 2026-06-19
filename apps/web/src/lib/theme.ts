// Light/dark theme: persisted in localStorage, applied as a `dark` class on <html>.
export type Theme = "light" | "dark";

export function getTheme(): Theme {
  return (localStorage.getItem("theme") as Theme) || "light";
}

export function applyTheme(theme: Theme) {
  document.documentElement.classList.toggle("dark", theme === "dark");
}

export function setTheme(theme: Theme) {
  localStorage.setItem("theme", theme);
  applyTheme(theme);
}

export function toggleTheme(): Theme {
  const next: Theme = getTheme() === "dark" ? "light" : "dark";
  setTheme(next);
  return next;
}
