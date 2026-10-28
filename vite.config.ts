import { cpSync, createReadStream, existsSync, statSync } from "node:fs";
import type { IncomingMessage, ServerResponse } from "node:http";
import { extname, join, normalize, relative, resolve } from "node:path";
import react from "@vitejs/plugin-react";
import { defineConfig, type Plugin } from "vite";

const spots = [
  {
    url: "/engine/workers",
    dir: resolve("node_modules/supersonic-scsynth/dist/workers"),
  },
  {
    url: "/engine/core",
    dir: resolve("node_modules/supersonic-scsynth-core"),
  },
];

const kinds: Record<string, string> = {
  ".js": "text/javascript",
  ".mjs": "text/javascript",
  ".wasm": "application/wasm",
  ".json": "application/json",
  ".map": "application/json",
  ".css": "text/css",
};

function sendFile(req: IncomingMessage, res: ServerResponse, next: () => void) {
  const raw = req.url?.split("?")[0] ?? "";
  const hit = spots.find((spot) => raw === spot.url || raw.startsWith(`${spot.url}/`));
  if (!hit) {
    next();
    return;
  }
  const file = normalize(join(hit.dir, decodeURIComponent(raw.slice(hit.url.length))));
  const rel = relative(hit.dir, file);
  if (!rel || rel.startsWith("..")) {
    next();
    return;
  }
  if (!existsSync(file) || !statSync(file).isFile()) {
    next();
    return;
  }
  res.setHeader("Content-Type", kinds[extname(file)] ?? "application/octet-stream");
  res.setHeader("Cross-Origin-Resource-Policy", "same-origin");
  res.setHeader("Cross-Origin-Embedder-Policy", "require-corp");
  res.setHeader("Cross-Origin-Opener-Policy", "same-origin");
  createReadStream(file).pipe(res);
}

function engineFiles(): Plugin {
  return {
    name: "engine-files",
    configureServer(server) {
      server.middlewares.use(sendFile);
    },
    configurePreviewServer(server) {
      server.middlewares.use(sendFile);
    },
    closeBundle() {
      for (const spot of spots) {
        cpSync(spot.dir, join("dist", spot.url.slice(1)), { recursive: true });
      }
    },
  };
}

const headers = {
  "Cross-Origin-Opener-Policy": "same-origin",
  "Cross-Origin-Embedder-Policy": "require-corp",
};

export default defineConfig({
  plugins: [react(), engineFiles()],
  publicDir: "images",
  server: { headers },
  preview: { headers },
});
