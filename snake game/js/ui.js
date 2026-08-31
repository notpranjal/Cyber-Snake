/**
 * UI & State Manager for Cyber Snake
 * Handles HUD updates, modals, achievements, toast notifications, themes, and persistence.
 */

const ACHIEVEMENTS_DEF = [
  { id: 'first_bite', title: 'First Bite', desc: 'Eat your first apple.', icon: '🍎' },
  { id: 'power_hungry', title: 'Power Hungry', desc: 'Collect any power-up item in Arcade Mode.', icon: '⚡' },
  { id: 'combo_king', title: 'Combo Master', desc: 'Reach a 3.0x combo multiplier.', icon: '🔥' },
  { id: 'long_boi', title: 'Long Boi', desc: 'Grow snake to a length of 25 segments.', icon: '🐍' },
  { id: 'centipede', title: 'Centipede', desc: 'Grow snake to a length of 50 segments.', icon: '👑' },
  { id: 'century', title: 'Century Club', desc: 'Score 250 points in a single run.', icon: '💯' },
  { id: 'high_roller', title: 'High Roller', desc: 'Score 500 points in a single run.', icon: '🏆' },
  { id: 'speed_demon', title: 'Speed Demon', desc: 'Score 100+ points on Insane speed.', icon: '🚀' }
];

class UIManager {
  constructor() {
    this.storagePrefix = 'cybersnake_';
    this.settings = this.loadSettings();
    this.highScores = this.loadHighScores();
    this.unlockedAchievements = this.loadAchievements();
    this.stats = this.loadStats();

    this.cachedElements = {};
    this.initDOM();
    this.applySettings();
    this.renderAchievementsList();
  }

  initDOM() {
    // HUD Elements
    this.scoreDisplay = document.getElementById('score-display');
    this.highscoreDisplay = document.getElementById('highscore-display');
    this.comboMultiplier = document.getElementById('combo-multiplier');
    this.comboMeterFill = document.getElementById('combo-meter-fill');
    this.powerupStatusBar = document.getElementById('powerup-status-bar');
    this.currentModeTag = document.getElementById('current-mode-tag');

    // Modals
    this.modalStart = document.getElementById('modal-start');
    this.modalPause = document.getElementById('modal-pause');
    this.modalGameOver = document.getElementById('modal-gameover');
    this.modalSettings = document.getElementById('modal-settings');
    this.modalAchievements = document.getElementById('modal-achievements');
    this.modalHelp = document.getElementById('modal-help');
    this.countdownOverlay = document.getElementById('countdown-overlay');
    this.countdownText = document.getElementById('countdown-text');

    // Quick Action & Toggle Buttons
    this.soundToggleBtn = document.getElementById('btn-sound-toggle');
    this.soundIcon = document.getElementById('sound-icon');
    this.touchControls = document.getElementById('touch-controls');

    this.bindEvents();
  }

  loadSettings() {
    const saved = localStorage.getItem(this.storagePrefix + 'settings');
    const defaults = {
      theme: 'theme-neon',
      speed: 'normal',
      gridSize: 20,
      wallCollisions: true,
      sound: true,
      particles: true,
      screenShake: true,
      dpad: false
    };
    if (saved) {
      try { return { ...defaults, ...JSON.parse(saved) }; } catch (e) { }
    }
    return defaults;
  }

  saveSettings() {
    localStorage.setItem(this.storagePrefix + 'settings', JSON.stringify(this.settings));
  }

  loadHighScores() {
    const saved = localStorage.getItem(this.storagePrefix + 'highscores');
    const defaults = { classic: 0, arcade: 0, frenzy: 0 };
    if (saved) {
      try { return { ...defaults, ...JSON.parse(saved) }; } catch (e) { }
    }
    return defaults;
  }

  saveHighScores() {
    localStorage.setItem(this.storagePrefix + 'highscores', JSON.stringify(this.highScores));
  }

  loadAchievements() {
    const saved = localStorage.getItem(this.storagePrefix + 'achievements');
    if (saved) {
      try { return JSON.parse(saved); } catch (e) { }
    }
    return [];
  }

