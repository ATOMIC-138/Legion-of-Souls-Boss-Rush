import { SpriteRenderer } from "./spriteRenderer.js?v=8";

/**
 * Minion (隨從實體 - ★3 終極覺醒技 + ★★★★ 神話泰坦 + 陣型切換 + 單體破甲平衡版)
 */
export class Minion {
  constructor(template, x, y, star = 1, metaDamageMult = 1.0) {
    this.id = template.id;
    this.baseName = template.name;
    this.awakenedName = template.awakenedName || template.name;
    this.name = star >= 3 && this.awakenedName ? this.awakenedName : this.baseName;
    this.tier = template.tier || 1;
    this.tags = [...template.tags];
    this.attackType = template.attackType; // "Melee" | "Projectile"
    this.color = template.color || "#38bdf8";
    this.ultName = template.ultName || "";
    this.ultDesc = template.ultDesc || "";
    this.isMythic = star >= 4 || String(template.id).startsWith("mythic_");

    this.star = star;
    this.x = x;
    this.y = y;
    this.metaDamageMult = metaDamageMult;

    this.baseStats = { ...template.stats };

    this.state = "FOLLOWING";
    this.targetEnemy = null;

    this.attackCooldown = 0;
    this.attackCount = 0;

    // 單體連擊獵殺印記 (針對同一高血量目標連續攻擊最高疊加 5 層 = +60% 單體傷害)
    this.comboTarget = null;
    this.comboStacks = 0;

    // Priest 專屬治療波計時器 (調整為 6.5 秒以平衡難度)
    this.healWaveTimer = 6.5;

    // ★3 終極覺醒技與 ★★★★ 神話大招冷卻計時器
    this.ultCooldown = 3.5;
    this.ultMaxCooldown = this.isMythic ? 4.5 : 5.2;

    // 靈魂重塑狀態
    this.isDowned = false;
    this.respawnTimer = 0;
    this.respawnDuration = 6.0;

    this.hasRevived = false;
    this.animTime = Math.random() * 10;

    // 累計總輸出傷害
    this.totalDamageDealt = 0;

    this.synergyMods = this.getDefaultSynergyMods();
    this.recalculateStats(true);
  }

  getDefaultSynergyMods() {
    return {
      lifesteal: 0,
      canRevive: false,
      damageReduction: 0,
      missileEveryN: 0,
      maxHpMultiplier: 1,
      thornsRatio: 0,
      rangeMultiplier: 1,
      critChance: 0,
      critDamageMultiplier: 1.75,
      extraProjectiles: 0,
      priestHealLevel: 0,
      mageAoeLevel: 0,
      elementalLevel: 0,
      assassinLevel: 0,
      voidLevel: 0,
      attackSpeedMultiplier: 1.0,
      moveSpeedMultiplier: 1.0,
      damageBonusMultiplier: 1.0,
      bossSlayerBonus: 0,
      phalanxExtraDR: 0
    };
  }

  recalculateStats(healToFull = false) {
    this.name =
      this.star >= 3 && this.awakenedName ? this.awakenedName : this.baseName;

    // 神話 ★4 角色本身 baseStats 已是神話級，不再重複乘以 2.2^3
    const starScale = this.isMythic ? 1.0 : Math.pow(2.2, this.star - 1);
    const mods = this.synergyMods || this.getDefaultSynergyMods();

    const prevMaxHp = this.maxHp || 1;
    this.maxHp = Math.round(this.baseStats.maxHp * starScale * mods.maxHpMultiplier);
    this.attackPower = Math.round(
      this.baseStats.attackPower *
        starScale *
        (mods.damageBonusMultiplier || 1) *
        this.metaDamageMult
    );
    this.attackSpeed =
      this.baseStats.attackSpeed *
      (this.isMythic ? 1.0 : 1 + (this.star - 1) * 0.16) *
      (mods.attackSpeedMultiplier || 1);
    this.range = Math.round(this.baseStats.range * mods.rangeMultiplier);
    this.moveSpeed =
      this.baseStats.moveSpeed *
      (this.isMythic ? 1.0 : 1 + (this.star - 1) * 0.08) *
      (mods.moveSpeedMultiplier || 1);

    const starMult = this.isMythic
      ? 2.75
      : this.star >= 3
        ? 2.25
        : this.star === 2
          ? 1.55
          : 1.0;
    this.size = Math.round(22 * starMult);
    this.radius = this.size / 2;

    if (healToFull || this.hp === undefined) {
      this.hp = this.maxHp;
    } else {
      const ratio = this.hp / prevMaxHp;
      this.hp = Math.min(this.maxHp, Math.max(1, Math.round(this.maxHp * ratio)));
    }
  }

