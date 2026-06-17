import { create } from "zustand";

import { api } from "../lib/api";

interface AuthState {
  token: string | null;
  role: string | null;
  roleAr: string | null;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
}

export const useAuth = create<AuthState>((set) => ({
  token: localStorage.getItem("token"),
  role: localStorage.getItem("role"),
  roleAr: localStorage.getItem("roleAr"),
  login: async (email, password) => {
    const { data } = await api.post("/auth/login", { email, password });
    localStorage.setItem("token", data.access_token);
    localStorage.setItem("role", data.role);
    localStorage.setItem("roleAr", data.role_ar);
    set({ token: data.access_token, role: data.role, roleAr: data.role_ar });
  },
  logout: () => {
    localStorage.removeItem("token");
    localStorage.removeItem("role");
    localStorage.removeItem("roleAr");
    set({ token: null, role: null, roleAr: null });
  },
}));
