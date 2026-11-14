# Wuxia Spire

**Wuxia Spire** is a classical Jianghu martial-arts pixel-art roguelite / endless dungeon RPG built for the **Reddit Daily Game Competition 2026** using [Devvit Web](https://developers.reddit.com/docs/capabilities/devvit-web/devvit_web_overview), Phaser, React + Meta Astryx UI, Hono, and TypeScript.

## Gameplay & Wuxia Features

- **Classless Jianghu Wanderer:** Every ascent starts unarmed with foundational **Taiji Fist** strikes and **Qinggong Cloud-Step** (`Space`), with zero class lockouts.
- **6-Slot Martial & Inner Qi Loadout (Lv. 1 → Lv. 3):** Draft up to **3 Active Martial Arts** (e.g. *18 Dragon-Subduing Palms*, *Jade Maiden Swordplay*, *Beggar Dog-Beating Staff*, *Xuantie Heavy Iron Cleave*, *Peach Blossom Jade Flute*, *Soul-Chilling Ice Needles*) and **3 Inner Qi (Neigong) Manuals** (*Nine Yang Divine Qi*, *Nine Yin True Scripture*, *Void Step Qinggong*, etc.).
- **Secret Peerless Synergies:** Pairs of Active Martial Arts (Lv. 3 Ultimate) and matching Inner Qi manuals awaken **6 hidden Peerless Synergies** (e.g. *True Dragon Sovereign Palm*, *Melancholic Sword of Parting*) that remain `???` until players discover them in battle and record them in their **Secret Synergy Scroll**.
- **Endless Cult Spire (Floors 10 / 20 / 30 / 40+):** Battle Cult Disciples from 5 daily rotating Wuxia Cult Sects, ambush **Cult Hall Master Mini-Bosses** on random floors inside each 10-floor bracket, and confront **Cult Leaders** every 10th floor (`10, 20, 30...`) until you choose to retreat or fall.
- **100% Loot Retention:** Retreat at any time (`🏮 Retreat (Keep Loot)`) or after any 10-floor Cult Leader checkpoint—or even upon defeat—while keeping 100% of collected Silver Taels, Jade Shards, Sect Cores, and Relics.

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
