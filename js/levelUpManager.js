import { MINION_DATA, MYTHIC_RECIPES, BOSS_CHEST_REWARDS } from "./data.js?v=11";
import { Minion } from "./minion.js?v=11";
import { SpriteRenderer } from "./spriteRenderer.js?v=11";

/**
 * 升級抽卡、Reroll 刷新、三合一升星、★★★★ 神話跨種族融合 與 首領寶箱獎勵管理器 (LevelUpManager)
 */
export class LevelUpManager {
  constructor(game) {
    this.game = game;
    this.dialog = document.getElementById("levelup-modal");
    this.modalTitle = document.getElementById("levelup-modal-title");
    this.modalSubtitle = document.getElementById("levelup-modal-subtitle");
    this.cardContainer = document.getElementById("card-choices");
    this.rerollBtn = document.getElementById("reroll-btn");
    this.rerollCountSpan = document.getElementById("reroll-count");

    this.pendingLevelUps = 0;
    this.pendingBossChests = 0;
    this.currentMode = "levelup"; // "levelup" | "chest"
    this.rerollsLeft = 1;

    this.floatingTexts = [];

    this.dialog.addEventListener("cancel", (e) => {
      e.preventDefault();
    });

    if (this.rerollBtn) {
      this.rerollBtn.addEventListener("click", () => this.handleReroll());
    }
  }

  setInitialRerolls(count) {
    this.rerollsLeft = count;
    this.updateRerollButton();
  }

  updateRerollButton() {
    if (!this.rerollBtn || !this.rerollCountSpan) return;
    this.rerollCountSpan.textContent = this.rerollsLeft;
    if (this.currentMode === "chest" || this.rerollsLeft <= 0) {
      this.rerollBtn.disabled = true;
      this.rerollBtn.style.opacity = "0.45";
    } else {
      this.rerollBtn.disabled = false;
      this.rerollBtn.style.opacity = "1";
    }
  }

  handleReroll() {
    if (this.currentMode !== "levelup" || this.rerollsLeft <= 0) return;
    this.rerollsLeft -= 1;
    if (this.game.soundManager) {
      this.game.soundManager.playButton();
    }
    this.updateRerollButton();
    const choices = this.getRandomCardChoices(3);
    this.renderCards(choices);
  }

  queueLevelUp() {
    this.pendingLevelUps += 1;
    if (!this.dialog.open) {
      this.openNextModal();
    }
  }

  queueBossChest() {
    this.pendingBossChests += 1;
    if (!this.dialog.open) {
      this.openNextModal();
    }
  }

  openNextModal() {
    if (this.pendingBossChests > 0) {
      this.currentMode = "chest";
      this.openChestDraft();
      return;
    }

    if (this.pendingLevelUps > 0) {
      this.currentMode = "levelup";
      this.openLevelUpDraft();
      return;
    }

    this.game.isPaused = false;
  }

  openLevelUpDraft() {
    this.game.isPaused = true;
    this.game.input.keys.clear();

    if (this.modalTitle) {
      this.modalTitle.textContent = "✨ 召喚師升級！選擇你的隨從 ✨";
    }
    if (this.modalSubtitle) {
      this.modalSubtitle.textContent =
        "湊齊 3 隻同星隨從自動升星；兩隻 ★3 可觸發 ★★★★ 神話融合！";
    }

    this.updateRerollButton();
    const choices = this.getRandomCardChoices(3);
    this.renderCards(choices);

    if (!this.dialog.open) {
      this.dialog.showModal();
    }
  }

  openChestDraft() {
    this.game.isPaused = true;
    this.game.input.keys.clear();

    if (this.modalTitle) {
      this.modalTitle.textContent = "📦 獲得首領寶箱！選擇一項傳說秘寶 📦";
    }
    if (this.modalSubtitle) {
      this.modalSubtitle.textContent =
        "擊敗強敵或獻祭聖壇獲得的皇家秘寶，將永久顯示於左上角遺物裝備欄！";
    }

    this.updateRerollButton();

    const pool = [...BOSS_CHEST_REWARDS];
    for (let i = pool.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [pool[i], pool[j]] = [pool[j], pool[i]];
    }
    const choices = pool.slice(0, 3);
    this.renderChestRewards(choices);

    if (!this.dialog.open) {
      this.dialog.showModal();
    }
  }

