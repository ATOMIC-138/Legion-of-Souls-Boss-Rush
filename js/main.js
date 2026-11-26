import { WORLD_CONFIG, MINION_DATA, MYTHIC_RECIPES } from "./data.js?v=12";
import { InputHandler } from "./input.js?v=12";
import { Player } from "./player.js?v=12";
import { ObjectPool } from "./pool.js?v=12";
import { Quadtree } from "./quadtree.js?v=12";
import { Enemy } from "./enemy.js?v=12";
import { WaveManager } from "./waveManager.js?v=12";
import { Minion } from "./minion.js?v=12";
import { ProjectileManager } from "./projectile.js?v=12";
import { ItemManager } from "./item.js?v=12";
import { LevelUpManager } from "./levelUpManager.js?v=12";
import { SynergyManager } from "./synergyManager.js?v=12";
import { VFXManager } from "./vfx.js?v=12";
import { SpriteRenderer } from "./spriteRenderer.js?v=12";
import { SoundManager } from "./soundManager.js?v=12";
import { MetaProgressionManager } from "./metaManager.js?v=12";
import { BossHazardManager } from "./bossHazardManager.js?v=12";
import { ArenaRenderer } from "./arenaRenderer.js?v=12";
import { ShrineManager } from "./shrineManager.js?v=12";

/**
 * 遊戲主控制器 (Game Engine - 終極完整版)
 * 包含：
 * - 30 波次制與三大傳說君王大 Boss (伊格尼斯 / 阿拉克涅 / 瑪爾扎哈)
 * - 隨從 ★3 終極覺醒大招 & ★★★★ 跨種族神話超進化融合
 * - 地圖隨機互動聖壇事件 (雷霆超載 / 鮮血獻祭 / 星辰賜福) & 貪婪黃金哥布林盜寶賊
 * - R 鍵 / Tab 鍵一鍵切換隨從陣型 (⚔️自由狩獵陣 vs 🛡️鐵壁護衛陣)
 * - WebAudio 合成器動態分層 BGM + 鏡頭動態縮放 (Camera Zoom) 與慢動作頓幀 (Hit-Stop)
 * - 左上角傳說遺物裝備欄、主畫面傳說造型商場與 📖 魔導圖鑑系統
 */
