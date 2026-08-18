import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, "..");
const jsDir = path.join(root, "js");
const files = fs.readdirSync(jsDir)
  .filter(name => /^\d+-.+\.js$/.test(name))
  .sort((a, b) => Number(a.split("-")[0]) - Number(b.split("-")[0]));

const parts = files.map(name => {
  let source = fs.readFileSync(path.join(jsDir, name), "utf8");
  source = source.replace(/^\/\* Vector Studio modular baseline[^]*?\*\/\s*/m, "");
  return source.trimEnd();
});

fs.writeFileSync(path.join(root, "app.bundle.js"), parts.join("\n") + "\n");
console.log(`Built app.bundle.js from ${files.length} source modules.`);
