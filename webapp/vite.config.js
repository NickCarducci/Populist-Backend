import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { visualizer } from "rollup-plugin-visualizer";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  base: "/", // This ensures assets are loaded from root (e.g. /assets/index.js)
  plugins: [react(), visualizer({ open: true, filename: "dist/stats.html" })],
  define: {
    "process.env.NODE_ENV": JSON.stringify(mode)
  },
  build: {
    outDir: "/var/www/webapp", // Target the public Caddy folder
    emptyOutDir: true, // Clear old files before building
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes("node_modules")) {
            // Keep all Firebase modules together to avoid initialization issues
            if (id.includes("firebase") || id.includes("@firebase")) {
              return "firebase";
            }
            if (
              id.includes("node_modules/react/") ||
              id.includes("node_modules/react-dom/") ||
              id.includes("node_modules/scheduler/") ||
              id.includes("node_modules/react-reconciler/") ||
              id.includes("node_modules/object-assign/") ||
              id.includes("node_modules/loose-envify/") ||
              id.includes("node_modules/js-tokens/")
            )
              return "react-vendor";
            return "vendor";
          }
        }
      }
    }
  },
  optimizeDeps: {
    include: ["firebase/app", "firebase/auth", "firebase/firestore"]
  }
}));