class Game {
  constructor() {
    this.canvas = document.getElementById("game-canvas");
    this.ctx = this.canvas.getContext("2d");

    // HUD DOM 元素
    this.hpBarFill = document.getElementById("hp-bar-fill");
    this.hpText = document.getElementById("hp-text");
    this.expBarFill = document.getElementById("exp-bar-fill");
    this.expText = document.getElementById("exp-text");
    this.levelText = document.getElementById("level-text");
    this.waveBadge = document.getElementById("wave-badge");
    this.timerDisplay = document.getElementById("timer-display");
    this.killCountText = document.getElementById("kill-count-text");
    this.minionCountText = document.getElementById("minion-count-text");
    this.muteToggleBtn = document.getElementById("mute-toggle-btn");
    this.muteStatusText = document.getElementById("mute-status-text");

    // 專屬大 Boss 頂部巨型血條與技能提示 HUD
    this.bossHudPanel = document.getElementById("boss-hud-panel");
    this.bossHudName = document.getElementById("boss-hud-name");
    this.bossHudHpText = document.getElementById("boss-hud-hp-text");
    this.bossHudBarFill = document.getElementById("boss-hud-bar-fill");
    this.bossHudSkill = document.getElementById("boss-hud-skill");

    // 主動技能與陣型 HUD 元素
    this.skillDashBox = document.getElementById("skill-dash-box");
    this.dashCdText = document.getElementById("dash-cd-text");
    this.skillCmdBox = document.getElementById("skill-cmd-box");
    this.cmdCdText = document.getElementById("cmd-cd-text");
    this.skillStanceBox = document.getElementById("skill-stance-box");
    this.stanceIcon = document.getElementById("stance-icon");
    this.stanceName = document.getElementById("stance-name");
    this.stanceDesc = document.getElementById("stance-desc");

    this.bossAlertBanner = document.getElementById("boss-alert-banner");
    this.bossAlertInner = this.bossAlertBanner
      ? this.bossAlertBanner.querySelector(".boss-alert-inner")
      : null;

    // 結算 Modal 元素
    this.gameoverModal = document.getElementById("gameover-modal");
    this.summaryTitle = document.getElementById("summary-title");
    this.summarySubtitle = document.getElementById("summary-subtitle");
    this.sumTime = document.getElementById("sum-time");
    this.sumKills = document.getElementById("sum-kills");
    this.sumLevel = document.getElementById("sum-level");
    this.sumGold = document.getElementById("sum-gold");
    this.dpsLeaderboard = document.getElementById("dps-leaderboard");
    this.restartNowBtn = document.getElementById("restart-now-btn");
    this.backToTitleBtn = document.getElementById("back-to-title-btn");

    // 遊戲地圖尺寸、鏡頭、動態縮放與高質感古戰場背景渲染器
    this.world = { ...WORLD_CONFIG };
    this.camera = { x: 0, y: 0 };
    this.cameraZoom = 1.0;
    this.targetZoom = 1.0;
    this.zoomTimer = 0;
    this.timeScale = 1.0;
    this.timeScaleTimer = 0;

    this.arenaRenderer = new ArenaRenderer(this.world);
    this.shrineManager = new ShrineManager(this.world);

    // 音效、輸入與局外永久天賦/造型管理器
    this.soundManager = new SoundManager();
    this.input = new InputHandler(this.canvas);
    this.metaManager = new MetaProgressionManager(this.soundManager);
    this.metaManager.onSkinChanged = () => {
      if (!this.hasStarted) {
        this.resetMatchState();
      }
    };
    this.metaManager.renderShop();

    // 物件池、四叉樹、VFX、Boss 彈幕機關、升級與羈絆管理器
    this.enemyPool = new ObjectPool(() => new Enemy(), 180);
    this.quadtree = new Quadtree(
      { x: 0, y: 0, width: this.world.width, height: this.world.height },
      8,
      6
    );
    this.projectileManager = new ProjectileManager(180);
    this.bossHazardManager = new BossHazardManager();
    this.itemManager = new ItemManager(240);
    this.vfx = new VFXManager();
    this.synergyManager = new SynergyManager();
    this.levelUpManager = new LevelUpManager(this);

    // 開始介面 DOM 綁定
    this.startScreen = document.getElementById("start-screen");
    this.startBtn = document.getElementById("start-game-btn");
    this.previewCanvas = document.getElementById("start-preview-canvas");
    this.previewCtx = this.previewCanvas ? this.previewCanvas.getContext("2d") : null;

    if (this.startBtn) {
      this.startBtn.addEventListener("click", () => this.beginGame());
    }
    if (this.skillStanceBox) {
      this.skillStanceBox.addEventListener("click", () => {
        if (this.hasStarted && !this.isPaused && this.player) {
          this.togglePlayerStance();
        }
      });
    }
    if (this.muteToggleBtn) {
      this.muteToggleBtn.addEventListener("click", () => {
        this.toggleAudioMute();
        this.muteToggleBtn.blur();
      });
    }
    const synergyPanel = document.getElementById("synergy-panel");
    const synergyToggleBtn = document.getElementById("synergy-toggle-btn");
    if (synergyPanel && synergyToggleBtn) {
      synergyToggleBtn.addEventListener("click", () => {
        const collapsed = synergyPanel.classList.toggle("collapsed");
        synergyToggleBtn.textContent = collapsed ? "▶" : "◀";
        synergyToggleBtn.blur();
      });
    }
    if (this.restartNowBtn) {
      this.restartNowBtn.addEventListener("click", () => {
        this.soundManager.playButton();
        this.gameoverModal.close();
        this.resetMatchState();
        this.beginGame();
      });
    }
    if (this.backToTitleBtn) {
      this.backToTitleBtn.addEventListener("click", () => {
        this.soundManager.playButton();
        this.gameoverModal.close();
        this.resetMatchState();
        this.metaManager.renderShop();
        if (this.startScreen) {
          this.startScreen.classList.remove("hidden");
        }
      });
    }

    this.gameoverModal.addEventListener("cancel", (e) => e.preventDefault());

    this.resetMatchState();

    this.previewTime = 0;
    this.lastTimestamp = 0;

    // 玩家快捷鍵：Enter / Space 開始遊戲、R / Tab 切換隨從陣型、M 切換靜音 (使用 capture 確保 Tab 不被瀏覽器劫持焦點)
    window.addEventListener(
      "keydown",
      (e) => {
        const keyLower = (e.key || "").toLowerCase();
        const isStanceKey =
          e.code === "KeyR" ||
          e.code === "Tab" ||
          keyLower === "r" ||
          keyLower === "tab";

        if (
          !this.hasStarted &&
          !this.gameoverModal.open &&
          (!this.metaManager.codexModal || !this.metaManager.codexModal.open) &&
          (e.code === "Enter" || e.code === "Space")
        ) {
          e.preventDefault();
          this.beginGame();
          return;
        }

        if (isStanceKey && this.hasStarted && !this.isPaused && !this.gameoverModal.open) {
          e.preventDefault();
          e.stopPropagation();
          if (!e.repeat && this.player) {
            this.togglePlayerStance();
          }
          return;
        }

        if ((e.code === "KeyM" || keyLower === "m") && !e.repeat) {
          this.toggleAudioMute();
        }
      },
      { capture: true }
    );

    window.addEventListener("resize", () => this.handleResize());
    this.handleResize();
  }

  togglePlayerStance() {
    if (!this.player) return;
    const newStance = this.player.toggleStance(this.soundManager, this.vfx);
    const isPhalanx = newStance === "phalanx";
    if (this.levelUpManager) {
      this.levelUpManager.addFloatingText(
        isPhalanx
          ? "🛡️ 切換：鐵壁護衛陣 (全軍收縮躲招・減傷 40%)"
          : "⚔️ 切換：自由狩獵陣 (主動索敵・傷害 +15%)",
        this.player.x,
        this.player.y - 42,
        isPhalanx ? "#38bdf8" : "#facc15"
      );
    }
    this.updateHUD();
  }

  toggleAudioMute() {
    const muted = this.soundManager.toggleMute();
    if (this.muteStatusText) {
      this.muteStatusText.textContent = muted ? "🔇 已靜音" : "🔊 音效開";
    }
  }

