import { ObjectPool } from "./pool.js?v=8";

/**
 * 敵方彈幕、Boss 範圍預警圈、燃燒岩漿池與旋轉雷射系統 (BossHazardManager)
 * 專門負責渲染與結算三大傳說 Boss 與特色小 Boss 的走位試煉機制：
 * 1. 敵方飛行彈幕 (EnemyProjectiles)：火球、螺旋紫綠毒液彈、亡靈鐵騎幻影彈幕牆、追蹤魂火
 * 2. 多樣化地面預警與場地機關 (Hazards)：
 *    - 圓形紅圈轟炸 (`circle_aoe`：流星雨落點、定時炸彈圈)
 *    - 甜甜圈外環震爆 (`donut_aoe`：伊格尼斯地脈三連震第 2 擊，內圈安全、外環爆炸！)
 *    - 持續燃燒岩漿池 (`lava_pool`：踩上去每秒持續扣血，迫使玩家移動走位)
 *    - 扇形束縛蛛網 (`cone_web`：阿拉克涅扇形紅區，命中造成 60% 緩速 3 秒)
 *    - 虛空滅世旋轉死光 (`rotating_laser`：瑪爾扎哈 4 向 / 8 向貫穿全場順時針旋轉雷射！)
 *    - 靈魂虹吸黑洞 (`black_hole`：瑪爾扎哈中央引力漩渦，持續拉扯玩家並在結束時引爆巨型毀滅圈)
 */
class EnemyBullet {
  constructor() {
    this.reset();
  }

  reset() {
    this.active = false;
    this.x = 0;
    this.y = 0;
    this.vx = 0;
    this.vy = 0;
    this.radius = 7;
    this.damage = 14;
    this.color = "#f97316";
    this.coreColor = "#fef08a";
    this.life = 0;
    this.maxLife = 4.0;
    this.isCavalry = false; // 是否為瑪爾扎哈「亡靈千軍萬馬」鐵騎幻影
    this.homingStrength = 0; // 追蹤轉向力道
  }

  init({
    x,
    y,
    vx,
    vy,
    radius = 7,
    damage = 14,
    color = "#f97316",
    coreColor = "#fef08a",
    maxLife = 4.0,
    isCavalry = false,
    homingStrength = 0
  }) {
    this.active = true;
    this.x = x;
    this.y = y;
    this.vx = vx;
    this.vy = vy;
    this.radius = radius;
    this.damage = damage;
    this.color = color;
    this.coreColor = coreColor;
    this.life = 0;
    this.maxLife = maxLife;
    this.isCavalry = isCavalry;
    this.homingStrength = homingStrength;
  }

  update(dt, player) {
    if (!this.active) return;
    this.life += dt;
    if (this.life >= this.maxLife) {
      this.active = false;
      return;
    }

    if (this.homingStrength > 0 && player) {
      const speed = Math.hypot(this.vx, this.vy) || 200;
      const curAngle = Math.atan2(this.vy, this.vx);
      const targetAngle = Math.atan2(player.y - this.y, player.x - this.x);
      let diff = targetAngle - curAngle;
      while (diff > Math.PI) diff -= Math.PI * 2;
      while (diff < -Math.PI) diff += Math.PI * 2;
      const newAngle = curAngle + Math.sign(diff) * Math.min(Math.abs(diff), this.homingStrength * dt);
      this.vx = Math.cos(newAngle) * speed;
      this.vy = Math.sin(newAngle) * speed;
    }

    this.x += this.vx * dt;
    this.y += this.vy * dt;
  }

