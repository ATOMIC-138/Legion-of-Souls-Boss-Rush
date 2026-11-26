import { SpriteRenderer } from "./spriteRenderer.js?v=9";

/**
 * Enemy (敵人、特色小 Boss 與 9 大傳說君王大 Boss 完整 AI 控制器)
 */
export class Enemy {
  constructor() {
    this.reset();
  }

  reset() {
    this.active = false;
    this.id = "";
    this.name = "";
    this.subtitle = "";
    this.x = 0;
    this.y = 0;
    this.size = 24;
    this.radius = 12;
    this.color = "#84cc16";
    this.isBoss = false;
    this.isElite = false;
    this.isMiniBoss = false;
    this.isEgg = false;
    this.isGoblin = false;
    this.goblinEscapeTimer = 14.0;

    this.maxHp = 30;
    this.hp = 30;
    this.speed = 40;
    this.damage = 5;
    this.expReward = 1;
    this.knockbackResist = 0;

    this.knockbackVx = 0;
    this.knockbackVy = 0;
    this.hitFlashTimer = 0;
    this.animTime = 0;

    // 仇恨目標與普攻冷卻
    this.aggroTarget = null;
    this.aggroCheckTimer = 0;
    this.attackCooldown = 0;

    // 動態韌性護盾 (Adaptive Armor) 每秒承受傷害統計視窗
    this.damageTakenThisSec = 0;
    this.dpsWindowTimer = 1.0;
    this.enraged = false;

    // 劇毒卵囊孵化倒數
    this.eggTimer = 6.0;

    // 技能狀態機與提示文字 (供頂部 Boss HUD 顯示當前招式名！)
    this.skillState = "NONE";
    this.currentSkillLabel = "";
    this.skillCooldown = 3.5;
    this.skillTimer = 0;
    this.skillMaxTimer = 1.0;
    this.skillStep = 0;
    this.subTickTimer = 0;
    this.spiralAngle = 0;
    this.dashDirX = 0;
    this.dashDirY = 0;
    this.lavaTrailTick = 0;
  }

  init(template, x, y, hpScale = 1.0, dmgScale = 1.0) {
    this.active = true;
    this.id = template.id;
    this.name = template.name;
    this.subtitle = template.subtitle || "";
    this.x = x;
    this.y = y;
    this.size = template.size || 24;
    this.radius = this.size / 2;
    this.color = template.color || "#ef4444";
    this.isBoss = Boolean(template.isBoss);
    this.isElite = Boolean(template.isElite);
    this.isMiniBoss = Boolean(template.isMiniBoss);
    this.isEgg = Boolean(template.isEgg);
    this.isGoblin = Boolean(template.isGoblin);
    this.goblinEscapeTimer = 14.0;

    this.maxHp = Math.round(template.stats.maxHp * hpScale);
    this.hp = this.maxHp;
    this.speed = template.stats.speed;
    this.damage = Math.round(template.stats.damage * dmgScale);
    this.expReward = template.stats.expReward;
    this.knockbackResist = template.stats.knockbackResist ?? 0;

    this.knockbackVx = 0;
    this.knockbackVy = 0;
    this.hitFlashTimer = 0;
    this.animTime = Math.random() * 10;

    this.aggroTarget = null;
    this.aggroCheckTimer = Math.random() * 0.25;
    this.attackCooldown = 0;

    this.damageTakenThisSec = 0;
    this.dpsWindowTimer = 1.0;
    this.enraged = false;
    this.eggTimer = 6.0;

    this.skillState = "NONE";
    this.currentSkillLabel = "";
    this.skillCooldown = this.isBoss ? 2.8 : 3.2 + Math.random() * 1.5;
    this.skillTimer = 0;
    this.skillStep = 0;
  }

  selectAggroTarget(player, minions) {
    let bestTarget = player;
    const dxP = player.x - this.x;
    const dyP = player.y - this.y;
    let bestScore = Math.hypot(dxP, dyP);

    if (minions && minions.length > 0) {
      for (let i = 0; i < minions.length; i++) {
        const m = minions[i];
        if (m.isDowned) continue;

        const d = Math.hypot(m.x - this.x, m.y - this.y);
        if (d > 260) continue;

        const isTank = m.tags.includes("Warrior") || m.tags.includes("Priest");
        const isMelee = m.attackType === "Melee";
        const tauntFactor = isTank ? 0.48 : isMelee ? 0.65 : 0.9;
        const effectiveScore = d * tauntFactor;

        if (effectiveScore < bestScore) {
          bestScore = effectiveScore;
          bestTarget = m;
        }
      }
    }

    this.aggroTarget = bestTarget;
  }