  renderChestRewards(rewards) {
    this.cardContainer.innerHTML = "";

    rewards.forEach((reward, idx) => {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "minion-card merge-ready";
      if (idx === 0) btn.setAttribute("autofocus", "");

      btn.innerHTML = `
        <div class="card-header">
          <div class="chest-reward-icon">${reward.icon}</div>
          <div class="card-title-group">
            <div class="card-name">${reward.name}</div>
            <div class="card-type">🏆 首領寶箱專屬秘寶</div>
          </div>
        </div>
        <div class="card-stats" style="grid-template-columns: 1fr; line-height: 1.5; color: #e2e8f0;">
          <div>${reward.desc}</div>
        </div>
        <div class="merge-banner">✨ 點擊立即裝備秘寶</div>
      `;

      btn.addEventListener("click", () => {
        this.selectChestReward(reward);
      });

      this.cardContainer.appendChild(btn);
    });
  }

  selectChestReward(reward) {
    if (this.game.soundManager) {
      this.game.soundManager.playMergeStar(3);
    }

    const player = this.game.player;
    const syn = this.game.synergyManager;

    if (reward.type === "relic") {
      syn.addRelic(reward);
    }

    if (reward.id === "relic_magnet") {
      player.pickupRadius = Math.round(player.pickupRadius * 1.55);
      this.game.itemManager.magnetizeAllGems();
      this.addFloatingText("🧲 拾取範圍 +55% & 全圖吸寶！", player.x, player.y - 30, "#38bdf8");
    } else if (reward.id === "relic_boots") {
      syn.relicBonuses.moveSpeedBonus += 0.22;
      player.dashMaxCooldown = Math.max(1.5, player.dashMaxCooldown - 0.8);
      syn.recalculate(this.game.minions, player);
      this.addFloatingText("⚡ 全軍移速 +22% & 閃現冷卻縮減！", player.x, player.y - 30, "#fde047");
    } else if (reward.id === "relic_staff") {
      player.multiShot = (player.multiShot || 1) + 1;
      player.baseAttackPower += 12;
      this.addFloatingText("🪄 法杖連射升級 & 攻擊 +12！", player.x, player.y - 30, "#c084fc");
    } else if (reward.id === "relic_banner") {
      syn.relicBonuses.attackSpeedBonus += 0.25;
      player.commandMaxDuration += 2.0;
      syn.recalculate(this.game.minions, player);
      this.addFloatingText("📯 全軍攻速 +25% & 號角延長！", player.x, player.y - 30, "#f97316");
    } else if (reward.id === "relic_slayer") {
      syn.relicBonuses.critChanceBonus += 0.15;
      syn.relicBonuses.bossSlayerBonus += 0.3;
      syn.recalculate(this.game.minions, player);
      this.addFloatingText("🗡️ 弒神聖劍：全軍爆擊+15% & 首領破甲+30%！", player.x, player.y - 30, "#f43f5e");
    } else if (reward.id === "relic_aegis") {
      syn.relicBonuses.maxHpBonus += 0.25;
      syn.relicBonuses.phalanxExtraDR += 0.15;
      syn.recalculate(this.game.minions, player);
      this.addFloatingText("🛡️ 泰坦聖盾：最大生命+25% & 鐵壁減傷強化！", player.x, player.y - 30, "#38bdf8");
    } else if (reward.id === "reward_reinforce") {
      for (let i = 0; i < 2; i++) {
        const randTemplate =
          MINION_DATA[Math.floor(Math.random() * MINION_DATA.length)];
        this.game.addMinionById(randTemplate.id, 1);
        this.checkAndMergeMinions(randTemplate.id);
      }
      syn.recalculate(this.game.minions, player);
      this.addFloatingText("👑 皇家隨從空投增援 +2！", player.x, player.y - 30, "#fde047");
    }

    this.pendingBossChests = Math.max(0, this.pendingBossChests - 1);
    if (this.pendingBossChests > 0 || this.pendingLevelUps > 0) {
      this.openNextModal();
    } else {
      this.dialog.close("selected");
      this.dialog.returnValue = "";
      this.game.isPaused = false;
    }
  }

