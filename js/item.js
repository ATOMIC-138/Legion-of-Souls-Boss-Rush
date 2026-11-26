import { ObjectPool } from "./pool.js?v=12";

/**
 * DropItem (掉落物實體：支援經驗寶石 Gem、全圖磁鐵 Magnet、烤雞靈藥 Meat、首領寶箱 Chest)
 */
export class DropItem {
  constructor() {
    this.reset();
  }

  reset() {
    this.active = false;
    this.type = "gem"; // "gem" | "magnet" | "meat" | "chest"
    this.x = 0;
    this.y = 0;
    this.expValue = 1;
    this.radius = 7;
    this.color = "#38bdf8";
    this.isMagnetized = false;
    this.magnetSpeed = 0;
    this.magnetTime = 0;
    this.arcSign = 1;
    this.animTime = 0;
  }

  init(x, y, expValue = 1, type = "gem") {
    this.active = true;
    this.type = type;
    this.x = x;
    this.y = y;
    this.expValue = expValue;
    this.isMagnetized = false;
    this.magnetSpeed = 0;
    this.magnetTime = 0;
    this.arcSign = Math.random() < 0.5 ? -1 : 1;
    this.animTime = Math.random() * 6.28;

    if (type === "chest") {
      this.radius = 16;
      this.color = "#f59e0b";
    } else if (type === "magnet") {
      this.radius = 12;
      this.color = "#3b82f6";
    } else if (type === "meat") {
      this.radius = 12;
      this.color = "#22c55e";
    } else {
      if (expValue >= 15) {
        this.color = "#f59e0b";
        this.radius = 10;
      } else if (expValue >= 3) {
        this.color = "#a855f7";
        this.radius = 8.5;
      } else {
        this.color = "#38bdf8";
        this.radius = 7;
      }
    }
  }

  draw(ctx) {
    if (!this.active) return;

    ctx.save();
    ctx.translate(this.x, this.y);

    if (this.type === "chest") {
      // 繪製發光黃金首領寶箱
      const bob = Math.sin(this.animTime * 6) * 2.5;
      ctx.translate(0, bob);
      ctx.shadowColor = "#facc15";
      ctx.shadowBlur = 16;

      // 寶箱木身與金邊
      ctx.fillStyle = "#92400e";
      ctx.fillRect(-13, -9, 26, 18);
      ctx.strokeStyle = "#fde047";
      ctx.lineWidth = 2.5;
      ctx.strokeRect(-13, -9, 26, 18);

      // 寶箱橫條與中央鎖頭
      ctx.fillStyle = "#facc15";
      ctx.fillRect(-13, -2, 26, 3.5);
      ctx.fillRect(-3.5, -4, 7, 7);
    } else if (this.type === "magnet") {
      // 繪製紅藍 U 型全圖磁鐵
      const bob = Math.sin(this.animTime * 8) * 2;
      ctx.translate(0, bob);
      ctx.shadowColor = "#60a5fa";
      ctx.shadowBlur = 12;

      ctx.lineWidth = 4.5;
      ctx.strokeStyle = "#ef4444";
      ctx.beginPath();
      ctx.arc(0, 0, 8, Math.PI, 0);
      ctx.stroke();

      ctx.fillStyle = "#3b82f6";
      ctx.fillRect(-10.2, 0, 4.5, 7);
      ctx.fillRect(5.7, 0, 4.5, 7);
      ctx.fillStyle = "#e2e8f0";
      ctx.fillRect(-10.2, 5, 4.5, 3);
      ctx.fillRect(5.7, 5, 4.5, 3);
    } else if (this.type === "meat") {
      // 繪製生命靈藥 / 烤雞腿 (綠光十字靈藥瓶)
      const bob = Math.sin(this.animTime * 7) * 2;
      ctx.translate(0, bob);
      ctx.shadowColor = "#4ade80";
      ctx.shadowBlur = 12;

      ctx.fillStyle = "#16a34a";
      ctx.beginPath();
      ctx.arc(0, 1, 9.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = "#bbf7d0";
      ctx.lineWidth = 1.8;
      ctx.stroke();

      // 白色治癒十字
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(-2, -4, 4, 10);
      ctx.fillRect(-5, -1, 10, 4);
    } else {
      // 繪製菱形經驗寶石
      const r = this.radius;
      ctx.beginPath();
      ctx.moveTo(0, -r);
      ctx.lineTo(r * 0.85, 0);
      ctx.lineTo(0, r);
      ctx.lineTo(-r * 0.85, 0);
      ctx.closePath();

      ctx.fillStyle = this.color;
      ctx.fill();

      ctx.strokeStyle = "#ffffff";
      ctx.lineWidth = 1.5;
      ctx.stroke();
    }

    ctx.restore();
  }
}

/**
 * 掉落物管理器 (ItemManager)
 * 管理經驗寶石、全圖磁鐵、生命靈藥與首領寶箱的生成、磁吸與拾取回呼
 */
export class ItemManager {
  constructor(initialPoolSize = 220) {
    this.gemPool = new ObjectPool(() => new DropItem(), initialPoolSize);
  }