  applySynergyModifiers(mods) {
    this.synergyMods = { ...this.getDefaultSynergyMods(), ...mods };
    this.recalculateStats(false);
  }

  update(
    dt,
    player,
    allMinions,
    quadtree,
    projectileManager,
    onDamageEnemy,
    soundManager = null,
    vfx = null
  ) {
    this.animTime += dt;

    if (this.isDowned) {
      this.respawnTimer -= dt;
      const dxP = player.x - this.x;
      const dyP = player.y - this.y;
      const distP = Math.hypot(dxP, dyP) || 1;
      if (distP > 45) {
        this.x += (dxP / distP) * player.moveSpeed * dt;
        this.y += (dyP / distP) * player.moveSpeed * dt;
      }
      if (this.respawnTimer <= 0) {
        this.isDowned = false;
        this.hp = this.maxHp;
        if (vfx) {
          vfx.spawnShockwave(this.x, this.y, 45, "#38bdf8", 0.3);
        }
      }
      return;
    }

    const isCommandActive = player.commandTimer > 0;
    const isOvercharge = player.thunderOverchargeTimer > 0;
    const isPhalanx = player.stance === "phalanx";

    // 🛡️ 鐵壁護衛陣：隨從每秒自動回復 4% 最大生命
    if (isPhalanx && this.hp < this.maxHp) {
      this.hp = Math.min(this.maxHp, this.hp + this.maxHp * 0.04 * dt);
    }

    const speedMultiplier =
      (isCommandActive ? 2.0 : 1.0) * (isOvercharge ? 1.5 : 1.0);

    if (this.attackCooldown > 0) {
      this.attackCooldown = Math.max(0, this.attackCooldown - dt * speedMultiplier);
    }

    // Priest (牧師) 專屬技能：每隔 6.5 秒釋放翡翠治療波
    if (this.tags.includes("Priest")) {
      const cdScale = this.synergyMods.elementalLevel >= 2 ? 1.25 : 1.0;
      this.healWaveTimer -= dt * cdScale;
      if (this.healWaveTimer <= 0) {
        this.healWaveTimer = 6.5;
        this.castPriestHealWave(player, allMinions, soundManager, vfx, quadtree, onDamageEnemy);
      }
    }

    // ★3 終極覺醒技與 ★★★★ 神話泰坦專屬大招計時器
    if (this.star >= 3 || this.isMythic) {
      const cdScale = this.synergyMods.elementalLevel >= 2 ? 1.25 : 1.0;
      this.ultCooldown -= dt * cdScale * (isCommandActive ? 1.35 : 1.0);
      if (this.ultCooldown <= 0) {
        const castSuccess = this.tryCastUltimate(
          player,
          allMinions,
          quadtree,
          projectileManager,
          onDamageEnemy,
          soundManager,
          vfx
        );
        this.ultCooldown = castSuccess ? this.ultMaxCooldown : 1.0;
      }
    }

    const dxPlayer = player.x - this.x;
    const dyPlayer = player.y - this.y;
    const distToPlayer = Math.hypot(dxPlayer, dyPlayer);

    // 陣型控制：🛡️ 鐵壁護衛陣收縮在主角 78px 內同步走位；⚔️ 自由狩獵陣向外索敵 380px
    const maxLeashDistance = isPhalanx
      ? 78
      : isCommandActive
        ? 540
        : 380;
    const isTooFarFromPlayer = distToPlayer > maxLeashDistance;

    // 1. 索敵 (Targeting)
    if (isTooFarFromPlayer && !isPhalanx) {
      this.state = "FOLLOWING";
      this.targetEnemy = null;
    } else if (isCommandActive && !isPhalanx) {
      const cmdCandidates = quadtree.queryCircle(
        player.commandTarget.x,
        player.commandTarget.y,
        250
      );
      let bestTarget = null;
      let minDistSq = Infinity;
      for (let i = 0; i < cmdCandidates.length; i++) {
        const enemy = cmdCandidates[i];
        if (!enemy.active) continue;
        const ex = enemy.x - player.commandTarget.x;
        const ey = enemy.y - player.commandTarget.y;
        const dSq = ex * ex + ey * ey;
        const weight =
          enemy.isBoss || enemy.isGoblin || enemy.isEgg ? dSq * 0.15 : dSq;
        if (weight < minDistSq) {
          minDistSq = weight;
          bestTarget = enemy;
        }
      }
      if (bestTarget) {
        this.targetEnemy = bestTarget;
        this.state = "ATTACKING";
      } else {
        this.findStandardTarget(quadtree, player, isPhalanx);
      }
    } else {
      this.findStandardTarget(quadtree, player, isPhalanx);
    }

    // 2. 隨從間互斥力 (Flocking - Separation)
    let sepX = 0;
    let sepY = 0;
    const desiredSeparation = isPhalanx ? this.radius * 1.65 + 4 : this.radius * 2.1 + 8;
    for (let i = 0; i < allMinions.length; i++) {
      const other = allMinions[i];
      if (other === this || other.isDowned) continue;
      const ox = this.x - other.x;
      const oy = this.y - other.y;
      const distSq = ox * ox + oy * oy;
      if (distSq > 0 && distSq < desiredSeparation * desiredSeparation) {
        const d = Math.sqrt(distSq);
        const strength = (desiredSeparation - d) / desiredSeparation;
        sepX += (ox / d) * strength * 140;
        sepY += (oy / d) * strength * 140;
      } else if (distSq === 0) {
        const randAngle = Math.random() * Math.PI * 2;
        sepX += Math.cos(randAngle) * 50;
        sepY += Math.sin(randAngle) * 50;
      }
    }

    // 3. 移動與攻擊
    let moveVx = sepX;
    let moveVy = sepY;
    const overchargeMove = isOvercharge ? 1.45 : 1.0;
    const effectiveFollowSpeed =
      Math.max(this.moveSpeed * 1.5, player.moveSpeed * 1.05) * overchargeMove;

    if (isPhalanx) {
      // 🛡️ 鐵壁護衛陣：強制跟隨主角身邊 50~72px 護衛圈同步走位，並對射程內敵人開火/揮砍！
      const phalanxOrbit = 54;
      if (distToPlayer > phalanxOrbit) {
        const pullBoost = distToPlayer > 85 ? 1.85 : 1.15;
        moveVx += (dxPlayer / distToPlayer) * effectiveFollowSpeed * pullBoost;
        moveVy += (dyPlayer / distToPlayer) * effectiveFollowSpeed * pullBoost;
      }
      if (this.targetEnemy && this.targetEnemy.active) {
        const distToTarget = Math.hypot(
          this.targetEnemy.x - this.x,
          this.targetEnemy.y - this.y
        );
        const effectiveRange = this.range + this.targetEnemy.radius + 22;
        if (distToTarget <= effectiveRange && this.attackCooldown <= 0) {
          this.performAttack(
            this.targetEnemy,
            projectileManager,
            onDamageEnemy,
            soundManager,
            vfx,
            quadtree,
            player
          );
          this.attackCooldown = 1 / this.attackSpeed;
        }
      }
    } else if (this.state === "ATTACKING" && this.targetEnemy && this.targetEnemy.active) {
      const tx = this.targetEnemy.x - this.x;
      const ty = this.targetEnemy.y - this.y;
      const distToTarget = Math.hypot(tx, ty);
      const effectiveAttackRange = this.range + this.targetEnemy.radius;

      if (distToTarget <= effectiveAttackRange) {
        if (this.attackCooldown <= 0) {
          this.performAttack(
            this.targetEnemy,
            projectileManager,
            onDamageEnemy,
            soundManager,
            vfx,
            quadtree,
            player
          );
          this.attackCooldown = 1 / this.attackSpeed;
        }
      } else {
        const chargeSpeed =
          Math.max(this.moveSpeed * 1.65, 165) *
          (isCommandActive ? 1.35 : 1.0) *
          overchargeMove;
        moveVx += (tx / distToTarget) * chargeSpeed;
        moveVy += (ty / distToTarget) * chargeSpeed;
      }
    } else {
      const orbitRadius = 56;
      if (distToPlayer > orbitRadius) {
        const catchupBoost = isTooFarFromPlayer ? 1.7 : 1.0;
        moveVx += (dxPlayer / distToPlayer) * effectiveFollowSpeed * catchupBoost;
        moveVy += (dyPlayer / distToPlayer) * effectiveFollowSpeed * catchupBoost;
      }
    }

    this.x += moveVx * dt;
    this.y += moveVy * dt;
  }