  /**
   * 檢查場上是否滿足「★★★★ 神話超進化融合」條件
   */
  findAvailableMythicFusion() {
    const star3Minions = this.game.minions.filter((m) => m.star === 3 && !m.isMythic);
    if (star3Minions.length < 2) return null;

    // 優先匹配指定配方
    for (const recipe of MYTHIC_RECIPES) {
      const [idA, idB] = recipe.ingredients;
      const unitA = star3Minions.find((m) => m.id === idA);
      const unitB = star3Minions.find(
        (m) => m !== unitA && (m.id === idB || m.id === recipe.altIngredient)
      );
      if (unitA && unitB) {
        return { recipe, unitA, unitB };
      }
    }

    // 若場上有任意 2 隻 ★3 隨從，也允許觸發跨種族神話融合，讓玩家更容易體驗 ★★★★ 神話泰坦！
    const unitA = star3Minions[0];
    const unitB = star3Minions[1];
    const matchedRecipe =
      MYTHIC_RECIPES.find((r) => r.ingredients.includes(unitA.id)) ||
      MYTHIC_RECIPES[0];
    return { recipe: matchedRecipe, unitA, unitB };
  }

  getRandomCardChoices(count = 3) {
    // 智慧湊星權重抽卡：已持有隨從（特別是 ★2 或 2/3 ★1 差一隻就升星者）獲得更高出現機率，
    // 讓玩家在中後期能穩定養出 2~4 隻 ★3 隨從並順利融合 ★★★★ 神話泰坦！
    const weightedPool = MINION_DATA.map((m) => {
      const s1 = this.countMinionsByIdAndStar(m.id, 1);
      const s2 = this.countMinionsByIdAndStar(m.id, 2);
      const s3 = this.countMinionsByIdAndStar(m.id, 3);
      let weight = 1.0;
      if (s1 === 2 && s2 === 2) {
        weight = 4.5; // 差一張直衝 ★3！
      } else if (s2 === 2) {
        weight = 3.2; // 已有兩隻 ★2，全力推進 ★3
      } else if (s1 === 2) {
        weight = 2.8; // 差一張合 ★2
      } else if (s2 === 1) {
        weight = 2.4; // 已有一隻 ★2，持續累積
      } else if (s1 === 1) {
        weight = 1.7;
      } else if (s3 >= 1) {
        weight = 0.45; // 已有 ★3 時降低重複率，把名額留給第二隻 ★3 湊神話融合
      }
      return { item: m, weight };
    });

    const choices = [];
    const remaining = [...weightedPool];
    for (let c = 0; c < count && remaining.length > 0; c++) {
      const totalWeight = remaining.reduce((sum, entry) => sum + entry.weight, 0);
      let r = Math.random() * totalWeight;
      let pickedIdx = 0;
      for (let i = 0; i < remaining.length; i++) {
        r -= remaining[i].weight;
        if (r <= 0) {
          pickedIdx = i;
          break;
        }
      }
      choices.push(remaining[pickedIdx].item);
      remaining.splice(pickedIdx, 1);
    }

    // 若場上擁有可進行「★★★★ 神話超進化」的兩隻 ★3 隨從，第一張卡必出神話融合卡！
    const mythicMatch = this.findAvailableMythicFusion();
    if (mythicMatch) {
      choices[0] = {
        ...mythicMatch.recipe,
        isMythicFusionCard: true,
        fusionUnits: [mythicMatch.unitA, mythicMatch.unitB]
      };
    }

    return choices;
  }

  countMinionsByIdAndStar(minionId, star = 1) {
    let count = 0;
    for (const m of this.game.minions) {
      if (m.id === minionId && m.star === star) {
        count += 1;
      }
    }
    return count;
  }

