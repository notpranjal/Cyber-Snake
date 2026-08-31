/**
 * Core Game Engine for Cyber Snake
 * Handles game loop physics, grid math, snake mechanics, power-ups, and collisions.
 */

const POWERUP_TYPES = {
  GOLDEN: {
    id: 'golden',
    name: 'Golden Apple',
    icon: '⭐',
    duration: 8,
    color: '#ffd000',
    glow: 'rgba(255, 208, 0, 0.7)'
  },
  ICE: {
    id: 'ice',
    name: 'Ice Berry (Slow-Mo)',
    icon: '🧊',
    duration: 6,
    color: '#00f3ff',
    glow: 'rgba(0, 243, 255, 0.7)'
  },
  GHOST: {
    id: 'ghost',
    name: 'Ghost Pepper (Pass-thru)',
    icon: '🌶️',
    duration: 6,
    color: '#d946ef',
    glow: 'rgba(217, 70, 239, 0.7)'
  },
  STAR: {
    id: 'star',
    name: 'Star Multiplier (4x)',
    icon: '💎',
    duration: 8,
    color: '#f43f5e',
    glow: 'rgba(244, 63, 94, 0.7)'
  }
};

class SnakeGame {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');

    // Config & Settings
    this.gridSize = 20; // 20x20 grid
    this.wallCollisions = true;
    this.speedPreset = 'normal'; // casual (160ms), normal (120ms), fast (85ms), insane (55ms)
    this.mode = 'classic'; // 'classic', 'arcade', 'frenzy'

    // Gameplay States
    this.isRunning = false;
    this.isPaused = false;
    this.isGameOver = false;

    // Movement & Snake
    this.snake = [];
    this.direction = { x: 1, y: 0 };
    this.nextDirection = { x: 1, y: 0 };
    this.directionQueue = [];
    this.growPending = 0;

    // Items
    this.food = { x: 5, y: 5, type: 'regular' };
    this.powerup = null; // Active spawned powerup entity on grid

    // Active Buffs / Power-up Timers
    this.activePowerups = {}; // { [typeId]: remainingSeconds }

    // Scoring & Stats
    this.score = 0;
    this.applesEaten = 0;
    this.combo = 1.0;
    this.comboTimer = 0;
    this.maxComboTimer = 3.2; // Seconds to maintain combo
    this.maxComboReached = 1.0;
    this.timeSurvived = 0;
    this.frenzyTimeRemaining = 60; // 60s for Frenzy mode

    // Tick Timing
    this.tickInterval = 0.12; // Base seconds per step
    this.timeSinceLastTick = 0;
    this.animTime = 0;

