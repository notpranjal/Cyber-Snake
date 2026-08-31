/**
 * Core Game Engine for Cyber Snake (Single Player & 2-Player Versus)
 * Handles physics, snake bodies, multiplayer collisions, power-ups, and revives.
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
    this.gridSize = 20;
    this.wallCollisions = true;
    this.speedPreset = 'normal';
    this.mode = 'classic'; // 'classic', 'arcade', 'frenzy', 'multiplayer'

    // Gameplay States
    this.isRunning = false;
    this.isPaused = false;
    this.isGameOver = false;
    this.winner = null; // null, 'p1', 'p2', 'tie'

    // Single Player Snake (P1)
    this.snake = [];
    this.direction = { x: 1, y: 0 };
    this.directionQueue = [];
    this.growPending = 0;
    this.score = 0;
    this.applesEaten = 0;
    this.combo = 1.0;
    this.comboTimer = 0;
    this.maxComboTimer = 3.2;
    this.maxComboReached = 1.0;
    this.activePowerups = {};
    this.revivesLeft = 3;
    this.isInvulnerable = false;
    this.invulnerabilityTimer = 0;

    // Multiplayer Snake 2 (P2)
    this.snake2 = [];
    this.direction2 = { x: -1, y: 0 };
    this.directionQueue2 = [];
    this.growPending2 = 0;
    this.score2 = 0;
    this.applesEaten2 = 0;
    this.revivesLeft2 = 3;
    this.isInvulnerable2 = false;
    this.invulnerabilityTimer2 = 0;
    this.activePowerups2 = {};

    // Items
    this.food = { x: 5, y: 5, type: 'regular' };
    this.food2 = { x: 14, y: 14, type: 'regular' }; // 2nd food for 2-player mode
    this.powerup = null;

    // Timing & Stats
    this.timeSurvived = 0;
    this.frenzyTimeRemaining = 60;
    this.tickInterval = 0.12;
    this.timeSinceLastTick = 0;
    this.animTime = 0;

    this.resizeCanvas();
  }

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
    const isMulti = (this.mode === 'multiplayer');

    if (isMulti) {
      // 2-Player: P1 on left facing right, P2 on right facing left
      const offset = Math.min(4, Math.floor(this.gridSize / 4));
      this.snake = [
        { x: mid - offset, y: mid },
        { x: mid - offset - 1, y: mid },
        { x: mid - offset - 2, y: mid }
      ];
      this.direction = { x: 1, y: 0 };
      this.directionQueue = [];

      this.snake2 = [
        { x: mid + offset, y: mid },
        { x: mid + offset + 1, y: mid },
        { x: mid + offset + 2, y: mid }
      ];
      this.direction2 = { x: -1, y: 0 };
      this.directionQueue2 = [];

      this.score2 = 0;
      this.applesEaten2 = 0;
      this.growPending2 = 0;
      this.revivesLeft2 = 3;
      this.isInvulnerable2 = false;
      this.invulnerabilityTimer2 = 0;
      this.activePowerups2 = {};
    } else {
      // Single Player Centered
      this.snake = [
        { x: mid, y: mid },
        { x: mid - 1, y: mid },
        { x: mid - 2, y: mid }
      ];
      this.direction = { x: 1, y: 0 };
      this.directionQueue = [];
      this.snake2 = [];
    }

    this.score = 0;
    this.applesEaten = 0;
    this.growPending = 0;
    this.combo = 1.0;
    this.comboTimer = 0;
    this.maxComboReached = 1.0;
    this.timeSurvived = 0;
    this.frenzyTimeRemaining = 60;
    this.revivesLeft = 3;
    this.isInvulnerable = false;
    this.invulnerabilityTimer = 0;
    this.activePowerups = {};
    this.powerup = null;
    this.winner = null;

    this.isRunning = true;
    this.isPaused = false;
    this.isGameOver = false;
    this.timeSinceLastTick = 0;

    this.spawnFood();
    if (isMulti) {
      this.spawnFood2();
    }
  }

  /**
   * Direction Controls for Player 1
   */
  changeDirectionP1(newDir) {
    if (!this.isRunning || this.isPaused || this.isGameOver) return;
    const lastDir = this.directionQueue.length > 0
      ? this.directionQueue[this.directionQueue.length - 1]
      : this.direction;

    if (newDir.x === -lastDir.x && newDir.y === -lastDir.y) return;
    if (newDir.x === lastDir.x && newDir.y === lastDir.y) return;

    if (this.directionQueue.length < 3) {
      this.directionQueue.push(newDir);
    }
  }

  /**
   * Direction Controls for Player 2
   */
  changeDirectionP2(newDir) {
    if (!this.isRunning || this.isPaused || this.isGameOver || this.mode !== 'multiplayer') return;
    const lastDir = this.directionQueue2.length > 0
      ? this.directionQueue2[this.directionQueue2.length - 1]
      : this.direction2;

    if (newDir.x === -lastDir.x && newDir.y === -lastDir.y) return;
    if (newDir.x === lastDir.x && newDir.y === lastDir.y) return;

    if (this.directionQueue2.length < 3) {
      this.directionQueue2.push(newDir);
    }
  }

  // Alias for backward compatibility in single player
  changeDirection(newDir) {
    this.changeDirectionP1(newDir);
  }

  /**
   * Spawns primary food item
   */
  spawnFood() {
    const emptyCells = this.getEmptyCells();
    if (emptyCells.length === 0) return;

    const randomCell = emptyCells[Math.floor(Math.random() * emptyCells.length)];
    this.food = {
      x: randomCell.x,
      y: randomCell.y,
      type: 'regular'
    };

    if (this.mode === 'arcade' && !this.powerup && Math.random() < 0.35 && this.applesEaten > 2) {
      this.spawnPowerup(emptyCells);
    }
  }

  /**
   * Spawns secondary food item for 2-Player mode
   */
  spawnFood2() {
    const emptyCells = this.getEmptyCells().filter(c => c.x !== this.food.x || c.y !== this.food.y);
    if (emptyCells.length === 0) return;

    const randomCell = emptyCells[Math.floor(Math.random() * emptyCells.length)];
    this.food2 = {
      x: randomCell.x,
      y: randomCell.y,
      type: 'regular'
    };
  }

  getEmptyCells() {
    const emptyCells = [];
    for (let x = 0; x < this.gridSize; x++) {
      for (let y = 0; y < this.gridSize; y++) {
        const inSnake1 = this.snake.some(s => s.x === x && s.y === y);
        const inSnake2 = this.snake2.some(s => s.x === x && s.y === y);
        const isPowerup = this.powerup && this.powerup.x === x && this.powerup.y === y;
        if (!inSnake1 && !inSnake2 && !isPowerup) {
          emptyCells.push({ x, y });
        }
      }
    }
    return emptyCells;
  }

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
      life: 12
    };
  }

  /**
   * Main Physics Tick Step
   */
  step() {
    if (!this.isRunning || this.isPaused || this.isGameOver) return;

    if (this.mode === 'multiplayer') {
      this.stepMultiplayer();
    } else {
      this.stepSinglePlayer();
    }
  }

  /**
   * Single Player Step Logic
   */
  stepSinglePlayer() {
    if (this.directionQueue.length > 0) {
      this.direction = this.directionQueue.shift();
    }

    const head = this.snake[0];
    let newX = head.x + this.direction.x;
    let newY = head.y + this.direction.y;

    const isGhostActive = Boolean(this.activePowerups['ghost']);
    const isProtected = isGhostActive || this.isInvulnerable;

    // Wall Collision / Wrap
    if (!this.wallCollisions || isProtected) {
      if (newX < 0) newX = this.gridSize - 1;
      else if (newX >= this.gridSize) newX = 0;

      if (newY < 0) newY = this.gridSize - 1;
      else if (newY >= this.gridSize) newY = 0;
    } else {
      if (newX < 0 || newX >= this.gridSize || newY < 0 || newY >= this.gridSize) {
        this.handleFatalCollision('Hit the wall boundary!');
        return;
      }
    }

    // Tail Collision
    if (!isProtected) {
      for (let i = 0; i < this.snake.length - 1; i++) {
        if (this.snake[i].x === newX && this.snake[i].y === newY) {
          this.handleFatalCollision('Ran into your own tail!');
          return;
        }
      }
    }

    const newHead = { x: newX, y: newY };
    this.snake.unshift(newHead);

    if (newX === this.food.x && newY === this.food.y) {
      this.handleEatFood(1);
    } else if (this.growPending > 0) {
      this.growPending--;
    } else {
      this.snake.pop();
    }

    if (this.powerup && newX === this.powerup.x && newY === this.powerup.y) {
      this.handleEatPowerup(1);
    }
  }

  /**
   * 2-Player Versus Step Logic
   */
  stepMultiplayer() {
    // Process queued inputs
    if (this.directionQueue.length > 0) this.direction = this.directionQueue.shift();
    if (this.directionQueue2.length > 0) this.direction2 = this.directionQueue2.shift();

    const head1 = this.snake[0];
    const head2 = this.snake2[0];

    let nx1 = head1.x + this.direction.x;
    let ny1 = head1.y + this.direction.y;
    let nx2 = head2.x + this.direction2.x;
    let ny2 = head2.y + this.direction2.y;

    const p1Protected = this.isInvulnerable || Boolean(this.activePowerups['ghost']);
    const p2Protected = this.isInvulnerable2 || Boolean(this.activePowerups2['ghost']);

    // P1 Wall Collision
    let p1Crashed = false;
    let p2Crashed = false;
    let p1Reason = '';
    let p2Reason = '';

    if (!this.wallCollisions || p1Protected) {
      if (nx1 < 0) nx1 = this.gridSize - 1;
      else if (nx1 >= this.gridSize) nx1 = 0;
      if (ny1 < 0) ny1 = this.gridSize - 1;
      else if (ny1 >= this.gridSize) ny1 = 0;
    } else if (nx1 < 0 || nx1 >= this.gridSize || ny1 < 0 || ny1 >= this.gridSize) {
      p1Crashed = true;
      p1Reason = 'P1 hit wall!';
    }

    // P2 Wall Collision
    if (!this.wallCollisions || p2Protected) {
      if (nx2 < 0) nx2 = this.gridSize - 1;
      else if (nx2 >= this.gridSize) nx2 = 0;
      if (ny2 < 0) ny2 = this.gridSize - 1;
      else if (ny2 >= this.gridSize) ny2 = 0;
    } else if (nx2 < 0 || nx2 >= this.gridSize || ny2 < 0 || ny2 >= this.gridSize) {
      p2Crashed = true;
      p2Reason = 'P2 hit wall!';
    }

    // Self & Cross Body Collisions
    if (!p1Protected && !p1Crashed) {
      // P1 vs P1 tail
      for (let i = 0; i < this.snake.length - 1; i++) {
        if (this.snake[i].x === nx1 && this.snake[i].y === ny1) {
          p1Crashed = true;
          p1Reason = 'P1 hit own tail!';
        }
      }
      // P1 vs P2 body
      for (let i = 0; i < this.snake2.length; i++) {
        if (this.snake2[i].x === nx1 && this.snake2[i].y === ny1) {
          p1Crashed = true;
          p1Reason = 'P1 ran into P2!';
        }
      }
    }

    if (!p2Protected && !p2Crashed) {
      // P2 vs P2 tail
      for (let i = 0; i < this.snake2.length - 1; i++) {
        if (this.snake2[i].x === nx2 && this.snake2[i].y === ny2) {
          p2Crashed = true;
          p2Reason = 'P2 hit own tail!';
        }
      }
      // P2 vs P1 body
      for (let i = 0; i < this.snake.length; i++) {
        if (this.snake[i].x === nx2 && this.snake[i].y === ny2) {
          p2Crashed = true;
          p2Reason = 'P2 ran into P1!';
        }
      }
    }

    // Head to head collision
    if (nx1 === nx2 && ny1 === ny2 && !p1Protected && !p2Protected) {
      p1Crashed = true;
      p2Crashed = true;
      p1Reason = 'Head-on collision!';
      p2Reason = 'Head-on collision!';
    }

    // Handle Crash Resolutions
    if (p1Crashed && p2Crashed) {
      this.handleFatalCollisionP1(p1Reason);
      this.handleFatalCollisionP2(p2Reason);
      if (this.isGameOver) return;
    } else if (p1Crashed) {
      this.handleFatalCollisionP1(p1Reason);
      if (this.isGameOver) return;
    } else if (p2Crashed) {
      this.handleFatalCollisionP2(p2Reason);
      if (this.isGameOver) return;
    }

    // Advance P1
    if (!p1Crashed || this.isInvulnerable) {
      this.snake.unshift({ x: nx1, y: ny1 });
      if (this.checkFoodEaten(nx1, ny1, 1)) {
        // Ate food
      } else if (this.growPending > 0) {
        this.growPending--;
      } else {
        this.snake.pop();
      }
    }

    // Advance P2
    if (!p2Crashed || this.isInvulnerable2) {
      this.snake2.unshift({ x: nx2, y: ny2 });
      if (this.checkFoodEaten(nx2, ny2, 2)) {
        // Ate food
      } else if (this.growPending2 > 0) {
        this.growPending2--;
      } else {
        this.snake2.pop();
      }
    }
  }

  checkFoodEaten(x, y, playerNum) {
    let eaten = false;
    // Food 1
    if (x === this.food.x && y === this.food.y) {
      this.handleEatFood(playerNum, this.food);
      this.spawnFood();
      eaten = true;
    }
    // Food 2
    if (x === this.food2.x && y === this.food2.y) {
      this.handleEatFood(playerNum, this.food2);
      this.spawnFood2();
      eaten = true;
    }
    return eaten;
  }

  /**
   * Food consumption handler for Single or Multiplayer
   */
  handleEatFood(playerNum = 1, foodObj = this.food) {
    if (playerNum === 1) {
      this.applesEaten++;
      this.growPending += 1;
      this.score += 10;
      window.soundEngine.playEat(2);
      const worldX = (foodObj.x + 0.5) * this.cellSize;
      const worldY = (foodObj.y + 0.5) * this.cellSize;
      window.particleSystem.createFoodExplosion(worldX, worldY, '#00f3ff', 16);
      window.particleSystem.addFloatingText('+10 (P1)', worldX, worldY - 10, '#00f3ff', 13);
    } else {
      this.applesEaten2++;
      this.growPending2 += 1;
      this.score2 += 10;
      window.soundEngine.playEat(4);
      const worldX = (foodObj.x + 0.5) * this.cellSize;
      const worldY = (foodObj.y + 0.5) * this.cellSize;
      window.particleSystem.createFoodExplosion(worldX, worldY, '#ff007f', 16);
      window.particleSystem.addFloatingText('+10 (P2)', worldX, worldY - 10, '#ff007f', 13);
    }

    if (this.mode !== 'multiplayer') {
      this.comboTimer = this.maxComboTimer;
      if (this.activePowerups['star']) this.combo = 4.0;
      else this.combo = Math.min(4.0, Number((this.combo + 0.3).toFixed(1)));
      if (this.combo > this.maxComboReached) this.maxComboReached = this.combo;
      if (this.mode === 'frenzy') this.frenzyTimeRemaining = Math.min(60, this.frenzyTimeRemaining + 3);
    }

    if (window.uiManager) {
      window.uiManager.updateHUD();
      window.uiManager.checkAchievements();
    }
  }

  handleEatPowerup(playerNum = 1) {
    const p = this.powerup;
    if (!p) return;
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
   * P1 Revive / Fatal Collision handler
   */
  handleFatalCollisionP1(reason = '') {
    if (this.revivesLeft > 0) {
      this.revivesLeft--;
      this.triggerReviveP1();
    } else {
      if (this.mode === 'multiplayer') {
        this.winner = 'p2';
        this.triggerGameOver('Player 2 Wins!');
      } else {
        this.triggerGameOver(reason);
      }
    }
  }

  /**
   * P2 Revive / Fatal Collision handler
   */
  handleFatalCollisionP2(reason = '') {
    if (this.revivesLeft2 > 0) {
      this.revivesLeft2--;
      this.triggerReviveP2();
    } else {
      this.winner = 'p1';
      this.triggerGameOver('Player 1 Wins!');
    }
  }

  handleFatalCollision(reason = '') {
    this.handleFatalCollisionP1(reason);
  }

  triggerReviveP1() {
    this.isInvulnerable = true;
    this.invulnerabilityTimer = 3.0;
    window.soundEngine.playLifeLost();
    setTimeout(() => window.soundEngine.playRevive(), 150);

    const head = this.snake[0] || { x: 5, y: 5 };
    const wx = (head.x + 0.5) * this.cellSize;
    const wy = (head.y + 0.5) * this.cellSize;
    window.particleSystem.createFoodExplosion(wx, wy, '#00f3ff', 24);
    window.particleSystem.addFloatingText(`P1 REVIVED! (${this.revivesLeft} Left)`, wx, wy - 20, '#00f3ff', 14);

    if (window.uiManager) window.uiManager.updateHUD();
  }

  triggerReviveP2() {
    this.isInvulnerable2 = true;
    this.invulnerabilityTimer2 = 3.0;
    window.soundEngine.playLifeLost();
    setTimeout(() => window.soundEngine.playRevive(), 150);

    const head = this.snake2[0] || { x: 15, y: 15 };
    const wx = (head.x + 0.5) * this.cellSize;
    const wy = (head.y + 0.5) * this.cellSize;
    window.particleSystem.createFoodExplosion(wx, wy, '#ff007f', 24);
    window.particleSystem.addFloatingText(`P2 REVIVED! (${this.revivesLeft2} Left)`, wx, wy - 20, '#ff007f', 14);

    if (window.uiManager) window.uiManager.updateHUD();
  }

  /**
   * Main delta time update loop
   */
  update(dt) {
    if (!this.isRunning || this.isPaused || this.isGameOver) return;

    this.timeSurvived += dt;
    this.animTime += dt;

    if (this.mode === 'frenzy') {
      this.frenzyTimeRemaining -= dt;
      if (this.frenzyTimeRemaining <= 0) {
        this.frenzyTimeRemaining = 0;
        this.triggerGameOver("Time's up!");
        return;
      }
    }

    if (this.isInvulnerable) {
      this.invulnerabilityTimer -= dt;
      if (this.invulnerabilityTimer <= 0) {
        this.isInvulnerable = false;
        this.invulnerabilityTimer = 0;
      }
    }

    if (this.isInvulnerable2) {
      this.invulnerabilityTimer2 -= dt;
      if (this.invulnerabilityTimer2 <= 0) {
        this.isInvulnerable2 = false;
        this.invulnerabilityTimer2 = 0;
      }
    }

    if (this.comboTimer > 0) {
      this.comboTimer -= dt;
      if (this.comboTimer <= 0) {
        this.comboTimer = 0;
        this.combo = 1.0;
        if (window.uiManager) window.uiManager.onComboDrop();
      }
    }

    // Step Timing
    this.timeSinceLastTick += dt;
    if (this.timeSinceLastTick >= this.tickInterval) {
      this.timeSinceLastTick = 0;
      this.step();
    }
  }

  triggerGameOver(reason = '') {
    this.isRunning = false;
    this.isGameOver = true;
    window.soundEngine.playGameOver();

    const wrapper = document.getElementById('canvas-wrapper');
    if (wrapper && window.uiManager?.settings.screenShake) {
      wrapper.classList.remove('screen-shake');
      void wrapper.offsetWidth;
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

    ctx.clearRect(0, 0, width, height);

    // 1. Grid
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

    // 2. Foods
    this.renderFood(ctx, cs, this.food, '#ff3366');
    if (this.mode === 'multiplayer') {
      this.renderFood(ctx, cs, this.food2, '#ffd000');
    }

    // 3. Board Power-Up
    if (this.powerup) {
      this.renderPowerupEntity(ctx, cs);
    }

    // 4. Snakes
    if (this.mode === 'multiplayer') {
      // P1 (Cyan / Green)
      this.renderSnakeEntity(ctx, cs, this.snake, this.direction, {
        head: '#00ff88',
        body: '#00f3ff',
        tail: '#0284c7',
        glow: 'rgba(0, 243, 255, 0.6)'
      }, this.isInvulnerable);

      // P2 (Magenta / Orange)
      this.renderSnakeEntity(ctx, cs, this.snake2, this.direction2, {
        head: '#ff7644',
        body: '#ff007f',
        tail: '#7928ca',
        glow: 'rgba(255, 0, 127, 0.6)'
      }, this.isInvulnerable2);
    } else {
      // Single Player Snake (Uses Theme Colors)
      const computed = getComputedStyle(document.body);
      const isGolden = Boolean(this.activePowerups['golden']);
      const isGhost = Boolean(this.activePowerups['ghost']);
      const colors = {
        head: isGolden ? '#ffd000' : isGhost ? '#d946ef' : (computed.getPropertyValue('--snake-head').trim() || '#00ff88'),
        body: (computed.getPropertyValue('--snake-body').trim() || '#00f3ff'),
        tail: (computed.getPropertyValue('--snake-tail').trim() || '#0284c7'),
        glow: (computed.getPropertyValue('--snake-glow').trim() || 'rgba(0,255,136,0.5)')
      };
      this.renderSnakeEntity(ctx, cs, this.snake, this.direction, colors, this.isInvulnerable, isGhost);
    }

    // 5. VFX Particles & Floating text
    window.particleSystem.render(ctx);
  }

  renderFood(ctx, cs, foodItem, color = '#ff3366') {
    if (!foodItem) return;
    const fx = (foodItem.x + 0.5) * cs;
    const fy = (foodItem.y + 0.5) * cs;
    const radius = (cs / 2) * 0.72;
    const pulse = 1 + Math.sin(this.animTime * 6) * 0.08;

    ctx.save();
    ctx.translate(fx, fy);
    ctx.scale(pulse, pulse);

    ctx.shadowColor = color;
    ctx.shadowBlur = 12;
    ctx.fillStyle = color;

    ctx.beginPath();
    ctx.arc(0, 0, radius, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#00ff88';
    ctx.shadowBlur = 0;
    ctx.beginPath();
    ctx.arc(radius * 0.2, -radius * 0.9, radius * 0.35, 0, Math.PI);
    ctx.fill();

    ctx.restore();
  }

  renderPowerupEntity(ctx, cs) {
    const px = (this.powerup.x + 0.5) * cs;
    const py = (this.powerup.y + 0.5) * cs;
    const radius = (cs / 2) * 0.8;
    const pType = this.powerup.type;

    ctx.save();
    ctx.translate(px, py);

    ctx.rotate(this.animTime * 2.5);
    ctx.strokeStyle = pType.color;
    ctx.shadowColor = pType.glow;
    ctx.shadowBlur = 14;
    ctx.lineWidth = 2.5;
    ctx.setLineDash([4, 4]);
    ctx.beginPath();
    ctx.arc(0, 0, radius * 1.15, 0, Math.PI * 2);
    ctx.stroke();

    ctx.rotate(-this.animTime * 2.5);
    ctx.font = `${Math.round(cs * 0.65)}px sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(pType.icon, 0, 1);

    ctx.restore();
  }

  renderSnakeEntity(ctx, cs, snakeArray, dir, colors, isInvuln = false, isGhost = false) {
    if (!snakeArray || snakeArray.length === 0) return;

    ctx.save();
    if (isGhost) {
      ctx.globalAlpha = 0.65;
    } else if (isInvuln) {
      const blink = Math.floor(this.animTime * 14) % 2 === 0;
      ctx.globalAlpha = blink ? 0.35 : 1.0;
    }

    // Body Segments
    for (let i = snakeArray.length - 1; i >= 1; i--) {
      const seg = snakeArray[i];
      const prevSeg = snakeArray[i - 1];

      const x1 = (seg.x + 0.5) * cs;
      const y1 = (seg.y + 0.5) * cs;
      const x2 = (prevSeg.x + 0.5) * cs;
      const y2 = (prevSeg.y + 0.5) * cs;

      const progress = i / snakeArray.length;
      ctx.strokeStyle = progress > 0.6 ? colors.tail : colors.body;
      ctx.lineWidth = cs * 0.78 * (1 - progress * 0.2);
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';

      const dx = Math.abs(seg.x - prevSeg.x);
      const dy = Math.abs(seg.y - prevSeg.y);
      if (dx <= 1 && dy <= 1) {
        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.lineTo(x2, y2);
        ctx.stroke();
      }

      ctx.fillStyle = ctx.strokeStyle;
      ctx.beginPath();
      ctx.arc(x1, y1, (cs * 0.38) * (1 - progress * 0.15), 0, Math.PI * 2);
      ctx.fill();
    }

    // Head
    const head = snakeArray[0];
    const hx = (head.x + 0.5) * cs;
    const hy = (head.y + 0.5) * cs;
    const headRadius = cs * 0.44;

    ctx.save();
    ctx.translate(hx, hy);

    let angle = 0;
    if (dir.x === 1) angle = 0;
    else if (dir.x === -1) angle = Math.PI;
    else if (dir.y === 1) angle = Math.PI / 2;
    else if (dir.y === -1) angle = -Math.PI / 2;
    ctx.rotate(angle);

    ctx.shadowColor = colors.head;
    ctx.shadowBlur = 14;
    ctx.fillStyle = colors.head;

    ctx.beginPath();
    ctx.ellipse(0, 0, headRadius, headRadius * 0.85, 0, 0, Math.PI * 2);
    ctx.fill();

    // Eyes
    ctx.shadowBlur = 0;
    const eyeOffsetX = headRadius * 0.28;
    const eyeOffsetY = headRadius * 0.45;
    const eyeRadius = headRadius * 0.3;
    const pupilRadius = eyeRadius * 0.5;

    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(eyeOffsetX, -eyeOffsetY, eyeRadius, 0, Math.PI * 2);
    ctx.arc(eyeOffsetX, eyeOffsetY, eyeRadius, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#080c14';
    ctx.beginPath();
    ctx.arc(eyeOffsetX + pupilRadius * 0.6, -eyeOffsetY, pupilRadius, 0, Math.PI * 2);
    ctx.arc(eyeOffsetX + pupilRadius * 0.6, eyeOffsetY, pupilRadius, 0, Math.PI * 2);
    ctx.fill();

    // Tongue
    const tongueFlick = Math.sin(this.animTime * 12);
    if (tongueFlick > 0.3) {
      ctx.fillStyle = '#ff0055';
      ctx.beginPath();
      ctx.moveTo(headRadius * 0.9, 0);
      ctx.lineTo(headRadius * 1.5, 0);
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