  /**
   * 觸發電影級鏡頭拉近 (Camera Zoom) 與慢動作頓幀 (Time Dilation / Hit-Stop)
   */
  triggerCinematicMoment(zoom = 1.16, zoomDuration = 0.65, slowScale = 0.3, slowDuration = 0.28) {
    this.targetZoom = Math.max(this.targetZoom, zoom);
    this.zoomTimer = Math.max(this.zoomTimer, zoomDuration);
    this.timeScale = Math.min(this.timeScale, slowScale);
    this.timeScaleTimer = Math.max(this.timeScaleTimer, slowDuration);
  }

  resetMatchState() {
    const metaUpgrades = this.metaManager.getUpgrades();
    const equippedSkin = this.metaManager.getEquippedSkin();

    this.player = new Player(
      this.world.width / 2,
      this.world.height / 2,
      metaUpgrades,
      equippedSkin
    );

    this.enemyPool.releaseAll();
    this.projectileManager.pool.releaseAll();
    this.projectileManager.effects.length = 0;
    this.bossHazardManager.clearAll();
    this.itemManager.gemPool.releaseAll();
    this.vfx.particlePool.releaseAll();
    this.vfx.popupPool.releaseAll();
    this.vfx.shockwaves.length = 0;
    this.shrineManager.reset();
    this.synergyManager.resetRelics();

    this.waveManager = new WaveManager(
      this.enemyPool,
      this.world,
      (bannerText, isMajor) => this.triggerWaveBossBanner(bannerText, isMajor),
      this.vfx
    );

    this.minions = [];
    const baseRerolls = 1 + (metaUpgrades.rerollLevel || 0) * 2;
    this.levelUpManager.setInitialRerolls(baseRerolls);
    this.levelUpManager.pendingLevelUps = 0;
    this.levelUpManager.pendingBossChests = 0;

    this.spawnInitialMinions(metaUpgrades.startMinionsLevel || 0);
    this.synergyManager.recalculate(this.minions, this.player);

    this.hasStarted = false;
    this.isPaused = true;
    this.isMatchEnded = false;
    this.elapsedTime = 0;
    this.totalKills = 0;
    this.bossAlertTimer = 0;
    this.cameraZoom = 1.0;
    this.targetZoom = 1.0;
    this.zoomTimer = 0;
    this.timeScale = 1.0;
    this.timeScaleTimer = 0;

    if (this.bossAlertBanner) {
      this.bossAlertBanner.classList.add("hidden");
    }
    if (this.bossHudPanel) {
      this.bossHudPanel.classList.add("hidden");
    }

    this.updateCamera();
    this.updateHUD();
  }

  beginGame() {
    if (this.hasStarted) return;
    this.soundManager.init();
    this.soundManager.playButton();
    this.soundManager.playMergeStar(2);
    this.hasStarted = true;
    this.isPaused = false;
    if (this.startScreen) {
      this.startScreen.classList.add("hidden");
    }
    this.vfx.spawnShockwave(this.player.x, this.player.y, 130, "#facc15", 0.5);
  }

  spawnInitialMinions(extraCount = 0) {
    this.addMinionById("m_01", 1); // 骷髏步兵 (前排骨盾衛士)
    this.addMinionById("m_02", 1); // 發條射手 (遠程穿甲狙擊)
    this.addMinionById("m_05", 1); // 祭祀巨熊 (翡翠治療波牧師)

    for (let i = 0; i < extraCount; i++) {
      const rand = MINION_DATA[Math.floor(Math.random() * MINION_DATA.length)];
      this.addMinionById(rand.id, 1);
      this.levelUpManager.checkAndMergeMinions(rand.id);
    }
  }

  addMinionById(minionId, star = 1) {
    const template = MINION_DATA.find((m) => m.id === minionId);
    if (!template) return null;

    const angle = Math.random() * Math.PI * 2;
    const dist = 40 + Math.random() * 25;
    const mx = this.player.x + Math.cos(angle) * dist;
    const my = this.player.y + Math.sin(angle) * dist;

    const minion = new Minion(
      template,
      mx,
      my,
      star,
      this.player.damageMultiplier || 1.0
    );
    this.minions.push(minion);
    return minion;
  }

  triggerLevelUp() {
    this.player.level += 1;
    // 無上限平滑二次成長經驗曲線 (小幅下調約 18%，節奏流暢且後期穩定養出 3~4 隻 ★3 與 ★4 神話)
    const lv = this.player.level;
    this.player.expToNextLevel = Math.round(
      8 + (lv - 1) * 3.0 + Math.pow(lv - 1, 2) * 0.16
    );
    this.soundManager.playLevelUp();
    this.vfx.spawnShockwave(this.player.x, this.player.y, 95, "#38bdf8", 0.4);
    this.levelUpManager.queueLevelUp();
    this.updateHUD();
  }

  handleResize() {
    this.canvas.width = window.innerWidth;
    this.canvas.height = window.innerHeight;
    this.updateCamera();
  }

  start() {
    this.lastTimestamp = performance.now();
    requestAnimationFrame((ts) => this.gameLoop(ts));
  }

