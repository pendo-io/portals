import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  return ({
  server: {
    host: "::",
    port: 8080,
    proxy: {
      "/sfdc-token": {
        target: process.env.VITE_SFDC_LOGIN_URL || "https://test.salesforce.com",
        changeOrigin: true,
        rewrite: (path) => "/services/oauth2/token",
      },
      "/sfdc-api": {
        target: process.env.VITE_SFDC_INSTANCE_URL || "https://pendo--full.sandbox.my.salesforce.com",
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/sfdc-api/, ""),
      },
      "/momentum-api": {
        target: "https://api.momentum.io/v1",
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/momentum-api/, ""),
        configure: (proxy) => {
          proxy.on("proxyReq", (proxyReq) => {
            proxyReq.setHeader("X-API-Key", env.VITE_MOMENTUM_API_KEY || "");
          });
        },
      },
      "/clari-api": {
        target: "https://api.clari.com/v4",
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/clari-api/, ""),
        configure: (proxy) => {
          proxy.on("proxyReq", (proxyReq) => {
            proxyReq.setHeader("apikey", env.VITE_CLARI_API_KEY || "");
          });
        },
      },
    },
  },
  plugins: [
    react(),
    mode === 'development' &&
    componentTagger(),
  ].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
});
});
