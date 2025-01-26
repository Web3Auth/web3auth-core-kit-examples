/* eslint-disable import/no-extraneous-dependencies */
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  // IMP START - Bundler Issues
  define: {
    global: "globalThis",
  },
  // IMP END - Bundler Issues
});
