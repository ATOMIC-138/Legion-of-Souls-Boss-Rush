import { SpriteRenderer } from "./spriteRenderer.js?v=10";
import { PLAYER_SKINS } from "./data.js?v=10";

/**
 * Player (召喚師玩家實體 - 支援陣型切換、聖壇超載與傳說造型神兵)
 * - WASD 或方向鍵移動
 * - 空白鍵主動技能 1：「奧術閃現 (Dash)」— 短距離高速無敵衝刺穿過怪群並留下殘影
 * - E 鍵 / 滑鼠右鍵主動技能 2：「狂暴集火號角 (Command Skill)」— 5 秒內全場隨從攻速 +100% 並強制集火滑鼠指向目標區域
 * - R 鍵 / Tab 鍵戰術切換：「隨從陣型 (Formation Stance)」— 一鍵切換【⚔️自由狩獵陣】與【🛡️鐵壁護衛陣 (收縮 78px 同步走位 + 40% 減傷)】
 */
export class Player {
  constructor(x, y, metaBonus = {}, equippedSkinId = "skin_default") {
    this.x = x;
    this.y = y;
    this.vx = 0;
    this.vy = 0;
    this.width = 34;
    this.height = 34;
    this.radius = 16;

    // 傳說造型設定與專屬加成
    this.skinId = equippedSkinId || "skin_default";
    this.skinConfig =
      PLAYER_SKINS.find((s) => s.id === this.skinId) || PLAYER_SKINS[0];

    const skinHpBonus = this.skinId === "skin_seraph" ? 40 : 0;
    const skinDmgMult = this.skinId === "skin_inferno" ? 1.12 : 1.0;
    const skinSpeedMult = this.skinId === "skin_void" ? 1.1 : 1.0;
    const skinAtkSpdMult = this.skinId === "skin_seraph" ? 1.15 : 1.0;

    // 套用局外永久天賦加成
    const bonusHp = (metaBonus.maxHpLevel || 0) * 25 + skinHpBonus;
    this.damageMultiplier =
      (1 + (metaBonus.attackBonusLevel || 0) * 0.1) * skinDmgMult;
    this.skinAtkSpdMult = skinAtkSpdMult;
    this.skinSpeedMult = skinSpeedMult;

    this.baseMaxHp = 100 + bonusHp;
    this.maxHp = this.baseMaxHp;
    this.hp = this.maxHp;
    this.baseMoveSpeed = Math.round(215 * skinSpeedMult);
    this.moveSpeed = this.baseMoveSpeed;
    this.pickupRadius = 125;

    // 主角專屬防身輕武器：奧術微光法杖
    this.weaponName = this.skinConfig.subtitle.split("・")[1] || "奧術微光法杖";
    this.baseAttackPower = 7;
    this.attackSpeed = 1.65 * skinAtkSpdMult;
    this.attackRange = 295;
    this.attackCooldown = 0;
    this.castFlashTimer = 0;
    this.multiShot = 1;
    this.totalDamageDealt = 0;

    // 主動技能 1：空白鍵「奧術閃現 (Dash)」
    this.dashMaxCooldown = this.skinId === "skin_void" ? 3.5 : 4.0;
    this.dashCooldown = 0;
    this.dashDuration = 0.18;
    this.dashTimer = 0;
    this.dashSpeed = 830;
    this.dashDir = { x: 1, y: 0 };
    this.afterimages = [];

    // 主動技能 2：E 鍵 / 右鍵「狂暴集火號角 (Command Skill)」
    this.commandMaxCooldown = 12.0;
    this.commandCooldown = 0;
    this.commandMaxDuration = 5.0;
    this.commandTimer = 0;
    this.commandTarget = { x: x, y: y };

    // 戰術技能 3：R 鍵 / Tab 鍵「隨從陣型切換 (Formation Stance)」
    // "assault" = ⚔️ 自由狩獵陣 (隨從傷害 +15%、主動向外索敵)
    // "phalanx" = 🛡️ 鐵壁護衛陣 (隨從收縮於主角身邊 78px 內同步走位躲 Boss 紅圈、減傷 40%)
    this.stance = "assault";

    // 聖壇狀態：「⚡ 雷霆超載 (Thunder Overcharge)」計時器與牧師神聖護盾計時器
    this.thunderOverchargeTimer = 0;
    this.shieldBuffTimer = 0;

    // 吸血每秒回復軟上限計時器 (避免主角無腦秒回滿血)
    this.lifestealQuota = 5.0;
    this.lifestealResetTimer = 1.0;

    // 等級與經驗值 (降低初始升級門檻，讓玩家能快速組建隨從軍團並合成多隻 ★3 與 ★4 神話)
    this.level = 1;
    this.currentExp = 0;
    this.expToNextLevel = 6;

    // 受傷無敵幀 (秒) 與 蛛網緩速狀態
    this.invincibleDuration = 0.55;
    this.invincibleTimer = 0;
    this.slowTimer = 0;
    this.slowRatio = 0;

    // 全局羈絆加成與復活記錄
    this.synergyMods = {
      lifesteal: 0,
      canRevive: false,
      damageReduction: 0,
      maxHpMultiplier: 1.0,
      thornsRatio: 0,
      rangeMultiplier: 1.0,
      critChance: 0,
      extraProjectiles: 0,
      moveSpeedMultiplier: 1.0
    };
    this.hasRevived = false;

    this.facing = { x: 1, y: 0 };
    this.animTime = 0;
  }

