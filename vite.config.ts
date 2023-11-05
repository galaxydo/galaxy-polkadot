import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  define: {
    'process.env.VITE_PKG_NAME': '"galaxy"', // JSON.stringify(process.env.VITE_PKG_NAME),
    'process.env.VITE_PKG_VERSION': '"1.0"', // JSON.stringify(process.env.VITE_PKG_VERSION),
    'window.EXCALIDRAW_ASSET_PATH': '"/public/"'
  },
  /*  resolve: {
    alias: {
      "@excalidraw/excalidraw": "@galaxydo/excalidraw",
      "@excalidraw/utils": "@galaxydo/excalidraw-utils",
    },
  }, */
});
