import { SHRINE_TYPES } from "./data.js?v=12";

/**
 * 地圖隨機互動機關與「太古聖壇事件」管理器 (ShrineManager)
 * -----------------------------------------------------------------
 * 1. 每隔約 36 秒在地圖隨機方位降臨一座互動式太古聖壇 (開局第 14 秒即降臨第一座！)
 *    - ⚡ 雷霆超載聖壇：站圈 3 秒，全軍獲得 15 秒【雷霆超載】(移速+45%、攻速+50%、天罰落雷轟擊)
 *    - 🩸 鮮血獻祭祭壇：站圈 2.5 秒，獻祭主角 25% 當前生命，立即掉落【皇家秘寶箱】+ 隨機 1 星隨從直升 2 星！
 *    - 🌟 星辰賜福聖壇：站圈 3 秒，全軍恢復 35% 生命、贈送 +45 金幣並立即免費獲得一次隨從抽卡！
 * 2. 畫面邊緣動態方向指引箭頭 (Off-screen Indicator)：清楚標示聖壇與「貪婪黃金哥布林」的方位與距離
 */
export class ShrineManager {
  constructor(worldConfig) {
    this.world = worldConfig;
    this.activeShrines = [];
    this.spawnTimer = 14.0; // 開局 14 秒刷出第一座聖壇
    this.spawnInterval = 36.0;
    this.thunderStrikeTimer = 0;
  }

  reset() {
    this.activeShrines.length = 0;
    this.spawnTimer = 14.0;
    this.thunderStrikeTimer = 0;
  }

  update(dt, game) {
    const { player, minions, vfx, soundManager, itemManager, levelUpManager, quadtree } = game;

    // 1. 處理「⚡ 雷霆超載 (Thunder Overcharge)」持續期間的天罰落雷轟擊
    if (player.thunderOverchargeTimer > 0) {
      player.thunderOverchargeTimer = Math.max(0, player.thunderOverchargeTimer - dt);
      this.thunderStrikeTimer -= dt;
      if (this.thunderStrikeTimer <= 0) {
        this.thunderStrikeTimer = 0.45;
        const targets = quadtree.queryCircle(player.x, player.y, 380);
        if (targets.length > 0) {
          const hitEnemy = targets[Math.floor(Math.random() * targets.length)];
          if (hitEnemy && hitEnemy.active) {
            const lightningDmg = Math.round((28 + player.level * 5) * player.damageMultiplier);
            game.handleDamageEnemy(hitEnemy, lightningDmg, player.x, player.y, null, true);
            game.projectileManager.addLightningBolt(
              hitEnemy.x + (Math.random() - 0.5) * 30,
              hitEnemy.y - 260,
              hitEnemy.x,
              hitEnemy.y,
              "#38bdf8"
            );
            vfx.spawnShockwave(hitEnemy.x, hitEnemy.y, 45, "#fde047", 0.22);
          }
        }
      }
    }

    // 2. 聖壇定時生成計時
    this.spawnTimer -= dt;
    if (this.spawnTimer <= 0 && this.activeShrines.length < 2) {
      this.spawnTimer = this.spawnInterval;
      this.spawnRandomShrine(player, levelUpManager, soundManager, vfx);
    }

    // 3. 更新場上活躍聖壇與玩家站圈充能進度
    for (let i = this.activeShrines.length - 1; i >= 0; i--) {
      const s = this.activeShrines[i];
      s.animTime += dt;
      s.lifeTimer -= dt;

      if (s.lifeTimer <= 0) {
        this.activeShrines.splice(i, 1);
        continue;
      }

      const dist = Math.hypot(player.x - s.x, player.y - s.y);
      if (dist <= s.radius) {
        s.progress = Math.min(s.chargeTime, s.progress + dt);
        if (Math.random() < 0.35) {
          vfx.spawnBurst(player.x, player.y, s.color, 1, 55);
        }
        if (s.progress >= s.chargeTime) {
          this.triggerShrineEffect(s, game);
          this.activeShrines.splice(i, 1);
        }
      } else {
        s.progress = Math.max(0, s.progress - dt * 0.5);
      }
    }
  }

  spawnRandomShrine(player, levelUpManager, soundManager, vfx) {
    const cfg = SHRINE_TYPES[Math.floor(Math.random() * SHRINE_TYPES.length)];
    const pad = this.world.boundaryPadding + 180;
    const angle = Math.random() * Math.PI * 2;
    const dist = 420 + Math.random() * 240;

    const x = Math.max(
      pad,
      Math.min(this.world.width - pad, player.x + Math.cos(angle) * dist)
    );
    const y = Math.max(
      pad,
      Math.min(this.world.height - pad, player.y + Math.sin(angle) * dist)
    );

    this.activeShrines.push({
      ...cfg,
      x,
      y,
      radius: 82,
      progress: 0,
      animTime: 0,
      lifeTimer: 45.0 // 聖壇存在 45 秒
    });

    if (soundManager) soundManager.playPowerup();
    if (vfx) vfx.spawnShockwave(x, y, 130, cfg.color, 0.5);
    if (levelUpManager) {
      levelUpManager.addFloatingText(
        `🗺️ 遠古聖壇降臨：【${cfg.name}】！跟隨方向箭頭前往佔領！`,
        player.x,
        player.y - 48,
        cfg.color
      );
    }
  }