  applySynergyModifiers(mods) {
    const prevMaxHp = this.maxHp || 100;
    this.synergyMods = { ...this.synergyMods, ...mods };

    const newMaxHp = Math.round(this.baseMaxHp * (mods.maxHpMultiplier || 1));
    this.maxHp = newMaxHp;
    this.moveSpeed = Math.round(
      this.baseMoveSpeed * (mods.moveSpeedMultiplier || 1)
    );

    if (newMaxHp > prevMaxHp) {
      this.hp = Math.min(this.maxHp, this.hp + (newMaxHp - prevMaxHp));
    } else {
      this.hp = Math.min(this.maxHp, this.hp);
    }
  }

  applySlow(ratio = 0.6, duration = 3.0) {
    this.slowRatio = Math.max(this.slowRatio, ratio);
    this.slowTimer = Math.max(this.slowTimer, duration);
  }

  /**
   * 一鍵切換隨從陣型：⚔️ 自由狩獵陣 <-> 🛡️ 鐵壁護衛陣
   */
  toggleStance(soundManager, vfx) {
    this.stance = this.stance === "assault" ? "phalanx" : "assault";
    const isPhalanx = this.stance === "phalanx";
    if (soundManager) soundManager.playStanceSwitch(isPhalanx);
    if (vfx) {
      vfx.spawnShockwave(
        this.x,
        this.y,
        isPhalanx ? 85 : 135,
        isPhalanx ? "#38bdf8" : "#f59e0b",
        0.32
      );
    }
    return this.stance;
  }

  triggerDash(moveVec, soundManager, vfx) {
    if (this.dashCooldown > 0 || this.dashTimer > 0) return false;

    const dirX = moveVec.x !== 0 || moveVec.y !== 0 ? moveVec.x : this.facing.x || 1;
    const dirY = moveVec.x !== 0 || moveVec.y !== 0 ? moveVec.y : this.facing.y || 0;
    const len = Math.hypot(dirX, dirY) || 1;

    this.dashDir = { x: dirX / len, y: dirY / len };
    this.dashTimer = this.dashDuration;
    this.dashCooldown = this.dashMaxCooldown;
    this.invincibleTimer = Math.max(this.invincibleTimer, this.dashDuration + 0.15);

    if (soundManager) soundManager.playDash();
    if (vfx) {
      vfx.spawnShockwave(this.x, this.y, 55, this.skinConfig.auraColor, 0.25);
      vfx.spawnBurst(this.x, this.y, this.skinConfig.projectileColor, 12, 160);
    }
    return true;
  }

  triggerCommand(targetWorldPos, soundManager, vfx) {
    if (this.commandCooldown > 0) return false;

    this.commandTimer = this.commandMaxDuration;
    this.commandCooldown = this.commandMaxCooldown;
    this.commandTarget = { x: targetWorldPos.x, y: targetWorldPos.y };

    if (soundManager) soundManager.playCommandHorn();
    if (vfx) {
      vfx.spawnShockwave(this.x, this.y, 140, "#f59e0b", 0.4);
      vfx.spawnShockwave(targetWorldPos.x, targetWorldPos.y, 110, "#ef4444", 0.45);
      vfx.triggerShake(6, 0.2);
    }
    return true;
  }

