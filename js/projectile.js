import { ObjectPool } from "./pool.js?v=10";

/**
 * Projectile (投射物 / 穿透箭矢 / 冥界死神劍氣 / 範圍導彈實體)
 * 具備飛行流光殘影 (Motion Trail)、直線穿透 (Pierce) 與 AOE 濺射平衡機制
 */
export class Projectile {
  constructor() {
    this.trail = [];
    this.hitEntities = new Set();
    this.reset();
  }

  reset() {
    this.active = false;
    this.x = 0;
    this.y = 0;
    this.vx = 0;
    this.vy = 0;
    this.speed = 440;
    this.damage = 10;
    this.radius = 5;
    this.color = "#fde047";
    this.lifeTimer = 0;
    this.maxLife = 2.0;
    this.isCrit = false;
    this.aoeRadius = 0;
    this.chainCount = 0;
    this.pierce = 0;
    this.isWaveSlash = false;
    this.sourceMinion = null;
    if (this.trail) {
      this.trail.length = 0;
    } else {
      this.trail = [];
    }
    if (this.hitEntities) {
      this.hitEntities.clear();
    } else {
      this.hitEntities = new Set();
    }
  }

  init({
    x,
    y,
    targetX,
    targetY,
    angleOffset = 0,
    speed = 460,
    damage = 10,
    radius = 5,
    color = "#fde047",
    maxLife = 1.8,
    isCrit = false,
    aoeRadius = 0,
    chainCount = 0,
    pierce = 0,
    isWaveSlash = false,
    sourceMinion = null
  }) {
    this.active = true;
    this.x = x;
    this.y = y;
    this.speed = speed;
    this.damage = damage;
    this.radius = radius;
    this.color = color;
    this.lifeTimer = 0;
    this.maxLife = maxLife;
    this.isCrit = isCrit;
    this.aoeRadius = aoeRadius;
    this.chainCount = chainCount;
    this.pierce = pierce;
    this.isWaveSlash = isWaveSlash;
    this.sourceMinion = sourceMinion;
    this.trail.length = 0;
    this.hitEntities.clear();

    const baseAngle = Math.atan2(targetY - y, targetX - x) + angleOffset;
    this.angle = baseAngle;
    this.vx = Math.cos(baseAngle) * this.speed;
    this.vy = Math.sin(baseAngle) * this.speed;
  }

  update(dt) {
    if (!this.active) return;

    this.trail.push({ x: this.x, y: this.y });
    if (this.trail.length > 5) {
      this.trail.shift();
    }

    this.x += this.vx * dt;
    this.y += this.vy * dt;
    this.lifeTimer += dt;
    if (this.lifeTimer >= this.maxLife) {
      this.active = false;
    }
  }

  draw(ctx) {
    if (!this.active) return;
    ctx.save();

    if (this.isWaveSlash) {
      // ★3 / ★4 覺醒大招：飛行貫穿新月死神劍氣
      ctx.translate(this.x, this.y);
      ctx.rotate(this.angle);
      ctx.shadowColor = this.color;
      ctx.shadowBlur = 14;
      ctx.strokeStyle = this.color;
      ctx.lineWidth = 8;
      ctx.beginPath();
      ctx.arc(0, 0, this.radius, -Math.PI * 0.48, Math.PI * 0.48);
      ctx.stroke();

      ctx.strokeStyle = "#ffffff";
      ctx.lineWidth = 3.5;
      ctx.beginPath();
      ctx.arc(2, 0, this.radius * 0.9, -Math.PI * 0.42, Math.PI * 0.42);
      ctx.stroke();
      ctx.restore();
      return;
    }

    // 1. 繪製飛行流光殘影
    if (this.trail.length > 1) {
      ctx.beginPath();
      ctx.moveTo(this.trail[0].x, this.trail[0].y);
      for (let i = 1; i < this.trail.length; i++) {
        ctx.lineTo(this.trail[i].x, this.trail[i].y);
      }
      ctx.lineTo(this.x, this.y);
      ctx.strokeStyle = this.color;
      ctx.lineWidth = this.radius * 1.1;
      ctx.lineCap = "round";
      ctx.globalAlpha = 0.38;
      ctx.stroke();
    }

    // 2. 繪製能量彈本體
    ctx.globalAlpha = 1;
    ctx.shadowColor = this.color;
    ctx.shadowBlur = 10;
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
    ctx.fillStyle = this.color;
    ctx.fill();

    ctx.fillStyle = "#ffffff";
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.radius * 0.45, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  }
}