  findStandardTarget(quadtree, player, isPhalanx = false) {
    const isAssassin = this.tags.includes("Assassin");
    const scanRadius = isPhalanx
      ? Math.max(this.range + 35, 110)
      : Math.max(this.range, isAssassin ? 260 : 210);
    const candidates = quadtree.queryCircle(this.x, this.y, scanRadius);

    let chosen = null;
    let bestScore = Infinity;

    for (let i = 0; i < candidates.length; i++) {
      const enemy = candidates[i];
      if (!enemy.active) continue;
      const ex = enemy.x - this.x;
      const ey = enemy.y - this.y;
      const dSq = ex * ex + ey * ey;

      // 優先鎖定貪婪哥布林、劇毒卵囊與首領
      let score = dSq;
      if (enemy.isGoblin || enemy.isEgg) {
        score = dSq * 0.12;
      } else if (isAssassin && (enemy.isBoss || enemy.isMiniBoss)) {
        score = dSq * 0.25;
      } else if (isAssassin) {
        score = enemy.hp * 60 + dSq * 0.02;
      }

      if (score < bestScore) {
        bestScore = score;
        chosen = enemy;
      }
    }

    if (chosen) {
      this.targetEnemy = chosen;
      this.state = "ATTACKING";
    } else {
      this.targetEnemy = null;
      this.state = "FOLLOWING";
    }
  }