  triggerShrineEffect(shrine, game) {
    const { player, minions, vfx, soundManager, itemManager, levelUpManager, metaManager } =
      game;

    if (soundManager) soundManager.playMergeStar(3);
    if (vfx) {
      vfx.spawnShockwave(shrine.x, shrine.y, 190, shrine.color, 0.55);
      vfx.spawnBurst(shrine.x, shrine.y, shrine.secondaryColor, 26, 240);
    }
    game.triggerCinematicMoment(1.12, 0.45, 0.35, 0.18);

    if (shrine.id === "thunder") {
      player.thunderOverchargeTimer = 15.0;
      levelUpManager.addFloatingText(
        "⚡ 雷霆超載啟動 (15秒)：全軍攻速+50%、移速+45% & 天罰落雷！",
        player.x,
        player.y - 40,
        "#38bdf8"
      );
    } else if (shrine.id === "blood") {
      const sacrifice = Math.max(1, Math.floor(player.hp * 0.25));
      player.hp = Math.max(1, player.hp - sacrifice);
      vfx.spawnDamagePopup(player.x, player.y - 26, `獻祭 -${sacrifice} HP`, true, "#f43f5e");

      // 掉落一個皇家秘寶箱
      itemManager.spawnSpecialItem(shrine.x, shrine.y, "chest");

      // 隨機將場上一隻 ★1 隨從直接晉升為 ★2！
      const star1Minions = minions.filter((m) => m.star === 1);
      if (star1Minions.length > 0) {
        const lucky = star1Minions[Math.floor(Math.random() * star1Minions.length)];
        lucky.star = 2;
        lucky.recalculateStats(true);
        vfx.spawnShockwave(lucky.x, lucky.y, 90, "#facc15", 0.45);
        levelUpManager.checkAndMergeMinions(lucky.id);
        levelUpManager.addFloatingText(
          `🩸 鮮血獻祭完成：掉落秘寶箱 + 【${lucky.name}】直升 ★★2 星！`,
          player.x,
          player.y - 42,
          "#f43f5e"
        );
      } else {
        levelUpManager.addFloatingText(
          "🩸 鮮血獻祭完成：獲得【皇家首領秘寶箱】！",
          player.x,
          player.y - 42,
          "#f43f5e"
        );
      }
    } else if (shrine.id === "starlight") {
      // 全軍恢復 35% 生命 + 免費抽卡 + 賞金
      const healP = Math.round(player.maxHp * 0.35);
      player.hp = Math.min(player.maxHp, player.hp + healP);
      for (const m of minions) {
        m.isDowned = false;
        m.hp = Math.min(m.maxHp, m.hp + Math.round(m.maxHp * 0.5));
      }
      const shrineGold = metaManager.addGold(180);
      levelUpManager.queueLevelUp();
      levelUpManager.addFloatingText(
        `🌟 星辰賜福：全軍恢復生命 + ${shrineGold.toLocaleString()}金幣 + 免費隨從抽卡！`,
        player.x,
        player.y - 42,
        "#fde047"
      );
    }
  }

