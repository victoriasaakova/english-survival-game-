import { build } from "esbuild";
import { readdir, readFile, mkdir, copyFile } from "node:fs/promises";
import { join, relative, extname } from "node:path";

const types = {
  ".js": "text/javascript",
  ".css": "text/css",
  ".html": "text/html",
  ".json": "application/json",
  ".svg": "image/svg+xml",
  ".webmanifest": "application/manifest+json",
  ".txt": "text/plain",
};
const assets = {};
async function collect(dir) {
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const file = join(dir, entry.name);
    if (entry.isDirectory()) {
      await collect(file);
      continue;
    }
    if (extname(file) === ".zip") {
      assets["/" + relative("out", file)] = {
        text: (await readFile(file)).toString("base64"),
        mime: "application/zip",
        binary: true,
      };
      continue;
    }
    const mime = types[extname(file)];
    if (!mime) throw Error("Unsupported exported asset: " + file);
    assets["/" + relative("out", file)] = {
      text: await readFile(file, "utf8"),
      mime: mime + "; charset=utf-8",
    };
  }
}
await collect("out");
await mkdir("dist/server", { recursive: true });
await mkdir("dist/.openai", { recursive: true });
await copyFile(".openai/hosting.json", "dist/.openai/hosting.json");
await build({
  stdin: {
    contents:
      'import {createWorker} from "./hosting/worker.ts"; export default createWorker(' +
      JSON.stringify(assets) +
      ");",
    resolveDir: process.cwd(),
  },
  bundle: true,
  format: "esm",
  platform: "browser",
  target: "es2022",
  outfile: "dist/server/index.js",
  minify: true,
});
