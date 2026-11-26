import {
  META_UPGRADE_CONFIG,
  PLAYER_SKINS,
  MINION_DATA,
  MYTHIC_RECIPES,
  SYNERGY_RULES,
  ENEMY_DATA
} from "./data.js?v=8";
import { SpriteRenderer } from "./spriteRenderer.js?v=8";

/**
 * 局外永久天賦、主角傳說造型商場與魔導圖鑑管理器 (MetaProgressionManager)
 * 使用 localStorage 持久化儲存玩家的金幣、永久天賦、已解鎖造型與已討伐首領紀錄
 */
const STORAGE_KEY = "SUMMONER_SURVIVOR_META_V2";

export class MetaProgressionManager {
  constructor(soundManager = null) {
    this.soundManager = soundManager;
    this.state = this.loadState();

    this.goldDisplayEl = document.getElementById("meta-gold-amount");
    this.shopGridEl = document.getElementById("meta-shop-grid");
    this.tabUpgradesBtn = document.getElementById("shop-tab-upgrades");
    this.tabSkinsBtn = document.getElementById("shop-tab-skins");
    this.currentShopTab = "upgrades"; // "upgrades" | "skins"

    // 魔導圖鑑 Modal 元素
    this.codexBtn = document.getElementById("open-codex-btn");
    this.codexModal = document.getElementById("codex-modal");
    this.codexCloseBtn = document.getElementById("close-codex-btn");
    this.codexContentEl = document.getElementById("codex-body-content");
    this.currentCodexTab = "minions";

    this._bindEvents();
  }

  _bindEvents() {
    if (this.tabUpgradesBtn) {
      this.tabUpgradesBtn.addEventListener("click", () => {
        if (this.soundManager) this.soundManager.playButton();
        this.currentShopTab = "upgrades";
        this.tabUpgradesBtn.classList.add("active");
        if (this.tabSkinsBtn) this.tabSkinsBtn.classList.remove("active");
        this.renderShop();
      });
    }
    if (this.tabSkinsBtn) {
      this.tabSkinsBtn.addEventListener("click", () => {
        if (this.soundManager) this.soundManager.playButton();
        this.currentShopTab = "skins";
        this.tabSkinsBtn.classList.add("active");
        if (this.tabUpgradesBtn) this.tabUpgradesBtn.classList.remove("active");
        this.renderShop();
      });
    }

    if (this.codexBtn && this.codexModal) {
      this.codexBtn.addEventListener("click", () => {
        if (this.soundManager) this.soundManager.playButton();
        this.renderCodex(this.currentCodexTab);
        this.codexModal.showModal();
      });
    }
    if (this.codexCloseBtn && this.codexModal) {
      this.codexCloseBtn.addEventListener("click", () => {
        if (this.soundManager) this.soundManager.playButton();
        this.codexModal.close();
      });
    }

    const codexTabBtns = document.querySelectorAll("[data-codex-tab]");
    codexTabBtns.forEach((btn) => {
      btn.addEventListener("click", () => {
        if (this.soundManager) this.soundManager.playButton();
        codexTabBtns.forEach((b) => b.classList.remove("active"));
        btn.classList.add("active");
        this.currentCodexTab = btn.getAttribute("data-codex-tab");
        this.renderCodex(this.currentCodexTab);
      });
    });
  }

  loadState() {
    try {
      const raw =
        localStorage.getItem(STORAGE_KEY) ||
        localStorage.getItem("SUMMONER_SURVIVOR_META_V1");
      if (raw) {
        const parsed = JSON.parse(raw);
        return {
          gold: parsed.gold ?? 0,
          upgrades: {
            maxHpLevel: parsed.upgrades?.maxHpLevel || 0,
            startMinionsLevel: parsed.upgrades?.startMinionsLevel || 0,
            rerollLevel: parsed.upgrades?.rerollLevel || 0,
            attackBonusLevel: parsed.upgrades?.attackBonusLevel || 0,
            greedLevel: parsed.upgrades?.greedLevel || 0
          },
          unlockedSkins: parsed.unlockedSkins || ["skin_default"],
          equippedSkin: parsed.equippedSkin || "skin_default",
          defeatedBosses: parsed.defeatedBosses || {}
        };
      }
    } catch {
      // ignore storage errors
    }
    return {
      gold: 0,
      upgrades: {
        maxHpLevel: 0,
        startMinionsLevel: 0,
        rerollLevel: 0,
        attackBonusLevel: 0,
        greedLevel: 0
      },
      unlockedSkins: ["skin_default"],
      equippedSkin: "skin_default",
      defeatedBosses: {}
    };
  }