  update(
    dt,
    player,
    quadtree,
    minions = [],
    vfx = null,
    soundManager = null,
    hazardManager = null,
    waveManager = null
  ) {
    if (!this.active) return;

    this.animTime += dt;

    if (this.hitFlashTimer > 0) {
      this.hitFlashTimer = Math.max(0, this.hitFlashTimer - dt);
    }
    if (this.attackCooldown > 0) {
      this.attackCooldown = Math.max(0, this.attackCooldown - dt);
    }

    // 更新動態韌性護盾每秒傷害統計視窗
    if (this.isBoss) {
      this.dpsWindowTimer -= dt;
      if (this.dpsWindowTimer <= 0) {
        this.dpsWindowTimer = 1.0;
        this.damageTakenThisSec = 0;
      }

      // 檢查是否進入半血狂暴 (HP < 50%)
      if (!this.enraged && this.hp < this.maxHp * 0.5) {
        this.enraged = true;
        this.speed = Math.round(this.speed * 1.22);
        if (soundManager) soundManager.playBossAlert();
        if (vfx) {
          vfx.spawnShockwave(this.x, this.y, 180, "#f43f5e", 0.55);
          vfx.triggerShake(11, 0.35);
        }
      }
    }

    // 處理「貪婪黃金哥布林盜寶賊 (e_goblin)」：不會攻擊玩家，但會高速繞圈逃跑，14 秒未擊殺則遁地消失！
    if (this.isGoblin) {
      this.goblinEscapeTimer -= dt;
      if (this.goblinEscapeTimer <= 0) {
        if (vfx) vfx.spawnShockwave(this.x, this.y, 60, "#facc15", 0.35);
        this.active = false;
        return;
      }

      const dxAway = this.x - player.x;
      const dyAway = this.y - player.y;
      const awayAngle =
        Math.atan2(dyAway, dxAway) + Math.sin(this.animTime * 2.5) * 0.85;
      this.x += Math.cos(awayAngle) * this.speed * dt;
      this.y += Math.sin(awayAngle) * this.speed * dt;

      // 保持在邊界內避免跑出地圖
      this.x = Math.max(120, Math.min(2280, this.x));
      this.y = Math.max(120, Math.min(2280, this.y));
      return;
    }

    // 處理「劇毒魔蛛卵囊 (e_egg)」6 秒倒數孵化機制
    if (this.isEgg) {
      this.eggTimer -= dt;
      if (this.eggTimer <= 0) {
        // 卵囊時間到未被擊破：孵化出 3 隻菁英自爆魔蛛！
        if (soundManager) soundManager.playExplosion();
        if (vfx) {
          vfx.spawnShockwave(this.x, this.y, 85, "#a855f7", 0.35);
          vfx.spawnBurst(this.x, this.y, "#bef264", 18, 200);
        }
        if (waveManager) {
          for (let k = 0; k < 3; k++) {
            const a = (k * Math.PI * 2) / 3;
            waveManager.spawnEnemyAt("e_spider_bomb", this.x + Math.cos(a) * 22, this.y + Math.sin(a) * 22);
          }
        }
        this.hp = 0;
        this.active = false;
      }
      return;
    }

    // 定期評估仇恨目標
    this.aggroCheckTimer -= dt;
    if (
      this.aggroCheckTimer <= 0 ||
      !this.aggroTarget ||
      this.aggroTarget.isDowned
    ) {
      this.aggroCheckTimer = 0.35;
      this.selectAggroTarget(player, minions);
    }

    const target = this.aggroTarget || player;

    // 處理大 Boss 與特色小 Boss 專屬技能機
    if (this.isBoss || this.isMiniBoss) {
      const handled = this.updateBossSkills(
        dt,
        player,
        minions,
        vfx,
        soundManager,
        hazardManager,
        waveManager
      );
      if (handled) return;
    }

    // 一般移動：朝當前仇恨目標移動
    const dx = target.x - this.x;
    const dy = target.y - this.y;
    const dist = Math.hypot(dx, dy);

    let vx = 0;
    let vy = 0;
    if (dist > 0.001) {
      vx = (dx / dist) * this.speed;
      vy = (dy / dist) * this.speed;
    }

    // 若仇恨目標是隨從且接觸，攻擊隨從
    if (target !== player && !target.isDowned) {
      const contactDist = this.radius + target.radius + 4;
      if (dist <= contactDist && this.attackCooldown <= 0) {
        this.attackCooldown = 0.85;
        target.takeDamage(this.damage, player.stance === "phalanx");
        const thorns = target.synergyMods ? target.synergyMods.thornsRatio || 0 : 0;
        if (thorns > 0) {
          const reflect = Math.max(1, Math.round(this.damage * thorns));
          this.hp -= reflect;
          target.totalDamageDealt = (target.totalDamageDealt || 0) + reflect;
        }
      }
    }

    // 四叉樹鄰近分離 (小Boss 與 大Boss 擁有霸體威壓：會主動推開周圍所有小怪，避免小Boss被小怪淹沒遮擋！)
    if (quadtree) {
      const queryR = this.radius * 2.4 + 28;
      const neighbors = quadtree.queryCircle(this.x, this.y, queryR);
      let sepX = 0;
      let sepY = 0;
      const selfIsImportant = this.isBoss || this.isMiniBoss;

      for (let i = 0; i < neighbors.length; i++) {
        const other = neighbors[i];
        if (other === this || !other.active) continue;
        const otherIsImportant = other.isBoss || other.isMiniBoss;

        // 小Boss / 大Boss 絕不會被普通小怪推擠
        if (selfIsImportant && !otherIsImportant) continue;

        const ox = this.x - other.x;
        const oy = this.y - other.y;
        const oDistSq = ox * ox + oy * oy;
        const extraBuffer = !selfIsImportant && otherIsImportant ? 22 : 0;
        const minDist = this.radius + other.radius + extraBuffer;

        if (oDistSq > 0 && oDistSq < minDist * minDist) {
          const oDist = Math.sqrt(oDistSq);
          const push = (minDist - oDist) / minDist;
          const force = !selfIsImportant && otherIsImportant ? 260 : 50;
          sepX += (ox / oDist) * push * force;
          sepY += (oy / oDist) * push * force;
        }
      }
      vx += sepX;
      vy += sepY;
    }

    this.x += (vx + this.knockbackVx) * dt;
    this.y += (vy + this.knockbackVy) * dt;

    this.knockbackVx *= Math.pow(0.05, dt);
    this.knockbackVy *= Math.pow(0.05, dt);
  }