  draw(ctx) {
    if (!this.active) return;
    ctx.save();
    ctx.translate(this.x, this.y);

    if (this.isCavalry) {
      // 繪製亡靈騎兵幻影衝鋒彈體
      const angle = Math.atan2(this.vy, this.vx);
      ctx.rotate(angle);
      ctx.shadowColor = "#38bdf8";
      ctx.shadowBlur = 12;
      ctx.fillStyle = "rgba(56, 189, 248, 0.85)";
      ctx.beginPath();
      ctx.moveTo(this.radius * 1.4, 0);
      ctx.lineTo(-this.radius, -this.radius * 0.8);
      ctx.lineTo(-this.radius * 0.5, 0);
      ctx.lineTo(-this.radius, this.radius * 0.8);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = "#e0f2fe";
      ctx.lineWidth = 1.5;
      ctx.stroke();
    } else {
      ctx.shadowColor = this.color;
      ctx.shadowBlur = 10;
      ctx.fillStyle = this.color;
      ctx.beginPath();
      ctx.arc(0, 0, this.radius, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = this.coreColor;
      ctx.beginPath();
      ctx.arc(0, 0, this.radius * 0.5, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.restore();
  }
}

export class BossHazardManager {
  constructor() {
    this.bulletPool = new ObjectPool(() => new EnemyBullet(), 220);
    this.hazards = [];
  }

  clearAll() {
    this.bulletPool.releaseAll();
    this.hazards.length = 0;
  }

  spawnBullet(config) {
    const b = this.bulletPool.acquire();
    b.init(config);
    return b;
  }

  /**
   * 新增圓形紅圈預警 (倒數結束時爆炸，並可選擇是否在原地留下持續燃燒岩漿池)
   */
  addCircleTelegraph({
    x,
    y,
    radius = 65,
    delay = 1.15,
    damage = 22,
    color = "#ef4444",
    leaveLava = false,
    lavaDuration = 4.0
  }) {
    this.hazards.push({
      type: "circle_aoe",
      x,
      y,
      radius,
      timer: delay,
      maxTimer: delay,
      damage,
      color,
      leaveLava,
      lavaDuration
    });
  }

  /**
   * 新增外環甜甜圈預警圈 (伊格尼斯「地脈三連震」核心走位考驗：內圈 innerRadius 內安全，innerRadius ~ outerRadius 爆炸！)
   */
  addDonutTelegraph({
    x,
    y,
    innerRadius = 145,
    outerRadius = 295,
    delay = 1.1,
    damage = 28,
    color = "#f97316"
  }) {
    this.hazards.push({
      type: "donut_aoe",
      x,
      y,
      innerRadius,
      outerRadius,
      timer: delay,
      maxTimer: delay,
      damage,
      color
    });
  }

  /**
   * 新增持續燃燒岩漿池 / 火焰地雷
   */
  addLavaPool(x, y, radius = 52, duration = 4.0, dps = 18) {
    this.hazards.push({
      type: "lava_pool",
      x,
      y,
      radius,
      timer: duration,
      maxTimer: duration,
      dps,
      tickTimer: 0.25
    });
  }

  /**
   * 新增扇形束縛蛛網預警 (阿拉克涅專屬：命中造成傷害並附加 60% 緩速 3 秒)
   */
  addConeWebTelegraph({
    x,
    y,
    angle,
    spread = Math.PI * 0.45,
    radius = 280,
    delay = 1.0,
    damage = 20
  }) {
    this.hazards.push({
      type: "cone_web",
      x,
      y,
      angle,
      spread,
      radius,
      timer: delay,
      maxTimer: delay,
      damage
    });
  }

  /**
   * 新增瑪爾扎哈「虛空滅世死光 (十字 / 米字旋轉雷射)」
   * @param {object} config - { boss, beamCount: 4 | 8, warmup: 1.0, duration: 4.2, rotSpeed: 0.65, damage: 28 }
   */
  addRotatingLaser({
    boss,
    beamCount = 4,
    warmup = 1.05,
    duration = 4.0,
    rotSpeed = 0.62,
    damage = 28
  }) {
    this.hazards.push({
      type: "rotating_laser",
      boss,
      x: boss.x,
      y: boss.y,
      beamCount,
      angle: 0,
      rotSpeed,
      warmup,
      maxWarmup: warmup,
      timer: duration,
      maxTimer: duration,
      damage,
      hitTick: 0
    });
  }

  /**
   * 新增瑪爾扎哈「靈魂虹吸黑洞」：持續將玩家往中心拉扯，3 秒後引爆超大範圍虛空毀滅
   */
  addBlackHole({
    x,
    y,
    pullRadius = 380,
    explodeRadius = 210,
    duration = 2.8,
    pullForce = 125,
    damage = 38
  }) {
    this.hazards.push({
      type: "black_hole",
      x,
      y,
      pullRadius,
      explodeRadius,
      timer: duration,
      maxTimer: duration,
      pullForce,
      damage
    });
  }

  /**
   * 更新所有敵方彈幕與場地機關
   * Boss AOE 對「隨從」的範圍傷害自動衰減為 40%，對「玩家」則是 100%，確保隨從不會瞬間全滅但玩家必須走位！
   */
  update(dt, player, minions, vfx, soundManager, onDamagePlayer) {
    // 1. 更新敵方彈幕
    const bullets = this.bulletPool.activeList;
    for (let i = bullets.length - 1; i >= 0; i--) {
      const b = bullets[i];
      b.update(dt, player);
      if (!b.active) {
        this.bulletPool.release(b);
        continue;
      }

      // 檢測是否命中玩家
      const dxP = player.x - b.x;
      const dyP = player.y - b.y;
      const hitDistP = player.radius + b.radius;
      if (dxP * dxP + dyP * dyP <= hitDistP * hitDistP) {
        onDamagePlayer(b.damage);
        if (vfx) vfx.spawnBurst(b.x, b.y, b.color, 6, 110);
        this.bulletPool.release(b);
        continue;
      }
    }

    // 2. 更新地面預警與機關
    for (let i = this.hazards.length - 1; i >= 0; i--) {
      const hz = this.hazards[i];

      if (hz.type === "circle_aoe") {
        hz.timer -= dt;
        if (hz.timer <= 0) {
          if (soundManager) soundManager.playExplosion();
          if (vfx) {
            vfx.spawnShockwave(hz.x, hz.y, hz.radius, hz.color, 0.35);
            vfx.spawnBurst(hz.x, hz.y, hz.color, 14, 180);
          }
          // 結算對玩家 (100%) 與隨從 (40%) 的傷害
          if (Math.hypot(player.x - hz.x, player.y - hz.y) <= hz.radius + player.radius * 0.5) {
            onDamagePlayer(hz.damage);
          }
          const minionDmg = Math.max(1, Math.round(hz.damage * 0.4));
          for (let m = 0; m < minions.length; m++) {
            const unit = minions[m];
            if (!unit.isDowned && Math.hypot(unit.x - hz.x, unit.y - hz.y) <= hz.radius) {
              unit.takeDamage(minionDmg, vfx);
            }
          }
          if (hz.leaveLava) {
            this.addLavaPool(hz.x, hz.y, hz.radius * 0.85, hz.lavaDuration, 16);
          }
          this.hazards.splice(i, 1);
        }
      } else if (hz.type === "donut_aoe") {
        hz.timer -= dt;
        if (hz.timer <= 0) {
          if (soundManager) soundManager.playExplosion();
          if (vfx) {
            vfx.spawnShockwave(hz.x, hz.y, hz.outerRadius, hz.color, 0.45);
            vfx.triggerShake(9, 0.25);
          }
          const distP = Math.hypot(player.x - hz.x, player.y - hz.y);
          if (distP >= hz.innerRadius - 8 && distP <= hz.outerRadius + 8) {
            onDamagePlayer(hz.damage);
          }
          const minionDmg = Math.max(1, Math.round(hz.damage * 0.4));
          for (let m = 0; m < minions.length; m++) {
            const unit = minions[m];
            if (!unit.isDowned) {
              const dM = Math.hypot(unit.x - hz.x, unit.y - hz.y);
              if (dM >= hz.innerRadius && dM <= hz.outerRadius) {
                unit.takeDamage(minionDmg, vfx);
              }
            }
          }
          this.hazards.splice(i, 1);
        }
      } else if (hz.type === "lava_pool") {
        hz.timer -= dt;
        hz.tickTimer -= dt;
        if (hz.tickTimer <= 0) {
          hz.tickTimer = 0.35;
          if (Math.hypot(player.x - hz.x, player.y - hz.y) <= hz.radius) {
            onDamagePlayer(Math.round(hz.dps * 0.35));
          }
        }
        if (hz.timer <= 0) {
          this.hazards.splice(i, 1);
        }
      } else if (hz.type === "cone_web") {
        hz.timer -= dt;
        if (hz.timer <= 0) {
          if (soundManager) soundManager.playSlash();
          const dxP = player.x - hz.x;
          const dyP = player.y - hz.y;
          const distP = Math.hypot(dxP, dyP);
          if (distP <= hz.radius) {
            let angleDiff = Math.atan2(dyP, dxP) - hz.angle;
            while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;
            while (angleDiff < -Math.PI) angleDiff += Math.PI * 2;
            if (Math.abs(angleDiff) <= hz.spread * 0.5) {
              onDamagePlayer(hz.damage);
              player.applySlow(0.6, 3.0); // 移速降低 60% 持續 3 秒！
            }
          }
          this.hazards.splice(i, 1);
        }
      } else if (hz.type === "rotating_laser") {
        // 若 Boss 已死亡則立即結束雷射
        if (!hz.boss || !hz.boss.active) {
          this.hazards.splice(i, 1);
          continue;
        }
        hz.x = hz.boss.x;
        hz.y = hz.boss.y;

        if (hz.warmup > 0) {
          hz.warmup -= dt;
        } else {
          hz.timer -= dt;
          hz.angle += hz.rotSpeed * dt;
          hz.hitTick -= dt;

          if (hz.hitTick <= 0) {
            hz.hitTick = 0.22;
            // 檢查玩家是否碰到任一道旋轉雷射光束
            const dxP = player.x - hz.x;
            const dyP = player.y - hz.y;
            const distP = Math.hypot(dxP, dyP);
            if (distP > 18 && distP < 900) {
              const pAngle = Math.atan2(dyP, dxP);
              for (let b = 0; b < hz.beamCount; b++) {
                const beamAngle = hz.angle + (b * Math.PI * 2) / hz.beamCount;
                const perpDist = Math.abs(
                  Math.sin(pAngle - beamAngle) * distP
                );
                const dot = Math.cos(pAngle - beamAngle);
                if (dot > 0 && perpDist <= player.radius + 10) {
                  onDamagePlayer(hz.damage);
                  break;
                }
              }
            }
          }

          if (hz.timer <= 0) {
            this.hazards.splice(i, 1);
          }
        }
      } else if (hz.type === "black_hole") {
        hz.timer -= dt;
        // 持續將範圍內的玩家往黑洞中心拉扯 (若玩家未在閃現無敵期間)
        const dxP = hz.x - player.x;
        const dyP = hz.y - player.y;
        const distP = Math.hypot(dxP, dyP) || 1;
        if (distP < hz.pullRadius && player.dashTimer <= 0) {
          const pull = hz.pullForce * (1 - distP / hz.pullRadius * 0.4);
          player.x += (dxP / distP) * pull * dt;
          player.y += (dyP / distP) * pull * dt;
        }

        if (hz.timer <= 0) {
          if (soundManager) soundManager.playExplosion();
          if (vfx) {
            vfx.spawnShockwave(hz.x, hz.y, hz.explodeRadius, "#ec4899", 0.5);
            vfx.spawnBurst(hz.x, hz.y, "#a855f7", 30, 280);
            vfx.triggerShake(12, 0.35);
          }
          if (distP <= hz.explodeRadius) {
            onDamagePlayer(hz.damage);
          }
          this.hazards.splice(i, 1);
        }
      }
    }
  }

  draw(ctx, time) {
    // 1. 繪製地面機關與預警圈
    for (let i = 0; i < this.hazards.length; i++) {
      const hz = this.hazards[i];
      ctx.save();

      if (hz.type === "lava_pool") {
        const alpha = Math.min(1, hz.timer / 0.8) * 0.65;
        ctx.globalAlpha = alpha;
        const grad = ctx.createRadialGradient(hz.x, hz.y, 4, hz.x, hz.y, hz.radius);
        grad.addColorStop(0, "#fde047");
        grad.addColorStop(0.55, "#ea580c");
        grad.addColorStop(1, "rgba(185, 28, 28, 0.1)");
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(hz.x, hz.y, hz.radius, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = "#f97316";
        ctx.lineWidth = 2;
        ctx.stroke();
      } else if (hz.type === "circle_aoe") {
        const progress = 1 - hz.timer / hz.maxTimer;
        ctx.fillStyle = "rgba(239, 68, 68, 0.18)";
        ctx.beginPath();
        ctx.arc(hz.x, hz.y, hz.radius, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = hz.color;
        ctx.lineWidth = 2;
        ctx.stroke();

        ctx.fillStyle = "rgba(239, 68, 68, 0.45)";
        ctx.beginPath();
        ctx.arc(hz.x, hz.y, hz.radius * progress, 0, Math.PI * 2);
        ctx.fill();
      } else if (hz.type === "donut_aoe") {
        const progress = 1 - hz.timer / hz.maxTimer;
        ctx.beginPath();
        ctx.arc(hz.x, hz.y, hz.outerRadius, 0, Math.PI * 2);
        ctx.arc(hz.x, hz.y, hz.innerRadius, 0, Math.PI * 2, true);
        ctx.fillStyle = `rgba(249, 115, 22, ${0.18 + progress * 0.35})`;
        ctx.fill();

        ctx.strokeStyle = "#ef4444";
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.arc(hz.x, hz.y, hz.outerRadius, 0, Math.PI * 2);
        ctx.stroke();
        ctx.strokeStyle = "#22c55e"; // 內圈安全邊界標示綠線
        ctx.setLineDash([6, 4]);
        ctx.beginPath();
        ctx.arc(hz.x, hz.y, hz.innerRadius, 0, Math.PI * 2);
        ctx.stroke();
      } else if (hz.type === "cone_web") {
        const progress = 1 - hz.timer / hz.maxTimer;
        ctx.translate(hz.x, hz.y);
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.arc(0, 0, hz.radius, hz.angle - hz.spread * 0.5, hz.angle + hz.spread * 0.5);
        ctx.closePath();
        ctx.fillStyle = `rgba(168, 85, 247, ${0.18 + progress * 0.35})`;
        ctx.fill();
        ctx.strokeStyle = "#d8b4fe";
        ctx.lineWidth = 2;
        ctx.stroke();
      } else if (hz.type === "rotating_laser") {
        ctx.translate(hz.x, hz.y);
        const beamLen = 900;
        for (let b = 0; b < hz.beamCount; b++) {
          const a = hz.angle + (b * Math.PI * 2) / hz.beamCount;
          ctx.save();
          ctx.rotate(a);
          if (hz.warmup > 0) {
            // 預警紅線階段
            ctx.strokeStyle = "rgba(244, 63, 94, 0.75)";
            ctx.lineWidth = 3;
            ctx.setLineDash([10, 6]);
            ctx.beginPath();
            ctx.moveTo(20, 0);
            ctx.lineTo(beamLen, 0);
            ctx.stroke();
          } else {
            // 貫穿全場的紫紅滅世雷射光柱！
            ctx.shadowColor = "#ec4899";
            ctx.shadowBlur = 16;
            ctx.strokeStyle = "rgba(217, 70, 239, 0.65)";
            ctx.lineWidth = 22 + Math.sin(time * 30) * 4;
            ctx.beginPath();
            ctx.moveTo(20, 0);
            ctx.lineTo(beamLen, 0);
            ctx.stroke();

            ctx.strokeStyle = "#ffffff";
            ctx.lineWidth = 7;
            ctx.beginPath();
            ctx.moveTo(20, 0);
            ctx.lineTo(beamLen, 0);
            ctx.stroke();
          }
          ctx.restore();
        }
      } else if (hz.type === "black_hole") {
        const progress = 1 - hz.timer / hz.maxTimer;
        ctx.translate(hz.x, hz.y);
        // 外圈引力範圍虛線
        ctx.strokeStyle = "rgba(168, 85, 247, 0.4)";
        ctx.lineWidth = 1.5;
        ctx.setLineDash([8, 6]);
        ctx.beginPath();
        ctx.arc(0, 0, hz.pullRadius, 0, Math.PI * 2);
        ctx.stroke();
        ctx.setLineDash([]);

        // 爆炸危險紅圈
        ctx.fillStyle = `rgba(236, 72, 153, ${0.15 + progress * 0.35})`;
        ctx.beginPath();
        ctx.arc(0, 0, hz.explodeRadius, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = "#f43f5e";
        ctx.lineWidth = 2.5;
        ctx.stroke();

        // 中央旋轉黑洞奇點
        ctx.rotate(-time * 6);
        ctx.fillStyle = "#090d16";
        ctx.beginPath();
        ctx.arc(0, 0, 28 + progress * 18, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = "#e879f9";
        ctx.lineWidth = 3;
        ctx.stroke();
      }

      ctx.restore();
    }

    // 2. 繪製所有活躍敵方彈幕
    const bullets = this.bulletPool.activeList;
    for (let i = 0; i < bullets.length; i++) {
      bullets[i].draw(ctx);
    }
  }
}