  gameLoop(timestamp) {
    const rawDt = Math.min((timestamp - this.lastTimestamp) / 1000, 0.1);
    this.lastTimestamp = timestamp;

    // 更新鏡頭動態縮放與慢動作頓幀計時器
    if (this.zoomTimer > 0) {
      this.zoomTimer -= rawDt;
      if (this.zoomTimer <= 0) {
        this.targetZoom = 1.0;
      }
    }
    this.cameraZoom += (this.targetZoom - this.cameraZoom) * Math.min(1, rawDt * 8);

    if (this.timeScaleTimer > 0) {
      this.timeScaleTimer -= rawDt;
      if (this.timeScaleTimer <= 0) {
        this.timeScale = 1.0;
      }
    }
    const effectiveDt = rawDt * this.timeScale;

    if (!this.isPaused) {
      const activeMajorBoss = this.waveManager.getActiveMajorBoss();
      this.soundManager.updateBgm(rawDt, Boolean(activeMajorBoss), this.isPaused);
      this.update(effectiveDt);
    } else if (!this.hasStarted) {
      this.previewTime += rawDt;
      this.player.animTime += rawDt;
      for (let i = 0; i < this.minions.length; i++) {
        this.minions[i].animTime += rawDt;
      }
      this.drawStartPreview();
    }

    this.draw();
    requestAnimationFrame((ts) => this.gameLoop(ts));
  }

  drawStartPreview() {
    if (!this.previewCtx || !this.previewCanvas) return;
    const ctx = this.previewCtx;
    const w = this.previewCanvas.width;
    const h = this.previewCanvas.height;
    ctx.clearRect(0, 0, w, h);

    const demoUnits = [
      { id: "m_01", x: 65, y: 72, star: 1, state: "FOLLOWING" },
      { id: "m_01", x: 195, y: 72, star: 2, state: "ATTACKING" },
      { id: "m_01", x: 325, y: 74, star: 3, state: "ATTACKING" },
      { id: "mythic_02", x: 455, y: 76, star: 4, isMythic: true, state: "ATTACKING" }
    ];

    ctx.fillStyle = "rgba(250, 204, 21, 0.85)";
    ctx.font = "900 18px 'Segoe UI', sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("➔", 130, 68);
    ctx.fillText("➔", 260, 68);
    ctx.fillText("🌈", 390, 68);

    for (let i = 0; i < demoUnits.length; i++) {
      ctx.save();
      if (demoUnits[i].isMythic) {
        ctx.translate(demoUnits[i].x, demoUnits[i].y);
        ctx.scale(0.75, 0.75);
        SpriteRenderer.drawMinion(
          ctx,
          { ...demoUnits[i], x: 0, y: 0 },
          this.previewTime
        );
      } else {
        SpriteRenderer.drawMinion(ctx, demoUnits[i], this.previewTime);
      }
      ctx.restore();
    }
  }

  handleDamageEnemy(enemy, damage, sourceX, sourceY, sourceMinion = null, isCrit = false) {
    if (!enemy || !enemy.active) return;

    const prevHp = enemy.hp;
    const isKilled = enemy.takeDamage(damage, sourceX, sourceY, 145);
    const actualDamage = Math.max(1, Math.round(prevHp - Math.max(0, enemy.hp)));

    if (sourceMinion) {
      sourceMinion.totalDamageDealt = (sourceMinion.totalDamageDealt || 0) + actualDamage;
    } else {
      this.player.totalDamageDealt = (this.player.totalDamageDealt || 0) + actualDamage;
    }

    this.soundManager.playHit(isCrit);
    this.vfx.spawnDamagePopup(enemy.x, enemy.y - enemy.radius, actualDamage, isCrit);
    this.vfx.spawnBurst(enemy.x, enemy.y, enemy.color, isCrit ? 9 : 4, 130);

    // Undead (2) 羈絆：8% 隨從吸血 (主角吸血受每秒 5 HP 軟上限約束，避免主角完全無敵)
    const lifesteal =
      (sourceMinion && sourceMinion.synergyMods.lifesteal) ||
      this.synergyManager.globalModifiers.lifesteal ||
      0;
    if (lifesteal > 0) {
      const rawHeal = actualDamage * lifesteal;
      if (sourceMinion && !sourceMinion.isDowned) {
        sourceMinion.hp = Math.min(sourceMinion.maxHp, sourceMinion.hp + rawHeal);
      }
      if (this.player.lifestealQuota > 0 && this.player.hp < this.player.maxHp) {
        const pHeal = Math.min(this.player.lifestealQuota, rawHeal * 0.25);
        this.player.lifestealQuota -= pHeal;
        this.player.hp = Math.min(this.player.maxHp, this.player.hp + pHeal);
      }
    }

    if (isKilled) {
      this.totalKills += 1;
      this.soundManager.playKill();
      this.vfx.spawnBurst(enemy.x, enemy.y, enemy.color, 16, 220);

      if (this.synergyManager.globalModifiers.voidLevel >= 2) {
        this.vfx.spawnShockwave(enemy.x, enemy.y, 65, "#a855f7", 0.25);
      }

      const killedBossId = enemy.id;
      const wasMajorBoss = enemy.isBoss;
      const wasElite = enemy.isElite;
      const wasGoblin = enemy.isGoblin;

      if (wasMajorBoss || enemy.isMiniBoss || wasGoblin) {
        this.metaManager.recordBossKill(killedBossId);
      }

      if (wasGoblin) {
        // 💰 擊殺貪婪黃金哥布林：爆出大量金幣、全圖磁鐵、烤雞與高級經驗寶石！
        this.soundManager.playMergeStar(3);
        this.vfx.spawnShockwave(enemy.x, enemy.y, 150, "#facc15", 0.5);
        const goblinGold = this.metaManager.addGold(250);
        this.itemManager.spawnSpecialItem(enemy.x, enemy.y, "magnet");
        this.itemManager.spawnSpecialItem(enemy.x + 22, enemy.y, "meat");
        for (let g = 0; g < 6; g++) {
          const ga = (g * Math.PI * 2) / 6;
          this.itemManager.spawnGem(
            enemy.x + Math.cos(ga) * 28,
            enemy.y + Math.sin(ga) * 28,
            5
          );
        }
        this.levelUpManager.addFloatingText(
          `💰 擊殺貪婪黃金哥布林！獲得 +${goblinGold.toLocaleString()} 金幣 & 全圖磁鐵！`,
          enemy.x,
          enemy.y - 36,
          "#fde047"
        );
      } else if (wasMajorBoss || wasElite) {
        this.soundManager.playExplosion();
        this.vfx.triggerShake(11, 0.35);
        this.vfx.spawnShockwave(enemy.x, enemy.y, 125, "#facc15", 0.5);
        this.itemManager.spawnSpecialItem(enemy.x, enemy.y, "chest");
        this.itemManager.spawnSpecialItem(enemy.x + 26, enemy.y, "meat");

        if (wasMajorBoss) {
          this.bossHazardManager.clearAll();
          this.triggerCinematicMoment(1.18, 0.7, 0.3, 0.35);
          if (this.waveManager.currentWave < this.waveManager.maxWaves) {
            this.waveManager.currentWave += 1;
            this.waveManager.waveTimer = 0;
          }
          this.levelUpManager.addFloatingText(
            `🏆 單挑擊破 ${enemy.name}！推進至 Wave ${this.waveManager.currentWave}！`,
            enemy.x,
            enemy.y - 40,
            "#fde047"
          );
        }
      } else {
        this.itemManager.spawnGem(enemy.x, enemy.y, enemy.expReward);
        const roll = Math.random();
        if (roll < 0.008) {
          this.itemManager.spawnSpecialItem(enemy.x, enemy.y, "magnet");
        } else if (roll < 0.022 && enemy.id === "e_04") {
          this.itemManager.spawnSpecialItem(enemy.x, enemy.y, "meat");
        }
      }

      this.enemyPool.release(enemy);

      if (wasMajorBoss && killedBossId.startsWith("b_30")) {
        this.endMatch(true);
      }
    }
  }

