You are writing a Devvit Web application (**Wuxia Spire**, app slug `wuxia-spire`) that runs inside an iFrame on Reddit.com.

## Tech Stack

- **Platform**: Devvit Web (`@devvit/web`, `@devvit/start`), Node.js `>=24.0.0`
- **Frontend**: Phaser `4.2.1`, React `19` + Meta Astryx UI (`@astryxdesign/core`, `@astryxdesign/theme-gothic`, `@astryxdesign/theme-neutral`, `@stylexjs/stylex`), Vite `8`
- **Backend**: Hono `4` REST JSON API running in Devvit's serverless Node environment (`@hono/node-server`)
- **Storage & Reddit APIs**: `redis`, `reddit`, and `context` via `@devvit/web/server`
- **Shared Validation**: Pure TypeScript catalogs, combat formulas, and runtime typeguards in `/src/shared`

## Layout & Architecture

- `/src/server`: **Backend Code** (serverless Node environment).
  - `index.ts`: Main Hono server entrypoint mounting `/api` and `/internal`.
  - `routes/api.ts`: Game REST endpoints (`/api/init`, `/api/run/start`, `/api/run/complete`, `/api/camp/action`, `/api/share-comment`).
  - `routes/menu.ts`, `routes/forms.ts`, `routes/triggers.ts`: Devvit moderator menu actions, form handlers, and install trigger endpoints.
  - `core/post.ts`: Post creation helpers via `reddit`.
  - `*.test.ts`: Node built-in test runner unit suites (`buffs.test.ts`, `gameLogic.test.ts`, `wuxia.test.ts`).
- `/src/client`: **Frontend Code** (executed inside Reddit iFrame).
  - Entrypoints registered in `devvit.json`:
    - `splash.html` / `splash.ts`: Fast inline view rendered directly in the Reddit feed (keep heavy Phaser/gameplay dependencies out of this bundle).
    - `game.html` / `game.ts`: Full expanded view hosting Phaser + React/DOM overlays.
  - `scenes/DungeonScene.ts`: Phaser combat engine, wave/boss spawning, animations, projectile evolution, Qi Flaw Meridian Shatter, and active scroll procs.
  - `ui/OverlayManager.ts` & `ui/AstryxWidgets.tsx` & `ui/bridge.ts`: In-run HUD, Camp tabs, Draft/Roulette/Extraction/Greed Gamble/Summary modals, and game-to-UI bridge.
  - `fx/pixelArt.ts` & `fx/sound.ts`: Procedural pixel-art sprite textures and Web Audio synth SFX.
- `/src/shared`: **Shared Code** imported cleanly by both client and server.
  - `types.ts`, `api.ts`, `utils.ts`, `buffCombat.ts`, and `catalogs/` (`wuxia.ts`, `biomes.ts`, `legendaries.ts`, `buffs.ts`, `classes.ts`).

## Frontend Rules & Devvit Limitations

- Instead of `window.location` or `window.assign`, use `navigateTo` from `@devvit/web/client`.
- `window.alert`: Use `showToast` or `showForm` from `@devvit/web/client`.
- File downloads: Use clipboard API with `showToast` to confirm.
- Geolocation, camera, microphone, and notifications web APIs: No alternatives.
- Inline `<script>` tags inside `.html` files are disallowed; load external `.ts`/`.js` modules.

## Commands

- `npm run test:types`: Check TypeScript types (`tsc --build`)
- `npm run lint`: Run ESLint (`eslint 'src/**/*.{ts,tsx}'`)
- `npm run test:unit`: Run all unit tests (`node --experimental-strip-types --no-warnings=ExperimentalWarning --test "src/**/*.test.ts"`)
- `npm run test:unit -- src/server/wuxia.test.ts`: Run a single unit test file
- `npm run build`: Build client and server bundles (`vite build`)
- `npm run dev`: Start live Devvit playtest (`devvit playtest`)
- `npm run deploy`: Typecheck, lint, and upload bundle (`devvit upload`)

## Code Style

- Prefer `type` aliases over `interface` when writing TypeScript.
- Prefer named exports over default exports.
- Never cast TypeScript types (no `as ...`; write explicit runtime typeguards in `/src/shared/utils.ts` instead).
- Preserve explicit `.ts` / `.tsx` relative import extensions in shared/client modules where configured.

## Game Domain & Devvit Guardrails

- Do NOT use Devvit Blocks or `@devvit/public-api` anywhere; this project is pure Devvit Web.
- Whenever adding a new menu item, form, or trigger endpoint, register its corresponding mapping in `devvit.json`.
- Keep `"name": "wuxia-spire"` unchanged in `devvit.json` so it continues matching the registered Devvit app slug.
- Maintain pure **Wuxia martial-arts theming** throughout catalogs, UI copy, weapons, cult mobs, and sprites; do not introduce non-Wuxia fantasy classes, slime monsters, or elemental weapon sockets (`maxSockets: 0` and `sockets: []` must remain enforced on gear generation and `parseGearItem`).
- Keep drop/reward logic consistent between `src/server/routes/api.ts` (`/api/run/complete`) and the local fallback (`applyRunCompleteLocally` in `src/client/ui/OverlayManager.ts`).

Docs: https://developers.reddit.com/docs/llms.txt