  /**
   * 執行 9 大傳說君王大 Boss 與 3 種特色小 Boss 的專屬技能狀態機
   */
  updateBossSkills(dt, player, minions, vfx, soundManager, hazardManager, waveManager) {
    if (!hazardManager) return false;

    if (this.skillState === "NONE") {
      const cdRate = this.enraged ? 1.42 : 1.0;
      this.skillCooldown -= dt * cdRate;
      if (this.skillCooldown <= 0) {
        this.triggerNextSkill(player, minions, vfx, soundManager, hazardManager, waveManager);
      }
      return false;
    }

    // 處理通用預警直線衝鋒 (TELEGRAPH_DASH -> DASHING)
    if (this.skillState === "TELEGRAPH_DASH") {
      this.skillTimer -= dt;
      if (this.skillTimer <= 0) {
        this.skillState = "DASHING";
        this.skillTimer = 0.65;
        this.lavaTrailTick = 0;
        if (soundManager) soundManager.playSlash();
      }
      return true;
    }

    if (this.skillState === "DASHING") {
      this.skillTimer -= dt;
      const dashSpeed = this.speed * (this.id === "mb_25" ? 4.4 : 5.8);
      this.x += this.dashDirX * dashSpeed * dt;
      this.y += this.dashDirY * dashSpeed * dt;

      // 伊格尼斯 / 巴哈姆特 衝鋒路徑沿途留下燃燒岩漿火海！
      if ((this.id === "b_10" && this.enraged) || this.id === "b_30_dragon") {
        this.lavaTrailTick -= dt;
        if (this.lavaTrailTick <= 0) {
          this.lavaTrailTick = 0.13;
          hazardManager.addLavaPool(this.x, this.y, 48, 4.2, 22);
        }
      }

      if (this.skillTimer <= 0) {
        if (this.id === "b_10" || this.id === "b_30_dragon") {
          const baseAngle = Math.atan2(this.dashDirY, this.dashDirX);
          const count = this.id === "b_30_dragon" ? 12 : 9;
          for (let i = 0; i < count; i++) {
            const offset = (i - (count - 1) / 2) * 0.22;
            const a = baseAngle + offset;
            hazardManager.spawnBullet({
              x: this.x,
              y: this.y,
              vx: Math.cos(a) * 300,
              vy: Math.sin(a) * 300,
              radius: 9,
              damage: Math.round(this.damage * 0.9),
              color: "#ea580c",
              coreColor: "#fef08a",
              maxLife: 3.0
            });
          }
          if (soundManager) soundManager.playExplosion();
        } else if (this.id === "b_10_frost") {
          // 冰霜暴君衝鋒終點震出環狀 10 向破冰尖刺與冰爆圈
          hazardManager.addCircleTelegraph({
            x: this.x,
            y: this.y,
            radius: 135,
            delay: 0.45,
            damage: this.damage,
            color: "#38bdf8"
          });
          for (let i = 0; i < 10; i++) {
            const a = (i * Math.PI * 2) / 10;
            hazardManager.spawnBullet({
              x: this.x,
              y: this.y,
              vx: Math.cos(a) * 265,
              vy: Math.sin(a) * 265,
              radius: 8,
              damage: Math.round(this.damage * 0.85),
              color: "#38bdf8",
              coreColor: "#ffffff",
              maxLife: 3.2
            });
          }
          if (soundManager) soundManager.playExplosion();
        } else if (this.id === "mb_05") {
          hazardManager.addCircleTelegraph({
            x: this.x,
            y: this.y,
            radius: 115,
            delay: 0.45,
            damage: this.damage,
            color: "#ef4444"
          });
        }

        this.finishSkill(this.isBoss ? 2.6 : 3.4);
      }
      return true;
    }

    // 螺旋彈幕風暴 (阿拉克涅 / 冰霜暴君 / 德古拉 / 路西法 共用多變化狀態)
    if (this.skillState === "SPIRAL_BARRAGE") {
      this.skillTimer -= dt;
      this.subTickTimer -= dt;
      this.spiralAngle += dt * 4.1;

      if (this.subTickTimer <= 0) {
        this.subTickTimer = 0.13;
        const arms = this.enraged ? 4 : 3;
        let colA = "#a855f7";
        let colB = "#84cc16";
        if (this.id === "b_10_frost") {
          colA = "#38bdf8";
          colB = "#e0f2fe";
        } else if (this.id === "b_20_vampire") {
          colA = "#e11d48";
          colB = "#f43f5e";
        } else if (this.id === "b_30_seraph") {
          colA = "#facc15";
          colB = "#c084fc";
        }

        for (let k = 0; k < arms; k++) {
          const a = this.spiralAngle + (k * Math.PI * 2) / arms;
          hazardManager.spawnBullet({
            x: this.x,
            y: this.y,
            vx: Math.cos(a) * 255,
            vy: Math.sin(a) * 255,
            radius: 8,
            damage: Math.round(this.damage * 0.8),
            color: k % 2 === 0 ? colA : colB,
            coreColor: "#fef08a",
            maxLife: 4.2
          });
        }
        if (soundManager) soundManager.playMinionShoot();
      }

      if (this.skillTimer <= 0) {
        this.finishSkill(2.8);
      }
      return true;
    }

    // 紅線高傷狙擊雷射 (Wave 15 發條處刑者 & Wave 20 機械帝皇・奧米茄零式)
    if (this.skillState === "SNIPE_LASER") {
      this.skillTimer -= dt;
      if (this.skillTimer <= 0) {
        if (soundManager) soundManager.playExplosion();
        const baseA = Math.atan2(this.dashDirY, this.dashDirX);
        const lanes = this.id === "b_20_mech" ? [-0.2, 0, 0.2] : [0];
        for (const offset of lanes) {
          const a = baseA + offset;
          for (let s = 0; s < 3; s++) {
            hazardManager.spawnBullet({
              x: this.x,
              y: this.y,
              vx: Math.cos(a) * (470 + s * 65),
              vy: Math.sin(a) * (470 + s * 65),
              radius: 9,
              damage: Math.round(this.damage * 1.15),
              color: "#ef4444",
              coreColor: "#ffffff",
              maxLife: 2.4
            });
          }
        }
        this.finishSkill(this.isBoss ? 2.6 : 3.5);
      }
      return true;
    }

    return false;
  }

