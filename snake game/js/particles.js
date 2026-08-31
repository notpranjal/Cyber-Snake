/**
 * Particle and Floating Text VFX System for Cyber Snake
 * Provides visual juice: bursts, confetti, tail glows, and floating damage/score text.
 */
class ParticleSystem {
  constructor() {
    this.particles = [];
    this.floatingTexts = [];
    this.enabled = true;
  }

  setEnabled(val) {
    this.enabled = Boolean(val);
  }

  clear() {
    this.particles = [];
    this.floatingTexts = [];
  }

  /**
   * Explodes colorful particles when food or power-ups are consumed
   */
  createFoodExplosion(x, y, color = '#00ff88', count = 16) {
    if (!this.enabled) return;

    for (let i = 0; i < count; i++) {
      const angle = (Math.PI * 2 * i) / count + (Math.random() - 0.5) * 0.5;
      const speed = Math.random() * 3.5 + 1.5;
      const size = Math.random() * 3.5 + 2;
      const life = Math.random() * 0.35 + 0.35; // seconds

      this.particles.push({
        x: x,
        y: y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        size: size,
        originalSize: size,
        color: color,
        alpha: 1,
        life: life,
        maxLife: life,
        drag: 0.94
      });
    }
  }

  /**
   * Golden star burst for high-value bonuses
   */
  createGoldenExplosion(x, y) {
    if (!this.enabled) return;
    this.createFoodExplosion(x, y, '#ffd000', 24);
    this.createFoodExplosion(x, y, '#ff007f', 12);
  }

  /**
   * Spawns celebration confetti across canvas upon breaking high scores
   */
  createConfetti(width, height, count = 50) {
    if (!this.enabled) return;
    const colors = ['#00f3ff', '#00ff88', '#ff007f', '#ffd000', '#a855f7'];

    for (let i = 0; i < count; i++) {
      this.particles.push({
        x: Math.random() * width,
        y: -10 - Math.random() * 50,
        vx: (Math.random() - 0.5) * 3,
        vy: Math.random() * 3 + 2,
        size: Math.random() * 5 + 3,
        originalSize: 5,
        color: colors[Math.floor(Math.random() * colors.length)],
        alpha: 1,
        life: 2.5,
        maxLife: 2.5,
        drag: 0.99,
        isConfetti: true,
        rotation: Math.random() * Math.PI * 2,
        vRot: (Math.random() - 0.5) * 0.2
      });
    }
  }

  /**
   * Subtle tail glow particle as snake moves
   */
  createTailSpark(x, y, color = '#00f3ff') {
    if (!this.enabled || Math.random() > 0.4) return;

    this.particles.push({
      x: x + (Math.random() - 0.5) * 6,
      y: y + (Math.random() - 0.5) * 6,
      vx: (Math.random() - 0.5) * 0.5,
      vy: (Math.random() - 0.5) * 0.5,
      size: Math.random() * 2 + 1.5,
      originalSize: 2.5,
      color: color,
      alpha: 0.8,
      life: 0.3,
      maxLife: 0.3,
      drag: 0.9
    });
  }

  /**
   * Creates a floating animated score popup text
   */
  addFloatingText(text, x, y, color = '#00f3ff', fontSize = 14) {
    if (!this.enabled) return;

    this.floatingTexts.push({
      text: text,
      x: x,
      y: y,
      vy: -1.2,
      color: color,
      alpha: 1,
      fontSize: fontSize,
      life: 0.8,
      maxLife: 0.8,
      scale: 1.2
    });
  }

  /**
   * Update particle positions and lifespans
   */
  update(dt) {
    // Update Particles
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.life -= dt;
      if (p.life <= 0) {
        this.particles.splice(i, 1);
        continue;
      }

      p.x += p.vx;
      p.y += p.vy;
      p.vx *= p.drag;
      p.vy *= p.drag;

      if (p.isConfetti) {
        p.rotation += p.vRot;
        p.vy += 0.05; // gentle gravity
      }

      p.alpha = Math.max(0, p.life / p.maxLife);
      p.size = p.originalSize * (p.life / p.maxLife);
    }

    // Update Floating Texts
    for (let i = this.floatingTexts.length - 1; i >= 0; i--) {
      const ft = this.floatingTexts[i];
      ft.life -= dt;
      if (ft.life <= 0) {
        this.floatingTexts.splice(i, 1);
        continue;
      }

      ft.y += ft.vy;
      ft.alpha = Math.max(0, ft.life / ft.maxLife);
      if (ft.scale > 1.0) {
        ft.scale -= dt * 1.5;
      }
    }
  }

  /**
   * Render all particles and floating text onto canvas context
   */
  render(ctx) {
    ctx.save();

    // Render Particles
    for (const p of this.particles) {
      ctx.globalAlpha = p.alpha;
      ctx.fillStyle = p.color;

      if (p.isConfetti) {
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rotation);
        ctx.fillRect(-p.size / 2, -p.size / 4, p.size, p.size / 2);
        ctx.restore();
      } else {
        ctx.beginPath();
        ctx.arc(p.x, p.y, Math.max(0.5, p.size), 0, Math.PI * 2);
        ctx.fill();
      }
    }

    // Render Floating Text
    for (const ft of this.floatingTexts) {
      ctx.globalAlpha = ft.alpha;
      ctx.fillStyle = ft.color;
      ctx.shadowColor = ft.color;
      ctx.shadowBlur = 8;
      ctx.font = `800 ${Math.round(ft.fontSize * ft.scale)}px 'Space Grotesk', sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(ft.text, ft.x, ft.y);
    }

    ctx.restore();
  }
}

// Global Particle System Instance
window.particleSystem = new ParticleSystem();
