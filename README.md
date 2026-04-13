# DiscordCloner v7

<p align="center">
  <img src="https://img.shields.io/badge/version-7.0.0-5865F2?style=for-the-badge" alt="Version">
  <img src="https://img.shields.io/badge/node-%3E%3D18.0.0-339933?style=for-the-badge&logo=node.js" alt="Node">
  <img src="https://img.shields.io/badge/TypeScript-5.x-3178C6?style=for-the-badge&logo=typescript" alt="TypeScript">
  <img src="https://img.shields.io/badge/license-MIT-ED4245?style=for-the-badge" alt="License">
</p>

> **⚠️ IMPORTANT DISCLAIMER:** This tool interacts with the Discord API using a user token. Using self-bots or automating user accounts may violate [Discord's Terms of Service](https://discord.com/terms). Use **entirely at your own risk**. The author bears no responsibility for any bans, suspensions, or account termination. See [Disclaimer](#disclaimer) for full details.

---

## 📋 Table of Contents

- [Overview](#overview)
- [Features](#features)
- [Requirements](#requirements)
- [Installation](#installation)
- [Usage](#usage)
- [Project Structure](#project-structure)
- [Clone Modes](#clone-modes)
- [Disclaimer](#disclaimer)
- [License](#license)

---

## Overview

**DiscordCloner v7** is a command-line tool written in TypeScript that allows you to clone the structure of a Discord server to another server you own. It copies roles, channels (with permission overwrites), emojis, stickers, and basic server settings.

The tool is designed for **server owners and administrators** who need to duplicate their own servers — for example, when setting up a backup, a staging environment, or migrating to a fresh server.

---

## Features

| Feature | Description |
|---|---|
| 🎭 **Role cloning** | Copies all roles with colors, permissions, and hierarchy |
| 📁 **Channel cloning** | Copies text, voice, announcement, stage, and forum channels with their category structure |
| 🔒 **Permission overwrites** | Replicates per-channel role permission overwrites |
| 😄 **Emoji cloning** | Copies all custom emojis (static and animated) |
| 🎨 **Sticker cloning** | Copies all custom stickers |
| ⚙️ **Server settings** | Optionally syncs server name, icon, banner, locale, and moderation settings |
| 🗂️ **Log saving** | Automatically saves a JSON log of every cloning session |
| ⏱️ **Rate limit handling** | Built-in retry logic and delays to respect Discord API rate limits |
| 🎛️ **Interactive UI** | Fully interactive CLI with spinners, prompts, and color output |

---

## Requirements

- **Node.js** `>= 18.0.0`
- **npm** `>= 9.0.0`
- A Discord account with **admin/owner access** to both the source and target servers
- Your Discord user token

---

## Installation

```bash
# Clone the repository
git clone https://github.com/YOUR_USERNAME/discord-cloner.git
cd discord-cloner

# Install dependencies
npm install

# Build the project
npm run build
```

---

## Usage

### Run (compiled)
```bash
npm start
```

### Run (development / ts-node)
```bash
npm run dev
```

### Step-by-step

1. **Launch** the tool — the banner and version info will appear.
2. **Enter your Discord token** — it is masked during input and never saved to disk.
3. **Enter the Source Server ID** — the server you want to clone *from*.
4. **Enter the Target Server ID** — the server you want to clone *to*.
5. **Choose a clone mode** — full clone or media only (see below).
6. **Confirm** the operation and wait for it to complete.

> **How to get a Server ID:** Enable Developer Mode in Discord settings (`Settings → Advanced → Developer Mode`), then right-click a server and select **Copy Server ID**.

> **How to get your Token:** Open Discord in a browser, press `F12`, go to the Network tab, send any message, find a request, and look for the `Authorization` header value.

---

## Project Structure

```
discord-cloner/
├── src/
│   ├── api/
│   │   └── client.ts          # Discord REST API client with rate limit handling
│   ├── core/
│   │   ├── auth.ts             # Token authentication & user validation
│   │   └── cloner.ts           # Main cloning orchestrator
│   ├── modules/
│   │   ├── channels.ts         # Channel + permission cloning logic
│   │   ├── emojis.ts           # Emoji cloning logic
│   │   ├── roles.ts            # Role cloning logic
│   │   └── stickers.ts         # Sticker cloning logic
│   ├── types/
│   │   └── index.ts            # TypeScript type definitions
│   ├── ui/
│   │   ├── banner.ts           # ASCII banner renderer
│   │   ├── logger.ts           # Colored logger (steps, success, errors)
│   │   ├── prompt.ts           # Interactive CLI prompts
│   │   └── spinner.ts          # Loading spinners
│   ├── utils/
│   │   ├── api.ts              # Utility helpers (sleep, etc.)
│   │   └── logSaver.ts         # JSON session log writer
│   └── index.ts                # Entry point
├── tsconfig.json
└── package.json
```

---

## Clone Modes

### Full Clone
Copies the complete server structure:
- All roles (excluding managed/integration roles and `@everyone`)
- All channels and categories with their position order
- Per-channel permission overwrites mapped to the newly created roles
- Server settings (verification level, notification settings, locale, AFK timeout, etc.)
- Optionally: server name, icon, and banner

> ⚠️ **WARNING:** Full clone **deletes all existing channels and roles** on the target server before creating new ones. This action is **irreversible**.

### Media Only
Copies only:
- Custom emojis
- Custom stickers

This mode does **not** touch channels, roles, or server settings.

---

## Disclaimer

> **Read carefully before use.**

1. **Terms of Service:** Automating a Discord user account (self-bot) is explicitly prohibited by [Discord's Terms of Service, Section 13](https://discord.com/terms). Using this tool may result in your account being **permanently banned**.

2. **No liability:** The author(s) of this software accept **no responsibility** for any consequences arising from its use, including but not limited to: account bans, data loss, server disruption, or violation of third-party terms of service.

3. **Own servers only:** This tool is intended **solely** for use on servers that you own or have explicit written permission to clone. Using it on servers you do not own or have permission to copy may violate additional laws and platform policies.

4. **No affiliation:** This project is **not affiliated with, endorsed by, or sponsored by Discord Inc.** in any way.

5. **Use at your own risk:** By using this software, you acknowledge and accept all risks associated with its use.

---

## License

This project is licensed under the **MIT License** — see the [LICENSE](LICENSE) file for details.
