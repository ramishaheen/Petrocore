import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [react()],
  // Bake the demo flag into the bundle at build time. Vercel's static preview
  // sets VITE_DEMO=1 so the app serves fixture data with no backend; normal
  // builds (CI, Docker) leave it false and use the live API client.
  define: { __DEMO__: JSON.stringify(process.env.VITE_DEMO === "1") },
  server: { port: 5173, host: true },
});