  castPriestHealWave(player, allMinions, soundManager, vfx, quadtree, onDamageEnemy) {
    const priestLv = Math.max(1, this.synergyMods.priestHealLevel || 1);
    // 平衡對主角的單次回血量 (避免主角無敵)，同時保持對隨從的高額恢復
    const playerHealAmount = Math.round((6 + this.star * 4) * priestLv);
    const minionHealAmount = Math.round((22 + this.star * 16) * priestLv);
    const healRadius = this.star >= 3 ? 260 : 220;

    if (soundManager) soundManager.playHeal();
    if (vfx) {
      vfx.spawnShockwave(
        this.x,
        this.y,
        healRadius,
        this.star >= 3 ? "#facc15" : "#10b981",
        0.45
      );
      vfx.spawnBurst(this.x, this.y, "#34d399", 12, 130);
    }

    const distP = Math.hypot(player.x - this.x, player.y - this.y);
    if (distP <= healRadius) {
      if (player.hp < player.maxHp) {
        player.hp = Math.min(player.maxHp, player.hp + playerHealAmount);
        if (vfx) {
          vfx.spawnDamagePopup(
            player.x,
            player.y - 24,
            `+${playerHealAmount}`,
            false,
            "#34d399"
          );
        }
      }
      // ★3 森羅古神覺醒或 Priest(2) 賦予主角短暫神聖減傷護盾
      if (this.star >= 3 || priestLv >= 2) {
        player.shieldBuffTimer = Math.max(player.shieldBuffTimer, 3.5);
      }
    }

    for (let i = 0; i < allMinions.length; i++) {
      const m = allMinions[i];
      if (m.isDowned) continue;
      const d = Math.hypot(m.x - this.x, m.y - this.y);
      if (d <= healRadius && m.hp < m.maxHp) {
        m.hp = Math.min(m.maxHp, m.hp + minionHealAmount);
      }
    }

    // ★3 祭祀巨熊覺醒效果：治療波同時震退並傷害周圍敵人！
    if (this.star >= 3 && quadtree && onDamageEnemy) {
      const enemies = quadtree.queryCircle(this.x, this.y, healRadius);
      const shockDmg = Math.round(this.attackPower * 2.2);
      for (const e of enemies) {
        if (e.active) {
          onDamageEnemy(e, shockDmg, this.x, this.y, this, false);
        }
      }
    }
  }