  update(
    dt,
    input,
    bounds,
    quadtree = null,
    projectileManager = null,
    soundManager = null,
    vfx = null,
    camera = { x: 0, y: 0 }
  ) {
    this.animTime += dt;

    // 每秒重置吸血軟上限配額 (5 HP/s)
    this.lifestealResetTimer -= dt;
    if (this.lifestealResetTimer <= 0) {
      this.lifestealResetTimer = 1.0;
      this.lifestealQuota = 5.0;
    }

    if (this.invincibleTimer > 0) {
      this.invincibleTimer = Math.max(0, this.invincibleTimer - dt);
    }
    if (this.shieldBuffTimer > 0) {
      this.shieldBuffTimer = Math.max(0, this.shieldBuffTimer - dt);
    }
    if (this.slowTimer > 0) {
      this.slowTimer = Math.max(0, this.slowTimer - dt);
      if (this.slowTimer === 0) this.slowRatio = 0;
    }

    const overchargeAtkBoost = this.thunderOverchargeTimer > 0 ? 1.5 : 1.0;
    if (this.attackCooldown > 0) {
      this.attackCooldown = Math.max(0, this.attackCooldown - dt * overchargeAtkBoost);
    }
    if (this.castFlashTimer > 0) {
      this.castFlashTimer = Math.max(0, this.castFlashTimer - dt);
    }
    if (this.dashCooldown > 0) {
      this.dashCooldown = Math.max(0, this.dashCooldown - dt);
    }
    if (this.commandCooldown > 0) {
      this.commandCooldown = Math.max(0, this.commandCooldown - dt);
    }
    if (this.commandTimer > 0) {
      this.commandTimer = Math.max(0, this.commandTimer - dt);
      const mouseWorld = input.getMouseWorldPos(camera);
      this.commandTarget.x = mouseWorld.x;
      this.commandTarget.y = mouseWorld.y;
    }

    const move = input.getMovementVector();

    if (input.consumeKey("Space")) {
      this.triggerDash(move, soundManager, vfx);
    }

    if (input.consumeKey("KeyE") || input.consumeRightClick()) {
      const mouseWorld = input.getMouseWorldPos(camera);
      this.triggerCommand(mouseWorld, soundManager, vfx);
    }

    if (this.dashTimer > 0) {
      this.dashTimer = Math.max(0, this.dashTimer - dt);
      this.vx = this.dashDir.x * this.dashSpeed;
      this.vy = this.dashDir.y * this.dashSpeed;
      this.x += this.vx * dt;
      this.y += this.vy * dt;

      this.afterimages.push({
        x: this.x,
        y: this.y,
        alpha: 0.65
      });
    } else {
      const overchargeMoveBoost = this.thunderOverchargeTimer > 0 ? 1.45 : 1.0;
      const effectiveSpeed =
        this.moveSpeed *
        overchargeMoveBoost *
        (this.slowTimer > 0 ? 1 - this.slowRatio : 1);
      this.vx = move.x * effectiveSpeed;
      this.vy = move.y * effectiveSpeed;
      if (move.x !== 0 || move.y !== 0) {
        this.x += this.vx * dt;
        this.y += this.vy * dt;
        this.facing.x = move.x;
        this.facing.y = move.y;
      }
    }

    for (let i = this.afterimages.length - 1; i >= 0; i--) {
      this.afterimages[i].alpha -= dt * 2.8;
      if (this.afterimages[i].alpha <= 0) {
        this.afterimages.splice(i, 1);
      }
    }

    const halfW = this.width / 2;
    const halfH = this.height / 2;
    const pad = bounds.boundaryPadding || 0;

    this.x = Math.max(pad + halfW, Math.min(bounds.width - pad - halfW, this.x));
    this.y = Math.max(pad + halfH, Math.min(bounds.height - pad - halfH, this.y));

    if (quadtree && projectileManager && this.attackCooldown <= 0) {
      this.tryAutoAttack(quadtree, projectileManager, soundManager);
    }
  }

  tryAutoAttack(quadtree, projectileManager, soundManager) {
    const effectiveRange = this.attackRange * (this.synergyMods.rangeMultiplier || 1);
    const candidates = quadtree.queryCircle(this.x, this.y, effectiveRange);

    let nearest = null;
    let minDistSq = Infinity;
    for (let i = 0; i < candidates.length; i++) {
      const enemy = candidates[i];
      if (!enemy.active) continue;
      const dx = enemy.x - this.x;
      const dy = enemy.y - this.y;
      const dSq = dx * dx + dy * dy;
      if (dSq < minDistSq) {
        minDistSq = dSq;
        nearest = enemy;
      }
    }

    if (!nearest) return;

    this.attackCooldown = 1 / this.attackSpeed;
    this.castFlashTimer = 0.14;

    const baseDmg = Math.round(
      (this.baseAttackPower + (this.level - 1)) * this.damageMultiplier
    );
    const isCrit =
      this.synergyMods.critChance > 0 && Math.random() < this.synergyMods.critChance;
    const finalDmg = isCrit ? Math.round(baseDmg * 1.75) : baseDmg;

    const flipX = (this.facing.x || 0) < -0.05 ? -1 : 1;
    const staffTipX = this.x + 13 * flipX;
    const staffTipY = this.y - 18;

    const shots = this.multiShot || 1;
    for (let i = 0; i < shots; i++) {
      const offset = shots > 1 ? (i - (shots - 1) / 2) * 0.14 : 0;
      projectileManager.spawn({
        x: staffTipX,
        y: staffTipY,
        targetX: nearest.x,
        targetY: nearest.y,
        angleOffset: offset,
        speed: 530,
        damage: finalDmg,
        radius: isCrit ? 6.5 : 5,
        color: this.skinConfig.projectileColor || "#38bdf8",
        maxLife: 1.4,
        isCrit,
        sourceMinion: null
      });
    }

    if (soundManager) {
      soundManager.playPlayerShoot();
    }
  }

