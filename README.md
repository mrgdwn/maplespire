# MapleDelve

**MapleDelve** is a 2D pixel-art side-scrolling auto-battler roguelite / daily grind RPG built for the **Reddit Daily Game Competition 2026** using [Devvit Web](https://developers.reddit.com/docs/capabilities/devvit-web/devvit_web_overview), Phaser, Hono, Vite, and TypeScript.

See [docs/GDD.md](docs/GDD.md) for the full Game Design Document.

## Tech Stack

- **Platform:** [Devvit Web](https://developers.reddit.com/) (`@devvit/web`, `@devvit/start`)
- **Client:** [Phaser](https://phaser.io/) + Vite + TypeScript
- **Server:** [Hono](https://hono.dev/) + Redis (via `@devvit/web/server`)

## Prerequisites

- Node.js >= 24.0.0
- A Reddit Developer account

## Getting Started

1. Install dependencies:
   ```bash
   npm install
   ```
2. Log in to Reddit CLI:
   ```bash
   npm run login
   ```
3. Register your app on [developers.reddit.com/new](https://developers.reddit.com/new) (if not already created) and update `"name"` in `devvit.json` to match your registered app slug.
4. Start live playtesting on your test subreddit:
   ```bash
   npm run dev
   ```

## Scripts

- `npm run dev` — Start Devvit playtest
- `npm run build` — Build client and server bundles (`vite build`)
- `npm run test:types` — Run TypeScript typechecking (`tsc --build`)
- `npm run lint` — Run ESLint
- `npm run test:unit` — Run unit tests
- `npm run deploy` — Typecheck, lint, and upload to Reddit (`devvit upload`)
- `npm run launch` — Deploy and publish (`devvit publish`)
