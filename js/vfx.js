import { ObjectPool } from "./pool.js?v=11";

/**
 * 視覺特效與戰鬥回饋系統 (VFXManager)
 * 使用 ObjectPool 管理：
 * 1. 血液/魔力飛濺粒子 (Hit & Death Particles)
 * 2. 浮動跳動傷害數字 (Floating Damage Numbers，爆擊放大並帶金色驚嘆號)
 * 3. 地面衝擊波光環 (Shockwave Rings)
 * 4. 畫面震動控制器 (Screen Shake)
 */
class Particle {
  constructor() {
    this.reset();
  }

  reset() {
    this.active = false;
    this.x = 0;
    this.y = 0;
    this.vx = 0;
    this.vy = 0;
    this.size = 4;
    this.color = "#ffffff";
    this.life = 0;
    this.maxLife = 0.5;
    this.drag = 0.92;
  }

  init(x, y, vx, vy, size, color, maxLife) {
    this.active = true;
    this.x = x;
    this.y = y;
    this.vx = vx;
    this.vy = vy;
    this.size = size;
    this.color = color;
    this.life = 0;
    this.maxLife = maxLife;
  }

  update(dt) {
    this.life += dt;
    if (this.life >= this.maxLife) {
      this.active = false;
      return;
    }
    this.x += this.vx * dt;
    this.y += this.vy * dt;
    const damp = Math.pow(0.08, dt);
    this.vx *= damp;
    this.vy *= damp;
  }

