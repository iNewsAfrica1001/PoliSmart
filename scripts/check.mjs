import { spawnSync } from "node:child_process";
import { readdirSync } from "node:fs";
import path from "node:path";

const root = process.cwd();
const excluded = new Set(["android", "dist", "ios", "node_modules"]);
const extensions = new Set([".js", ".mjs"]);

function collect(directory) {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    if (entry.name.startsWith(".") || excluded.has(entry.name)) return [];
    const absolute = path.join(directory, entry.name);
    if (entry.isDirectory()) return collect(absolute);
    return extensions.has(path.extname(entry.name)) ? [absolute] : [];
  });
}

const files = collect(root);
const failures = files.flatMap((file) => {
  const result = spawnSync(process.execPath, ["--check", file], { encoding: "utf8" });
  return result.status === 0 ? [] : [{ file, output: result.stderr || result.stdout }];
});

if (failures.length) {
  for (const failure of failures) {
    console.error(`Syntax check failed: ${path.relative(root, failure.file)}\n${failure.output}`);
  }
  process.exit(1);
}

console.log(
  `Syntax checked ${files.length} Node-compatible JavaScript modules; Vite validates JSX during build.`,
);
