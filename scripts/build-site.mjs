// Export the same client used by the Next server. The Sites Worker supplies the API routes.
import { cp, mkdir, mkdtemp, rm, symlink, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { resolve, join, relative, sep } from "node:path";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
const root = fileURLToPath(new URL("../", import.meta.url));
const stage = await mkdtemp(join(tmpdir(), "english-coach-site-"));
try {
  for (const name of [
    "app",
    "components",
    "lib",
    "public",
    "hosting",
    "package.json",
    "tsconfig.json",
    "scripts/build-worker.mjs",
    ".openai/hosting.json",
  ])
    await cp(join(root, name), join(stage, name), {
      recursive: true,
      filter: (path) =>
        !relative(root, path).split(sep).join("/").startsWith("app/api"),
    });
  await symlink(join(root, "node_modules"), join(stage, "node_modules"), "dir");
  await writeFile(
    join(stage, "next.config.mjs"),
    "export default {output:'export',images:{unoptimized:true}};",
  );
  execFileSync(
    process.execPath,
    [join(root, "node_modules/next/dist/bin/next"), "build", "--webpack"],
    { cwd: stage, stdio: "inherit" },
  );
  execFileSync(process.execPath, ["scripts/build-worker.mjs"], {
    cwd: stage,
    stdio: "inherit",
  });
  await mkdir(resolve(root, "dist"), { recursive: true });
  await cp(join(stage, "dist"), resolve(root, "dist"), { recursive: true });
} finally {
  await rm(stage, { recursive: true, force: true });
}