  triggerWaveBossBanner(bannerText, isMajorBoss = false) {
    if (this.soundManager) {
      this.soundManager.playBossAlert();
    }
    this.vfx.triggerShake(isMajorBoss ? 12 : 7, 0.45);
    if (isMajorBoss) {
      this.triggerCinematicMoment(1.16, 0.75, 0.35, 0.32);
    }
    this.bossAlertTimer = isMajorBoss ? 5.5 : 4.0;
    if (this.bossAlertBanner) {
      if (this.bossAlertInner) {
        this.bossAlertInner.textContent = bannerText;
      }
      this.bossAlertBanner.classList.remove("hidden");
    }
  }

  endMatch(isVictory = false) {
    if (this.isMatchEnded) return;
    this.isMatchEnded = true;
    this.isPaused = true;

    if (isVictory) {
      this.soundManager.playMergeStar(4);
      this.summaryTitle.textContent = "👑 史詩大捷！成功擊破 30 波次與虛空大君 👑";
      this.summarySubtitle.textContent =
        "你率領傳說隨從大軍征服了伊格尼斯、阿拉克涅與瑪爾扎哈三大君王！";
    } else {
      this.soundManager.playPlayerHurt();
      this.summaryTitle.textContent = "💀 召喚師力竭倒下 (Game Over) 💀";
      this.summarySubtitle.textContent =
        "使用賞金升級永久天賦或穿戴傳說造型，善用 R 鍵鐵壁陣型再次挑戰！";
    }

    const mins = String(Math.floor(this.elapsedTime / 60)).padStart(2, "0");
    const secs = String(Math.floor(this.elapsedTime % 60)).padStart(2, "0");
    this.sumTime.textContent = `Wave ${this.waveManager.currentWave} (${mins}:${secs})`;
    this.sumKills.textContent = this.totalKills;
    this.sumLevel.textContent = `Lv.${this.player.level}`;

    const baseGold =
      this.waveManager.currentWave * 40 +
      this.totalKills * 1 +
      (isVictory ? 1500 : 50);
    const actualEarnedGold = this.metaManager.addGold(baseGold);
    this.sumGold.textContent = `+${actualEarnedGold.toLocaleString()} 💰`;

    const entries = [
      {
        name: `🪄 召喚師 (${this.player.skinConfig.name})`,
        damage: Math.round(this.player.totalDamageDealt || 0),
        color: this.player.skinConfig.auraColor || "#38bdf8"
      }
    ];

    for (const m of this.minions) {
      const stars = "★".repeat(m.isMythic ? 4 : m.star);
      entries.push({
        name: `${stars} ${m.name}`,
        damage: Math.round(m.totalDamageDealt || 0),
        color: m.color
      });
    }

    entries.sort((a, b) => b.damage - a.damage);
    const maxDmg = Math.max(1, entries[0]?.damage || 1);
    const surviveSecs = Math.max(1, this.elapsedTime);

    this.dpsLeaderboard.innerHTML = entries
      .map((item, idx) => {
        const pct = Math.round((item.damage / maxDmg) * 100);
        const dps = (item.damage / surviveSecs).toFixed(1);
        return `
          <div class="dps-row">
            <div class="dps-row-top">
              <span>#${idx + 1} ${item.name}</span>
              <span>${item.damage.toLocaleString()} 總傷害 (${dps} DPS)</span>
            </div>
            <div class="dps-bar-bg">
              <div class="dps-bar-fill" style="width:${pct}%; background:${item.color};"></div>
            </div>
          </div>
        `;
      })
      .join("");

    if (!this.gameoverModal.open) {
      this.gameoverModal.showModal();
    }
  }

