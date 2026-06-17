import axios, { type AxiosResponse } from "axios";

import { DEMO, demoResponse } from "./demo";

const baseURL =
  (import.meta as { env?: Record<string, string> }).env?.VITE_API_BASE_URL ??
  "http://localhost:8000/api/v1";

export const api = axios.create({ baseURL });

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// In demo mode, resolve every request from baked-in fixtures (no backend needed).
if (DEMO) {
  api.defaults.adapter = async (config) => {
    await new Promise((r) => setTimeout(r, 220)); // small latency so skeletons show
    return {
      data: demoResponse(config),
      status: 200,
      statusText: "OK",
      headers: {},
      config,
    } as AxiosResponse;
  };
}
