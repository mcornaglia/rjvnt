const fs = require("fs");
const path = require("path");

const root = path.join(__dirname, "..");
const contentDir = path.join(root, "app", "_content");
const outFile = path.join(root, "app", "content.ts");

function escapeTemplateLiteral(str) {
  return str.replace(/\\/g, "\\\\").replace(/`/g, "\\`").replace(/\$\{/g, "\\${");
}

const home = fs.readFileSync(path.join(contentDir, "home.html"), "utf8");
const machines = fs.readFileSync(path.join(contentDir, "machines.html"), "utf8");

const output = `// AUTO-GENERATED — do not edit. Run: node scripts/embed-content.js
const PARTIALS: Record<string, string> = {
  "home.html": \`${escapeTemplateLiteral(home)}\`,
  "machines.html": \`${escapeTemplateLiteral(machines)}\`,
};

export function partial(name: string): string {
  if (!/^[\\w-]+\\.html$/.test(name)) throw new Error(\`invalid partial name: \${name}\`);
  const content = PARTIALS[name];
  if (!content) throw new Error(\`partial not found: \${name}\`);
  return content;
}
`;

fs.writeFileSync(outFile, output, "utf8");
console.log("content.ts generated successfully");