  update(dt) {
    this.elapsedTime += dt;

    if (this.bossAlertTimer > 0) {
      this.bossAlertTimer -= dt;
      if (this.bossAlertTimer <= 0 && this.bossAlertBanner) {
        this.bossAlertBanner.classList.add("hidden");
      }
    }

    // 1. 波次管理器更新 (逢 5 出小 Boss、逢 10 出傳說大 Boss、定時亂入貪婪黃金哥布林)
    this.waveManager.update(dt, this.elapsedTime, this.player, {
      width: this.canvas.width,
      height: this.canvas.height
    });

    // 2. 重建四叉樹並插入所有活躍敵人
    this.quadtree.clear();
    const activeEnemies = this.enemyPool.activeList;
    for (let i = 0; i < activeEnemies.length; i++) {
      this.quadtree.insert(activeEnemies[i]);
    }

    // 3. 更新地圖互動聖壇事件與雷霆超載落雷
    this.shrineManager.update(dt, this);

    // 4. 更新玩家移動、陣型切換、主動技能與法杖自動射擊
    this.player.update(
      dt,
      this.input,
      this.world,
      this.quadtree,
      this.projectileManager,
      this.soundManager,
      this.vfx,
      this.camera
    );

    // 5. 更新所有隨從 (含 ★3 終極覺醒技與 ★4 神話大招)
    const onDamageCallback = (enemy, dmg, sx, sy, minion, isCrit) =>
      this.handleDamageEnemy(enemy, dmg, sx, sy, minion, isCrit);

    for (let i = 0; i < this.minions.length; i++) {
      this.minions[i].update(
        dt,
        this.player,
        this.minions,
        this.quadtree,
        this.projectileManager,
        onDamageCallback,
        this.soundManager,
        this.vfx
      );
    }

    // 6. 更新我方投射物與命中檢測
    this.projectileManager.update(dt, this.quadtree, onDamageCallback);

    // 7. 更新所有活躍敵人與三大傳說大 Boss 技能機
    for (let i = activeEnemies.length - 1; i >= 0; i--) {
      const enemy = activeEnemies[i];
      if (enemy && enemy.active) {
        enemy.update(
          dt,
          this.player,
          this.quadtree,
          this.minions,
          this.vfx,
          this.soundManager,
          this.bossHazardManager,
          this.waveManager
        );
        if (!enemy.active) {
          this.enemyPool.release(enemy);
        } else if (enemy.hp <= 0) {
          this.handleDamageEnemy(enemy, 1, enemy.x, enemy.y, null, false);
        }
      }
    }

    // 8. 更新 Boss 彈幕、內外環甜甜圈震爆、燃燒岩漿池、蛛網、旋轉死光與黑洞
    this.bossHazardManager.update(
      dt,
      this.player,
      this.minions,
      this.vfx,
      this.soundManager,
      (dmg) => this.applyDamageToPlayer(dmg, null)
    );

    // 9. 檢測玩家與周圍敵人的接觸傷害 (貪婪哥布林與卵囊不造成接觸傷害)
    const nearbyEnemies = this.quadtree.queryCircle(
      this.player.x,
      this.player.y,
      this.player.radius + 44
    );
    for (let i = 0; i < nearbyEnemies.length; i++) {
      const enemy = nearbyEnemies[i];
      if (!enemy.active || enemy.isEgg || enemy.isGoblin) continue;
      const dx = this.player.x - enemy.x;
      const dy = this.player.y - enemy.y;
      const minDist = this.player.radius + enemy.radius;
      if (dx * dx + dy * dy <= minDist * minDist) {
        this.applyDamageToPlayer(enemy.damage, enemy);
        if (enemy.id === "e_spider_bomb") {
          this.soundManager.playExplosion();
          this.vfx.spawnShockwave(enemy.x, enemy.y, 70, "#f43f5e", 0.3);
          this.enemyPool.release(enemy);
        }
        break;
      }
    }

    // 10. 更新掉落物拾取 (烤雞回復調整為 20% HP 以平衡生存挑戰)
    this.itemManager.update(dt, this.player, (collected) => {
      if (collected.type === "magnet") {
        this.soundManager.playPowerup();
        this.itemManager.magnetizeAllGems();
        this.vfx.spawnShockwave(this.player.x, this.player.y, 180, "#3b82f6", 0.5);
        this.levelUpManager.addFloatingText(
          "🧲 觸發全圖磁鐵！吸收全場寶石！",
          this.player.x,
          this.player.y - 30,
          "#60a5fa"
        );
      } else if (collected.type === "meat") {
        this.soundManager.playHeal();
        const heal = Math.round(this.player.maxHp * 0.2);
        this.player.hp = Math.min(this.player.maxHp, this.player.hp + heal);
        this.vfx.spawnDamagePopup(
          this.player.x,
          this.player.y - 28,
          `+${heal} HP`,
          true,
          "#4ade80"
        );
      } else if (collected.type === "chest") {
        this.soundManager.playPowerup();
        this.levelUpManager.queueBossChest();
      } else {
        this.soundManager.playGemPickup();
        this.vfx.spawnBurst(this.player.x, this.player.y, "#38bdf8", 3, 70);
        this.player.gainExp(collected.expValue);
        while (this.player.currentExp >= this.player.expToNextLevel) {
          this.player.currentExp -= this.player.expToNextLevel;
          this.triggerLevelUp();
        }
      }
    });

    // 11. 更新 VFX 與 HUD
    this.vfx.update(dt);
    this.levelUpManager.updateEffects(dt);
    this.updateCamera();
    this.updateHUD();
  }

