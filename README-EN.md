<div align="center">
  <img src="public/logo.svg" alt="OGame Vue TS Logo" width="128" height="128">

  # OGame Vue TS

  A modern of the classic OGame space strategy game, built with Vue 3 and TypeScript.

  [![License: CC BY-NC 4.0](https://img.shields.io/badge/License-CC%20BY--NC%204.0-lightgrey.svg)](https://creativecommons.org/licenses/by-nc/4.0/)
  [![Vue 3](https://img.shields.io/badge/Vue-3.5-brightgreen.svg)](https://vuejs.org/)
  [![TypeScript](https://img.shields.io/badge/TypeScript-5.9-blue.svg)](https://www.typescriptlang.org/)
  [![Vite](https://img.shields.io/badge/Vite-7.2-646CFF.svg)](https://vitejs.dev/)
  [![Go](https://img.shields.io/badge/Go-1.25-79D4FD.svg)](https://golang.org/)

  [简体中文](README.md) | English

</div>

## About

OGame Vue TS is a single-player, browser-based space strategy game inspired by the classic OGame. Build your empire across the galaxy, research technologies, construct ships, and engage in epic space battles. This project is built with modern web technologies, offering a smooth and responsive gaming experience entirely in your browser with local data persistence.

## Features

- **Multi-language Support** - Available in 6 languages: English, Chinese (Simplified & Traditional), German, Russian, and Korean
- **Building Management** - Construct and upgrade various buildings on planets and moons
- **Research Technologies** - Unlock advanced technologies to enhance your empire
- **Fleet Management** - Build ships, send missions, and engage in tactical space battles
- **Defense Systems** - Deploy defensive structures to protect your colonies
- **Officers System** - Recruit officers to gain strategic advantages
- **Battle Simulator** - Test combat scenarios before committing resources
- **Galaxy View** - Explore the universe and interact with other planets
- **Local Data Persistence** - All game data is encrypted and stored locally in your browser
- **Dark/Light Mode** - Choose your preferred visual theme
- **Queue Management** - Manage multiple build and research queues
- **Moon Generation** - Chance-based moon creation from debris fields

## Tech Stack

- **Frontend Framework:** [Vue 3](https://vuejs.org/) with Composition API (`<script setup>`)
- **Language:** [TypeScript](https://www.typescriptlang.org/) with strict type checking
- **Build Tool:** [Vite](https://vitejs.dev/) (Custom Rolldown-Vite 7.2.5)、[Golang](https://golang.org/)(Building cross-platform Web server.)、[Electron](https://www.electronjs.org/)(Building cross-platform visual interfaces)
- **State Management:** [Pinia](https://pinia.vuejs.org/) with persisted state plugin
- **Routing:** [Vue Router 4](https://router.vuejs.org/)
- **UI Components:** [shadcn-vue](https://www.shadcn-vue.com/) (New York style)
- **Styling:** [Tailwind CSS v4](https://tailwindcss.com/) with CSS variables
- **Icons:** [Lucide Vue Next](https://lucide.dev/)
- **Animations:** [tw-animate-css](https://www.npmjs.com/package/tw-animate-css)
- **Internationalization:** Custom i18n implementation

## Quick Start

### Download Build Product

#### Server version

[Windows](/releases/latest/download/ogame-windows-amd64.exe)

[Linux amd64](/releases/latest/download/ogame-linux-amd64)

[Linux arm64](/releases/latest/download/ogame-linux-arm64)

[MacOS Intel](/releases/latest/download/ogame-macos-amd64)

[MacOS](/releases/latest/download/ogame-macos-arm64)

#### Desktop version

[Windows](/releases/latest/download/OGame.Setup.exe)

[Ubuntu](/releases/latest/download/OGame.AppImage)

[MacOS](/releases/latest/download/OGame-mac.dmg)

### Prerequisites

- [Node.js](https://nodejs.org/) (version 18 or higher recommended)
- [pnpm](https://pnpm.io/) (version 10.13.1 or higher)
- [Go](https://golang.org/) (version 1.21 or higher recommended) (optional for binary builds)

### Installation

```bash
# Clone the repository
git clone https://github.com/setube/ogame-vue-ts.git

# Navigate to project directory
cd ogame-vue-ts

# Install dependencies
pnpm install
```

### Development

```bash
# Start development server (runs on port 25121)
pnpm dev
```

Open your browser and visit `http://localhost:25121`

### Build for Production

```bash
# Build the application
pnpm build

# Preview production build
pnpm preview
```

## Available Languages

- 🇺🇸 English
- 🇨🇳 简体中文 (Simplified Chinese)
- 🇹🇼 繁體中文 (Traditional Chinese)
- 🇩🇪 Deutsch (German)
- 🇷🇺 Русский (Russian)
- 🇰🇷 한국어 (Korean)

## Game Features

### Resource Management
- **Metal** - Primary construction material
- **Crystal** - Advanced technology component
- **Deuterium** - Fuel and research resource
- **Dark Matter** - Premium resource
- **Energy** - Powers your facilities

### Building Types
- **Resource Buildings** - Metal Mine, Crystal Mine, Deuterium Synthesizer, Solar Plant
- **Facilities** - Robotics Factory, Shipyard, Research Lab, Storage facilities
- **Special Buildings** - Nanite Factory, Terraformer, and more

### Technologies
- **Energy Technology** - Improves energy efficiency
- **Laser Technology** - Enhances weapon systems
- **Ion Technology** - Advanced propulsion and weapons
- **Hyperspace Technology** - Enables faster travel
- **Plasma Technology** - Ultimate weapon systems
- And many more...

### Ship Classes
- **Civil Ships** - Small/Large Cargo, Colony Ship, Recycler
- **Combat Ships** - Light/Heavy Fighter, Cruiser, Battleship, Bomber
- **Special Ships** - Deathstar, Battlecruiser, Destroyer

### Defense Systems
- Rocket Launcher, Light/Heavy Laser, Gauss Cannon
- Ion Cannon, Plasma Turret
- Small/Large Shield Dome

## Data Security

All game data is automatically encrypted using AES encryption before being stored in your browser's local storage. Your game progress is secure and private.

## Customization

The application supports full theme customization through Tailwind CSS variables defined in `src/style.css`. You can easily switch between light and dark modes.

## Contributing

Contributions are welcome! Please feel free to submit issues or pull requests.

## License

This work is licensed under the [Creative Commons Attribution-NonCommercial 4.0 International License](https://creativecommons.org/licenses/by-nc/4.0/).

### You are free to:
- **Share** — copy and redistribute the material in any medium or format
- **Adapt** — remix, transform, and build upon the material

### Under the following terms:
- **Attribution** — You must give appropriate credit, provide a link to the license, and indicate if changes were made
- **NonCommercial** — You may not use the material for commercial purposes

**Original Author:** Jun Qian (谦君)

## Acknowledgments

This project is inspired by the original [OGame](https://ogame.org/) browser game. All game mechanics and design elements are reimplemented for educational and entertainment purposes.

## Disclaimer

This project is not affiliated with, endorsed by, or connected to Gameforge AG or the official OGame game. It is an independent fan project created for educational purposes and personal enjoyment.

---

<div align="center">
  Made with ❤️ by Jun Qian
  <br>
  © 2025 - All rights reserved (except those granted by CC BY-NC 4.0 License)
</div>
