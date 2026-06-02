import { readFileSync } from "node:fs";
import { join } from "node:path";

export function partial(name: string): string {
  if (!/^[\w-]+\.html$/.test(name)) throw new Error(`invalid partial name: ${name}`);
  return readFileSync(join(process.cwd(), "app", "_content", name), "utf8");
}