  takeDamage(rawDamage) {
    if (this.invincibleTimer > 0) {
      return { damaged: false, revived: false, finalDamage: 0 };
    }

    let reduction = this.synergyMods.damageReduction || 0;
    if (this.stance === "phalanx") reduction += 0.15;
    if (this.shieldBuffTimer > 0) reduction += 0.25;
    reduction = Math.min(0.65, reduction);

    const finalDamage = Math.max(1, Math.round(rawDamage * (1 - reduction)));
    this.hp = Math.max(0, this.hp - finalDamage);
    this.invincibleTimer = this.invincibleDuration;

    if (this.hp <= 0 && this.synergyMods.canRevive && !this.hasRevived) {
      this.hasRevived = true;
      this.hp = Math.round(this.maxHp * 0.5);
      this.invincibleTimer = 2.0;
      return { damaged: true, revived: true, finalDamage };
    }

    return { damaged: true, revived: false, finalDamage };
  }

  gainExp(amount) {
    this.currentExp += amount;
  }

  draw(ctx) {
    // 繪製閃現殘影
    for (let i = 0; i < this.afterimages.length; i++) {
      const img = this.afterimages[i];
      ctx.save();
      ctx.globalAlpha = img.alpha * 0.5;
      ctx.fillStyle = this.skinConfig.auraColor || "#38bdf8";
      ctx.beginPath();
      ctx.arc(img.x, img.y - 6, 15, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    // 若處於「🛡️ 鐵壁護衛陣 (Phalanx Stance)」，繪製半徑 78px 的神聖護衛結界圈
    if (this.stance === "phalanx") {
      ctx.save();
      ctx.strokeStyle = "rgba(56, 189, 248, 0.45)";
      ctx.fillStyle = "rgba(56, 189, 248, 0.06)";
      ctx.lineWidth = 2;
      ctx.setLineDash([10, 6]);
      ctx.beginPath();
      ctx.arc(this.x, this.y, 78, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.restore();
    }

    // 若處於「⚡ 雷霆超載 (Thunder Overcharge)」，繪製雷電光環
    if (this.thunderOverchargeTimer > 0) {
      ctx.save();
      ctx.strokeStyle = "#fde047";
      ctx.lineWidth = 2.2;
      ctx.beginPath();
      ctx.arc(
        this.x,
        this.y,
        30 + Math.sin(this.animTime * 16) * 4,
        0,
        Math.PI * 2
      );
      ctx.stroke();
      ctx.restore();
    }

    SpriteRenderer.drawPlayer(ctx, this);

    // 若「狂暴集火號角」啟動中，在目標區域繪製醒目的金色集火戰術準星
    if (this.commandTimer > 0) {
      const tx = this.commandTarget.x;
      const ty = this.commandTarget.y;
      ctx.save();
      ctx.translate(tx, ty);
      ctx.rotate(this.animTime * 3.5);
      ctx.strokeStyle = "rgba(245, 158, 11, 0.85)";
      ctx.lineWidth = 2.5;
      ctx.setLineDash([8, 6]);
      ctx.beginPath();
      ctx.arc(0, 0, 48, 0, Math.PI * 2);
      ctx.stroke();
      ctx.setLineDash([]);

      ctx.beginPath();
      ctx.moveTo(-58, 0);
      ctx.lineTo(-32, 0);
      ctx.moveTo(32, 0);
      ctx.lineTo(58, 0);
      ctx.moveTo(0, -58);
      ctx.lineTo(0, -32);
      ctx.moveTo(0, 32);
      ctx.lineTo(0, 58);
      ctx.stroke();
      ctx.restore();
    }
  }
}
