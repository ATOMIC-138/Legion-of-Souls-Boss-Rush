import { SYNERGY_RULES } from "./data.js?v=9";

/**
 * 羈絆結算與遺物裝備欄管理器 (SynergyManager - 含左上角 Relic Inventory HUD)
 */
export class SynergyManager {
  constructor() {
    this.synergyListEl = document.getElementById("synergy-list");
    this.relicBarEl = document.getElementById("relic-inventory-bar");
    this.tagCounts = {};
    this.globalModifiers = this.getDefaultModifiers();

    // 首領寶箱獲得的永久局內遺物加成與持有清單
    this.relicBonuses = {
      attackSpeedBonus: 0,
      moveSpeedBonus: 0,
      critChanceBonus: 0,
      bossSlayerBonus: 0,
      maxHpBonus: 0,
      phalanxExtraDR: 0
    };
    this.ownedRelics = []; // [{ id, name, shortName, icon, desc, stacks }]
  }

  resetRelics() {
    this.relicBonuses = {
      attackSpeedBonus: 0,
      moveSpeedBonus: 0,
      critChanceBonus: 0,
      bossSlayerBonus: 0,
      maxHpBonus: 0,
      phalanxExtraDR: 0
    };
    this.ownedRelics = [];
    this.renderRelicInventory();
  }

  addRelic(reward) {
    const existing = this.ownedRelics.find((r) => r.id === reward.id);
    if (existing) {
      existing.stacks += 1;
    } else {
      this.ownedRelics.push({
        id: reward.id,
        name: reward.name,
        shortName: reward.shortName || reward.name,
        icon: reward.icon,
        desc: reward.desc,
        stacks: 1
      });
    }
    this.renderRelicInventory();
  }

  renderRelicInventory() {
    if (!this.relicBarEl) return;
    if (this.ownedRelics.length === 0) {
      this.relicBarEl.innerHTML = `<span class="relic-empty-hint">📦 尚未裝備遺物</span>`;
      return;
    }

    this.relicBarEl.innerHTML = this.ownedRelics
      .map(
        (r) => `
        <div class="relic-slot" title="${r.name} (x${r.stacks})：${r.desc}">
          <span class="relic-icon">${r.icon}</span>
          <span class="relic-name">${r.shortName}</span>
          ${r.stacks > 1 ? `<span class="relic-stack">x${r.stacks}</span>` : ""}
        </div>
      `
      )
      .join("");
  }