  /**
   * 施放 ★3 終極覺醒大招 或 ★★★★ 神話超進化大招
   */
  tryCastUltimate(
    player,
    allMinions,
    quadtree,
    projectileManager,
    onDamageEnemy,
    soundManager,
    vfx
  ) {
    const scanR = 380;
    const enemies = quadtree.queryCircle(this.x, this.y, scanR);
    if (enemies.length === 0) return false;

    // 優先瞄準 Boss 或最近敵人
    let primary = enemies[0];
    for (const e of enemies) {
      if (e.isBoss || e.isMiniBoss || e.isGoblin) {
        primary = e;
        break;
      }
    }

    if (this.id === "m_01") {
      // ★★★ 骸骨死神騎士：【冥界死神劍氣】貫穿全場巨型新月波
      if (soundManager) soundManager.playSlash();
      if (vfx) vfx.spawnShockwave(this.x, this.y, 75, "#38bdf8", 0.28);
      projectileManager.spawn({
        x: this.x,
        y: this.y,
        targetX: primary.x,
        targetY: primary.y,
        speed: 520,
        damage: Math.round(this.attackPower * 2.8),
        radius: 32,
        color: "#38bdf8",
        maxLife: 1.6,
        isCrit: true,
        pierce: 10,
        isWaveSlash: true,
        sourceMinion: this
      });
      return true;
    }

    if (this.id === "m_02") {
      // ★★★ 殲滅者重砲機神：【毀滅電磁軌道砲 + 8 向齊射】
      if (soundManager) soundManager.playExplosion();
      if (vfx) vfx.spawnShockwave(this.x, this.y, 80, "#f59e0b", 0.28);
      projectileManager.spawn({
        x: this.x,
        y: this.y,
        targetX: primary.x,
        targetY: primary.y,
        speed: 720,
        damage: Math.round(this.attackPower * 3.2),
        radius: 11,
        color: "#fde047",
        maxLife: 1.5,
        isCrit: true,
        pierce: 12,
        sourceMinion: this
      });
      for (let i = 0; i < 8; i++) {
        const a = (i * Math.PI) / 4;
        projectileManager.spawn({
          x: this.x,
          y: this.y,
          targetX: this.x + Math.cos(a) * 100,
          targetY: this.y + Math.sin(a) * 100,
          speed: 460,
          damage: Math.round(this.attackPower * 1.35),
          radius: 6,
          color: "#f97316",
          maxLife: 1.2,
          isCrit: false,
          sourceMinion: this
        });
      }
      return true;
    }

    if (this.id === "m_03") {
      // ★★★ 次元影皇・阿卡莉：【次元五連絕影斬】
      if (soundManager) soundManager.playDash();
      const slashCount = Math.min(5, enemies.length);
      let prevX = this.x;
      let prevY = this.y;
      for (let i = 0; i < slashCount; i++) {
        const t = enemies[i % enemies.length];
        if (!t || !t.active) continue;
        projectileManager.addLightningBolt(prevX, prevY, t.x, t.y, "#e879f9");
        projectileManager.addSlashEffect(prevX, prevY, t.x, t.y, "#e879f9");
        onDamageEnemy(
          t,
          Math.round(this.attackPower * 2.4),
          this.x,
          this.y,
          this,
          true
        );
        prevX = t.x;
        prevY = t.y;
      }
      if (player.stance !== "phalanx") {
        this.x = prevX + 18;
        this.y = prevY;
      }
      if (vfx) vfx.spawnShockwave(this.x, this.y, 70, "#c084fc", 0.25);
      return true;
    }

    if (this.id === "m_04") {
      // ★★★ 烈陽不死鳥・鳳凰：【天罰烈陽隕石雨】
      if (soundManager) soundManager.playExplosion();
      const count = Math.min(4, enemies.length);
      for (let i = 0; i < count; i++) {
        const t = enemies[i];
        if (!t || !t.active) continue;
        projectileManager.addExplosionEffect(t.x, t.y, 85, "#ef4444");
        if (vfx) vfx.spawnBurst(t.x, t.y, "#f97316", 10, 150);
        const nearby = quadtree.queryCircle(t.x, t.y, 85);
        for (let k = 0; k < Math.min(5, nearby.length); k++) {
          onDamageEnemy(
            nearby[k],
            Math.round(this.attackPower * 1.9),
            t.x,
            t.y,
            this,
            true
          );
        }
      }
      return true;
    }

    if (this.id === "m_06") {
      // ★★★ 雷神泰坦裝甲：【超電磁重力風暴】
      if (soundManager) soundManager.playExplosion();
      const rad = 165;
      if (vfx) {
        vfx.spawnShockwave(this.x, this.y, rad, "#eab308", 0.4);
        vfx.spawnBurst(this.x, this.y, "#fde047", 14, 160);
      }
      const inRange = quadtree.queryCircle(this.x, this.y, rad);
      for (const e of inRange) {
        if (!e.active) continue;
        // 聚攏微拉扯
        if (!e.isBoss) {
          e.x += (this.x - e.x) * 0.25;
          e.y += (this.y - e.y) * 0.25;
        }
        projectileManager.addLightningBolt(this.x, this.y, e.x, e.y, "#fde047");
        onDamageEnemy(
          e,
          Math.round(this.attackPower * 2.6),
          this.x,
          this.y,
          this,
          true
        );
      }
      return true;
    }

    if (this.id === "m_07") {
      // ★★★ 冥府萬箭魔弓：【冥王萬箭齊發 (9 支穿透靈魂神箭)】
      if (soundManager) soundManager.playMinionShoot();
      for (let i = -4; i <= 4; i++) {
        projectileManager.spawn({
          x: this.x,
          y: this.y,
          targetX: primary.x,
          targetY: primary.y,
          angleOffset: i * 0.11,
          speed: 560,
          damage: Math.round(this.attackPower * 1.65),
          radius: 6,
          color: "#38bdf8",
          maxLife: 1.5,
          isCrit: true,
          pierce: 3,
          sourceMinion: this
        });
      }
      return true;
    }

    if (this.id === "m_08") {
      // ★★★ 血獄戰神・阿瑞斯：【血獄毀滅大旋風】
      if (soundManager) soundManager.playSlash();
      const rad = 145;
      if (vfx) {
        vfx.spawnShockwave(this.x, this.y, rad, "#f97316", 0.35);
        vfx.spawnBurst(this.x, this.y, "#ef4444", 14, 160);
      }
      this.hp = Math.min(this.maxHp, this.hp + Math.round(this.maxHp * 0.25));
      const inRange = quadtree.queryCircle(this.x, this.y, rad);
      for (const e of inRange) {
        if (e.active) {
          onDamageEnemy(
            e,
            Math.round(this.attackPower * 3.1),
            this.x,
            this.y,
            this,
            true
          );
        }
      }
      return true;
    }

    // 🌈 ★★★★4 星神話泰坦專屬滅世大招
    if (this.isMythic) {
      if (soundManager) soundManager.playExplosion();
      if (vfx) {
        vfx.spawnShockwave(this.x, this.y, 210, this.color, 0.45);
        vfx.spawnBurst(this.x, this.y, "#fde047", 20, 220);
      }
      // 發射 8 道貫穿全場的神話劍氣/電磁砲 + 範圍落雷審判
      for (let i = 0; i < 8; i++) {
        const a = (i * Math.PI) / 4;
        projectileManager.spawn({
          x: this.x,
          y: this.y,
          targetX: this.x + Math.cos(a) * 120,
          targetY: this.y + Math.sin(a) * 120,
          speed: 580,
          damage: Math.round(this.attackPower * 2.2),
          radius: 26,
          color: this.color,
          maxLife: 1.5,
          isCrit: true,
          pierce: 10,
          isWaveSlash: this.attackType === "Melee",
          sourceMinion: this
        });
      }
      for (let i = 0; i < Math.min(6, enemies.length); i++) {
        const e = enemies[i];
        if (e && e.active) {
          projectileManager.addLightningBolt(this.x, this.y, e.x, e.y, "#fde047");
          onDamageEnemy(
            e,
            Math.round(this.attackPower * 2.6),
            this.x,
            this.y,
            this,
            true
          );
        }
      }
      return true;
    }

    return false;
  }

