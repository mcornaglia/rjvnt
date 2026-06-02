// Extracts the <style> block + body markup (scripts removed) and the inline
// scripts from the original hand-written HTML, producing partials + raw JS for
// the Next.js port. Run once: `node scripts/extract.mjs`.
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const SRC = "C:/Users/Mattia/Desktop/EthHackerWebsite-deploy";
const OUT = join(__dirname, "..", "app", "_content");
const PUB = join(__dirname, "..", "public");
mkdirSync(OUT, { recursive: true });
mkdirSync(PUB, { recursive: true });

// Wrap scripts in an IIFE so top-level `const`s are scoped (safe to re-run on
// Fast Refresh); handlers needed by inline on* attributes are put on window.
const wrap = (js) => `;(function(){\n${js}\n})();\n`;

function extract(file, { markupReplacers = [], jsReplacers = [] }) {
  const html = readFileSync(join(SRC, file), "utf8");

  // first <style>...</style>
  const styleMatch = html.match(/<style>([\s\S]*?)<\/style>/);
  const css = styleMatch ? styleMatch[1] : "";

  // body inner
  const bodyMatch = html.match(/<body[^>]*>([\s\S]*?)<\/body>/);
  let body = bodyMatch ? bodyMatch[1] : "";

  // pull every <script>...</script>; keep inline (no src) text, drop external
  const scripts = [];
  body = body.replace(/<script\b([^>]*)>([\s\S]*?)<\/script>/g, (_, attrs, code) => {
    if (/\bsrc=/.test(attrs)) return ""; // external (asciinema, cloudflare) handled separately
    scripts.push(code);
    return "";
  });

  let markup = `<style>\n${css}\n</style>\n${body}`;
  for (const [from, to] of markupReplacers) markup = markup.split(from).join(to);

  let js = scripts.join("\n\n/* ───────────────────────────── */\n\n");
  for (const [from, to] of jsReplacers) js = js.split(from).join(to);

  return { markup, js };
}

// ---- Home (index.html) ----
const home = extract("index.html", {
  markupReplacers: [
    ['href="Machines.html#pg"', 'href="/machines#pg"'],
    ['href="Machines.html#htb"', 'href="/machines#htb"'],
    ['href="Machines.html#hs"', 'href="/machines#hs"'],
    ['href="Machines.html"', 'href="/machines"'],
    ['src="claudecode-color.svg"', 'src="/claudecode-color.svg"'],
    ['src="oscp+.png"', 'src="/oscp+.png"'],
    ['src="oscp.png"', 'src="/oscp.png"'],
  ],
});
// expose handlers used by inline on* attributes
home.js +=
  "\n\n/* expose globals for inline handlers */\n" +
  "window.switchEra = switchEra;\n" +
  "if (typeof carouselMove === 'function') window.carouselMove = carouselMove;\n";

writeFileSync(join(OUT, "home.html"), home.markup, "utf8");
writeFileSync(join(PUB, "home.page.js"), wrap(home.js), "utf8");

// ---- Machines (Machines.html) ----
const machines = extract("Machines.html", {
  markupReplacers: [
    ['href="Portfolio.html"', 'href="/"'],
    ['src="oscp+.png"', 'src="/oscp+.png"'],
    ['src="oscp.png"', 'src="/oscp.png"'],
  ],
  jsReplacers: [
    ["mdFile:'Boxes/", "mdFile:'/Boxes/"],
    ["fetch('machines-index.json", "fetch('/machines-index.json"],
  ],
});
machines.js +=
  "\n\n/* expose globals for inline handlers */\n" +
  "window.closeDrawer = closeDrawer;\n";

writeFileSync(join(OUT, "machines.html"), machines.markup, "utf8");
writeFileSync(join(PUB, "machines.page.js"), wrap(machines.js), "utf8");

console.log("home.html", home.markup.length, "home.js", home.js.length);
console.log("machines.html", machines.markup.length, "machines.js", machines.js.length);
