import tailwindcss from "@tailwindcss/vite";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import netlify from "@netlify/vite-plugin-tanstack-start";
import viteReact from "@vitejs/plugin-react";
import { defineConfig } from "vite";
import tsConfigPaths from "vite-tsconfig-paths";

export default defineConfig({
  resolve: {
    alias: { "@": `${process.cwd()}/src` },
    dedupe: [
      "react",
      "react-dom",
      "react/jsx-runtime",
      "react/jsx-dev-runtime",
      "@tanstack/react-query",
      "@tanstack/query-core",
    ],
  },
  server: {
    host: "::",
    port: 8080,
  },
  optimizeDeps: {
    include: [
      "react",
      "react-dom",
      "react-dom/client",
      "react/jsx-runtime",
      "react/jsx-dev-runtime",
    ],
    // Avoid Vite rewriting the PDF.js worker into a broken "fake worker" in dev.
    // Keep browser PDF viewer packages out of the shared prebundle.
    exclude: ["pdfjs-dist", "react-pdf"],
  },
  ssr: {
    // unpdf ships a Node-safe PDF.js build + DOMMatrix stub; keep it external so
    // Vite/Nitro do not rewrite it onto browser pdfjs-dist (DOMMatrix crash).
    external: ["unpdf", "unpdf/pdfjs"],
  },
  plugins: [
    tailwindcss(),
    tsConfigPaths({ projects: ["./tsconfig.json"] }),
    tanstackStart({
      server: { entry: "server" },
      importProtection: {
        behavior: "error",
        client: {
          files: ["**/server/**"],
          specifiers: ["server-only"],
        },
      },
    }),
    // Official Netlify adapter — emits dist/client + Netlify functions (not Cloudflare Nitro .output)
    netlify(),
    viteReact(),
  ],
});