  /**
   * 根據 9 位傳說大 Boss 與 3 位小 Boss ID 觸發專屬技能組合
   */
  triggerNextSkill(player, minions, vfx, soundManager, hazardManager, waveManager) {
    this.skillStep = (this.skillStep + 1) % 3;

    // =========================================================
    // 🌋 Wave 10 君王 1：煉獄熔岩巨像・伊格尼斯 (b_10)
    // =========================================================
    if (this.id === "b_10") {
      if (this.skillStep === 0) {
        this.currentSkillLabel = "⚠️ 正在施放：【地脈內外環雙重震爆】（先遠離內圈、再閃現切入內圈！）";
        hazardManager.addCircleTelegraph({
          x: this.x,
          y: this.y,
          radius: 165,
          delay: 1.0,
          damage: Math.round(this.damage * 1.3),
          color: "#ef4444"
        });
        hazardManager.addDonutTelegraph({
          x: this.x,
          y: this.y,
          innerRadius: 160,
          outerRadius: 335,
          delay: 2.0,
          damage: Math.round(this.damage * 1.4),
          color: "#f97316"
        });
        this.skillCooldown = 3.2;
      } else if (this.skillStep === 1) {
        this.currentSkillLabel = "⚠️ 正在施放：【熔岩流星火雨】（注意地面殘留燃燒岩漿池！）";
        const count = this.enraged ? 9 : 6;
        for (let i = 0; i < count; i++) {
          const baseUnit =
            i === 0 || minions.length === 0 ? player : minions[i % minions.length];
          hazardManager.addCircleTelegraph({
            x: baseUnit.x + (Math.random() - 0.5) * 150,
            y: baseUnit.y + (Math.random() - 0.5) * 150,
            radius: 68,
            delay: 1.05 + i * 0.1,
            damage: this.damage,
            color: "#f97316",
            leaveLava: true,
            lavaDuration: 4.5
          });
        }
        this.skillCooldown = 3.4;
      } else {
        this.currentSkillLabel = "⚠️ 正在施放：【蠻牛烈焰衝鋒 + 扇形火浪】";
        this.skillState = "TELEGRAPH_DASH";
        this.skillMaxTimer = 0.85;
        this.skillTimer = 0.85;
        const a = Math.atan2(player.y - this.y, player.x - this.x);
        this.dashDirX = Math.cos(a);
        this.dashDirY = Math.sin(a);
      }
      return;
    }

    // =========================================================
    // ❄️ Wave 10 君王 2：永冬冰霜暴君・波瑞亞斯 (b_10_frost)
    // =========================================================
    if (this.id === "b_10_frost") {
      if (this.skillStep === 0) {
        this.currentSkillLabel = "⚠️ 正在施放：【極凍外內環反轉冰爆】（先貼近內圈、再往外閃避！）";
        hazardManager.addDonutTelegraph({
          x: this.x,
          y: this.y,
          innerRadius: 155,
          outerRadius: 335,
          delay: 1.0,
          damage: Math.round(this.damage * 1.3),
          color: "#38bdf8"
        });
        hazardManager.addCircleTelegraph({
          x: this.x,
          y: this.y,
          radius: 165,
          delay: 1.95,
          damage: Math.round(this.damage * 1.35),
          color: "#0284c7"
        });
        this.skillCooldown = 3.2;
      } else if (this.skillStep === 1) {
        this.currentSkillLabel = "⚠️ 正在施放：【永冬螺旋寒冰刃 + 極寒緩速扇區】";
        const aimAngle = Math.atan2(player.y - this.y, player.x - this.x);
        hazardManager.addConeWebTelegraph({
          x: this.x,
          y: this.y,
          angle: aimAngle,
          spread: Math.PI * 0.52,
          radius: 300,
          delay: 0.9,
          damage: this.damage
        });
        this.skillState = "SPIRAL_BARRAGE";
        this.skillMaxTimer = 3.2;
        this.skillTimer = 3.2;
        this.subTickTimer = 0.1;
        this.spiralAngle = 0;
      } else {
        this.currentSkillLabel = "⚠️ 正在施放：【雪崩破冰衝鋒 + 十方冰錐炸裂】";
        this.skillState = "TELEGRAPH_DASH";
        this.skillMaxTimer = 0.85;
        this.skillTimer = 0.85;
        const a = Math.atan2(player.y - this.y, player.x - this.x);
        this.dashDirX = Math.cos(a);
        this.dashDirY = Math.sin(a);
      }
      return;
    }

    // =========================================================
    // 🌳 Wave 10 君王 3：腐化世界古樹・尤格拉希爾 (b_10_treant)
    // =========================================================
    if (this.id === "b_10_treant") {
      if (this.skillStep === 0) {
        const beams = this.enraged ? 6 : 4;
        this.currentSkillLabel = `⚠️ 正在施放：【古木荊棘 ${beams} 向旋轉死光 + 毒霧外環】`;
        hazardManager.addRotatingLaser({
          boss: this,
          beamCount: beams,
          warmup: 1.05,
          duration: 3.6,
          rotSpeed: 0.58,
          damage: this.damage
        });
        hazardManager.addDonutTelegraph({
          x: this.x,
          y: this.y,
          innerRadius: 170,
          outerRadius: 340,
          delay: 1.4,
          damage: this.damage,
          color: "#22c55e"
        });
        this.skillCooldown = 4.0;
      } else if (this.skillStep === 1) {
        this.currentSkillLabel = "⚠️ 正在施放：【劇毒孢子沼澤雨 + 魔藤緩速網】";
        const aimAngle = Math.atan2(player.y - this.y, player.x - this.x);
        hazardManager.addConeWebTelegraph({
          x: this.x,
          y: this.y,
          angle: aimAngle,
          spread: Math.PI * 0.55,
          radius: 295,
          delay: 0.9,
          damage: this.damage
        });
        for (let i = 0; i < 6; i++) {
          hazardManager.addCircleTelegraph({
            x: player.x + (Math.random() - 0.5) * 180,
            y: player.y + (Math.random() - 0.5) * 180,
            radius: 65,
            delay: 1.0 + i * 0.12,
            damage: this.damage,
            color: "#22c55e",
            leaveLava: true,
            lavaDuration: 4.5
          });
        }
        this.skillCooldown = 3.4;
      } else {
        this.currentSkillLabel = "⚠️ 正在施放：【地脈根鬚引力漩渦 + 翠綠毒葉風暴】";
        hazardManager.addBlackHole({
          x: this.x,
          y: this.y,
          pullRadius: 340,
          explodeRadius: 175,
          duration: 2.4,
          pullForce: 115,
          damage: Math.round(this.damage * 1.25)
        });
        for (let i = 0; i < 12; i++) {
          const a = (i * Math.PI * 2) / 12;
          hazardManager.spawnBullet({
            x: this.x,
            y: this.y,
            vx: Math.cos(a) * 230,
            vy: Math.sin(a) * 230,
            radius: 8,
            damage: Math.round(this.damage * 0.8),
            color: "#22c55e",
            coreColor: "#fef08a",
            maxLife: 3.5
          });
        }
        this.skillCooldown = 3.6;
      }
      return;
    }

    // =========================================================
    // 🕸️ Wave 20 君王 1：深淵織網女皇・阿拉克涅 (b_20)
    // =========================================================
    if (this.id === "b_20") {
      if (this.skillStep === 0) {
        this.currentSkillLabel = "⚠️ 正在施放：【深淵螺旋劇毒彈幕風暴】（順著縫隙繞圈走位！）";
        this.skillState = "SPIRAL_BARRAGE";
        this.skillMaxTimer = 3.6;
        this.skillTimer = 3.6;
        this.subTickTimer = 0.1;
        this.spiralAngle = 0;
      } else if (this.skillStep === 1) {
        if (this.enraged) {
          this.currentSkillLabel = "⚠️ 正在施放：【背後暗影奇襲 + 劇毒束縛網】";
          const backAngle = Math.atan2(player.facing.y || 0, player.facing.x || 1) + Math.PI;
          this.x = player.x + Math.cos(backAngle) * 140;
          this.y = player.y + Math.sin(backAngle) * 140;
          if (vfx) vfx.spawnShockwave(this.x, this.y, 110, "#a855f7", 0.3);
        } else {
          this.currentSkillLabel = "⚠️ 正在施放：【深淵束縛蛛網 + 毒牙突刺】";
        }
        const aimAngle = Math.atan2(player.y - this.y, player.x - this.x);
        hazardManager.addConeWebTelegraph({
          x: this.x,
          y: this.y,
          angle: aimAngle,
          spread: Math.PI * 0.5,
          radius: 300,
          delay: 0.9,
          damage: this.damage
        });
        this.skillState = "TELEGRAPH_DASH";
        this.skillMaxTimer = 1.05;
        this.skillTimer = 1.05;
        this.dashDirX = Math.cos(aimAngle);
        this.dashDirY = Math.sin(aimAngle);
      } else {
        this.currentSkillLabel = "⚠️ 正在施放：【劇毒魔蛛卵囊召喚 + 內外環震爆】（快按 E 鍵集火打爆卵囊！）";
        if (waveManager) {
          for (let i = 0; i < 3; i++) {
            const a = (i * Math.PI * 2) / 3 + Math.random() * 0.5;
            const ex = this.x + Math.cos(a) * 150;
            const ey = this.y + Math.sin(a) * 150;
            waveManager.spawnEnemyAt("e_egg", ex, ey);
            if (vfx) vfx.spawnShockwave(ex, ey, 55, "#a855f7", 0.35);
          }
        }
        hazardManager.addDonutTelegraph({
          x: this.x,
          y: this.y,
          innerRadius: 150,
          outerRadius: 320,
          delay: 1.2,
          damage: this.damage,
          color: "#a855f7"
        });
        this.skillCooldown = 3.8;
      }
      return;
    }

    // =========================================================
    // ⚙️ Wave 20 君王 2：殲滅機械帝皇・奧米茄零式 (b_20_mech)
    // =========================================================
    if (this.id === "b_20_mech") {
      if (this.skillStep === 0) {
        const beams = this.enraged ? 6 : 4;
        this.currentSkillLabel = `⚠️ 正在施放：【高能軌道 ${beams} 向旋轉雷射 + 電漿彈幕環】`;
        hazardManager.addRotatingLaser({
          boss: this,
          beamCount: beams,
          warmup: 1.0,
          duration: 3.8,
          rotSpeed: 0.65,
          damage: Math.round(this.damage * 1.15)
        });
        for (let i = 0; i < 10; i++) {
          const a = (i * Math.PI * 2) / 10;
          hazardManager.spawnBullet({
            x: this.x,
            y: this.y,
            vx: Math.cos(a) * 240,
            vy: Math.sin(a) * 240,
            radius: 8,
            damage: Math.round(this.damage * 0.85),
            color: "#f59e0b",
            coreColor: "#fef08a",
            maxLife: 3.8
          });
        }
        this.skillCooldown = 4.2;
      } else if (this.skillStep === 1) {
        this.currentSkillLabel = "⚠️ 正在施放：【地毯式凝固汽油轟炸 + 磁暴甜甜圈】";
        const count = this.enraged ? 9 : 7;
        for (let i = 0; i < count; i++) {
          hazardManager.addCircleTelegraph({
            x: player.x + (Math.random() - 0.5) * 210,
            y: player.y + (Math.random() - 0.5) * 210,
            radius: 70,
            delay: 0.95 + i * 0.1,
            damage: this.damage,
            color: "#f59e0b",
            leaveLava: true,
            lavaDuration: 4.5
          });
        }
        hazardManager.addDonutTelegraph({
          x: this.x,
          y: this.y,
          innerRadius: 155,
          outerRadius: 330,
          delay: 1.5,
          damage: this.damage,
          color: "#ef4444"
        });
        this.skillCooldown = 3.5;
      } else {
        this.currentSkillLabel = "⚠️ 正在施放：【超載三聯電磁軌道砲狙擊 + 追蹤飛彈】";
        this.skillState = "SNIPE_LASER";
        this.skillMaxTimer = 0.88;
        this.skillTimer = 0.88;
        const a = Math.atan2(player.y - this.y, player.x - this.x);
        this.dashDirX = Math.cos(a);
        this.dashDirY = Math.sin(a);
        for (let h = 0; h < 4; h++) {
          const ha = a + (h - 1.5) * 0.6;
          hazardManager.spawnBullet({
            x: this.x,
            y: this.y,
            vx: Math.cos(ha) * 185,
            vy: Math.sin(ha) * 185,
            radius: 8,
            damage: Math.round(this.damage * 0.8),
            color: "#ef4444",
            coreColor: "#fde047",
            maxLife: 4.2,
            homingStrength: 1.15
          });
        }
      }
      return;
    }

    // =========================================================
    // 🩸 Wave 20 君王 3：鮮血緋紅真祖・德古拉 (b_20_vampire)
    // =========================================================
    if (this.id === "b_20_vampire") {
      if (this.skillStep === 0) {
        this.currentSkillLabel = "⚠️ 正在施放：【腥紅血月內外環大陣 + 噬血追蹤魂彈】";
        hazardManager.addCircleTelegraph({
          x: this.x,
          y: this.y,
          radius: 165,
          delay: 0.95,
          damage: Math.round(this.damage * 1.25),
          color: "#e11d48"
        });
        hazardManager.addDonutTelegraph({
          x: this.x,
          y: this.y,
          innerRadius: 160,
          outerRadius: 340,
          delay: 1.85,
          damage: Math.round(this.damage * 1.35),
          color: "#f43f5e"
        });
        for (let h = 0; h < 6; h++) {
          const a = (h * Math.PI * 2) / 6;
          hazardManager.spawnBullet({
            x: this.x,
            y: this.y,
            vx: Math.cos(a) * 185,
            vy: Math.sin(a) * 185,
            radius: 8,
            damage: Math.round(this.damage * 0.8),
            color: "#e11d48",
            coreColor: "#fecdd3",
            maxLife: 4.2,
            homingStrength: 1.15
          });
        }
        this.skillCooldown = 3.4;
      } else if (this.skillStep === 1) {
        this.currentSkillLabel = "⚠️ 正在施放：【暗夜血蝠瞬移奇襲 + 腥紅蝙蝠彈幕牆】";
        const sideAngle = Math.random() * Math.PI * 2;
        this.x = Math.max(180, Math.min(2220, player.x + Math.cos(sideAngle) * 170));
        this.y = Math.max(180, Math.min(2220, player.y + Math.sin(sideAngle) * 170));
        if (vfx) vfx.spawnShockwave(this.x, this.y, 120, "#e11d48", 0.35);

        const fromLeft = Math.random() < 0.5;
        const startX = player.x + (fromLeft ? -440 : 440);
        const vx = fromLeft ? 265 : -265;
        const totalRows = 10;
        const gapIdx = 2 + Math.floor(Math.random() * (totalRows - 4));
        for (let r = 0; r < totalRows; r++) {
          if (r === gapIdx || r === gapIdx + 1) continue;
          hazardManager.spawnBullet({
            x: startX,
            y: player.y + (r - totalRows / 2) * 58,
            vx,
            vy: 0,
            radius: 12,
            damage: this.damage,
            color: "#e11d48",
            coreColor: "#fde047",
            maxLife: 3.6,
            isCavalry: true
          });
        }
        this.skillCooldown = 3.4;
      } else {
        this.currentSkillLabel = "⚠️ 正在施放：【真祖魔劍螺旋風暴 + 鮮血引力漩渦】";
        hazardManager.addBlackHole({
          x: (this.x + player.x) * 0.5,
          y: (this.y + player.y) * 0.5,
          pullRadius: 340,
          explodeRadius: 175,
          duration: 2.5,
          pullForce: 118,
          damage: Math.round(this.damage * 1.2)
        });
        this.skillState = "SPIRAL_BARRAGE";
        this.skillMaxTimer = 3.2;
        this.skillTimer = 3.2;
        this.subTickTimer = 0.1;
        this.spiralAngle = 0;
      }
      return;
    }

    // =========================================================
    // 💀 Wave 30 終焉君王 1：虛空死靈大君・瑪爾扎哈 (b_30)
    // =========================================================
    if (this.id === "b_30") {
      if (this.skillStep === 0) {
        const beams = this.enraged ? 8 : 6;
        this.currentSkillLabel = `⚠️ 正在施放：【虛空滅世 ${beams} 向旋轉死光】（跟著死光順時針走位或閃現穿越！）`;
        hazardManager.addRotatingLaser({
          boss: this,
          beamCount: beams,
          warmup: 1.05,
          duration: 4.2,
          rotSpeed: this.enraged ? 0.58 : 0.68,
          damage: Math.round(this.damage * 1.2)
        });
        hazardManager.addCircleTelegraph({
          x: this.x,
          y: this.y,
          radius: 165,
          delay: 1.5,
          damage: this.damage,
          color: "#ec4899"
        });
        this.skillCooldown = 4.6;
      } else if (this.skillStep === 1) {
        this.currentSkillLabel = "⚠️ 正在施放：【亡靈千軍萬馬彈幕牆】（尋找隊列安全缺口鑽過去！）";
        const fromLeft = Math.random() < 0.5;
        const startX = player.x + (fromLeft ? -460 : 460);
        const vx = fromLeft ? 265 : -265;
        const totalRows = 11;
        const gapIdx = 2 + Math.floor(Math.random() * (totalRows - 4));

        for (let r = 0; r < totalRows; r++) {
          if (r === gapIdx || r === gapIdx + 1) continue;
          const rowY = player.y + (r - totalRows / 2) * 58;
          hazardManager.spawnBullet({
            x: startX,
            y: rowY,
            vx,
            vy: 0,
            radius: 13,
            damage: this.damage,
            color: "#38bdf8",
            coreColor: "#ffffff",
            maxLife: 3.8,
            isCavalry: true
          });
        }
        if (soundManager) soundManager.playCommandHorn();
        this.skillCooldown = 3.6;
      } else {
        this.currentSkillLabel = "⚠️ 正在施放：【靈魂虹吸黑洞 + 追蹤魂火彈】（被拉扯時抓準時機按空白鍵閃現逃離！）";
        const bhX = (this.x + player.x) * 0.5;
        const bhY = (this.y + player.y) * 0.5;
        hazardManager.addBlackHole({
          x: bhX,
          y: bhY,
          pullRadius: 390,
          explodeRadius: 210,
          duration: 2.7,
          pullForce: 135,
          damage: Math.round(this.damage * 1.4)
        });
        for (let h = 0; h < 6; h++) {
          const a = (h * Math.PI * 2) / 6;
          hazardManager.spawnBullet({
            x: this.x,
            y: this.y,
            vx: Math.cos(a) * 185,
            vy: Math.sin(a) * 185,
            radius: 8.5,
            damage: Math.round(this.damage * 0.85),
            color: "#f43f5e",
            coreColor: "#fde047",
            maxLife: 4.5,
            homingStrength: 1.2
          });
        }
        this.skillCooldown = 3.8;
      }
      return;
    }

    // =========================================================
    // 🐉 Wave 30 終焉君王 2：滅世混沌古龍・巴哈姆特 (b_30_dragon)
    // =========================================================
    if (this.id === "b_30_dragon") {
      if (this.skillStep === 0) {
        const beams = this.enraged ? 8 : 6;
        this.currentSkillLabel = `⚠️ 正在施放：【滅世焦土 ${beams} 向旋轉龍息 + 龍威內外環】`;
        hazardManager.addRotatingLaser({
          boss: this,
          beamCount: beams,
          warmup: 1.0,
          duration: 4.0,
          rotSpeed: 0.62,
          damage: Math.round(this.damage * 1.2)
        });
        hazardManager.addDonutTelegraph({
          x: this.x,
          y: this.y,
          innerRadius: 170,
          outerRadius: 360,
          delay: 1.6,
          damage: Math.round(this.damage * 1.35),
          color: "#f97316"
        });
        this.skillCooldown = 4.5;
      } else if (this.skillStep === 1) {
        this.currentSkillLabel = "⚠️ 正在施放：【天災龍炎隕石風暴 + 烈焰龍魂彈幕牆】";
        for (let i = 0; i < 9; i++) {
          hazardManager.addCircleTelegraph({
            x: player.x + (Math.random() - 0.5) * 240,
            y: player.y + (Math.random() - 0.5) * 240,
            radius: 72,
            delay: 0.95 + i * 0.1,
            damage: this.damage,
            color: "#f97316",
            leaveLava: true,
            lavaDuration: 4.8
          });
        }
        const fromLeft = Math.random() < 0.5;
        const startX = player.x + (fromLeft ? -460 : 460);
        const vx = fromLeft ? 270 : -270;
        const totalRows = 11;
        const gapIdx = 2 + Math.floor(Math.random() * (totalRows - 4));
        for (let r = 0; r < totalRows; r++) {
          if (r === gapIdx || r === gapIdx + 1) continue;
          hazardManager.spawnBullet({
            x: startX,
            y: player.y + (r - totalRows / 2) * 58,
            vx,
            vy: 0,
            radius: 13,
            damage: this.damage,
            color: "#f97316",
            coreColor: "#fef08a",
            maxLife: 3.8,
            isCavalry: true
          });
        }
        this.skillCooldown = 3.6;
      } else {
        this.currentSkillLabel = "⚠️ 正在施放：【混沌引力核 + 神龍俯衝裂地斬】";
        hazardManager.addBlackHole({
          x: (this.x + player.x) * 0.5,
          y: (this.y + player.y) * 0.5,
          pullRadius: 380,
          explodeRadius: 195,
          duration: 2.5,
          pullForce: 130,
          damage: Math.round(this.damage * 1.35)
        });
        this.skillState = "TELEGRAPH_DASH";
        this.skillMaxTimer = 0.85;
        this.skillTimer = 0.85;
        const a = Math.atan2(player.y - this.y, player.x - this.x);
        this.dashDirX = Math.cos(a);
        this.dashDirY = Math.sin(a);
      }
      return;
    }

    // =========================================================
    // 👁️ Wave 30 終焉君王 3：墮落六翼熾天使・路西法 (b_30_seraph)
    // =========================================================
    if (this.id === "b_30_seraph") {
      if (this.skillStep === 0) {
        const beams = this.enraged ? 8 : 6;
        this.currentSkillLabel = `⚠️ 正在施放：【聖魔八芒 ${beams} 向裁決死光 + 神罰雙重環】`;
        hazardManager.addRotatingLaser({
          boss: this,
          beamCount: beams,
          warmup: 1.0,
          duration: 4.1,
          rotSpeed: 0.64,
          damage: Math.round(this.damage * 1.2)
        });
        hazardManager.addCircleTelegraph({
          x: this.x,
          y: this.y,
          radius: 170,
          delay: 1.15,
          damage: Math.round(this.damage * 1.3),
          color: "#facc15"
        });
        hazardManager.addDonutTelegraph({
          x: this.x,
          y: this.y,
          innerRadius: 165,
          outerRadius: 350,
          delay: 2.1,
          damage: Math.round(this.damage * 1.35),
          color: "#c084fc"
        });
        this.skillCooldown = 4.5;
      } else if (this.skillStep === 1) {
        this.currentSkillLabel = "⚠️ 正在施放：【墮天光羽螺旋彈幕海 + 追蹤審判光球】";
        for (let h = 0; h < 6; h++) {
          const a = (h * Math.PI * 2) / 6;
          hazardManager.spawnBullet({
            x: this.x,
            y: this.y,
            vx: Math.cos(a) * 190,
            vy: Math.sin(a) * 190,
            radius: 8.5,
            damage: Math.round(this.damage * 0.85),
            color: "#facc15",
            coreColor: "#ffffff",
            maxLife: 4.5,
            homingStrength: 1.2
          });
        }
        this.skillState = "SPIRAL_BARRAGE";
        this.skillMaxTimer = 3.5;
        this.skillTimer = 3.5;
        this.subTickTimer = 0.1;
        this.spiralAngle = 0;
      } else {
        this.currentSkillLabel = "⚠️ 正在施放：【創世奇點黑洞 + 神罰聖槍陣列牆】";
        hazardManager.addBlackHole({
          x: (this.x + player.x) * 0.5,
          y: (this.y + player.y) * 0.5,
          pullRadius: 390,
          explodeRadius: 210,
          duration: 2.7,
          pullForce: 138,
          damage: Math.round(this.damage * 1.4)
        });
        const fromLeft = Math.random() < 0.5;
        const startX = player.x + (fromLeft ? -460 : 460);
        const vx = fromLeft ? 275 : -275;
        const totalRows = 11;
        const gapIdx = 2 + Math.floor(Math.random() * (totalRows - 4));
        for (let r = 0; r < totalRows; r++) {
          if (r === gapIdx || r === gapIdx + 1) continue;
          hazardManager.spawnBullet({
            x: startX,
            y: player.y + (r - totalRows / 2) * 58,
            vx,
            vy: 0,
            radius: 13,
            damage: this.damage,
            color: "#facc15",
            coreColor: "#ffffff",
            maxLife: 3.8,
            isCavalry: true
          });
        }
        this.skillCooldown = 3.8;
      }
      return;
    }

    // =========================================================
    // ⚔️ 逢 5 特色小 Boss 技能組 (mb_05 / mb_15 / mb_25)
    // =========================================================
    if (this.id === "mb_05") {
      this.skillState = "TELEGRAPH_DASH";
      this.skillMaxTimer = 0.85;
      this.skillTimer = 0.85;
      const a = Math.atan2(player.y - this.y, player.x - this.x);
      this.dashDirX = Math.cos(a);
      this.dashDirY = Math.sin(a);
    } else if (this.id === "mb_15") {
      if (this.skillStep % 2 === 0) {
        this.skillState = "SNIPE_LASER";
        this.skillMaxTimer = 0.9;
        this.skillTimer = 0.9;
        const a = Math.atan2(player.y - this.y, player.x - this.x);
        this.dashDirX = Math.cos(a);
        this.dashDirY = Math.sin(a);
      } else {
        for (let b = 0; b < 3; b++) {
          hazardManager.addCircleTelegraph({
            x: player.x + (Math.random() - 0.5) * 150,
            y: player.y + (Math.random() - 0.5) * 150,
            radius: 70,
            delay: 1.05,
            damage: this.damage,
            color: "#f59e0b"
          });
        }
        this.skillCooldown = 3.4;
      }
    } else if (this.id === "mb_25") {
      this.skillState = "TELEGRAPH_DASH";
      this.skillMaxTimer = 0.72;
      this.skillTimer = 0.72;
      const a = Math.atan2(player.y - this.y, player.x - this.x);
      this.dashDirX = Math.cos(a);
      this.dashDirY = Math.sin(a);
    }
  }

