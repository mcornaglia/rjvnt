import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const CONTENT_DIR = join(dirname(fileURLToPath(import.meta.url)), "_content");

export function partial(name: string): string {
  if (!/^[\w-]+\.html$/.test(name)) throw new Error(`invalid partial name: ${name}`);
  return readFileSync(join(CONTENT_DIR, name), "utf8");
}
