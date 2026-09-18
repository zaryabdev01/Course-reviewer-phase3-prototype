import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Mirrors Phase 2 frontend's vite.config.ts (same "@" alias, same plugin
// set) so this prototype can be folded into that repo later with minimal
// friction. No API proxy here — this app never talks to a real backend,
// see src/lib/api (in-memory fake client, dummy data only).
export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  server: {
    host: true,
    port: 5183,
  },
});