/**
 * 投射物與近戰刀光特效管理器 (ProjectileManager)
 */
export class ProjectileManager {
  constructor(initialPoolSize = 180) {
    this.pool = new ObjectPool(() => new Projectile(), initialPoolSize);
    this.effects = [];
  }

  spawn(config) {
    const proj = this.pool.acquire();
    proj.init(config);
    return proj;
  }

  addSlashEffect(fromX, fromY, toX, toY, color = "#ffffff") {
    const angle = Math.atan2(toY - fromY, toX - fromX);
    const dist = Math.min(48, Math.hypot(toX - fromX, toY - fromY) * 0.65);
    this.effects.push({
      type: "crescentSlash",
      x: fromX + Math.cos(angle) * dist,
      y: fromY + Math.sin(angle) * dist,
      angle,
      color,
      timer: 0.16,
      maxTimer: 0.16
    });
  }

  addExplosionEffect(x, y, radius, color = "#f97316") {
    this.effects.push({
      type: "explosion",
      x,
      y,
      radius,
      color,
      timer: 0.28,
      maxTimer: 0.28
    });
  }

  addLightningEffect(x1, y1, x2, y2, color = "#38bdf8") {
    this.effects.push({
      type: "lightning",
      x1,
      y1,
      x2,
      y2,
      color,
      timer: 0.18,
      maxTimer: 0.18
    });
  }

  addLightningBolt(x1, y1, x2, y2, color = "#38bdf8") {
    this.addLightningEffect(x1, y1, x2, y2, color);
  }

  update(dt, quadtree, onHitEnemy) {
    const list = this.pool.activeList;

    for (let i = list.length - 1; i >= 0; i--) {
      const proj = list[i];
      proj.update(dt);

      if (!proj.active) {
        this.pool.release(proj);
        continue;
      }

      const candidates = quadtree.queryCircle(proj.x, proj.y, proj.radius + 36);
      let hitTarget = null;

      for (let j = 0; j < candidates.length; j++) {
        const enemy = candidates[j];
        if (!enemy.active || proj.hitEntities.has(enemy)) continue;
        const dx = enemy.x - proj.x;
        const dy = enemy.y - proj.y;
        const hitDist = enemy.radius + proj.radius;
        if (dx * dx + dy * dy <= hitDist * hitDist) {
          hitTarget = enemy;
          break;
        }
      }

      if (hitTarget) {
        proj.hitEntities.add(hitTarget);

        if (proj.aoeRadius > 0) {
          this.addExplosionEffect(proj.x, proj.y, proj.aoeRadius, proj.color);
          const aoeTargets = quadtree.queryCircle(proj.x, proj.y, proj.aoeRadius);
          let splashCount = 0;
          const maxSplashTargets = 5; // 平衡單體與範圍：限制單次濺射目標數與 55% 濺射倍率
          for (let k = 0; k < aoeTargets.length; k++) {
            const e = aoeTargets[k];
            if (!e.active) continue;
            if (e === hitTarget) {
              onHitEnemy(e, proj.damage, proj.x, proj.y, proj.sourceMinion, proj.isCrit);
            } else if (splashCount < maxSplashTargets) {
              splashCount += 1;
              const splashDmg = Math.max(1, Math.round(proj.damage * 0.55));
              onHitEnemy(e, splashDmg, proj.x, proj.y, proj.sourceMinion, false);
            }
          }
        } else {
          onHitEnemy(
            hitTarget,
            proj.damage,
            proj.x,
            proj.y,
            proj.sourceMinion,
            proj.isCrit
          );
        }

        // Mage (2) 羈絆：命中時額外彈射連鎖閃電
        if (proj.chainCount > 0) {
          const chainCandidates = quadtree.queryCircle(hitTarget.x, hitTarget.y, 165);
          let chained = 0;
          let prevX = hitTarget.x;
          let prevY = hitTarget.y;
          for (let c = 0; c < chainCandidates.length && chained < proj.chainCount; c++) {
            const nextE = chainCandidates[c];
            if (!nextE.active || nextE === hitTarget) continue;
            this.addLightningEffect(prevX, prevY, nextE.x, nextE.y, "#38bdf8");
            onHitEnemy(
              nextE,
              Math.round(proj.damage * 0.65),
              prevX,
              prevY,
              proj.sourceMinion,
              false
            );
            prevX = nextE.x;
            prevY = nextE.y;
            chained += 1;
          }
        }

        if (proj.pierce > 0) {
          proj.pierce -= 1;
          proj.damage = Math.max(1, Math.round(proj.damage * 0.88));
        } else {
          this.pool.release(proj);
        }
      }
    }

    for (let i = this.effects.length - 1; i >= 0; i--) {
      this.effects[i].timer -= dt;
      if (this.effects[i].timer <= 0) {
        this.effects.splice(i, 1);
      }
    }
  }