  /**
   * 生成經驗寶石
   */
  spawnGem(x, y, expValue) {
    const item = this.gemPool.acquire();
    item.init(x, y, expValue, "gem");
    return item;
  }

  /**
   * 生成特殊道具 ("magnet" | "meat" | "chest")
   */
  spawnSpecialItem(x, y, type) {
    const item = this.gemPool.acquire();
    item.init(x, y, 0, type);
    return item;
  }

  /**
   * 觸發「全圖磁鐵」效果：將地圖上所有散落的經驗寶石瞬間磁吸飛向玩家！
   */
  magnetizeAllGems() {
    const list = this.gemPool.activeList;
    for (let i = 0; i < list.length; i++) {
      const item = list[i];
      if (item.active && item.type === "gem" && !item.isMagnetized) {
        item.isMagnetized = true;
        item.magnetSpeed = 120;
        item.magnetTime = 0;
      }
    }
  }

  /**
   * 更新所有掉落物
   * @param {number} dt
   * @param {Player} player
   * @param {(item: DropItem) => void} onCollectItem
   */
  update(dt, player, onCollectItem) {
    const activeItems = this.gemPool.activeList;

    for (let i = activeItems.length - 1; i >= 0; i--) {
      const item = activeItems[i];
      if (!item.active) continue;

      item.animTime += dt;

      const dx = player.x - item.x;
      const dy = player.y - item.y;
      const distSq = dx * dx + dy * dy;
      const pickupRad = item.type === "chest" ? player.radius + 28 : player.pickupRadius;

      if (!item.isMagnetized && distSq <= pickupRad * pickupRad && item.type !== "chest") {
        item.isMagnetized = true;
        item.magnetSpeed = -110;
        item.magnetTime = 0;
      }

      if (item.isMagnetized) {
        item.magnetTime += dt;
        const dist = Math.sqrt(distSq) || 1;
        const nx = dx / dist;
        const ny = dy / dist;

        const perpX = -ny * item.arcSign;
        const perpY = nx * item.arcSign;
        const arcFactor = Math.max(0, 1 - item.magnetTime * 3.2) * 90;

        item.magnetSpeed = Math.min(920, item.magnetSpeed + 1550 * dt);
        item.x += (nx * item.magnetSpeed + perpX * arcFactor) * dt;
        item.y += (ny * item.magnetSpeed + perpY * arcFactor) * dt;
      }

      const collectDist = player.radius + item.radius + 8;
      const newDx = player.x - item.x;
      const newDy = player.y - item.y;
      if (newDx * newDx + newDy * newDy <= collectDist * collectDist) {
        const collectedSnapshot = {
          type: item.type,
          expValue: item.expValue,
          x: item.x,
          y: item.y
        };
        this.gemPool.release(item);
        if (onCollectItem) {
          onCollectItem(collectedSnapshot);
        }
      }
    }
  }

  draw(ctx) {
    const activeItems = this.gemPool.activeList;
    for (let i = 0; i < activeItems.length; i++) {
      activeItems[i].draw(ctx);
    }
  }
}
