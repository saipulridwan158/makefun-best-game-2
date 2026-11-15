// STARBLOOM — best-game-01 entry (Node 22, standard library only).
// The game itself lives in game/ as plain static ES modules a desktop browser
// loads offline (no library, no network request). This entrypoint hands it in:
// it copies game/ and screenshots/ from beside this file into /output and
// writes /output/dossier.json — the summary the judge reads — via the vendored
// make.fun library.
//
// Serve locally with `node serve.ts`, then open http://localhost:8080.
// Outside the grader's container MAKEFUN_OUTPUT_DIR stands in for /output:
//   mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts

import { cpSync, existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-game.ts';

const here = fileURLToPath(new URL('.', import.meta.url));
const out = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';

mkdirSync(out, { recursive: true });
cpSync(join(here, 'game'), join(out, 'game'), { recursive: true });
mkdirSync(join(out, 'screenshots'), { recursive: true });
if (existsSync(join(here, 'screenshots'))) cpSync(join(here, 'screenshots'), join(out, 'screenshots'), { recursive: true });

// Scorer caps (reference/gate.json): text_max_bytes shapes the bytes; the rest refuse
// an entry the scorer itself would refuse (max 4 screenshots, each under 256 KiB; max
// 993 files / 48 MiB under game/; no game/ path over 1000 bytes).
writeFileSync(
  join(out, 'dossier.json'),
  buildDossier(out, {
    text_max_bytes: 163840,
    screenshots: { max: 4, max_bytes: 262144 },
    game_max_files: 993,
    game_max_bytes: 50331648,
    game_path_max_bytes: 1000,
  }),
);