  finishSkill(nextCd = 3.2) {
    this.skillState = "NONE";
    this.currentSkillLabel = "";
    this.skillCooldown = nextCd;
  }

  /**
   * 承受傷害並計算大 Boss「動態韌性護盾 (Adaptive Armor)」防秒殺機制：
   * 當大 Boss 每秒受到超過最大生命值 2.8% 的傷害時，超出部分自動衰減 76%，確保單挑決鬥緊張刺激！
   */
  takeDamage(amount, sourceX = this.x, sourceY = this.y, knockbackForce = 135) {
    if (!this.active) return false;

    let effectiveDamage = amount;
    if (this.isBoss) {
      const softCapPerSec = this.maxHp * 0.028;
      if (this.damageTakenThisSec >= softCapPerSec) {
        effectiveDamage = Math.max(1, Math.round(amount * 0.24));
      } else if (this.damageTakenThisSec + amount > softCapPerSec) {
        const normalPart = softCapPerSec - this.damageTakenThisSec;
        const excessPart = (amount - normalPart) * 0.24;
        effectiveDamage = Math.max(1, Math.round(normalPart + excessPart));
      }
      this.damageTakenThisSec += effectiveDamage;
    }

    this.hp -= effectiveDamage;
    this.hitFlashTimer = 0.12;

    const effectiveForce = knockbackForce * Math.max(0, 1 - this.knockbackResist);
    if (effectiveForce > 0 && this.skillState === "NONE") {
      const dx = this.x - sourceX;
      const dy = this.y - sourceY;
      const dist = Math.hypot(dx, dy) || 1;
      this.knockbackVx = (dx / dist) * effectiveForce;
      this.knockbackVy = (dy / dist) * effectiveForce;
    }

    return this.hp <= 0;
  }