  /**
   * 繪製世界空間中的互動聖壇法陣與充能進度環
   */
  drawWorld(ctx) {
    for (const s of this.activeShrines) {
      ctx.save();
      ctx.translate(s.x, s.y);

      const pulse = 0.85 + 0.15 * Math.sin(s.animTime * 4);

      // 1. 聖壇地面光暈池
      const grad = ctx.createRadialGradient(0, 0, 10, 0, 0, s.radius);
      grad.addColorStop(0, "rgba(255, 255, 255, 0.22)");
      grad.addColorStop(0.6, `${s.color}33`);
      grad.addColorStop(1, "rgba(0, 0, 0, 0)");
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(0, 0, s.radius, 0, Math.PI * 2);
      ctx.fill();

      // 2. 旋轉符文外圈
      ctx.save();
      ctx.rotate(s.animTime * 0.8);
      ctx.strokeStyle = s.color;
      ctx.lineWidth = 2.5;
      ctx.setLineDash([14, 10]);
      ctx.beginPath();
      ctx.arc(0, 0, s.radius - 4, 0, Math.PI * 2);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.restore();

      // 3. 站圈充能進度圓環 (Progress Ring)
      if (s.progress > 0) {
        const ratio = Math.min(1, s.progress / s.chargeTime);
        ctx.strokeStyle = "#fde047";
        ctx.lineWidth = 6;
        ctx.beginPath();
        ctx.arc(
          0,
          0,
          s.radius + 6,
          -Math.PI / 2,
          -Math.PI / 2 + Math.PI * 2 * ratio
        );
        ctx.stroke();
      }

      // 4. 聖壇中央古石底座與懸浮圖騰
      ctx.fillStyle = "#1e1b26";
      ctx.strokeStyle = s.color;
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.arc(0, 0, 24, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      const bob = Math.sin(s.animTime * 3.5) * 5;
      ctx.font = "24px 'Segoe UI Emoji', sans-serif";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(s.icon, 0, -6 + bob);

      // 5. 聖壇名稱與提示文字
      ctx.font = "bold 12px 'Segoe UI', 'Microsoft JhengHei', sans-serif";
      ctx.fillStyle = "#ffffff";
      ctx.strokeStyle = "rgba(0,0,0,0.85)";
      ctx.lineWidth = 3;
      const label =
        s.progress > 0
          ? `${s.name} (${Math.round((s.progress / s.chargeTime) * 100)}%)`
          : `${s.name} [站入圈內啟動]`;
      ctx.strokeText(label, 0, -s.radius - 12);
      ctx.fillStyle = s.secondaryColor;
      ctx.fillText(label, 0, -s.radius - 12);

      ctx.restore();
    }
  }

  /**
   * 繪製螢幕邊緣的「聖壇 & 貪婪黃金哥布林」方向指引箭頭
   */
  drawScreenIndicators(ctx, camera, canvasWidth, canvasHeight, player, activeEnemies) {
    const targets = [];

    for (const s of this.activeShrines) {
      targets.push({
        x: s.x,
        y: s.y,
        icon: s.icon,
        name: s.name,
        color: s.color
      });
    }

    // 若場上有「大 Boss、小 Boss 或 貪婪黃金哥布林」，於畫面邊緣顯示顯眼追蹤指標！
    if (activeEnemies) {
      for (const e of activeEnemies) {
        if (!e.active) continue;
        if (e.isBoss) {
          targets.push({
            x: e.x,
            y: e.y,
            icon: "👑",
            name: e.name,
            color: e.color || "#ef4444"
          });
        } else if (e.isMiniBoss) {
          targets.push({
            x: e.x,
            y: e.y,
            icon: "⚔️",
            name: e.name,
            color: e.color || "#f97316"
          });
        } else if (e.isGoblin) {
          targets.push({
            x: e.x,
            y: e.y,
            icon: "💰",
            name: "黃金哥布林",
            color: "#facc15"
          });
        }
      }
    }

    const margin = 64;
    const halfW = canvasWidth / 2 - margin;
    const halfH = canvasHeight / 2 - margin;

    // 計算「不被 UI 遮擋的安全可視區」，若哥布林或 Boss 躲在左側羈絆欄 / 頂部或底部 HUD 後方，指標箭頭依然會精準提示位置！
    const synergyPanel =
      typeof document !== "undefined" ? document.getElementById("synergy-panel") : null;
    const isSynergyCollapsed = synergyPanel
      ? synergyPanel.classList.contains("collapsed")
      : false;
    const leftSafe = isSynergyCollapsed ? 52 : 210;
    const rightSafe = canvasWidth - 52;
    const topSafe = 108;
    const bottomSafe = canvasHeight - 110;

    for (const t of targets) {
      const screenX = t.x - camera.x;
      const screenY = t.y - camera.y;

      // 若已在中央清晰可視區內則不需邊緣箭頭
      if (
        screenX >= leftSafe &&
        screenX <= rightSafe &&
        screenY >= topSafe &&
        screenY <= bottomSafe
      ) {
        continue;
      }

      const dx = t.x - player.x;
      const dy = t.y - player.y;
      const angle = Math.atan2(dy, dx);
      const distMeters = Math.round(Math.hypot(dx, dy) / 10);

      const ix = canvasWidth / 2 + Math.cos(angle) * Math.min(halfW, 340);
      const iy = canvasHeight / 2 + Math.sin(angle) * Math.min(halfH, 240);

      ctx.save();
      ctx.translate(ix, iy);

      // 指標圓框
      ctx.fillStyle = "rgba(15, 23, 42, 0.9)";
      ctx.strokeStyle = t.color;
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.arc(0, 0, 22, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      // 指向外推三角箭頭
      ctx.save();
      ctx.rotate(angle);
      ctx.fillStyle = t.color;
      ctx.beginPath();
      ctx.moveTo(32, 0);
      ctx.lineTo(21, -7);
      ctx.lineTo(21, 7);
      ctx.closePath();
      ctx.fill();
      ctx.restore();

      // 圖示與距離
      ctx.font = "16px 'Segoe UI Emoji', sans-serif";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(t.icon, 0, -2);

      ctx.font = "bold 11px 'Segoe UI', 'Microsoft JhengHei', sans-serif";
      ctx.fillStyle = t.color;
      ctx.fillText(`${distMeters}m`, 0, 32);

      ctx.restore();
    }
  }
}
