import { readdirSync, readFileSync, writeFileSync } from "fs";
import { join } from "path";

/**
 * Repair menu photos that were committed to git as base64 text instead of
 * binary JPEGs. Detects non-JPEG files in public/menu and decodes them.
 * Safe to run on every build: valid JPEGs are skipped untouched.
 */
const dir = join(process.cwd(), "public", "menu");
let fixed = 0;
for (const f of readdirSync(dir)) {
  if (!f.endsWith(".jpg") && !f.endsWith(".jpeg")) continue;
  const p = join(dir, f);
  const buf = readFileSync(p);
  if (buf.length > 3 && buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) continue;
  const text = buf.toString("utf8").replace(/\s/g, "");
  if (!text || !/^[A-Za-z0-9+/=]+$/.test(text)) {
    console.warn(`[fix-menu-photos] skipping ${f}: not a JPEG and not base64`);
    continue;
  }
  writeFileSync(p, Buffer.from(text, "base64"));
  fixed++;
  console.log(`[fix-menu-photos] decoded ${f} to binary JPEG`);
}
console.log(`[fix-menu-photos] done, fixed ${fixed} file(s)`);