  draw(ctx) {
    if (!this.active) return;

    // 1. 繪製直線衝鋒紅帶 或 狙擊瞄準紅線
    if (this.skillState === "TELEGRAPH_DASH") {
      const progress = 1 - this.skillTimer / this.skillMaxTimer;
      const dashLen = this.isBoss ? 390 : 300;
      ctx.save();
      ctx.translate(this.x, this.y);
      ctx.rotate(Math.atan2(this.dashDirY, this.dashDirX));

      ctx.fillStyle = "rgba(239, 68, 68, 0.24)";
      ctx.fillRect(0, -this.radius, dashLen, this.radius * 2);

      ctx.fillStyle = "rgba(239, 68, 68, 0.62)";
      ctx.fillRect(0, -this.radius, dashLen * progress, this.radius * 2);

      ctx.strokeStyle = "#ef4444";
      ctx.lineWidth = 2.5;
      ctx.strokeRect(0, -this.radius, dashLen, this.radius * 2);
      ctx.restore();
    } else if (this.skillState === "SNIPE_LASER") {
      const baseA = Math.atan2(this.dashDirY, this.dashDirX);
      const lanes = this.id === "b_20_mech" ? [-0.2, 0, 0.2] : [0];
      for (const offset of lanes) {
        ctx.save();
        ctx.translate(this.x, this.y);
        ctx.rotate(baseA + offset);
        ctx.strokeStyle = "#ef4444";
        ctx.lineWidth = 3;
        ctx.setLineDash([8, 4]);
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(540, 0);
        ctx.stroke();
        ctx.restore();
      }
    }

    // 2. 繪製魔物、特色小 Boss 或 9 大傳說君王本體
    SpriteRenderer.drawEnemy(ctx, this, this.animTime);
  }
}
