import { ENEMY_DATA, WORLD_CONFIG, WAVE_BOSS_POOLS } from "./data.js?v=9";

/**
 * 30 波次制動態生成、貪婪黃金哥布林亂入、隨機君王抽選與「大 Boss 清場單挑決鬥」管理器 (WaveManager)
 */
export class WaveManager {
  constructor(enemyPool, world, onWaveBanner = null, vfx = null) {
    this.enemyPool = enemyPool;
    this.world = world;
    this.onWaveBanner = onWaveBanner;
    this.vfx = vfx;

    this.enemyTemplates = new Map();
    for (const data of ENEMY_DATA) {
      this.enemyTemplates.set(data.id, data);
    }

    this.currentWave = 1;
    this.maxWaves = WORLD_CONFIG.maxWaves || 30;
    this.waveDuration = WORLD_CONFIG.waveDuration || 12;
    this.waveTimer = 0;
    this.spawnTimer = 0;

    // 貪婪黃金哥布林盜寶賊定時亂入計時器 (開局 24 秒首次現身，之後每 42 秒亂入一次)
    this.goblinTimer = 24.0;

    // 追蹤目前已觸發過首領降臨的波次
    this.triggeredSpecialWaves = new Set();
  }

  getActiveMajorBoss() {
    const list = this.enemyPool.activeList;
    for (let i = 0; i < list.length; i++) {
      const e = list[i];
      if (e.active && e.isBoss) {
        return e;
      }
    }
    return null;
  }

  /**
   * ⚡ 大 Boss 降臨清場機制：將場上所有一般小怪、小 Boss 與雜兵全數抹殺，清空場地供玩家與大 Boss 一對一單挑！
   */
  purgeArenaForBossDuel(player, bossColor = "#facc15") {
    const list = this.enemyPool.activeList;
    for (let i = list.length - 1; i >= 0; i--) {
      const e = list[i];
      if (!e.active || e.isBoss) continue;
      if (this.vfx) {
        this.vfx.spawnBurst(e.x, e.y, e.color || bossColor, 8, 160);
      }
      this.enemyPool.release(e);
    }
    if (this.vfx && player) {
      this.vfx.spawnShockwave(player.x, player.y, 420, bossColor, 0.65);
      this.vfx.spawnShockwave(player.x, player.y, 260, "#ffffff", 0.45);
    }
  }

  update(dt, elapsedTime, player, viewport) {
    if (!this.triggeredSpecialWaves.has(this.currentWave)) {
      this.triggeredSpecialWaves.add(this.currentWave);
      this.checkAndSpawnWaveBoss(this.currentWave, player, viewport);
    }

    const activeBoss = this.getActiveMajorBoss();

    // 🔥 大 Boss 一對一單挑鎖定：只要場上有大 Boss 存活，完全停止波次計時與小怪生成！必須擊敗大 Boss 才會進入下一波！
    if (activeBoss) {
      return;
    }

    this.waveTimer += dt;
    if (this.waveTimer >= this.waveDuration && this.currentWave < this.maxWaves) {
      this.waveTimer = 0;
      this.currentWave += 1;
      if (!this.triggeredSpecialWaves.has(this.currentWave)) {
        this.triggeredSpecialWaves.add(this.currentWave);
        this.checkAndSpawnWaveBoss(this.currentWave, player, viewport);
      }
      // 若剛進入的新波次產生了大 Boss，立即停止後續雜兵生成
      if (this.getActiveMajorBoss()) {
        return;
      }
    }

    // 貪婪黃金哥布林亂入事件 (僅在非大 Boss 單挑波次出現)
    this.goblinTimer -= dt;
    if (this.goblinTimer <= 0) {
      this.goblinTimer = 42.0;
      const hpScale = 1 + (this.currentWave - 1) * 0.14;
      this.spawnBatch("e_goblin", 1, player, viewport, hpScale, 1.0);
      if (this.onWaveBanner) {
        this.onWaveBanner(
          "💰 貪婪黃金哥布林現身！限時 14 秒按 E 鍵吹響號角集火擊殺，爆出巨額金幣與磁鐵！",
          false
        );
      }
    }

    const progress = (this.currentWave - 1) / Math.max(1, this.maxWaves - 1);
    const baseInterval = 1.15 - progress * 0.82;

    this.spawnTimer += dt;
    if (this.spawnTimer >= baseInterval) {
      this.spawnTimer = 0;
      const batchCount = Math.min(7, 2 + Math.floor(this.currentWave / 5));
      this.spawnRegularWaveMob(this.currentWave, batchCount, player, viewport);
    }
  }