  applyDamageToPlayer(rawDamage, sourceEnemy = null) {
    const result = this.player.takeDamage(rawDamage);
    if (!result.damaged) return;

    this.soundManager.playPlayerHurt();
    this.vfx.triggerShake(6, 0.16);
    this.vfx.spawnDamagePopup(
      this.player.x,
      this.player.y - 24,
      `-${result.finalDamage}`,
      false,
      "#ef4444"
    );

    const thorns = this.player.synergyMods.thornsRatio || 0;
    if (thorns > 0 && sourceEnemy && sourceEnemy.active) {
      const reflectDmg = Math.max(1, Math.round(rawDamage * thorns));
      this.handleDamageEnemy(
        sourceEnemy,
        reflectDmg,
        this.player.x,
        this.player.y,
        null,
        false
      );
    }

    if (result.revived) {
      this.soundManager.playMergeStar(3);
      this.vfx.spawnShockwave(this.player.x, this.player.y, 120, "#38bdf8", 0.5);
      this.levelUpManager.addFloatingText(
        "💀 不死族羈絆觸發：50% 血量復活！",
        this.player.x,
        this.player.y - 30,
        "#38bdf8"
      );
    } else if (this.player.hp <= 0) {
      this.endMatch(false);
    }
  }

  updateCamera() {
    const targetX = this.player.x - this.canvas.width / 2;
    const targetY = this.player.y - this.canvas.height / 2;

    const maxCamX = Math.max(0, this.world.width - this.canvas.width);
    const maxCamY = Math.max(0, this.world.height - this.canvas.height);

    this.camera.x = Math.max(0, Math.min(maxCamX, targetX));
    this.camera.y = Math.max(0, Math.min(maxCamY, targetY));
  }

  updateHUD() {
    const hpPercent = (this.player.hp / this.player.maxHp) * 100;
    this.hpBarFill.style.width = `${hpPercent}%`;
    this.hpText.textContent = `${Math.ceil(this.player.hp)} / ${this.player.maxHp}`;

    const expPercent = Math.min(
      100,
      (this.player.currentExp / this.player.expToNextLevel) * 100
    );
    this.expBarFill.style.width = `${expPercent}%`;
    this.expText.textContent = `${this.player.currentExp} / ${this.player.expToNextLevel}`;
    this.levelText.textContent = this.player.level;

    if (this.waveBadge) {
      this.waveBadge.textContent = `WAVE ${this.waveManager.currentWave} / ${this.waveManager.maxWaves}`;
    }

    const mins = String(Math.floor(this.elapsedTime / 60)).padStart(2, "0");
    const secs = String(Math.floor(this.elapsedTime % 60)).padStart(2, "0");
    this.timerDisplay.textContent = `${mins}:${secs}`;
    if (this.killCountText) {
      this.killCountText.textContent = this.totalKills;
    }

    const activeMajorBoss = this.waveManager.getActiveMajorBoss();
    if (activeMajorBoss && this.bossHudPanel) {
      this.bossHudPanel.classList.remove("hidden");
      this.bossHudName.textContent =
        activeMajorBoss.name + (activeMajorBoss.enraged ? " 【🔥狂暴形態】" : "");
      this.bossHudHpText.textContent = `${Math.max(0, Math.ceil(activeMajorBoss.hp)).toLocaleString()} / ${activeMajorBoss.maxHp.toLocaleString()}`;
      const bossPct = Math.max(
        0,
        (activeMajorBoss.hp / activeMajorBoss.maxHp) * 100
      );
      this.bossHudBarFill.style.width = `${bossPct}%`;
      this.bossHudSkill.textContent =
        activeMajorBoss.currentSkillLabel ||
        `🛡️ ${activeMajorBoss.subtitle || "動態韌性護盾啟動中"}`;
    } else if (this.bossHudPanel) {
      this.bossHudPanel.classList.add("hidden");
    }

    if (this.minionCountText) {
      this.minionCountText.textContent = this.minions.length;
    }

    if (this.dashCdText && this.skillDashBox) {
      if (this.player.dashCooldown > 0) {
        this.skillDashBox.className = "skill-slot cooling";
        this.dashCdText.textContent = `冷卻 ${this.player.dashCooldown.toFixed(1)}s`;
      } else {
        this.skillDashBox.className = "skill-slot ready";
        this.dashCdText.textContent = "就緒 READY";
      }
    }

    if (this.cmdCdText && this.skillCmdBox) {
      if (this.player.commandTimer > 0) {
        this.skillCmdBox.className = "skill-slot ready";
        this.cmdCdText.textContent = `🔥 集火中 ${this.player.commandTimer.toFixed(1)}s`;
      } else if (this.player.commandCooldown > 0) {
        this.skillCmdBox.className = "skill-slot cooling";
        this.cmdCdText.textContent = `冷卻 ${this.player.commandCooldown.toFixed(1)}s`;
      } else {
        this.skillCmdBox.className = "skill-slot ready";
        this.cmdCdText.textContent = "就緒 READY";
      }
    }

    if (this.stanceIcon && this.stanceName && this.stanceDesc) {
      if (this.player.stance === "phalanx") {
        if (this.skillStanceBox) {
          this.skillStanceBox.className = "skill-slot ready stance-phalanx";
        }
        this.stanceIcon.textContent = "🛡️";
        this.stanceName.textContent = "鐵壁護衛陣";
        this.stanceDesc.textContent = "貼身躲招 (減傷40%)";
      } else {
        if (this.skillStanceBox) {
          this.skillStanceBox.className = "skill-slot ready stance-assault";
        }
        this.stanceIcon.textContent = "⚔️";
        this.stanceName.textContent = "自由狩獵陣";
        this.stanceDesc.textContent = "主動索敵 (傷害+15%)";
      }
    }
  }

