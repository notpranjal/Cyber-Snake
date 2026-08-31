/**
 * Main Application Entry Point & Input Orchestrator for Cyber Snake
 * Manages game loop, keyboard mapping, touch swipes, and virtual arcade d-pad.
 */

window.addEventListener('DOMContentLoaded', () => {
  const canvas = document.getElementById('game-canvas');
  if (!canvas) return;

  // Initialize Game Instance
  const game = new SnakeGame(canvas);
  window.game = game;

  // Sync initial settings from UI Manager
  if (window.uiManager) {
    game.setSpeedPreset(window.uiManager.settings.speed);
    game.setGridSize(window.uiManager.settings.gridSize);
    game.setWallCollisions(window.uiManager.settings.wallCollisions);
    window.uiManager.updateHUD();
  }

  // ----------------------------------------------------
  // 1. KEYBOARD INPUT HANDLING
  // ----------------------------------------------------
  window.addEventListener('keydown', (e) => {
    // Prevent default scroll behavior on arrow and space keys
    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', ' ', 'Spacebar'].includes(e.key)) {
      e.preventDefault();
    }

    // Modal / Start Screen Shortcuts
    const startModal = document.getElementById('modal-start');
    const gameOverModal = document.getElementById('modal-gameover');
    const pauseModal = document.getElementById('modal-pause');

    if (e.key === ' ' || e.key === 'Spacebar') {
      if (startModal && startModal.classList.contains('active')) {
        window.uiManager.startCountdownAndPlay();
        return;
      }
      if (gameOverModal && gameOverModal.classList.contains('active')) {
        window.uiManager.startCountdownAndPlay();
        return;
      }
      if (game.isRunning && !game.isGameOver) {
        window.uiManager.togglePause();
        return;
      }
    }

    if (e.key === 'Enter') {
      if (gameOverModal && gameOverModal.classList.contains('active')) {
        window.uiManager.startCountdownAndPlay();
        return;
      }
    }

    // Quick Restart (R)
    if (e.key === 'r' || e.key === 'R') {
      if (game.isRunning || game.isGameOver) {
        window.uiManager.startCountdownAndPlay();
        return;
      }
    }

    // Quick Mute (M)
    if (e.key === 'm' || e.key === 'M') {
      if (window.uiManager) {
        window.uiManager.soundToggleBtn.click();
        return;
      }
    }

    // Pause Toggle (Escape or P)
    if (e.key === 'Escape' || e.key === 'p' || e.key === 'P') {
      if (game.isRunning && !game.isGameOver) {
        window.uiManager.togglePause();
        return;
      }
    }

    // Directional Controls (WASD for P1, Arrow Keys for P2 in Multiplayer)
    if (game.mode === 'multiplayer') {
      // Player 1 (WASD)
      switch (e.key) {
        case 'w':
        case 'W':
          game.changeDirectionP1({ x: 0, y: -1 });
          highlightDpad('dpad-up');
          break;
        case 's':
        case 'S':
          game.changeDirectionP1({ x: 0, y: 1 });
          highlightDpad('dpad-down');
          break;
        case 'a':
        case 'A':
          game.changeDirectionP1({ x: -1, y: 0 });
          highlightDpad('dpad-left');
          break;
        case 'd':
        case 'D':
          game.changeDirectionP1({ x: 1, y: 0 });
          highlightDpad('dpad-right');
          break;
      }

      // Player 2 (Arrow Keys)
      switch (e.key) {
        case 'ArrowUp':
          game.changeDirectionP2({ x: 0, y: -1 });
          break;
        case 'ArrowDown':
          game.changeDirectionP2({ x: 0, y: 1 });
          break;
        case 'ArrowLeft':
          game.changeDirectionP2({ x: -1, y: 0 });
          break;
        case 'ArrowRight':
          game.changeDirectionP2({ x: 1, y: 0 });
          break;
      }
    } else {
      // Single Player Mode (Both WASD & Arrow Keys steer the snake)
      switch (e.key) {
        case 'ArrowUp':
        case 'w':
        case 'W':
          game.changeDirection({ x: 0, y: -1 });
          highlightDpad('dpad-up');
          break;
        case 'ArrowDown':
        case 's':
        case 'S':
          game.changeDirection({ x: 0, y: 1 });
          highlightDpad('dpad-down');
          break;
        case 'ArrowLeft':
        case 'a':
        case 'A':
          game.changeDirection({ x: -1, y: 0 });
          highlightDpad('dpad-left');
          break;
        case 'ArrowRight':
        case 'd':
        case 'D':
          game.changeDirection({ x: 1, y: 0 });
          highlightDpad('dpad-right');
          break;
      }
    }
  });

  function highlightDpad(id) {
    const btn = document.getElementById(id);
    if (!btn) return;
    btn.classList.add('pressed');
    setTimeout(() => btn.classList.remove('pressed'), 120);
  }

  // ----------------------------------------------------
  // 2. VIRTUAL TOUCH D-PAD CONTROLS
  // ----------------------------------------------------
  const dpadUp = document.getElementById('dpad-up');
  const dpadDown = document.getElementById('dpad-down');
  const dpadLeft = document.getElementById('dpad-left');
  const dpadRight = document.getElementById('dpad-right');

  const setupDpadButton = (btn, dir) => {
    if (!btn) return;
    const trigger = (e) => {
      e.preventDefault();
      game.changeDirection(dir);
      btn.classList.add('pressed');
      if (window.navigator.vibrate) window.navigator.vibrate(15);
    };
    const release = () => {
      btn.classList.remove('pressed');
    };

    btn.addEventListener('touchstart', trigger, { passive: false });
    btn.addEventListener('touchend', release);
    btn.addEventListener('mousedown', trigger);
    btn.addEventListener('mouseup', release);
  };

  setupDpadButton(dpadUp, { x: 0, y: -1 });
  setupDpadButton(dpadDown, { x: 0, y: 1 });
  setupDpadButton(dpadLeft, { x: -1, y: 0 });
  setupDpadButton(dpadRight, { x: 1, y: 0 });

  // ----------------------------------------------------
  // 3. TOUCH SCREEN SWIPE GESTURES
  // ----------------------------------------------------
  let touchStartX = 0;
  let touchStartY = 0;
  const minSwipeDistance = 25; // px

  const canvasWrapper = document.getElementById('canvas-wrapper');
  if (canvasWrapper) {
    canvasWrapper.addEventListener('touchstart', (e) => {
      if (e.touches.length === 1) {
        touchStartX = e.touches[0].clientX;
        touchStartY = e.touches[0].clientY;
      }
    }, { passive: true });

    canvasWrapper.addEventListener('touchmove', (e) => {
      // Prevent screen scrolling when swiping on the canvas area
      if (game.isRunning && !game.isPaused) {
        e.preventDefault();
      }
    }, { passive: false });

    canvasWrapper.addEventListener('touchend', (e) => {
      if (e.changedTouches.length === 1) {
        const touchEndX = e.changedTouches[0].clientX;
        const touchEndY = e.changedTouches[0].clientY;

        const diffX = touchEndX - touchStartX;
        const diffY = touchEndY - touchStartY;
        const absX = Math.abs(diffX);
        const absY = Math.abs(diffY);

        if (Math.max(absX, absY) > minSwipeDistance) {
          if (absX > absY) {
            // Horizontal swipe
            if (diffX > 0) game.changeDirection({ x: 1, y: 0 });
            else game.changeDirection({ x: -1, y: 0 });
          } else {
            // Vertical swipe
            if (diffY > 0) game.changeDirection({ x: 0, y: 1 });
            else game.changeDirection({ x: 0, y: -1 });
          }
          if (window.navigator.vibrate) window.navigator.vibrate(15);
        }
      }
    }, { passive: true });
  }

  // ----------------------------------------------------
  // 4. RESIZE & ORIENTATION HANDLER
  // ----------------------------------------------------
  window.addEventListener('resize', () => {
    game.resizeCanvas();
  });

  // ----------------------------------------------------
  // 5. MASTER GAME LOOP (requestAnimationFrame)
  // ----------------------------------------------------
  let lastTimestamp = performance.now();

  function gameLoop(timestamp) {
    const dt = Math.min((timestamp - lastTimestamp) / 1000, 0.1); // Clamp max delta time
    lastTimestamp = timestamp;

    // Update Particles
    window.particleSystem.update(dt);

    // Update Game Physics & Timers
    game.update(dt);

    // Render Canvas
    game.render();

    // Request next frame
    requestAnimationFrame(gameLoop);
  }

  // Start Animation Loop
  requestAnimationFrame(gameLoop);
});
