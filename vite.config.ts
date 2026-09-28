import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  // Tauri: Ausgaben nicht wegscrollen lassen, damit Rust-Fehler sichtbar bleiben.
  clearScreen: false,
  server: {
    host: "::",
    port: 8080,
    // Bei belegtem Port hart abbrechen statt still auf einen anderen auszuweichen —
    // sonst findet die Desktop-App das Frontend nicht.
    strictPort: true,
    hmr: {
      overlay: false,
    },
    watch: {
      // Rust-Quellen nicht vom Vite-Watcher beobachten lassen.
      ignored: ["**/src-tauri/**"],
    },
  },
  // Diese Env-Präfixe an das Frontend durchreichen (VITE_ = App-Config, TAURI_ = Desktop).
  envPrefix: ["VITE_", "TAURI_"],
  plugins: [react(), mode === "development" && componentTagger()].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
}));