  getDefaultModifiers() {
    return {
      lifesteal: 0,
      canRevive: false,
      damageReduction: 0,
      missileEveryN: 0,
      maxHpMultiplier: 1.0,
      thornsRatio: 0,
      rangeMultiplier: 1.0,
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

  recalculate(minions, player) {
    const counts = {};
    for (let i = 0; i < minions.length; i++) {
      const m = minions[i];
      for (let j = 0; j < m.tags.length; j++) {
        const tag = m.tags[j];
        counts[tag] = (counts[tag] || 0) + 1;
      }
    }
    this.tagCounts = counts;

    const mods = this.getDefaultModifiers();

    // 1. Undead (2/4) - 平衡調整為 8% 隨從吸血
    const undead = counts.Undead || 0;
    if (undead >= 2) mods.lifesteal = 0.08;
    if (undead >= 4) mods.canRevive = true;

    // 2. Mech (2/4)
    const mech = counts.Mech || 0;
    if (mech >= 2) mods.damageReduction = 0.15;
    if (mech >= 4) mods.missileEveryN = 5;

    // 3. Warrior (3/6)
    const warrior = counts.Warrior || 0;
    if (warrior >= 3) mods.maxHpMultiplier = 1.3;
    if (warrior >= 6) mods.thornsRatio = 0.5;

    // 4. Ranger (3/6)
    const ranger = counts.Ranger || 0;
    if (ranger >= 3) {
      mods.rangeMultiplier = 1.3;
      mods.critChance = 0.2;
    }
    if (ranger >= 6) mods.extraProjectiles = 2;

    // 5. Priest (1/2)
    const priest = counts.Priest || 0;
    if (priest >= 1) mods.priestHealLevel = 1;
    if (priest >= 2) {
      mods.priestHealLevel = 2;
      mods.attackSpeedMultiplier += 0.15;
    }

    // 6. Mage (1/2)
    const mage = counts.Mage || 0;
    if (mage >= 1) mods.mageAoeLevel = 1;
    if (mage >= 2) mods.mageAoeLevel = 2;

    // 7. Elemental (1/2)
    const elemental = counts.Elemental || 0;
    if (elemental >= 1) mods.elementalLevel = 1;
    if (elemental >= 2) {
      mods.elementalLevel = 2;
      mods.damageBonusMultiplier += 0.25;
    }

    // 8. Assassin (1/2)
    const assassin = counts.Assassin || 0;
    if (assassin >= 1) {
      mods.assassinLevel = 1;
      mods.bossSlayerBonus += 0.2;
    }
    if (assassin >= 2) {
      mods.assassinLevel = 2;
      mods.critDamageMultiplier = 2.5;
    }

    // 9. Void (1/2)
    const voidCount = counts.Void || 0;
    if (voidCount >= 1) {
      mods.voidLevel = 1;
      mods.damageBonusMultiplier += 0.2;
    }
    if (voidCount >= 2) mods.voidLevel = 2;

    // 10. Beast (2/4)
    const beast = counts.Beast || 0;
    if (beast >= 2) {
      mods.moveSpeedMultiplier += 0.2;
      mods.attackSpeedMultiplier += 0.2;
    }
    if (beast >= 4) {
      mods.attackSpeedMultiplier += 0.25;
    }

    // 疊加首領遺物加成
    mods.attackSpeedMultiplier += this.relicBonuses.attackSpeedBonus;
    mods.moveSpeedMultiplier += this.relicBonuses.moveSpeedBonus;
    mods.critChance += this.relicBonuses.critChanceBonus;
    mods.bossSlayerBonus += this.relicBonuses.bossSlayerBonus;
    mods.maxHpMultiplier += this.relicBonuses.maxHpBonus;
    mods.phalanxExtraDR += this.relicBonuses.phalanxExtraDR;

    this.globalModifiers = mods;

    for (let i = 0; i < minions.length; i++) {
      minions[i].applySynergyModifiers(mods);
    }

    if (player) {
      player.applySynergyModifiers(mods);
    }

    this.renderSynergyPanel();
  }

  renderSynergyPanel() {
    if (!this.synergyListEl) return;

    const allTags = Object.keys(SYNERGY_RULES);
    const sortedTags = [...allTags].sort((a, b) => {
      const ca = this.tagCounts[a] || 0;
      const cb = this.tagCounts[b] || 0;
      const [ta1, ta2] = SYNERGY_RULES[a].thresholds;
      const [tb1, tb2] = SYNERGY_RULES[b].thresholds;
      const tierA = ca >= ta2 ? 2 : ca >= ta1 ? 1 : 0;
      const tierB = cb >= tb2 ? 2 : cb >= tb1 ? 1 : 0;
      if (tierB !== tierA) return tierB - tierA;
      return cb - ca;
    });

    let html = "";
    for (const tag of sortedTags) {
      const rule = SYNERGY_RULES[tag];
      const count = this.tagCounts[tag] || 0;
      if (count === 0 && !["Undead", "Mech", "Warrior", "Ranger"].includes(tag)) {
        continue;
      }
      const [t1, t2] = rule.thresholds;
      const tierLevel = count >= t2 ? 2 : count >= t1 ? 1 : 0;

      html += `
        <div class="synergy-item tier-${tierLevel}">
          <div class="synergy-header">
            <span class="synergy-name">${rule.name}</span>
            <span class="synergy-count">${count} / ${t1} / ${t2}</span>
          </div>
          <div class="synergy-desc ${count >= t1 ? "active" : ""}">${rule.descriptions[0]}</div>
          <div class="synergy-desc ${count >= t2 ? "active" : ""}">${rule.descriptions[1]}</div>
        </div>
      `;
    }

    this.synergyListEl.innerHTML = html;
  }
}