  draw() {
    const ctx = this.ctx;
    ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

    const shake = this.vfx.getShakeOffset();
    const activeMajorBoss = this.waveManager.getActiveMajorBoss();

    ctx.save();
    // 支援電影級鏡頭縮放 (Camera Zoom)
    if (Math.abs(this.cameraZoom - 1.0) > 0.002) {
      const cx = this.canvas.width / 2;
      const cy = this.canvas.height / 2;
      ctx.translate(cx, cy);
      ctx.scale(this.cameraZoom, this.cameraZoom);
      ctx.translate(-cx, -cy);
    }

    ctx.translate(-this.camera.x + shake.x, -this.camera.y + shake.y);

    // 1. 繪製高質感無縫自然岩土與太古黃金聖殿背景
    this.arenaRenderer.drawWorld(
      ctx,
      this.camera,
      this.canvas.width,
      this.canvas.height,
      this.elapsedTime,
      this.waveManager.currentWave,
      activeMajorBoss
    );

    // 2. 繪製地圖隨機互動聖壇 (雷霆/鮮血/星辰聖壇與充能環)
    this.shrineManager.drawWorld(ctx);

    // 3. 繪製 Boss 地面預警圈、甜甜圈外環、岩漿池、蛛網、黑洞與敵方彈幕
    this.bossHazardManager.draw(ctx, this.elapsedTime);

    // 5. 繪製掉落物 (經驗寶石、磁鐵、生命靈藥、首領寶箱)
    this.itemManager.draw(ctx);

    // 6. 分層繪製敵人與隨從：
    //    第 1 層：一般雜兵魔物 (繪製在最底層，絕不遮擋小Boss與大Boss)
    const activeEnemies = this.enemyPool.activeList;
    for (let i = 0; i < activeEnemies.length; i++) {
      const e = activeEnemies[i];
      if (!e.isBoss && !e.isMiniBoss && !e.isGoblin && !e.isEgg) {
        e.draw(ctx);
      }
    }

    //    第 2 層：繪製所有隨從角色 (含 ★3 覺醒與 ★★★★ 神話泰坦)
    for (let i = 0; i < this.minions.length; i++) {
      this.minions[i].draw(ctx);
    }

    //    第 3 層：繪製特殊機制單位 (劇毒卵囊、貪婪黃金哥布林) 與 ⚔️ 特色小 Boss
    for (let i = 0; i < activeEnemies.length; i++) {
      const e = activeEnemies[i];
      if (e.isEgg || e.isGoblin || e.isMiniBoss) {
        e.draw(ctx);
      }
    }

    //    第 4 層：繪製 👑 傳說君王大 Boss (永遠位於所有小怪與隨從最上層，搭配沖天光柱與頭頂名牌！)
    for (let i = 0; i < activeEnemies.length; i++) {
      const e = activeEnemies[i];
      if (e.isBoss) {
        e.draw(ctx);
      }
    }

    // 8. 繪製召喚師玩家角色、傳說造型神翼、鐵壁陣型結界與集火準星
    this.player.draw(ctx);

    // 9. 繪製我方流光投射物、冥界死神劍氣、新月刀光與連鎖閃電特效
    this.projectileManager.draw(ctx);

    // 10. 繪製粒子爆裂、衝擊波光環與跳動傷害數字
    this.vfx.draw(ctx);

    // 11. 繪製升星、聖壇與神話融合浮動文字特效
    this.levelUpManager.drawEffects(ctx);

    ctx.restore();

    // 12. 繪製螢幕空間環境漂浮微粒與電影級景深暗角
    this.arenaRenderer.drawScreenAtmosphere(
      ctx,
      this.canvas.width,
      this.canvas.height,
      this.elapsedTime,
      this.waveManager.currentWave,
      activeMajorBoss
    );

    // 13. 繪製螢幕邊緣「太古聖壇 & 貪婪黃金哥布林」方向指引箭頭
    this.shrineManager.drawScreenIndicators(
      ctx,
      this.camera,
      this.canvas.width,
      this.canvas.height,
      this.player,
      this.enemyPool.activeList
    );
  }
}

window.addEventListener("DOMContentLoaded", () => {
  const game = new Game();
  game.start();
});