  performAttack(
    target,
    projectileManager,
    onDamageEnemy,
    soundManager = null,
    vfx = null,
    quadtree = null,
    player = null
  ) {
    this.attackCount += 1;
    const mods = this.synergyMods;

    // 1. 單體連擊印記 (Combo Mark)：連續攻擊同一目標疊加最高 5 層 (+60% 單體傷害)
    if (this.comboTarget === target) {
      this.comboStacks = Math.min(5, this.comboStacks + 1);
    } else {
      this.comboTarget = target;
      this.comboStacks = 1;
    }

    const isSingleTargetSpecialist =
      !this.tags.includes("Mage") && !this.tags.includes("Priest");
    const comboMult = isSingleTargetSpecialist ? 1 + this.comboStacks * 0.12 : 1.0;

    // 2. 破甲獵首 (Giant Slayer)：單體隨從對 Boss / 小Boss / 哥布林 / 卵囊 額外造成 +45% 破甲傷害
    const isHighValueTarget =
      target.isBoss || target.isMiniBoss || target.isElite || target.isEgg || target.isGoblin;
    const slayerMult =
      isHighValueTarget
        ? 1 + (isSingleTargetSpecialist ? 0.45 : 0.1) + (mods.bossSlayerBonus || 0)
        : 1.0;

    // 3. 陣型加成：⚔️ 自由狩獵陣提升 +15% 傷害
    const stanceMult = player && player.stance === "assault" ? 1.15 : 1.0;

    // 4. 荒野狂戰 (m_08) 被動：血量越低傷害越高
    const berserkMult =
      this.id === "m_08" ? 1 + (1 - this.hp / this.maxHp) * 0.65 : 1.0;

    // 5. 發條射手 (m_02) 被動：每第 4 發射出 220% 高爆穿甲狙擊彈
    const isSniperShot = this.id === "m_02" && this.attackCount % 4 === 0;
    const sniperMult = isSniperShot ? 2.2 : 1.0;

    // 6. Assassin (虛空潛影) 專屬技能：每 3 次攻擊瞬移背刺目標並必出爆擊！
    const isShadowStrike =
      this.tags.includes("Assassin") && this.attackCount % 3 === 0;
    if (isShadowStrike && (!player || player.stance !== "phalanx")) {
      if (vfx) {
        vfx.spawnBurst(this.x, this.y, "#c084fc", 8, 120);
      }
      const angle = Math.random() * Math.PI * 2;
      this.x = target.x + Math.cos(angle) * (target.radius + 14);
      this.y = target.y + Math.sin(angle) * (target.radius + 14);
      if (vfx) {
        vfx.spawnShockwave(this.x, this.y, 48, "#a855f7", 0.22);
      }
    }

    const isCrit =
      isShadowStrike ||
      isSniperShot ||
      this.isMythic ||
      (mods.critChance > 0 && Math.random() < mods.critChance);
    const critMult = mods.critDamageMultiplier || 1.75;
    const finalDamage = Math.round(
      this.attackPower *
        comboMult *
        slayerMult *
        stanceMult *
        berserkMult *
        sniperMult *
        (isCrit ? critMult : 1.0)
    );

    if (this.attackType === "Melee") {
      if (soundManager) soundManager.playSlash();
      projectileManager.addSlashEffect(
        this.x,
        this.y,
        target.x,
        target.y,
        isShadowStrike ? "#e879f9" : this.color
      );
      onDamageEnemy(target, finalDamage, this.x, this.y, this, isCrit);

      // ★★★★ 神話塔納托斯 / 芬里爾 普攻額外揮出劍氣
      if (this.isMythic) {
        projectileManager.spawn({
          x: this.x,
          y: this.y,
          targetX: target.x,
          targetY: target.y,
          speed: 520,
          damage: Math.round(finalDamage * 0.75),
          radius: 22,
          color: this.color,
          maxLife: 1.0,
          isCrit: true,
          pierce: 4,
          isWaveSlash: true,
          sourceMinion: this
        });
      }
    } else {
      if (soundManager) soundManager.playMinionShoot();
      const extra = (mods.extraProjectiles || 0) + (this.isMythic ? 2 : 0);
      const totalShots = 1 + extra;
      const spreadStep = 0.16;

      // Mage / Elemental (星火小妖) 普攻命中自帶元素火焰爆裂 AOE 與連鎖閃電
      const isMage = this.tags.includes("Mage") || this.tags.includes("Elemental");
      const aoeScale = mods.elementalLevel >= 1 ? 1.35 : 1.0;
      const aoeRad = isMage && !this.isMythic ? Math.round(50 * aoeScale) : 0;
      const chainCount = isMage && mods.mageAoeLevel >= 2 ? 2 : 0;

      // 幽魂獵手 (m_07) 與穿甲狙擊彈具備直線穿透能力！
      const pierceCount =
        this.id === "m_07" ? 2 : isSniperShot || this.isMythic ? 3 : 0;

      for (let i = 0; i < totalShots; i++) {
        const offsetIndex = i - (totalShots - 1) / 2;
        projectileManager.spawn({
          x: this.x,
          y: this.y,
          targetX: target.x,
          targetY: target.y,
          angleOffset: offsetIndex * spreadStep,
          speed: isSniperShot ? 680 : 490,
          damage: finalDamage,
          radius: isSniperShot ? 8 : isCrit ? 6.5 : 5,
          color: isSniperShot ? "#fde047" : isCrit ? "#fde047" : this.color,
          maxLife: 1.6,
          isCrit,
          aoeRadius: aoeRad,
          chainCount,
          pierce: pierceCount,
          sourceMinion: this
        });
      }
    }

    // Mech (4) 羈絆：每攻擊 5 次發射一發高爆導彈
    if (mods.missileEveryN > 0 && this.attackCount % mods.missileEveryN === 0) {
      if (soundManager) soundManager.playExplosion();
      projectileManager.spawn({
        x: this.x,
        y: this.y,
        targetX: target.x,
        targetY: target.y,
        angleOffset: 0,
        speed: 380,
        damage: Math.round(this.attackPower * 2.4),
        radius: 9,
        color: "#f97316",
        maxLife: 2.2,
        isCrit: true,
        aoeRadius: 82,
        chainCount: 0,
        sourceMinion: this
      });
    }
  }