  renderCards(choices) {
    this.cardContainer.innerHTML = "";

    choices.forEach((template, idx) => {
      const isMythicCard = Boolean(template.isMythicFusionCard);
      const star1Count = this.countMinionsByIdAndStar(template.id, 1);
      const star2Count = this.countMinionsByIdAndStar(template.id, 2);
      const willMergeTo2 = !isMythicCard && star1Count === 2;
      const willMergeTo3 = !isMythicCard && star1Count === 2 && star2Count === 2;

      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = `minion-card ${isMythicCard ? "mythic-fusion-card" : willMergeTo2 ? "merge-ready" : ""}`;
      if (idx === 0) {
        btn.setAttribute("autofocus", "");
      }

      const tagsHtml = template.tags
        .map((t) => `<span class="tag-pill">${t}</span>`)
        .join("");

      let mergeBanner = "";
      if (isMythicCard) {
        const [uA, uB] = template.fusionUnits;
        mergeBanner = `<div class="merge-banner mythic">🌈 神話融合：消耗 ★3 ${uA.baseName} + ★3 ${uB.baseName} ➔ 降臨 ★★★★ 神話泰坦！</div>`;
      } else if (willMergeTo3) {
        mergeBanner = `<div class="merge-banner super">🔥 選取將連鎖合成 ★★★3 星並解鎖【${template.awakenedName}】大招！</div>`;
      } else if (willMergeTo2) {
        mergeBanner = `<div class="merge-banner">✨ 已擁有 2/3 隻 ★1 — 選取立即合成 ★2！</div>`;
      } else {
        mergeBanner = `<div class="owned-info">目前持有 ★1: ${star1Count} / 3 ${star2Count > 0 ? `(★2: ${star2Count})` : ""}</div>`;
      }

      btn.innerHTML = `
        <div class="card-header">
          <canvas class="card-portrait" width="56" height="56"></canvas>
          <div class="card-title-group">
            <div class="card-name">${template.name}</div>
            <div class="card-type">${isMythicCard ? "🌈 ★★★★ 跨種族神話超進化" : `${template.roleTag || template.attackType}`}</div>
          </div>
        </div>
        <div class="card-tags">${tagsHtml}</div>
        <div class="card-skill-desc">${template.skillDesc || ""}</div>
        <div class="card-ult-box">
          <div class="ult-title">${template.ultName || "🌟 ★3 終極覺醒技"}</div>
          <div class="ult-desc">${template.ultDesc || ""}</div>
        </div>
        <div class="card-stats">
          <div>❤️ 生命: <b>${template.stats.maxHp}</b></div>
          <div>🗡️ 攻擊: <b>${template.stats.attackPower}</b></div>
          <div>⚡ 攻速: <b>${template.stats.attackSpeed}/s</b></div>
          <div>🎯 射程: <b>${template.stats.range}</b></div>
        </div>
        ${mergeBanner}
      `;

      const portraitCanvas = btn.querySelector(".card-portrait");
      if (portraitCanvas) {
        const pCtx = portraitCanvas.getContext("2d");
        pCtx.save();
        pCtx.translate(28, 36);
        pCtx.scale(isMythicCard ? 0.55 : 0.85, isMythicCard ? 0.55 : 0.85);
        SpriteRenderer.drawMinion(
          pCtx,
          {
            id: template.id,
            x: 0,
            y: 0,
            star: isMythicCard ? 4 : 1,
            isMythic: isMythicCard,
            state: "ATTACKING"
          },
          1.2
        );
        pCtx.restore();
      }

      btn.addEventListener("click", () => {
        this.selectCard(template);
      });

      this.cardContainer.appendChild(btn);
    });
  }

  selectCard(template) {
    if (this.game.soundManager) {
      this.game.soundManager.playButton();
    }

    if (template.isMythicFusionCard && template.fusionUnits) {
      this.executeMythicFusion(template, template.fusionUnits);
    } else {
      this.game.addMinionById(template.id, 1);
      this.checkAndMergeMinions(template.id);
    }

    if (this.game.synergyManager) {
      this.game.synergyManager.recalculate(this.game.minions, this.game.player);
    }

    this.pendingLevelUps = Math.max(0, this.pendingLevelUps - 1);
    if (this.pendingBossChests > 0 || this.pendingLevelUps > 0) {
      this.openNextModal();
    } else {
      this.dialog.close("selected");
      this.dialog.returnValue = "";
      this.game.isPaused = false;
    }
  }

  /**
   * 執行 ★★★★4 星跨種族神話融合
   */
  executeMythicFusion(recipe, [unitA, unitB]) {
    const inheritedDamage =
      (unitA.totalDamageDealt || 0) + (unitB.totalDamageDealt || 0);
    const spawnX = this.game.player.x;
    const spawnY = this.game.player.y - 45;

    this.game.minions = this.game.minions.filter(
      (m) => m !== unitA && m !== unitB
    );

    const mythicMinion = new Minion(
      recipe,
      spawnX,
      spawnY,
      4,
      this.game.player.damageMultiplier || 1.0
    );
    mythicMinion.totalDamageDealt = inheritedDamage;
    this.game.minions.push(mythicMinion);

    if (this.game.soundManager) {
      this.game.soundManager.playMergeStar(4);
    }
    if (this.game.vfx) {
      this.game.vfx.spawnShockwave(spawnX, spawnY, 210, "#e879f9", 0.65);
      this.game.vfx.spawnShockwave(spawnX, spawnY, 150, "#fde047", 0.5);
      this.game.vfx.spawnBurst(spawnX, spawnY, "#fde047", 36, 280);
      this.game.vfx.triggerShake(14, 0.45);
    }
    // 觸發電影級鏡頭拉近與慢動作頓幀
    this.game.triggerCinematicMoment(1.24, 0.85, 0.25, 0.42);

    this.addFloatingText(
      `🌈 神話超進化降臨：${recipe.name} ★★★★！`,
      spawnX,
      spawnY - 40,
      "#fde047"
    );
  }