  checkAndSpawnWaveBoss(wave, player, viewport) {
    if (wave === 5) {
      this.spawnBatch("mb_05", 1, player, viewport, 1.0, 1.0);
      if (this.onWaveBanner) {
        this.onWaveBanner("⚔️ Wave 5 小Boss降臨：【骸骨暴徒隊長】！小心直線衝鋒與旋風錘！", false);
      }
    } else if (wave === 15) {
      this.spawnBatch("mb_15", 2, player, viewport, 1.0, 1.0);
      if (this.onWaveBanner) {
        this.onWaveBanner("🎯 Wave 15 小Boss降臨：【發條處刑者 x2】！小心紅線狙擊與定時炸彈！", false);
      }
    } else if (wave === 25) {
      this.spawnBatch("mb_25", 2, player, viewport, 1.0, 1.0);
      if (this.onWaveBanner) {
        this.onWaveBanner("🗡️ Wave 25 小Boss降臨：【深淵雙子刺客】！閃避交叉紅線斬擊！", false);
      }
    } else if (WAVE_BOSS_POOLS[wave]) {
      // 🎲 逢 10 波次 (Wave 10 / 20 / 30)：從該波次的 3 位傳說君王池中隨機抽選 1 位降臨，並清空全場雜兵進行單挑！
      const pool = WAVE_BOSS_POOLS[wave];
      const randomBossId = pool[Math.floor(Math.random() * pool.length)];
      const bossTemplate = this.enemyTemplates.get(randomBossId);

      // 1. 立即清場抹殺所有小怪，展開君王單挑決鬥領域
      this.purgeArenaForBossDuel(player, bossTemplate ? bossTemplate.color : "#facc15");

      // 2. 降臨隨機選出的傳說大 Boss
      this.spawnBatch(randomBossId, 1, player, viewport, 1.0, 1.0);

      if (this.onWaveBanner && bossTemplate) {
        this.onWaveBanner(
          `👑 Wave ${wave} 君王清場單挑！隨機降臨：${bossTemplate.name}（${bossTemplate.subtitle}）！`,
          true
        );
      }
    }
  }

  spawnRegularWaveMob(wave, count, player, viewport) {
    const hpScale = 1 + (wave - 1) * 0.16;
    const dmgScale = 1 + (wave - 1) * 0.08;

    for (let i = 0; i < count; i++) {
      let enemyId = "e_01";
      const r = Math.random();
      if (wave >= 8) {
        enemyId = r < 0.38 ? "e_01" : r < 0.7 ? "e_02" : "e_04";
      } else if (wave >= 3) {
        enemyId = r < 0.58 ? "e_01" : "e_02";
      }
      this.spawnBatch(enemyId, 1, player, viewport, hpScale, dmgScale);
    }
  }

  spawnEnemyAt(enemyId, x, y) {
    const template = this.enemyTemplates.get(enemyId);
    if (!template) return null;

    const pad = this.world.boundaryPadding + 24;
    const sx = Math.max(pad, Math.min(this.world.width - pad, x));
    const sy = Math.max(pad, Math.min(this.world.height - pad, y));

    const enemy = this.enemyPool.acquire();
    enemy.init(template, sx, sy, 1.0, 1.0);
    return enemy;
  }

  spawnBatch(enemyId, count, player, viewport, hpScale = 1.0, dmgScale = 1.0) {
    const template = this.enemyTemplates.get(enemyId);
    if (!template) return;

    const isMajorBoss = Boolean(template.isBoss);
    const spawnRadius = isMajorBoss
      ? 260
      : Math.min(Math.hypot(viewport.width, viewport.height) * 0.46, 480);
    const pad = this.world.boundaryPadding + 24;

    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const jitter = (Math.random() - 0.5) * 35;
      let sx = player.x + Math.cos(angle) * (spawnRadius + jitter);
      let sy = player.y + Math.sin(angle) * (spawnRadius + jitter);

      sx = Math.max(pad, Math.min(this.world.width - pad, sx));
      sy = Math.max(pad, Math.min(this.world.height - pad, sy));

      const enemy = this.enemyPool.acquire();
      enemy.init(template, sx, sy, hpScale, dmgScale);
    }
  }
}