  saveState() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.state));
    } catch {
      // ignore storage errors
    }
  }

  getUpgrades() {
    return { ...this.state.upgrades };
  }

  getEquippedSkin() {
    return this.state.equippedSkin || "skin_default";
  }

  recordBossKill(bossId) {
    this.state.defeatedBosses[bossId] =
      (this.state.defeatedBosses[bossId] || 0) + 1;
    this.saveState();
  }

  addGold(amount) {
    const greedMult = 1 + (this.state.upgrades.greedLevel || 0) * 0.2;
    this.state.gold += Math.max(0, Math.round(amount * greedMult));
    this.saveState();
    this.renderShop();
  }

  getUpgradeCost(cfg) {
    const lv = this.state.upgrades[cfg.id] || 0;
    return cfg.baseCost + lv * cfg.costStep;
  }

  buyUpgrade(cfg) {
    const lv = this.state.upgrades[cfg.id] || 0;
    if (lv >= cfg.maxLevel) return false;

    const cost = this.getUpgradeCost(cfg);
    if (this.state.gold < cost) return false;

    this.state.gold -= cost;
    this.state.upgrades[cfg.id] = lv + 1;
    this.saveState();

    if (this.soundManager) {
      this.soundManager.playMergeStar(2);
    }
    this.renderShop();
    return true;
  }

  buyOrEquipSkin(skin) {
    const isUnlocked = this.state.unlockedSkins.includes(skin.id);
    if (isUnlocked) {
      this.state.equippedSkin = skin.id;
      this.saveState();
      if (this.soundManager) this.soundManager.playButton();
      this.renderShop();
      if (this.onSkinChanged) this.onSkinChanged(skin.id);
      return true;
    }

    if (this.state.gold < skin.cost) return false;
    this.state.gold -= skin.cost;
    this.state.unlockedSkins.push(skin.id);
    this.state.equippedSkin = skin.id;
    this.saveState();

    if (this.soundManager) {
      this.soundManager.playMergeStar(3);
    }
    this.renderShop();
    if (this.onSkinChanged) this.onSkinChanged(skin.id);
    return true;
  }

  renderShop() {
    if (this.goldDisplayEl) {
      this.goldDisplayEl.textContent = this.state.gold;
    }
    if (!this.shopGridEl) return;

    this.shopGridEl.innerHTML = "";

    if (this.currentShopTab === "skins") {
      this._renderSkinsTab();
      return;
    }

    for (const cfg of META_UPGRADE_CONFIG) {
      const lv = this.state.upgrades[cfg.id] || 0;
      const isMax = lv >= cfg.maxLevel;
      const cost = this.getUpgradeCost(cfg);
      const canAfford = !isMax && this.state.gold >= cost;

      const card = document.createElement("div");
      card.className = "meta-upgrade-card";
      card.innerHTML = `
        <div class="meta-up-header">
          <span class="meta-up-name">${cfg.name}</span>
          <span class="meta-up-lv">Lv.${lv} / ${cfg.maxLevel}</span>
        </div>
        <div class="meta-up-desc">${cfg.desc}</div>
        <button type="button" class="meta-buy-btn" ${!canAfford ? "disabled" : ""}>
          ${isMax ? "已滿級 MAX" : `💰 ${cost} 金幣升級`}
        </button>
      `;

      const btn = card.querySelector(".meta-buy-btn");
      btn.addEventListener("click", () => {
        this.buyUpgrade(cfg);
      });

      this.shopGridEl.appendChild(card);
    }
  }

  _renderSkinsTab() {
    for (const skin of PLAYER_SKINS) {
      const isUnlocked = this.state.unlockedSkins.includes(skin.id);
      const isEquipped = this.state.equippedSkin === skin.id;
      const canAfford = isUnlocked || this.state.gold >= skin.cost;

      const card = document.createElement("div");
      card.className = `meta-upgrade-card skin-card ${isEquipped ? "equipped-skin" : ""}`;
      card.innerHTML = `
        <div class="skin-card-top">
          <canvas class="skin-preview-canvas" width="54" height="54"></canvas>
          <div class="skin-info">
            <div class="meta-up-name">${skin.name}</div>
            <div class="skin-bonus-tag">${skin.bonusDesc}</div>
          </div>
        </div>
        <div class="meta-up-desc">${skin.desc}</div>
        <button type="button" class="meta-buy-btn ${isEquipped ? "equipped" : ""}" ${!canAfford ? "disabled" : ""}>
          ${
            isEquipped
              ? "✨ 已穿戴裝備中"
              : isUnlocked
                ? "👑 點擊穿戴此造型"
                : `💰 ${skin.cost} 金幣解鎖造型`
          }
        </button>
      `;

      const canvas = card.querySelector(".skin-preview-canvas");
      if (canvas) {
        const ctx = canvas.getContext("2d");
        ctx.save();
        ctx.translate(27, 33);
        ctx.scale(0.75, 0.75);
        SpriteRenderer.drawPlayer(ctx, {
          x: 0,
          y: 0,
          vx: 0,
          vy: 0,
          facing: { x: 1, y: 0 },
          animTime: 1.5,
          castFlashTimer: 0,
          invincibleTimer: 0,
          skinId: skin.id,
          skinConfig: skin
        });
        ctx.restore();
      }

      const btn = card.querySelector(".meta-buy-btn");
      btn.addEventListener("click", () => {
        this.buyOrEquipSkin(skin);
      });

      this.shopGridEl.appendChild(card);
    }
  }

  /**
   * 渲染「📖 魔導圖鑑系統 (Codex / Bestiary)」
   */
  renderCodex(tab = "minions") {
    if (!this.codexContentEl) return;
    this.codexContentEl.innerHTML = "";

    if (tab === "minions") {
      const grid = document.createElement("div");
      grid.className = "codex-grid";
      MINION_DATA.forEach((m) => {
        const item = document.createElement("div");
        item.className = "codex-card";
        item.innerHTML = `
          <div class="codex-card-header">
            <canvas class="codex-canvas" width="68" height="68"></canvas>
            <div>
              <div class="codex-title">${m.name} ➔ <span style="color:#fde047;">★3 ${m.awakenedName}</span></div>
              <div class="codex-sub">${m.roleTag} | 標籤: ${m.tags.join(" / ")}</div>
            </div>
          </div>
          <div class="codex-desc">${m.skillDesc}</div>
          <div class="codex-ult-box">
            <b>${m.ultName}</b>：${m.ultDesc}
          </div>
        `;
        const cvs = item.querySelector(".codex-canvas");
        if (cvs) {
          const c = cvs.getContext("2d");
          c.save();
          c.translate(34, 42);
          c.scale(0.62, 0.62);
          SpriteRenderer.drawMinion(
            c,
            { id: m.id, x: 0, y: 0, star: 3, state: "ATTACKING" },
            1.4
          );
          c.restore();
        }
        grid.appendChild(item);
      });
      this.codexContentEl.appendChild(grid);
    } else if (tab === "mythic") {
      const grid = document.createElement("div");
      grid.className = "codex-grid";
      MYTHIC_RECIPES.forEach((r) => {
        const item = document.createElement("div");
        item.className = "codex-card mythic-border";
        item.innerHTML = `
          <div class="codex-card-header">
            <canvas class="codex-canvas" width="74" height="74"></canvas>
            <div>
              <div class="codex-title" style="color:#fde047;">${r.name}</div>
              <div class="codex-sub">合成配方：<b>${r.recipeText}</b></div>
            </div>
          </div>
          <div class="codex-desc">${r.skillDesc}</div>
          <div class="codex-ult-box">
            <b>${r.ultName}</b>：${r.ultDesc}
          </div>
        `;
        const cvs = item.querySelector(".codex-canvas");
        if (cvs) {
          const c = cvs.getContext("2d");
          c.save();
          c.translate(37, 45);
          c.scale(0.55, 0.55);
          SpriteRenderer.drawMinion(
            c,
            { id: r.id, x: 0, y: 0, star: 4, isMythic: true, state: "ATTACKING" },
            1.8
          );
          c.restore();
        }
        grid.appendChild(item);
      });
      this.codexContentEl.appendChild(grid);
    } else if (tab === "synergies") {
      const grid = document.createElement("div");
      grid.className = "codex-grid";
      for (const key of Object.keys(SYNERGY_RULES)) {
        const s = SYNERGY_RULES[key];
        const item = document.createElement("div");
        item.className = "codex-card";
        item.innerHTML = `
          <div class="codex-title">${s.name}</div>
          <div class="codex-desc" style="margin-top:6px;">
            <div>🟢 <b>階段一</b>：${s.descriptions[0]}</div>
            <div style="margin-top:4px; color:#fde047;">🟡 <b>階段二</b>：${s.descriptions[1]}</div>
          </div>
        `;
        grid.appendChild(item);
      }
      this.codexContentEl.appendChild(grid);
    } else if (tab === "bosses") {
      const grid = document.createElement("div");
      grid.className = "codex-grid";
      const bossList = ENEMY_DATA.filter(
        (e) => e.isBoss || e.isMiniBoss || e.isGoblin
      );
      bossList.forEach((b) => {
        const kills = this.state.defeatedBosses[b.id] || 0;
        const item = document.createElement("div");
        item.className = "codex-card";
        item.innerHTML = `
          <div class="codex-card-header">
            <canvas class="codex-canvas" width="72" height="72"></canvas>
            <div>
              <div class="codex-title" style="color:${b.color};">${b.name}</div>
              <div class="codex-sub">❤️ 基礎血量: ${b.stats.maxHp.toLocaleString()} | 🏆 累計討伐: <b>${kills}</b> 次</div>
            </div>
          </div>
          <div class="codex-ult-box">
            <b>招牌機制</b>：${b.subtitle || "高速突襲與範圍壓制"}
          </div>
        `;
        const cvs = item.querySelector(".codex-canvas");
        if (cvs) {
          const c = cvs.getContext("2d");
          c.save();
          c.translate(36, 40);
          const scale = b.isBoss ? 0.42 : 0.62;
          c.scale(scale, scale);
          SpriteRenderer.drawEnemy(
            c,
            {
              id: b.id,
              x: 0,
              y: 0,
              size: b.size,
              radius: b.size / 2,
              color: b.color,
              isBoss: b.isBoss,
              isMiniBoss: b.isMiniBoss,
              isGoblin: b.isGoblin,
              hp: b.stats.maxHp,
              maxHp: b.stats.maxHp
            },
            1.6
          );
          c.restore();
        }
        grid.appendChild(item);
      });
      this.codexContentEl.appendChild(grid);
    }
  }
}