  checkAndMergeMinions(minionId) {
    let mergedAny = true;

    while (mergedAny) {
      mergedAny = false;

      const starGroups = new Map();
      for (const m of this.game.minions) {
        if (m.id === minionId && m.star < 3) {
          if (!starGroups.has(m.star)) {
            starGroups.set(m.star, []);
          }
          starGroups.get(m.star).push(m);
        }
      }

      for (const [star, list] of starGroups.entries()) {
        if (list.length >= 3) {
          const toRemove = list.slice(0, 3);
          const centerMinion = toRemove[0];
          const mergeX = centerMinion.x;
          const mergeY = centerMinion.y;

          const inheritedDamage = toRemove.reduce(
            (sum, unit) => sum + (unit.totalDamageDealt || 0),
            0
          );

          this.game.minions = this.game.minions.filter((m) => !toRemove.includes(m));

          const template = MINION_DATA.find((d) => d.id === minionId);
          const newStar = star + 1;
          const upgraded = new Minion(
            template,
            mergeX,
            mergeY,
            newStar,
            this.game.player.damageMultiplier || 1.0
          );
          upgraded.totalDamageDealt = inheritedDamage;
          this.game.minions.push(upgraded);

          this.game.projectileManager.addExplosionEffect(
            mergeX,
            mergeY,
            95,
            "#facc15"
          );
          if (this.game.vfx) {
            this.game.vfx.spawnShockwave(
              mergeX,
              mergeY,
              newStar >= 3 ? 160 : 110,
              newStar >= 3 ? "#f43f5e" : "#fde047",
              0.5
            );
            this.game.vfx.spawnBurst(mergeX, mergeY, "#fde047", 26, 250);
            this.game.vfx.triggerShake(newStar >= 3 ? 11 : 7, 0.3);
          }
          if (this.game.soundManager) {
            this.game.soundManager.playMergeStar(newStar);
          }

          if (newStar >= 3) {
            // ★3 終極覺醒：觸發鏡頭拉近與慢動作頓幀特效！
            this.game.triggerCinematicMoment(1.16, 0.65, 0.3, 0.32);
            this.addFloatingText(
              `🌟 ★★★ 終極覺醒：【${upgraded.name}】解鎖 ${template.ultName}！`,
              mergeX,
              mergeY - 34,
              "#fda4af"
            );
          } else {
            this.addFloatingText(
              `⭐ 合成升星！${upgraded.name} ★${newStar}`,
              mergeX,
              mergeY - 24,
              "#fde047"
            );
          }

          mergedAny = true;
          break;
        }
      }
    }
  }

  addFloatingText(text, x, y, color = "#fde047") {
    this.floatingTexts.push({
      text,
      x,
      y,
      color,
      timer: 1.5,
      maxTimer: 1.5
    });
  }

  updateEffects(dt) {
    for (let i = this.floatingTexts.length - 1; i >= 0; i--) {
      const ft = this.floatingTexts[i];
      ft.y -= 35 * dt;
      ft.timer -= dt;
      if (ft.timer <= 0) {
        this.floatingTexts.splice(i, 1);
      }
    }
  }

  drawEffects(ctx) {
    for (let i = 0; i < this.floatingTexts.length; i++) {
      const ft = this.floatingTexts[i];
      const alpha = Math.max(0, ft.timer / ft.maxTimer);
      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.font = "bold 15px 'Segoe UI', 'Microsoft JhengHei', sans-serif";
      ctx.textAlign = "center";
      ctx.strokeStyle = "#000000";
      ctx.lineWidth = 3;
      ctx.strokeText(ft.text, ft.x, ft.y);
      ctx.fillStyle = ft.color;
      ctx.fillText(ft.text, ft.x, ft.y);
      ctx.restore();
    }
  }
}