  draw(ctx) {
    const list = this.pool.activeList;
    for (let i = 0; i < list.length; i++) {
      list[i].draw(ctx);
    }

    for (let i = 0; i < this.effects.length; i++) {
      const fx = this.effects[i];
      const alpha = Math.max(0, fx.timer / fx.maxTimer);
      ctx.save();
      ctx.globalAlpha = alpha;

      if (fx.type === "crescentSlash") {
        ctx.translate(fx.x, fx.y);
        ctx.rotate(fx.angle);
        ctx.shadowColor = fx.color;
        ctx.shadowBlur = 10;
        ctx.strokeStyle = "#ffffff";
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.arc(0, 0, 24, -Math.PI * 0.42, Math.PI * 0.42);
        ctx.stroke();

        ctx.strokeStyle = fx.color;
        ctx.lineWidth = 7;
        ctx.globalAlpha = alpha * 0.6;
        ctx.beginPath();
        ctx.arc(2, 0, 26, -Math.PI * 0.48, Math.PI * 0.48);
        ctx.stroke();
      } else if (fx.type === "explosion") {
        const progress = 1 - alpha;
        const curR = fx.radius * (0.4 + progress * 0.65);

        ctx.fillStyle = fx.color;
        ctx.globalAlpha = alpha * 0.35;
        ctx.beginPath();
        ctx.arc(fx.x, fx.y, curR, 0, Math.PI * 2);
        ctx.fill();

        ctx.strokeStyle = "#fde047";
        ctx.lineWidth = 3;
        ctx.globalAlpha = alpha * 0.85;
        ctx.beginPath();
        ctx.arc(fx.x, fx.y, curR, 0, Math.PI * 2);
        ctx.stroke();
      } else if (fx.type === "lightning") {
        ctx.strokeStyle = fx.color;
        ctx.shadowColor = fx.color;
        ctx.shadowBlur = 8;
        ctx.lineWidth = 2.5;
        const midX = (fx.x1 + fx.x2) / 2 + (Math.random() - 0.5) * 18;
        const midY = (fx.y1 + fx.y2) / 2 + (Math.random() - 0.5) * 18;
        ctx.beginPath();
        ctx.moveTo(fx.x1, fx.y1);
        ctx.lineTo(midX, midY);
        ctx.lineTo(fx.x2, fx.y2);
        ctx.stroke();
      }

      ctx.restore();
    }
  }
}