  saveAchievements() {
    localStorage.setItem(this.storagePrefix + 'achievements', JSON.stringify(this.unlockedAchievements));
  }

  loadStats() {
    const saved = localStorage.getItem(this.storagePrefix + 'stats');
    const defaults = { gamesPlayed: 0, applesEatenTotal: 0, totalScore: 0 };
    if (saved) {
      try { return { ...defaults, ...JSON.parse(saved) }; } catch (e) { }
    }
    return defaults;
  }

  saveStats() {
    localStorage.setItem(this.storagePrefix + 'stats', JSON.stringify(this.stats));
  }

  applySettings() {
    // 1. Theme
    document.body.className = this.settings.theme;
    document.querySelectorAll('.theme-btn').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.theme === this.settings.theme);
    });

    // 2. Speed Preset
    document.querySelectorAll('.seg-btn').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.speed === this.settings.speed);
    });
    if (window.game) {
      window.game.setSpeedPreset(this.settings.speed);
    }

    // 3. Grid Size
    document.querySelectorAll('.grid-btn').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.grid === String(this.settings.gridSize));
    });
    if (window.game) {
      window.game.setGridSize(this.settings.gridSize);
    }

    // 4. Toggles
    const toggleWalls = document.getElementById('toggle-walls');
    if (toggleWalls) toggleWalls.checked = this.settings.wallCollisions;
    if (window.game) window.game.setWallCollisions(this.settings.wallCollisions);

    const toggleSound = document.getElementById('toggle-sound');
    if (toggleSound) toggleSound.checked = this.settings.sound;
    if (window.soundEngine) window.soundEngine.setEnabled(this.settings.sound);
    if (this.soundIcon) this.soundIcon.textContent = this.settings.sound ? '🔊' : '🔇';

    const toggleParticles = document.getElementById('toggle-particles');
    if (toggleParticles) toggleParticles.checked = this.settings.particles;
    if (window.particleSystem) window.particleSystem.setEnabled(this.settings.particles);

    const toggleShake = document.getElementById('toggle-shake');
    if (toggleShake) toggleShake.checked = this.settings.screenShake;

    const toggleDpad = document.getElementById('toggle-dpad');
    if (toggleDpad) toggleDpad.checked = this.settings.dpad;
    if (this.touchControls) {
      this.touchControls.classList.toggle('active', this.settings.dpad);
    }

    this.updateHUD();
  }

  bindEvents() {
    // Sound Toggle in Header
    this.soundToggleBtn.addEventListener('click', () => {
      this.settings.sound = !this.settings.sound;
      window.soundEngine.setEnabled(this.settings.sound);
      this.soundIcon.textContent = this.settings.sound ? '🔊' : '🔇';
      this.saveSettings();
      window.soundEngine.playClick();
    });

    // Header Modals Openers
    document.getElementById('btn-open-settings').addEventListener('click', () => {
      this.openModal(this.modalSettings);
    });
    document.getElementById('btn-open-achievements').addEventListener('click', () => {
      this.renderAchievementsList();
      this.openModal(this.modalAchievements);
    });
    document.getElementById('btn-open-help').addEventListener('click', () => {
      this.openModal(this.modalHelp);
    });

    // Close Modal Buttons
    document.querySelectorAll('.close-modal-btn, [data-close]').forEach(btn => {
      btn.addEventListener('click', () => {
        const modalId = btn.dataset.close;
        const targetModal = modalId ? document.getElementById(modalId) : btn.closest('.modal-backdrop');
        if (targetModal) this.closeModal(targetModal);
        window.soundEngine.playClick();
      });
    });

    // Mode Selector in Start Modal
    document.querySelectorAll('.mode-card').forEach(card => {
      card.addEventListener('click', () => {
        document.querySelectorAll('.mode-card').forEach(c => c.classList.remove('active'));
        card.classList.add('active');
        const mode = card.dataset.mode;
        if (window.game) window.game.setMode(mode);
        this.currentModeTag.textContent = mode.toUpperCase();
        this.updateHUD();
        window.soundEngine.playClick();
      });
    });

    // Start Game Button
    document.getElementById('btn-start-game').addEventListener('click', () => {
      this.closeModal(this.modalStart);
      this.startCountdownAndPlay();
    });

    // Pause Modal Buttons
    document.getElementById('btn-resume-game').addEventListener('click', () => {
      this.closeModal(this.modalPause);
      if (window.game) window.game.isPaused = false;
      window.soundEngine.playClick();
    });
    document.getElementById('btn-restart-game').addEventListener('click', () => {
      this.closeModal(this.modalPause);
      this.startCountdownAndPlay();
    });
    document.getElementById('btn-pause-to-menu').addEventListener('click', () => {
      this.closeModal(this.modalPause);
      if (window.game) window.game.isRunning = false;
      this.openModal(this.modalStart);
      window.soundEngine.playClick();
    });

    // Quick Pause In-Game Button
    document.getElementById('btn-quick-pause').addEventListener('click', () => {
      this.togglePause();
    });

    // Game Over Buttons
    document.getElementById('btn-play-again').addEventListener('click', () => {
      this.closeModal(this.modalGameOver);
      this.startCountdownAndPlay();
    });
    document.getElementById('btn-gameover-menu').addEventListener('click', () => {
      this.closeModal(this.modalGameOver);
      this.openModal(this.modalStart);
      window.soundEngine.playClick();
    });

    // Settings Theme Buttons
    document.querySelectorAll('.theme-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        this.settings.theme = btn.dataset.theme;
        this.saveSettings();
        this.applySettings();
        window.soundEngine.playClick();
      });
    });

    // Speed Preset Buttons
    document.querySelectorAll('.seg-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        this.settings.speed = btn.dataset.speed;
        this.saveSettings();
        this.applySettings();
        window.soundEngine.playClick();
      });
    });

    // Grid Preset Buttons
    document.querySelectorAll('.grid-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        this.settings.gridSize = parseInt(btn.dataset.grid, 10);
        this.saveSettings();
        this.applySettings();
        window.soundEngine.playClick();
      });
    });

    // Setting Checkbox Toggles
    const toggleWalls = document.getElementById('toggle-walls');
    if (toggleWalls) {
      toggleWalls.addEventListener('change', (e) => {
        this.settings.wallCollisions = e.target.checked;
        this.saveSettings();
        if (window.game) window.game.setWallCollisions(e.target.checked);
      });
    }

    const toggleSound = document.getElementById('toggle-sound');
    if (toggleSound) {
      toggleSound.addEventListener('change', (e) => {
        this.settings.sound = e.target.checked;
        this.saveSettings();
        this.applySettings();
      });
    }

    const toggleParticles = document.getElementById('toggle-particles');
    if (toggleParticles) {
      toggleParticles.addEventListener('change', (e) => {
        this.settings.particles = e.target.checked;
        this.saveSettings();
        if (window.particleSystem) window.particleSystem.setEnabled(e.target.checked);
      });
    }

    const toggleShake = document.getElementById('toggle-shake');
    if (toggleShake) {
      toggleShake.addEventListener('change', (e) => {
        this.settings.screenShake = e.target.checked;
        this.saveSettings();
      });
    }

    const toggleDpad = document.getElementById('toggle-dpad');
    if (toggleDpad) {
      toggleDpad.addEventListener('change', (e) => {
        this.settings.dpad = e.target.checked;
        this.saveSettings();
        this.applySettings();
      });
    }

    // Reset Data Button
    document.getElementById('btn-reset-data').addEventListener('click', () => {
      if (confirm('Are you sure you want to reset all high scores and achievements?')) {
        this.highScores = { classic: 0, arcade: 0, frenzy: 0 };
        this.unlockedAchievements = [];
        this.saveHighScores();
        this.saveAchievements();
        this.updateHUD();
        this.renderAchievementsList();
        this.showToast('Data Reset', 'All high scores and records cleared.', '🗑️');
      }
    });

    // Touch Action Buttons
    const touchPause = document.getElementById('touch-btn-pause');
    if (touchPause) touchPause.addEventListener('click', () => this.togglePause());

    const touchRestart = document.getElementById('touch-btn-restart');
    if (touchRestart) touchRestart.addEventListener('click', () => this.startCountdownAndPlay());
  }

  openModal(modal) {
    if (!modal) return;
    modal.classList.add('active');
    window.soundEngine.playClick();
  }

  closeModal(modal) {
    if (!modal) return;
    modal.classList.remove('active');
  }

  closeAllModals() {
    document.querySelectorAll('.modal-backdrop').forEach(m => m.classList.remove('active'));
  }

  togglePause() {
    if (!window.game || !window.game.isRunning || window.game.isGameOver) return;

    window.game.isPaused = !window.game.isPaused;
    if (window.game.isPaused) {
      document.getElementById('pause-score').textContent = window.game.score;
      document.getElementById('pause-length').textContent = window.game.snake.length;
      this.openModal(this.modalPause);
    } else {
      this.closeModal(this.modalPause);
    }
  }

  /**
   * Starts a smooth 3.. 2.. 1.. GO! countdown overlay before initiating gameplay
   */
  startCountdownAndPlay() {
    this.closeAllModals();
    if (!window.game) return;

    window.game.initGame();
    window.game.isPaused = true; // Wait for countdown to finish

    this.countdownOverlay.classList.remove('hidden');
    let count = 3;
    this.countdownText.textContent = count;
    window.soundEngine.playCountdown(false);

    const interval = setInterval(() => {
      count--;
      if (count > 0) {
        this.countdownText.textContent = count;
        window.soundEngine.playCountdown(false);
      } else if (count === 0) {
        this.countdownText.textContent = 'GO!';
        window.soundEngine.playCountdown(true);
      } else {
        clearInterval(interval);
        this.countdownOverlay.classList.add('hidden');
        window.game.isPaused = false;
      }
    }, 700);
  }

  /**
   * Updates HUD scores, combo gauge, and active power-ups
   */
  updateHUD() {
    const game = window.game;
    const mode = game ? game.mode : 'classic';
    const currentHigh = this.highScores[mode] || 0;

    if (this.highscoreDisplay) {
      this.highscoreDisplay.textContent = currentHigh;
    }

    if (!game) return;

    if (this.scoreDisplay) {
      this.scoreDisplay.textContent = game.score;
    }

    // Combo bar
    if (this.comboMultiplier && this.comboMeterFill) {
      this.comboMultiplier.textContent = `${game.combo.toFixed(1)}x`;
      const fillPct = (game.comboTimer / game.maxComboTimer) * 100;
      this.comboMeterFill.style.width = `${Math.max(0, Math.min(100, fillPct))}%`;

      if (game.combo >= 2.5) {
        this.comboMultiplier.classList.add('pop');
      } else {
        this.comboMultiplier.classList.remove('pop');
      }
    }

    // Active Powerups Status Pills
    if (this.powerupStatusBar) {
      this.powerupStatusBar.innerHTML = '';
      for (const [key, timeLeft] of Object.entries(game.activePowerups)) {
        const pDef = POWERUP_TYPES[key.toUpperCase()] || { icon: '⚡', name: key, color: '#00f3ff' };
        const pill = document.createElement('div');
        pill.className = `powerup-pill ${timeLeft < 2.5 ? 'expiring' : ''}`;
        pill.style.borderColor = pDef.color;
        pill.innerHTML = `
          <span>${pDef.icon}</span>
          <span>${pDef.name}</span>
          <span class="p-timer">${Math.ceil(timeLeft)}s</span>
        `;
        this.powerupStatusBar.appendChild(pill);
      }
    }
  }

  onComboDrop() {
    this.updateHUD();
  }

  /**
   * Displays Game Over modal with stats breakdown & high score celebration
   */
  showGameOver(reason) {
    const game = window.game;
    const mode = game.mode;
    const prevBest = this.highScores[mode] || 0;
    const isNewHigh = game.score > prevBest && game.score > 0;

    if (isNewHigh) {
      this.highScores[mode] = game.score;
      this.saveHighScores();
      window.soundEngine.playHighScore();
      window.particleSystem.createConfetti(game.displaySize, game.displaySize, 60);
    }

    // Update Lifetime Stats
    this.stats.gamesPlayed++;
    this.stats.applesEatenTotal += game.applesEaten;
    this.stats.totalScore += game.score;
    this.saveStats();

    // Populate Modal Details
    document.getElementById('gameover-heading').textContent = reason || 'GAME OVER';
    document.getElementById('new-highscore-badge').classList.toggle('hidden', !isNewHigh);
    document.getElementById('gameover-score').textContent = game.score;
    document.getElementById('stat-apples').textContent = game.applesEaten;
    document.getElementById('stat-maxcombo').textContent = `${game.maxComboReached.toFixed(1)}x`;
    document.getElementById('stat-length').textContent = game.snake.length;

    const mins = Math.floor(game.timeSurvived / 60);
    const secs = Math.floor(game.timeSurvived % 60);
    document.getElementById('stat-time').textContent = `${mins}:${secs < 10 ? '0' : ''}${secs}`;

    this.checkAchievements();
    this.openModal(this.modalGameOver);
    this.updateHUD();
  }

  /**
   * Checks achievement trigger conditions
   */
  checkAchievements() {
    const game = window.game;
    if (!game) return;

    if (game.applesEaten >= 1) this.unlockAchievement('first_bite');
    if (Object.keys(game.activePowerups).length > 0) this.unlockAchievement('power_hungry');
    if (game.combo >= 3.0) this.unlockAchievement('combo_king');
    if (game.snake.length >= 25) this.unlockAchievement('long_boi');
    if (game.snake.length >= 50) this.unlockAchievement('centipede');
    if (game.score >= 250) this.unlockAchievement('century');
    if (game.score >= 500) this.unlockAchievement('high_roller');
    if (game.speedPreset === 'insane' && game.score >= 100) this.unlockAchievement('speed_demon');
  }

  unlockAchievement(id) {
    if (this.unlockedAchievements.includes(id)) return;

    this.unlockedAchievements.push(id);
    this.saveAchievements();

    const ach = ACHIEVEMENTS_DEF.find(a => a.id === id);
    if (ach) {
      this.showToast('Achievement Unlocked!', `${ach.icon} ${ach.title}: ${ach.desc}`, '🏆');
      window.soundEngine.playHighScore();
    }
  }

  renderAchievementsList() {
    const container = document.getElementById('achievements-list-container');
    if (!container) return;

    container.innerHTML = '';
    let unlockedCount = 0;

    ACHIEVEMENTS_DEF.forEach(ach => {
      const isUnlocked = this.unlockedAchievements.includes(ach.id);
      if (isUnlocked) unlockedCount++;

      const item = document.createElement('div');
      item.className = `achievement-card ${isUnlocked ? 'unlocked' : ''}`;
      item.innerHTML = `
        <div class="ach-icon">${ach.icon}</div>
        <div class="ach-details">
          <span class="ach-title">${ach.title} ${isUnlocked ? '✓' : '🔒'}</span>
          <span class="ach-desc">${ach.desc}</span>
        </div>
      `;
      container.appendChild(item);
    });

    const countText = document.getElementById('achievements-unlocked-count');
    const fill = document.getElementById('achievements-progress-fill');
    if (countText) countText.textContent = `${unlockedCount} / ${ACHIEVEMENTS_DEF.length} Unlocked`;
    if (fill) fill.style.width = `${(unlockedCount / ACHIEVEMENTS_DEF.length) * 100}%`;
  }

  showToast(title, desc, icon = '✨') {
    const container = document.getElementById('toast-container');
    if (!container) return;

    const toast = document.createElement('div');
    toast.className = 'toast';
    toast.innerHTML = `
      <span class="toast-icon">${icon}</span>
      <div class="toast-content">
        <span class="toast-title">${title}</span>
        <span class="toast-desc">${desc}</span>
      </div>
    `;

    container.appendChild(toast);

    setTimeout(() => {
      toast.classList.add('removing');
      setTimeout(() => toast.remove(), 350);
    }, 3500);
  }
}

// Global UI Manager Singleton
window.uiManager = new UIManager();
