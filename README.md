# 🐍 Cyber Snake — Next-Gen Arcade Game

<p align="center">
  <img src="https://img.shields.io/badge/HTML5-Canvas%202D-E34F26?style=for-the-badge&logo=html5&logoColor=white" alt="HTML5">
  <img src="https://img.shields.io/badge/CSS3-Glassmorphism%20%26%20Themes-1572B6?style=for-the-badge&logo=css3&logoColor=white" alt="CSS3">
  <img src="https://img.shields.io/badge/JavaScript-Vanilla%20ES6+-F7DF1E?style=for-the-badge&logo=javascript&logoColor=black" alt="JavaScript">
  <img src="https://img.shields.io/badge/Audio-Web%20Audio%20API-9B51E0?style=for-the-badge" alt="Web Audio API">
  <img src="https://img.shields.io/badge/Platform-Desktop%20%2F%20Mobile-00f3ff?style=for-the-badge" alt="Cross-Platform">
</p>

A modern, responsive, and feature-packed reimagining of the classic Snake arcade game. Built with pure **HTML5 Canvas**, modern **CSS Glassmorphism**, and **Vanilla JavaScript**, featuring zero external dependencies and synthesized real-time sound effects via the **Web Audio API**.

---

## 🌟 Key Highlights

- 🎨 **5 Curated Color Themes**: Switch instantly between *Cyber Neon*, *Sunset Glow*, *Emerald Zen*, *Midnight Dark*, and *8-Bit Retro*.
- 🕹️ **3 Game Modes**:
  - **Classic**: Pure snake experience with progressive speed growth.
  - **Arcade Power**: Collect power-ups like *Golden Apples*, *Ice Berries (Slow-Mo)*, *Ghost Peppers (Pass-thru)*, and *Star Multipliers*.
  - **Frenzy 60s**: 60-second time attack where food adds bonus seconds to the clock!
- 🔊 **Zero-Asset Procedural Audio**: Dynamic pitch-scaled sound effects synthesized entirely in code using the browser's Web Audio API.
- ✨ **High-Polish Visual FX ("Game Juice")**:
  - Expressive animated eyes tracking movement direction.
  - Animated flicking tongue.
  - Particle bursts, spark trails, and floating score popups.
  - Confetti celebrations on high score milestones.
  - Screen shake on impacts (customizable in settings).
- 📱 **Universal Controls**: Full keyboard navigation (WASD & Arrows), touch swipe gestures, and an ergonomic virtual on-screen D-Pad for mobile devices.
- 🏆 **Progression & Persistence**: High scores per mode, in-game achievements with toast notifications, and customizable settings saved to `localStorage`.

---

## 🎮 Game Controls

### Desktop Keyboard
| Key | Action |
| :--- | :--- |
| <kbd>▲</kbd> <kbd>▼</kbd> <kbd>◀</kbd> <kbd>▶</kbd> or <kbd>W</kbd><kbd>A</kbd><kbd>S</kbd><kbd>D</kbd> | Steer Snake |
| <kbd>Space</kbd> | Start Game / Pause / Resume / Replay |
| <kbd>R</kbd> | Instant Quick Restart |
| <kbd>M</kbd> | Toggle Sound Mute |
| <kbd>Esc</kbd> or <kbd>P</kbd> | Open Pause Menu |

### Mobile & Touch Screens
- **Swipe Gestures**: Swipe anywhere on screen (Up, Down, Left, Right).
- **Virtual D-Pad**: Tap on-screen directional buttons with tactile vibration feedback.

---

## ⚡ Power-Ups Guide (Arcade Mode)

| Item | Name | Effect |
| :---: | :--- | :--- |
| 🍎 | **Regular Apple** | +10 Points, grows snake length by 1. |
| ⭐ | **Golden Apple** | +50 Points, temporary 2x score boost & glowing trail for 8s. |
| 🧊 | **Ice Berry** | Slows game speed by 40% for 6s for precision navigation. |
| 🌶️ | **Ghost Pepper** | Allows passing through walls and your own tail for 6s! |
| 💎 | **Star Multiplier** | Instantly maxes out combo multiplier to 4.0x for 8s. |

---

## 🚀 Quick Start

### Method 1: Double-Click Launcher (Windows)
Double-click `start.bat` in the project folder to open the game in your default browser.

### Method 2: Open Directly in Browser
Open `snake game/index.html` in any web browser (Chrome, Edge, Firefox, Safari, Brave).

---

## 📂 Project Structure

```
.
├── start.bat               # Windows one-click game launcher
├── README.md               # Game documentation & guide
└── snake game/
    ├── index.html          # Semantic layout, HUD, modals & touch D-pad
    ├── styles.css          # Glassmorphism design system & theme variables
    ├── start.bat           # Subfolder launcher
    └── js/
        ├── audio.js        # Web Audio API sound synthesizer
        ├── particles.js    # VFX particles & floating score text engine
        ├── game.js         # Core snake engine, physics & power-ups
        ├── ui.js           # UI state manager, modals, achievements & storage
        └── main.js         # Game loop & input controllers
```

---

## 🛠️ Technology Stack

- **Frontend**: HTML5 Canvas API, CSS3 Modern Features (Grid, Flexbox, Backdrop-filter, CSS Variables).
- **Logic**: Vanilla JavaScript ES6+ (No external runtime frameworks or bloated dependencies).
- **Audio**: Web Audio API (Synthesizers for oscillators and gain envelopes).
- **Storage**: Browser `localStorage` API.

---

## 📄 License

This project is open source and available under the [MIT License](LICENSE).
