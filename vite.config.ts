import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

// GitHub Pages serves a project site at /<repo>/, so the base path comes from
// BASE_PATH (set by the deploy workflow). Defaults to "/" for local dev.
function basePath(): string {
  const raw = process.env.BASE_PATH?.trim();
  if (!raw || raw === "/") return "/";
  return `/${raw.replace(/^\/+|\/+$/g, "")}/`;
}

export default defineConfig({
  base: basePath(),
  resolve: { tsconfigPaths: true },
  plugins: [tailwindcss(), react()],
});
