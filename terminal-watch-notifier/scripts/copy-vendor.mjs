// Copies node-notifier's vendored platform binaries (snoretoast.exe, notifu,
// terminal-notifier.app) to the extension root.
//
// Why: esbuild bundles all of node-notifier's JS into out/extension.js, but
// the platform binaries live in node_modules/node-notifier/vendor and are
// located at runtime via `path.resolve(__dirname, "../vendor/...")`. From the
// bundle, __dirname is <ext>/out, so the binaries must sit at <ext>/vendor.
import { cpSync, existsSync, mkdirSync, rmSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const extRoot = dirname(dirname(fileURLToPath(import.meta.url)));
const vendorSource = join(
  extRoot,
  "node_modules",
  "node-notifier",
  "vendor",
);
const vendorDest = join(extRoot, "vendor");

if (!existsSync(vendorSource)) {
  console.error(
    `[copy-vendor] node-notifier vendor not found at ${vendorSource}`,
  );
  process.exit(1);
}

rmSync(vendorDest, { recursive: true, force: true });
mkdirSync(vendorDest, { recursive: true });
cpSync(vendorSource, vendorDest, { recursive: true });
console.log(`[copy-vendor] Copied vendor binaries -> ${vendorDest}`);
