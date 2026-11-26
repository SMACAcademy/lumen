/**
 * After `next build`: give every route-segment prefetch file the flat name the
 * browser asks for.
 *
 * The static export writes a page's segment data as nested folders, e.g.
 *   home/__next.!KGFwcCk/home/__PAGE__.txt
 * while the client router requests the same data as one dotted file name:
 *   home/__next.!KGFwcCk.home.__PAGE__.txt
 * A plain static host (GitHub Pages) cannot map one to the other, so each
 * prefetch would 404 and navigation would fall back to a full page load. This
 * copies every nested file to its dotted name. It only adds files.
 */
import { copyFileSync, existsSync, readdirSync, statSync } from "node:fs";
import { join, relative, sep } from "node:path";

const out = new URL("../out/", import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1");
if (!existsSync(out)) {
  console.error(`flatten-prefetch: no build output at ${out}`);
  process.exit(1);
}

let copied = 0;

/** Walk a `__next.*` folder and copy each file inside it to the dotted name beside the folder. */
function flatten(folder, parent) {
  const walk = (dir) => {
    for (const name of readdirSync(dir)) {
      const path = join(dir, name);
      if (statSync(path).isDirectory()) walk(path);
      else {
        const dotted = relative(parent, path).split(sep).join(".");
        const target = join(parent, dotted);
        if (!existsSync(target)) {
          copyFileSync(path, target);
          copied += 1;
        }
      }
    }
  };
  walk(folder);
}

const visit = (dir) => {
  for (const name of readdirSync(dir)) {
    const path = join(dir, name);
    if (!statSync(path).isDirectory()) continue;
    if (name.startsWith("__next.")) flatten(path, dir);
    else if (name !== "_next") visit(path);
  }
};

visit(out);
console.log(`flatten-prefetch: wrote ${copied} prefetch files under their flat names`);