    this.resizeCanvas();
  }

  /**
   * Resizes canvas based on container pixel density for Retina clarity
   */
  resizeCanvas() {
    const parent = this.canvas.parentElement;
    const parentRect = parent ? parent.getBoundingClientRect() : null;
    let size = parentRect ? Math.min(parentRect.width - 10, parentRect.height - 10) : 400;
    if (!size || size < 100) {
      const rect = this.canvas.getBoundingClientRect();
      size = Math.min(rect.width || 400, rect.height || 400);
      if (!size || size < 100) size = 400;
    }
    size = Math.floor(size);
    const dpr = window.devicePixelRatio || 1;

    this.canvas.width = size * dpr;
    this.canvas.height = size * dpr;
    this.canvas.style.width = `${size}px`;
    this.canvas.style.height = `${size}px`;
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    this.displaySize = size;
    this.cellSize = size / this.gridSize;
  }

  setGridSize(size) {
    this.gridSize = parseInt(size, 10) || 20;
    this.resizeCanvas();
  }

  setSpeedPreset(preset) {
    this.speedPreset = preset;
    const speeds = {
      casual: 0.16,
      normal: 0.12,
      fast: 0.085,
      insane: 0.055
    };
    this.tickInterval = speeds[preset] || 0.12;
  }

  setMode(mode) {
    this.mode = mode;
  }

  setWallCollisions(val) {
    this.wallCollisions = Boolean(val);
  }

  /**
   * Initializes or resets game state for a new session
   */
  initGame() {
    const mid = Math.floor(this.gridSize / 2);
    this.snake = [
      { x: mid, y: mid },
      { x: mid - 1, y: mid },
      { x: mid - 2, y: mid }
    ];

    this.direction = { x: 1, y: 0 };
    this.nextDirection = { x: 1, y: 0 };
    this.directionQueue = [];
    this.growPending = 0;

    this.score = 0;
    this.applesEaten = 0;
    this.combo = 1.0;
    this.comboTimer = 0;
    this.maxComboReached = 1.0;
    this.timeSurvived = 0;
    this.frenzyTimeRemaining = 60;

    this.activePowerups = {};
    this.powerup = null;

    this.isRunning = true;
    this.isPaused = false;
    this.isGameOver = false;
    this.timeSinceLastTick = 0;

    this.spawnFood();
  }

  /**
   * Safely queues directional input, preventing 180-degree instant suicide
   */
  changeDirection(newDir) {
    if (!this.isRunning || this.isPaused || this.isGameOver) return;

    const lastDir = this.directionQueue.length > 0
      ? this.directionQueue[this.directionQueue.length - 1]
      : this.direction;

    // Prevent direct reverse
    if (newDir.x === -lastDir.x && newDir.y === -lastDir.y) return;
    // Prevent duplicate directions
    if (newDir.x === lastDir.x && newDir.y === lastDir.y) return;

    if (this.directionQueue.length < 3) {
      this.directionQueue.push(newDir);
    }
  }

  /**
   * Spawns regular or special food on unoccupied grid cell
   */
  spawnFood() {
    const emptyCells = [];
    for (let x = 0; x < this.gridSize; x++) {
      for (let y = 0; y < this.gridSize; y++) {
        const isOccupiedBySnake = this.snake.some(seg => seg.x === x && seg.y === y);
        const isOccupiedByPowerup = this.powerup && this.powerup.x === x && this.powerup.y === y;
        if (!isOccupiedBySnake && !isOccupiedByPowerup) {
          emptyCells.push({ x, y });
        }
      }
    }

    if (emptyCells.length === 0) return; // Full board victory

    const randomCell = emptyCells[Math.floor(Math.random() * emptyCells.length)];
    this.food = {
      x: randomCell.x,
      y: randomCell.y,
      type: 'regular'
    };

    // In Arcade mode, occasionally spawn special power-ups
    if (this.mode === 'arcade' && !this.powerup && Math.random() < 0.35 && this.applesEaten > 2) {
      this.spawnPowerup(emptyCells);
    }
  }

  /**
   * Spawns a floating special powerup in Arcade Mode
   */
  spawnPowerup(emptyCells) {
    const pKeys = Object.keys(POWERUP_TYPES);
    const randomKey = pKeys[Math.floor(Math.random() * pKeys.length)];
    const pType = POWERUP_TYPES[randomKey];

    const available = emptyCells.filter(c => c.x !== this.food.x || c.y !== this.food.y);
    if (available.length === 0) return;

    const cell = available[Math.floor(Math.random() * available.length)];
    this.powerup = {
      x: cell.x,
      y: cell.y,
      type: pType,
      life: 12 // Spawns for 12 seconds before disappearing
    };
  }

  /**
   * Main game physics step (executed on fixed interval)
   */
  step() {
    if (!this.isRunning || this.isPaused || this.isGameOver) return;

    // Apply next queued direction
    if (this.directionQueue.length > 0) {
      this.direction = this.directionQueue.shift();
    }

    const head = this.snake[0];
    let newX = head.x + this.direction.x;
    let newY = head.y + this.direction.y;

    const isGhostActive = Boolean(this.activePowerups['ghost']);

    // Handle Wall Collisions & Wrap-around
    if (!this.wallCollisions || isGhostActive) {
      if (newX < 0) newX = this.gridSize - 1;
      else if (newX >= this.gridSize) newX = 0;

      if (newY < 0) newY = this.gridSize - 1;
      else if (newY >= this.gridSize) newY = 0;
    } else {
      if (newX < 0 || newX >= this.gridSize || newY < 0 || newY >= this.gridSize) {
        this.triggerGameOver('Hit the wall boundary!');
        return;
      }
    }

    // Check Self Collision (unless Ghost mode active)
    if (!isGhostActive) {
      for (let i = 0; i < this.snake.length - 1; i++) {
        if (this.snake[i].x === newX && this.snake[i].y === newY) {
          this.triggerGameOver('Ran into your own tail!');
          return;
        }
      }
    }

    // Move Head
    const newHead = { x: newX, y: newY };
    this.snake.unshift(newHead);

    // Food Eaten Check
    if (newX === this.food.x && newY === this.food.y) {
      this.handleEatFood();
    } else if (this.growPending > 0) {
      this.growPending--;
    } else {
      this.snake.pop(); // Standard movement: remove tail segment
    }

    // Power-up Picked Check
    if (this.powerup && newX === this.powerup.x && newY === this.powerup.y) {
      this.handleEatPowerup();
    }
  }

  /**
   * Action when regular food is consumed
   */
  handleEatFood() {
    this.applesEaten++;
    this.growPending += 1;

    // Combo system update
    this.comboTimer = this.maxComboTimer;
    if (this.activePowerups['star']) {
      this.combo = 4.0;
    } else {
      this.combo = Math.min(4.0, Number((this.combo + 0.3).toFixed(1)));
    }
    if (this.combo > this.maxComboReached) {
      this.maxComboReached = this.combo;
    }

    // Score calculation
    let basePoints = 10;
    if (this.activePowerups['golden']) basePoints *= 2;
    const gainedPoints = Math.round(basePoints * this.combo);
    this.score += gainedPoints;

    // Frenzy mode: add extra seconds to clock
    if (this.mode === 'frenzy') {
      this.frenzyTimeRemaining = Math.min(60, this.frenzyTimeRemaining + 3);
    }

    // Audio & VFX
    window.soundEngine.playEat(Math.round(this.combo * 2));
    
    const worldX = (this.food.x + 0.5) * this.cellSize;
    const worldY = (this.food.y + 0.5) * this.cellSize;
    window.particleSystem.createFoodExplosion(worldX, worldY, '#ff3366', 16);
    
    const popupText = this.combo > 1.2 ? `+${gainedPoints} (${this.combo}x)` : `+${gainedPoints}`;
    window.particleSystem.addFloatingText(popupText, worldX, worldY - 10, '#00ff88', 14);

    this.spawnFood();

    // Trigger UI updates
    if (window.uiManager) {
      window.uiManager.updateHUD();
      window.uiManager.checkAchievements();
    }
  }

  /**
   * Action when a power-up entity is picked up
   */
  handleEatPowerup() {
    const p = this.powerup;
    this.activePowerups[p.type.id] = p.type.duration;
    this.powerup = null;

    this.score += 25;
    window.soundEngine.playPowerUp();

    const worldX = (p.x + 0.5) * this.cellSize;
    const worldY = (p.y + 0.5) * this.cellSize;

    if (p.type.id === 'golden') {
      window.particleSystem.createGoldenExplosion(worldX, worldY);
      window.soundEngine.playGoldenEat();
    } else {
      window.particleSystem.createFoodExplosion(worldX, worldY, p.type.color, 24);
    }

    window.particleSystem.addFloatingText(p.type.name.toUpperCase() + '!', worldX, worldY - 15, p.type.color, 15);

    if (window.uiManager) {
      window.uiManager.updateHUD();
      window.uiManager.checkAchievements();
    }
  }

  /**
   * Main delta time update loop
   */
  update(dt) {
    if (!this.isRunning || this.isPaused || this.isGameOver) return;

    this.timeSurvived += dt;
    this.animTime += dt;

    // Frenzy Countdown Check
    if (this.mode === 'frenzy') {
      this.frenzyTimeRemaining -= dt;
      if (this.frenzyTimeRemaining <= 0) {
        this.frenzyTimeRemaining = 0;
        this.triggerGameOver("Time's up!");
        return;
      }
    }

    // Powerup entity on board lifespan
    if (this.powerup) {
      this.powerup.life -= dt;
      if (this.powerup.life <= 0) {
        this.powerup = null;
      }
    }

    // Active power-up buffs countdown
    for (const [key, timeLeft] of Object.entries(this.activePowerups)) {
      const nextTime = timeLeft - dt;
      if (nextTime <= 0) {
        delete this.activePowerups[key];
        window.soundEngine.playPowerExpire();
      } else {
        this.activePowerups[key] = nextTime;
      }
    }

    // Combo timer decay
    if (this.comboTimer > 0) {
      this.comboTimer -= dt;
      if (this.comboTimer <= 0) {
        this.comboTimer = 0;
        this.combo = 1.0;
        if (window.uiManager) window.uiManager.onComboDrop();
      }
    }

    // Calculate current effective step interval (Ice berry slows movement by 40%)
    let currentInterval = this.tickInterval;
    if (this.activePowerups['ice']) {
      currentInterval *= 1.45;
    }

    // Snake Step Timing
    this.timeSinceLastTick += dt;
    if (this.timeSinceLastTick >= currentInterval) {
      this.timeSinceLastTick = 0;
      this.step();
    }

    // Generate Tail Glow VFX
    if (this.snake.length > 0 && Math.random() < 0.3) {
      const tail = this.snake[this.snake.length - 1];
      window.particleSystem.createTailSpark(
        (tail.x + 0.5) * this.cellSize,
        (tail.y + 0.5) * this.cellSize
      );
    }
  }

  /**
   * Game Over Trigger
   */
  triggerGameOver(reason = '') {
    this.isRunning = false;
    this.isGameOver = true;

    window.soundEngine.playGameOver();

    // Trigger Screen Shake
    const wrapper = document.getElementById('canvas-wrapper');
    if (wrapper && window.uiManager?.settings.screenShake) {
      wrapper.classList.remove('screen-shake');
      void wrapper.offsetWidth; // trigger reflow
      wrapper.classList.add('screen-shake');
    }

    if (window.uiManager) {
      window.uiManager.showGameOver(reason);
    }
  }

  /**
   * Canvas Rendering Engine
   */
  render() {
    const ctx = this.ctx;
    const cs = this.cellSize;
    const width = this.displaySize;
    const height = this.displaySize;

    // Clear Canvas
    ctx.clearRect(0, 0, width, height);

    // 1. Draw Subtle Grid Pattern
    ctx.save();
    ctx.strokeStyle = getComputedStyle(document.body).getPropertyValue('--canvas-grid') || 'rgba(255,255,255,0.04)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (let x = 0; x <= this.gridSize; x++) {
      ctx.moveTo(x * cs, 0);
      ctx.lineTo(x * cs, height);
    }
    for (let y = 0; y <= this.gridSize; y++) {
      ctx.moveTo(0, y * cs);
      ctx.lineTo(width, y * cs);
    }
    ctx.stroke();
    ctx.restore();

    // 2. Draw Food Entity with pulsating aura
    this.renderFood(ctx, cs);

    // 3. Draw Active Board Power-up Entity (if spawned)
    if (this.powerup) {
      this.renderPowerupEntity(ctx, cs);
    }

    // 4. Draw Snake Body & Head
    this.renderSnake(ctx, cs);

    // 5. Draw Particle VFX & Floating Texts
    window.particleSystem.render(ctx);
  }

  /**
   * Renders the pulsating Food Apple
   */
  renderFood(ctx, cs) {
    const fx = (this.food.x + 0.5) * cs;
    const fy = (this.food.y + 0.5) * cs;
    const radius = (cs / 2) * 0.72;
    const pulse = 1 + Math.sin(this.animTime * 6) * 0.08;

    ctx.save();
    ctx.translate(fx, fy);
    ctx.scale(pulse, pulse);

    // Glow aura
    ctx.shadowColor = '#ff3366';
    ctx.shadowBlur = 12;
    ctx.fillStyle = '#ff3366';

    // Apple circle
    ctx.beginPath();
    ctx.arc(0, 0, radius, 0, Math.PI * 2);
    ctx.fill();

    // Leaf / Stem
    ctx.fillStyle = '#00ff88';
    ctx.shadowBlur = 0;
    ctx.beginPath();
    ctx.arc(radius * 0.2, -radius * 0.9, radius * 0.35, 0, Math.PI);
    ctx.fill();

    ctx.restore();
  }

  /**
   * Renders special board power-up with rotating orbital ring
   */
  renderPowerupEntity(ctx, cs) {
    const px = (this.powerup.x + 0.5) * cs;
    const py = (this.powerup.y + 0.5) * cs;
    const radius = (cs / 2) * 0.8;
    const pType = this.powerup.type;

    ctx.save();
    ctx.translate(px, py);

    // Outer Rotating Neon Orbit Ring
    ctx.rotate(this.animTime * 2.5);
    ctx.strokeStyle = pType.color;
    ctx.shadowColor = pType.glow;
    ctx.shadowBlur = 14;
    ctx.lineWidth = 2.5;
    ctx.setLineDash([4, 4]);
    ctx.beginPath();
    ctx.arc(0, 0, radius * 1.15, 0, Math.PI * 2);
    ctx.stroke();

    // Power-up Icon representation
    ctx.rotate(-this.animTime * 2.5); // restore rotation for text
    ctx.font = `${Math.round(cs * 0.65)}px sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(pType.icon, 0, 1);

    ctx.restore();
  }

  /**
   * Renders the complete snake with expressive eyes, tongue & neon glow
   */
  renderSnake(ctx, cs) {
    if (this.snake.length === 0) return;

    const isGhostActive = Boolean(this.activePowerups['ghost']);
    const isGoldenActive = Boolean(this.activePowerups['golden']);
    const isIceActive = Boolean(this.activePowerups['ice']);

    // Theme CSS colors
    const computed = getComputedStyle(document.body);
    const headColor = isGoldenActive ? '#ffd000' : isGhostActive ? '#d946ef' : (computed.getPropertyValue('--snake-head').trim() || '#00ff88');
    const bodyColor = isIceActive ? '#00f3ff' : (computed.getPropertyValue('--snake-body').trim() || '#00f3ff');
    const tailColor = computed.getPropertyValue('--snake-tail').trim() || '#0284c7';
    const glowColor = computed.getPropertyValue('--snake-glow').trim() || 'rgba(0,255,136,0.5)';

    ctx.save();
    if (isGhostActive) {
      ctx.globalAlpha = 0.65;
    }

    // 1. Draw Body Segments (Connected Smooth Capsule Curves)
    for (let i = this.snake.length - 1; i >= 1; i--) {
      const seg = this.snake[i];
      const prevSeg = this.snake[i - 1];

      const x1 = (seg.x + 0.5) * cs;
      const y1 = (seg.y + 0.5) * cs;
      const x2 = (prevSeg.x + 0.5) * cs;
      const y2 = (prevSeg.y + 0.5) * cs;

      // Color gradient from head to tail
      const progress = i / this.snake.length;
      ctx.strokeStyle = progress > 0.6 ? tailColor : bodyColor;
      ctx.lineWidth = cs * 0.78 * (1 - progress * 0.2); // slight taper towards tail
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';

      // Skip drawing connection line if wrapping across border
      const dx = Math.abs(seg.x - prevSeg.x);
      const dy = Math.abs(seg.y - prevSeg.y);
      if (dx <= 1 && dy <= 1) {
        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.lineTo(x2, y2);
        ctx.stroke();
      }

      // Draw segment bulb
      ctx.fillStyle = ctx.strokeStyle;
      ctx.beginPath();
      ctx.arc(x1, y1, (cs * 0.38) * (1 - progress * 0.15), 0, Math.PI * 2);
      ctx.fill();
    }

    // 2. Draw Snake Head
    const head = this.snake[0];
    const hx = (head.x + 0.5) * cs;
    const hy = (head.y + 0.5) * cs;
    const headRadius = cs * 0.44;

    ctx.save();
    ctx.translate(hx, hy);

    // Rotate head towards movement direction
    let angle = 0;
    if (this.direction.x === 1) angle = 0;
    else if (this.direction.x === -1) angle = Math.PI;
    else if (this.direction.y === 1) angle = Math.PI / 2;
    else if (this.direction.y === -1) angle = -Math.PI / 2;
    ctx.rotate(angle);

    // Glowing Aura for Head
    ctx.shadowColor = headColor;
    ctx.shadowBlur = 14;
    ctx.fillStyle = headColor;

    // Head Oval
    ctx.beginPath();
    ctx.ellipse(0, 0, headRadius, headRadius * 0.85, 0, 0, Math.PI * 2);
    ctx.fill();

    // 3. Expressive Eyes
    ctx.shadowBlur = 0;
    const eyeOffsetX = headRadius * 0.28;
    const eyeOffsetY = headRadius * 0.45;
    const eyeRadius = headRadius * 0.3;
    const pupilRadius = eyeRadius * 0.5;

    // White eye sockets
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(eyeOffsetX, -eyeOffsetY, eyeRadius, 0, Math.PI * 2);
    ctx.arc(eyeOffsetX, eyeOffsetY, eyeRadius, 0, Math.PI * 2);
    ctx.fill();

    // Black Pupils looking forward
    ctx.fillStyle = '#080c14';
    ctx.beginPath();
    ctx.arc(eyeOffsetX + pupilRadius * 0.6, -eyeOffsetY, pupilRadius, 0, Math.PI * 2);
    ctx.arc(eyeOffsetX + pupilRadius * 0.6, eyeOffsetY, pupilRadius, 0, Math.PI * 2);
    ctx.fill();

    // 4. Flicking Tongue Animation
    const tongueFlick = Math.sin(this.animTime * 12);
    if (tongueFlick > 0.3) {
      ctx.fillStyle = '#ff0055';
      ctx.beginPath();
      ctx.moveTo(headRadius * 0.9, 0);
      ctx.lineTo(headRadius * 1.5, 0);
      // Fork
      ctx.lineTo(headRadius * 1.7, -headRadius * 0.2);
      ctx.moveTo(headRadius * 1.5, 0);
      ctx.lineTo(headRadius * 1.7, headRadius * 0.2);
      ctx.strokeStyle = '#ff0055';
      ctx.lineWidth = 1.5;
      ctx.stroke();
    }

    ctx.restore();
    ctx.restore();
  }
}

// Attach to window
window.SnakeGame = SnakeGame;