  draw(ctx) {
    if (!this.active) return;
    const progress = this.life / this.maxLife;
    const alpha = Math.max(0, 1 - progress);
    const currentSize = this.size * (1 - progress * 0.5);

    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.fillStyle = this.color;
    ctx.beginPath();
    ctx.arc(this.x, this.y, currentSize, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
}

class DamagePopup {
  constructor() {
    this.reset();
  }

  reset() {
    this.active = false;
    this.x = 0;
    this.y = 0;
    this.vx = 0;
    this.vy = 0;
    this.text = "";
    this.color = "#ffffff";
    this.isCrit = false;
    this.life = 0;
    this.maxLife = 0.75;
  }

  init(x, y, amount, isCrit = false, customColor = null) {
    this.active = true;
    this.x = x + (Math.random() - 0.5) * 14;
    this.y = y - 10;
    this.vx = (Math.random() - 0.5) * 45;
    this.vy = isCrit ? -115 : -85;
    this.text = isCrit ? `${amount}!` : `${amount}`;
    this.isCrit = isCrit;
    this.color = customColor || (isCrit ? "#fde047" : "#f8fafc");
    this.life = 0;
    this.maxLife = isCrit ? 0.9 : 0.65;
  }

  update(dt) {
    this.life += dt;
    if (this.life >= this.maxLife) {
      this.active = false;
      return;
    }
    this.x += this.vx * dt;
    this.y += this.vy * dt;
    this.vy += 180 * dt; // 微重力拋物線跳字
  }

  draw(ctx) {
    if (!this.active) return;
    const progress = this.life / this.maxLife;
    const alpha = progress < 0.7 ? 1 : Math.max(0, (1 - progress) / 0.3);
    const scale = this.isCrit
      ? 1.25 - Math.min(0.25, progress * 0.4)
      : 1.0;

    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.translate(this.x, this.y);
    ctx.scale(scale, scale);
    ctx.font = this.isCrit
      ? "900 16px 'Segoe UI', sans-serif"
      : "700 13px 'Segoe UI', sans-serif";
    ctx.textAlign = "center";
    ctx.strokeStyle = "#000000";
    ctx.lineWidth = 3;
    ctx.strokeText(this.text, 0, 0);
    ctx.fillStyle = this.color;
    ctx.fillText(this.text, 0, 0);
    ctx.restore();
  }
}

export class VFXManager {
  constructor() {
    this.particlePool = new ObjectPool(() => new Particle(), 300);
    this.popupPool = new ObjectPool(() => new DamagePopup(), 120);
    this.shockwaves = [];

    // 螢幕震動狀態
    this.shakeTimer = 0;
    this.shakeIntensity = 0;
  }

  /**
   * 觸發畫面震動
   */
  triggerShake(intensity = 6, duration = 0.18) {
    this.shakeIntensity = Math.max(this.shakeIntensity, intensity);
    this.shakeTimer = Math.max(this.shakeTimer, duration);
  }

  /**
   * 取得當前畫面震動偏移量 { x, y }
   */
  getShakeOffset() {
    if (this.shakeTimer <= 0) return { x: 0, y: 0 };
    return {
      x: (Math.random() - 0.5) * 2 * this.shakeIntensity,
      y: (Math.random() - 0.5) * 2 * this.shakeIntensity
    };
  }

  /**
   * 生成傷害跳字
   */
  spawnDamagePopup(x, y, amount, isCrit = false, customColor = null) {
    const popup = this.popupPool.acquire();
    popup.init(x, y, amount, isCrit, customColor);
  }

  /**
   * 生成受擊或死亡爆裂粒子
   */
  spawnBurst(x, y, color = "#ef4444", count = 10, maxSpeed = 180) {
    for (let i = 0; i < count; i++) {
      const p = this.particlePool.acquire();
      const angle = Math.random() * Math.PI * 2;
      const speed = 40 + Math.random() * maxSpeed;
      const size = 2.5 + Math.random() * 3.5;
      p.init(
        x,
        y,
        Math.cos(angle) * speed,
        Math.sin(angle) * speed,
        size,
        color,
        0.3 + Math.random() * 0.35
      );
    }
  }

  /**
   * 生成擴散光環衝擊波 (用於升星、範圍導彈爆炸、死後復活)
   */
  spawnShockwave(x, y, maxRadius = 85, color = "#facc15", duration = 0.35) {
    this.shockwaves.push({
      x,
      y,
      maxRadius,
      color,
      life: 0,
      duration
    });
  }

  update(dt) {
    if (this.shakeTimer > 0) {
      this.shakeTimer = Math.max(0, this.shakeTimer - dt);
      if (this.shakeTimer === 0) {
        this.shakeIntensity = 0;
      }
    }

    const particles = this.particlePool.activeList;
    for (let i = particles.length - 1; i >= 0; i--) {
      const p = particles[i];
      p.update(dt);
      if (!p.active) {
        this.particlePool.release(p);
      }
    }

    const popups = this.popupPool.activeList;
    for (let i = popups.length - 1; i >= 0; i--) {
      const pop = popups[i];
      pop.update(dt);
      if (!pop.active) {
        this.popupPool.release(pop);
      }
    }

    for (let i = this.shockwaves.length - 1; i >= 0; i--) {
      const sw = this.shockwaves[i];
      sw.life += dt;
      if (sw.life >= sw.duration) {
        this.shockwaves.splice(i, 1);
      }
    }
  }

  draw(ctx) {
    // 1. 繪製擴散衝擊波光環
    for (let i = 0; i < this.shockwaves.length; i++) {
      const sw = this.shockwaves[i];
      const progress = sw.life / sw.duration;
      const radius = sw.maxRadius * progress;
      const alpha = Math.max(0, 1 - progress);

      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.strokeStyle = sw.color;
      ctx.lineWidth = 4 * (1 - progress * 0.5);
      ctx.beginPath();
      ctx.arc(sw.x, sw.y, radius, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }

    // 2. 繪製粒子
    const particles = this.particlePool.activeList;
    for (let i = 0; i < particles.length; i++) {
      particles[i].draw(ctx);
    }

    // 3. 繪製跳動傷害數字
    const popups = this.popupPool.activeList;
    for (let i = 0; i < popups.length; i++) {
      popups[i].draw(ctx);
    }
  }
}