  takeDamage(rawDamage, isPhalanx = false) {
    if (this.isDowned) {
      return { damaged: false, revived: false, finalDamage: 0, killed: false };
    }

    let reduction = this.synergyMods.damageReduction || 0;
    if (isPhalanx) {
      reduction += 0.4 + (this.synergyMods.phalanxExtraDR || 0);
    }
    reduction = Math.min(0.75, reduction);

    const finalDamage = Math.max(1, Math.round(rawDamage * (1 - reduction)));
    this.hp = Math.max(0, this.hp - finalDamage);

    if (this.hp <= 0) {
      if (this.synergyMods.canRevive && !this.hasRevived) {
        this.hasRevived = true;
        this.hp = Math.round(this.maxHp * 0.5);
        return { damaged: true, revived: true, finalDamage, killed: false };
      }
      this.isDowned = true;
      this.respawnTimer = this.respawnDuration;
      return { damaged: true, revived: false, finalDamage, killed: true };
    }

    return { damaged: true, revived: false, finalDamage, killed: false };
  }

  draw(ctx) {
    if (this.isDowned) {
      ctx.save();
      ctx.globalAlpha = 0.38;
      SpriteRenderer.drawMinion(ctx, this, this.animTime);
      ctx.globalAlpha = 0.9;
      ctx.fillStyle = "#38bdf8";
      ctx.font = "bold 11px 'Segoe UI', sans-serif";
      ctx.textAlign = "center";
      ctx.fillText(
        `重塑 ${this.respawnTimer.toFixed(1)}s`,
        this.x,
        this.y - this.radius - 12
      );
      ctx.restore();
      return;
    }

    SpriteRenderer.drawMinion(ctx, this, this.animTime);

    // 繪製隨從獨立血條
    if (this.hp < this.maxHp || this.star >= 2 || this.isMythic) {
      const barW = Math.max(24, this.size * 0.85);
      const barH = 4;
      const bx = this.x - barW / 2;
      const by = this.y - this.radius - (this.star >= 3 ? 28 : 20);
      const ratio = Math.max(0, Math.min(1, this.hp / this.maxHp));

      ctx.save();
      ctx.fillStyle = "rgba(0, 0, 0, 0.7)";
      ctx.fillRect(bx, by, barW, barH);
      ctx.fillStyle = this.isMythic
        ? "#e879f9"
        : ratio > 0.4
          ? "#4ade80"
          : "#fbbf24";
      ctx.fillRect(bx, by, barW * ratio, barH);
      ctx.restore();
    }
  }
}
