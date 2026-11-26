/**
 * 2D 殿堂級角色、隨從與史詩 Boss 美術渲染引擎 (SpriteRenderer)
 * 全面升級細節層次：
 * - 召喚師主角：雙層奧術星盤、飄逸漸層法袍、符文護肩、懸浮翻頁魔導書與星辰法杖
 * - 8 種隨從：細緻盔甲高光、武器光暈、呼吸與揮砍骨骼動態、★2/★3 專屬戰冠與魂火陣
 * - 一般魔物與 3 大特色小 Boss (mb_05 骸骨暴徒隊長、mb_15 發條處刑者、mb_25 深淵雙子刺客)
 * - 3 大波次傳說君王大 Boss (b_10 煉獄熔岩巨像・伊格尼斯、b_20 深淵織網女皇・阿拉克涅、b_30 虛空死靈大君・瑪爾扎哈)
 */
export class SpriteRenderer {
  /**
   * 繪製召喚師玩家角色
   */
  static drawPlayer(ctx, player, time = player.animTime || 0) {
    const isMoving = Math.hypot(player.vx || 0, player.vy || 0) > 5;
    const bob = isMoving ? Math.sin(time * 14) * 3 : Math.sin(time * 4) * 1.4;
    const tilt = isMoving ? (player.facing.x || 0) * 0.11 : 0;
    const flipX = (player.facing.x || 0) < -0.05 ? -1 : 1;

    const skin = player.skinConfig || {
      capeColor: "#1d4ed8",
      robeColor: "#1e3a8a",
      trimColor: "#facc15",
      auraColor: "#38bdf8",
      wingType: "none"
    };

    ctx.save();
    ctx.translate(player.x, player.y);

    // 1. 腳下雙層旋轉奧術召喚陣 (隨主角傳說造型變換色澤)
    ctx.save();
    ctx.rotate(time * 0.9);
    const auraGrad = ctx.createRadialGradient(0, 8, 2, 0, 8, 28);
    auraGrad.addColorStop(0, `${skin.auraColor}55`);
    auraGrad.addColorStop(1, "rgba(0, 0, 0, 0)");
    ctx.fillStyle = auraGrad;
    ctx.beginPath();
    ctx.arc(0, 8, 28, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = skin.auraColor;
    ctx.globalAlpha = 0.65;
    ctx.lineWidth = 1.8;
    ctx.beginPath();
    ctx.arc(0, 0, 24, 0, Math.PI * 2);
    ctx.stroke();

    // 內接六芒星陣線
    ctx.strokeStyle = skin.trimColor;
    ctx.globalAlpha = 0.45;
    ctx.lineWidth = 1.2;
    for (let t = 0; t < 2; t++) {
      ctx.beginPath();
      for (let i = 0; i < 3; i++) {
        const a = (i * Math.PI * 2) / 3 + (t * Math.PI) / 3;
        const px = Math.cos(a) * 21;
        const py = Math.sin(a) * 21;
        if (i === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      }
      ctx.closePath();
      ctx.stroke();
    }
    ctx.restore();

    // 若玩家受蛛網緩速，繪製腳下紫綠蛛絲束縛特效
    if (player.slowTimer > 0) {
      ctx.save();
      ctx.strokeStyle = "rgba(192, 132, 252, 0.85)";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(0, 6, 20, 0, Math.PI * 2);
      ctx.moveTo(-18, 6); ctx.lineTo(18, 6);
      ctx.moveTo(0, -12); ctx.lineTo(0, 24);
      ctx.stroke();
      ctx.restore();
    }

    // 2. 地面陰影
    ctx.fillStyle = "rgba(0, 0, 0, 0.5)";
    ctx.beginPath();
    ctx.ellipse(0, 16, 16, 6.5, 0, 0, Math.PI * 2);
    ctx.fill();

    if (player.invincibleTimer > 0 && Math.floor(player.invincibleTimer * 24) % 2 === 0) {
      ctx.globalAlpha = 0.45;
    }

    ctx.translate(0, bob);
    ctx.rotate(tilt);
    ctx.scale(flipX, 1);

    // 2.5 傳說造型專屬背部神翼 (火焰魔翼 / 虛空星晶翼 / 熾天使六翼黃金羽)
    if (skin.wingType && skin.wingType !== "none") {
      const wingFlap = Math.sin(time * 7) * 0.16;
      for (const side of [-1, 1]) {
        ctx.save();
        ctx.scale(side, 1);
        ctx.rotate(wingFlap);
        ctx.fillStyle = skin.auraColor;
        ctx.strokeStyle = skin.trimColor;
        ctx.lineWidth = 1.4;
        for (let w = 0; w < 3; w++) {
          ctx.beginPath();
          ctx.moveTo(4, -6 + w * 4);
          ctx.quadraticCurveTo(22 - w * 3, -18 + w * 5, 26 - w * 4, -6 + w * 6);
          ctx.quadraticCurveTo(15, 0 + w * 4, 4, -2 + w * 4);
          ctx.closePath();
          ctx.fill();
          ctx.stroke();
        }
        ctx.restore();
      }
    }

    // 3. 背部飄動星辰披風
    const capeWave = Math.sin(time * 9) * 3;
    ctx.fillStyle = skin.capeColor;
    ctx.beginPath();
    ctx.moveTo(-10, -6);
    ctx.quadraticCurveTo(-18 - capeWave, 6, -15 - capeWave, 17);
    ctx.lineTo(12, 16);
    ctx.lineTo(9, -6);
    ctx.closePath();
    ctx.fill();

    // 4. 大召喚師鑲金星藍法袍
    const robeGrad = ctx.createLinearGradient(0, -14, 0, 16);
    robeGrad.addColorStop(0, skin.capeColor);
    robeGrad.addColorStop(0.6, skin.robeColor);
    robeGrad.addColorStop(1, "#0f172a");
    ctx.fillStyle = robeGrad;
    ctx.beginPath();
    ctx.moveTo(-11, -4);
    ctx.quadraticCurveTo(-15, 10, -13, 15);
    ctx.lineTo(13, 15);
    ctx.quadraticCurveTo(15, 10, 11, -4);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = skin.trimColor;
    ctx.lineWidth = 1.6;
    ctx.stroke();

    // 法袍中央黃金符文垂帶
    ctx.fillStyle = skin.trimColor;
    ctx.fillRect(-3, -1, 6, 15);
    ctx.fillStyle = "#fef08a";
    ctx.fillRect(-1.2, 2, 2.4, 9);

    // 5. 黃金羽翼肩甲
    ctx.fillStyle = skin.robeColor;
    ctx.beginPath();
    ctx.ellipse(0, -3.5, 14, 6, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = skin.trimColor;
    ctx.lineWidth = 1.5;
    ctx.stroke();

    // 胸前奧術藍寶石胸針
    ctx.fillStyle = skin.auraColor;
    ctx.beginPath();
    ctx.arc(0, -3, 3, 0, Math.PI * 2);
    ctx.fill();

    // 6. 尖頂奧術兜帽與神秘發光雙眼
    ctx.fillStyle = skin.robeColor;
    ctx.beginPath();
    ctx.arc(0, -11, 11, 0, Math.PI * 2);
    ctx.moveTo(-10, -13);
    ctx.quadraticCurveTo(-4, -23, -8, -24);
    ctx.quadraticCurveTo(4, -20, 9, -14);
    ctx.fill();
    ctx.strokeStyle = skin.trimColor;
    ctx.lineWidth = 1.3;
    ctx.stroke();

    ctx.fillStyle = "#060913";
    ctx.beginPath();
    ctx.arc(1.5, -10.5, 7.5, 0, Math.PI * 2);
    ctx.fill();

    ctx.shadowColor = skin.auraColor;
    ctx.shadowBlur = 9;
    ctx.fillStyle = "#7dd3fc";
    ctx.beginPath();
    ctx.ellipse(0, -11, 2.1, 1.3, -0.1, 0, Math.PI * 2);
    ctx.ellipse(5.2, -11, 2.1, 1.3, 0.1, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;

    // 7. 右手星辰大魔導法杖
    const staffWave = Math.sin(time * 6) * 2;
    ctx.save();
    ctx.translate(14, -2 + staffWave * 0.4);
    ctx.rotate(0.16);
    ctx.strokeStyle = "#92400e";
    ctx.lineWidth = 3.2;
    ctx.beginPath();
    ctx.moveTo(0, -15);
    ctx.lineTo(0, 16);
    ctx.stroke();

    // 黃金月牙杖首
    ctx.strokeStyle = "#facc15";
    ctx.lineWidth = 2.2;
    ctx.beginPath();
    ctx.arc(0, -17, 5.5, 0.15, Math.PI * 1.35);
    ctx.stroke();

    // 懸浮星核寶珠
    ctx.shadowColor = "#38bdf8";
    ctx.shadowBlur = 14;
    ctx.fillStyle = "#e0f2fe";
    ctx.beginPath();
    ctx.arc(0, -18, 4.2, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    // 8. 左側懸浮開啟的黃金魔導書
    const bookY = -6 + Math.cos(time * 5) * 3;
    ctx.save();
    ctx.translate(-16, bookY);
    ctx.rotate(-0.18);
    ctx.fillStyle = "#7c2d12";
    ctx.fillRect(-6, -4.5, 12, 9);
    ctx.strokeStyle = "#facc15";
    ctx.lineWidth = 1.2;
    ctx.strokeRect(-6, -4.5, 12, 9);
    ctx.fillStyle = "#fef3c7";
    ctx.fillRect(-4.5, -3, 9, 6);
    ctx.strokeStyle = "#3b82f6";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, -3); ctx.lineTo(0, 3);
    ctx.stroke();
    ctx.restore();

    ctx.restore();
  }

  /**
   * 繪製各種類隨從角色 (含升星巨型化 1.0x / 1.55x / 2.25x、戰冠與魂火陣)
   */
  static drawMinion(ctx, minion, time = 0) {
    const isMythic = minion.star >= 4 || minion.isMythic;
    const scale = isMythic
      ? 2.65
      : minion.star >= 3
        ? 2.25
        : minion.star === 2
          ? 1.55
          : 1.0;
    const seed = (minion.x * 0.05 + minion.y * 0.05) % 6.28;
    const isAttacking = minion.state === "ATTACKING";
    const bob = Math.sin(time * 12 + seed) * 2.2;
    const attackSwing = isAttacking ? Math.sin(time * 22) * 0.38 : 0;

    ctx.save();
    ctx.translate(minion.x, minion.y);
    ctx.scale(scale, scale);

    // 1. 高星級腳下霸氣光環 (★4 神話泰坦擁有雙重彩虹流光神環)
    if (minion.star >= 2 || isMythic) {
      ctx.save();
      const isStar3 = minion.star >= 3 || isMythic;
      const auraColor = isMythic
        ? "rgba(232, 121, 249, 0.9)"
        : isStar3
          ? "rgba(244, 63, 94, 0.85)"
          : "rgba(250, 204, 21, 0.75)";
      const subAuraColor = isMythic
        ? "rgba(56, 189, 248, 0.8)"
        : isStar3
          ? "rgba(251, 191, 36, 0.65)"
          : "rgba(254, 240, 138, 0.45)";

      const auraGrad = ctx.createRadialGradient(0, 6, 2, 0, 6, 20);
      auraGrad.addColorStop(
        0,
        isMythic
          ? "rgba(232, 121, 249, 0.4)"
          : isStar3
            ? "rgba(244, 63, 94, 0.35)"
            : "rgba(250, 204, 21, 0.25)"
      );
      auraGrad.addColorStop(1, "rgba(0, 0, 0, 0)");
      ctx.fillStyle = auraGrad;
      ctx.beginPath();
      ctx.arc(0, 6, 20, 0, Math.PI * 2);
      ctx.fill();

      ctx.rotate(-time * 1.8);
      ctx.strokeStyle = auraColor;
      ctx.lineWidth = isStar3 ? 2.0 : 1.5;
      ctx.setLineDash([5, 3]);
      ctx.beginPath();
      ctx.arc(0, 0, 15.5, 0, Math.PI * 2);
      ctx.stroke();

      if (isStar3) {
        ctx.rotate(time * 3.6);
        ctx.setLineDash([]);
        ctx.strokeStyle = subAuraColor;
        ctx.lineWidth = 1.3;
        ctx.beginPath();
        ctx.arc(0, 0, 12, 0, Math.PI * 2);
        ctx.stroke();

        const orbCount = isMythic ? 4 : 3;
        for (let i = 0; i < orbCount; i++) {
          const orbAngle = (i * Math.PI * 2) / orbCount;
          const ox = Math.cos(orbAngle) * 15.5;
          const oy = Math.sin(orbAngle) * 15.5;
          ctx.fillStyle = isMythic && i % 2 === 0 ? "#38bdf8" : "#fde047";
          ctx.beginPath();
          ctx.arc(ox, oy, 2.4, 0, Math.PI * 2);
          ctx.fill();
        }
      }
      ctx.restore();
    }

    // 2. 地面陰影
    ctx.fillStyle = "rgba(0, 0, 0, 0.45)";
    ctx.beginPath();
    ctx.ellipse(0, 11, 10.5, 4.8, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.translate(0, bob);
    ctx.rotate(attackSwing * 0.35);

    if (isMythic) {
      ctx.shadowColor = "#e879f9";
      ctx.shadowBlur = 16;
    } else if (minion.star === 2) {
      ctx.shadowColor = "#facc15";
      ctx.shadowBlur = 8;
    } else if (minion.star >= 3) {
      ctx.shadowColor = "#f43f5e";
      ctx.shadowBlur = 14;
    }

    switch (minion.id) {
      case "m_01":
        this._drawSkeletonWarrior(ctx, time, attackSwing);
        break;
      case "m_02":
        this._drawClockworkRanger(ctx, time);
        break;
      case "m_03":
        this._drawVoidAssassin(ctx, time, attackSwing);
        break;
      case "m_04":
        this._drawFireSprite(ctx, time);
        break;
      case "m_05":
        this._drawTotemBear(ctx, time, attackSwing);
        break;
      case "m_06":
        this._drawHeavyMech(ctx, time, attackSwing);
        break;
      case "m_07":
        this._drawSpectralHunter(ctx, time);
        break;
      case "mythic_01":
        this._drawHeavyMech(ctx, time, attackSwing);
        this._drawClockworkRanger(ctx, time);
        break;
      case "mythic_02":
        this._drawVoidAssassin(ctx, time, attackSwing);
        this._drawSkeletonWarrior(ctx, time, attackSwing);
        break;
      case "mythic_03":
        this._drawTotemBear(ctx, time, attackSwing);
        this._drawBeastBerserker(ctx, time, attackSwing);
        break;
      case "m_08":
      default:
        this._drawBeastBerserker(ctx, time, attackSwing);
        break;
    }

    ctx.shadowBlur = 0;

    if (minion.star >= 2 || isMythic) {
      this._drawStarCrown(ctx, isMythic ? 4 : minion.star);
    }

    ctx.restore();

    const topOffset = 18 * scale + (minion.star >= 2 ? 6 : 0);
    const starsStr = "★".repeat(isMythic ? 4 : minion.star);
    ctx.save();
    ctx.font = `900 ${11 + (Math.min(4, minion.star) - 1) * 3.5}px 'Segoe UI', sans-serif`;
    ctx.textAlign = "center";
    ctx.strokeStyle = "#000000";
    ctx.lineWidth = 3.5;
    ctx.strokeText(starsStr, minion.x, minion.y - topOffset);
    ctx.fillStyle = isMythic
      ? "#e879f9"
      : minion.star >= 3
        ? "#fb7185"
        : minion.star === 2
          ? "#facc15"
          : "#fde047";
    ctx.fillText(starsStr, minion.x, minion.y - topOffset);
    ctx.restore();
  }

  static _drawStarCrown(ctx, star) {
    ctx.save();
    ctx.translate(0, -15);
    ctx.fillStyle = star >= 3 ? "#f43f5e" : "#facc15";
    ctx.strokeStyle = "#fef08a";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(-5, 0);
    ctx.lineTo(-6, -5);
    ctx.lineTo(-2.5, -2);
    ctx.lineTo(0, -6.5);
    ctx.lineTo(2.5, -2);
    ctx.lineTo(6, -5);
    ctx.lineTo(5, 0);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.restore();
  }

  static _drawSkeletonWarrior(ctx, time, swing) {
    // 亡靈破布披風与骨甲
    ctx.fillStyle = "#1e293b";
    ctx.beginPath();
    ctx.moveTo(-7, -3);
    ctx.lineTo(-9, 10);
    ctx.lineTo(9, 10);
    ctx.lineTo(7, -3);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = "#475569";
    ctx.fillRect(-6, -2, 12, 10);
    ctx.strokeStyle = "#e2e8f0";
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(-4, 1); ctx.lineTo(4, 1);
    ctx.moveTo(-4, 4); ctx.lineTo(4, 4);
    ctx.stroke();

    ctx.fillStyle = "#f8fafc";
    ctx.beginPath();
    ctx.arc(0, -7, 7, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillRect(-3.5, -2, 7, 3);

    ctx.fillStyle = "#0f172a";
    ctx.beginPath();
    ctx.arc(-2.5, -7, 1.9, 0, Math.PI * 2);
    ctx.arc(2.5, -7, 1.9, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#38bdf8";
    ctx.fillRect(-3, -7.5, 1.4, 1.4);
    ctx.fillRect(2, -7.5, 1.4, 1.4);

    // 鉚釘圓盾
    ctx.fillStyle = "#334155";
    ctx.beginPath();
    ctx.arc(-8.5, 2, 6, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "#94a3b8";
    ctx.lineWidth = 1.8;
    ctx.stroke();
    ctx.fillStyle = "#facc15";
    ctx.beginPath();
    ctx.arc(-8.5, 2, 1.8, 0, Math.PI * 2);
    ctx.fill();

    // 符文騎士闊劍
    ctx.save();
    ctx.translate(8.5, 0);
    ctx.rotate(swing * 1.6 - 0.25);
    ctx.fillStyle = "#e2e8f0";
    ctx.beginPath();
    ctx.moveTo(-2, 0);
    ctx.lineTo(-1.5, -13);
    ctx.lineTo(0, -16);
    ctx.lineTo(1.5, -13);
    ctx.lineTo(2, 0);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = "#f59e0b";
    ctx.fillRect(-4.5, -1.5, 9, 2.5);
    ctx.restore();
  }

  static _drawClockworkRanger(ctx, time) {
    ctx.fillStyle = "#d97706";
    ctx.fillRect(-7, -3, 14, 12);
    ctx.strokeStyle = "#fef08a";
    ctx.lineWidth = 1.2;
    ctx.strokeRect(-7, -3, 14, 12);

    ctx.fillStyle = "#38bdf8";
    ctx.beginPath();
    ctx.arc(0, 3, 3.2, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = "#f59e0b";
    ctx.beginPath();
    ctx.arc(0, -7, 6.8, Math.PI, 0);
    ctx.lineTo(6.8, -3);
    ctx.lineTo(-6.8, -3);
    ctx.closePath();
    ctx.fill();

    ctx.strokeStyle = "#fde047";
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(0, -13);
    ctx.lineTo(0, -17);
    ctx.stroke();
    ctx.fillStyle = "#ef4444";
    ctx.beginPath();
    ctx.arc(0, -17, 2.2, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = "#111827";
    ctx.fillRect(-5, -8, 10, 3.5);
    ctx.fillStyle = "#ef4444";
    ctx.beginPath();
    ctx.arc(Math.sin(time * 5) * 2.5, -6.2, 1.7, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = "#334155";
    ctx.fillRect(5, -2.5, 10, 5);
    ctx.fillStyle = "#fbbf24";
    ctx.fillRect(13, -3, 2.5, 6);
  }

  static _drawVoidAssassin(ctx, time, swing) {
    ctx.fillStyle = "#4c1d95";
    ctx.beginPath();
    ctx.moveTo(0, -13);
    ctx.lineTo(-9.5, 9.5);
    ctx.lineTo(0, 6);
    ctx.lineTo(9.5, 9.5);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = "#c084fc";
    ctx.lineWidth = 1.3;
    ctx.stroke();

    ctx.fillStyle = "#1e1b4b";
    ctx.beginPath();
    ctx.arc(0, -6, 6.2, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#f43f5e";
    ctx.fillRect(-3.8, -7, 2.8, 1.6);
    ctx.fillRect(1, -7, 2.8, 1.6);

    ctx.save();
    ctx.rotate(swing * 1.8);
    ctx.strokeStyle = "#e879f9";
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(-7, 0); ctx.lineTo(-15, -6);
    ctx.moveTo(7, 0); ctx.lineTo(15, -6);
    ctx.stroke();
    ctx.restore();
  }

  static _drawFireSprite(ctx, time) {
    const flicker = Math.sin(time * 18) * 2.2;
    const grad = ctx.createRadialGradient(0, -2, 2, 0, -2, 12.5);
    grad.addColorStop(0, "#fef08a");
    grad.addColorStop(0.55, "#f97316");
    grad.addColorStop(1, "#dc2626");

    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.moveTo(-8, 4);
    ctx.quadraticCurveTo(-10, -6, -4, -12 + flicker);
    ctx.quadraticCurveTo(0, -18 - flicker, 4, -12 + flicker);
    ctx.quadraticCurveTo(10, -6, 8, 4);
    ctx.arc(0, 4, 8, 0, Math.PI);
    ctx.fill();

    ctx.fillStyle = "#1f2937";
    ctx.beginPath();
    ctx.arc(-3, -2, 1.8, 0, Math.PI * 2);
    ctx.arc(3, -2, 1.8, 0, Math.PI * 2);
    ctx.fill();
  }

  static _drawTotemBear(ctx, time, swing) {
    ctx.fillStyle = "#065f46";
    ctx.beginPath();
    ctx.arc(0, 1, 10.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "#34d399";
    ctx.lineWidth = 1.6;
    ctx.stroke();

    ctx.fillStyle = "#047857";
    ctx.beginPath();
    ctx.arc(-6, -10, 3.6, 0, Math.PI * 2);
    ctx.arc(6, -10, 3.6, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = "#059669";
    ctx.beginPath();
    ctx.arc(0, -6, 7.6, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#a7f3d0";
    ctx.beginPath();
    ctx.ellipse(0, -4.5, 3.5, 2.5, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#064e3b";
    ctx.beginPath();
    ctx.arc(-3, -7.5, 1.4, 0, Math.PI * 2);
    ctx.arc(3, -7.5, 1.4, 0, Math.PI * 2);
    ctx.fill();

    ctx.save();
    ctx.translate(9.5, 0);
    ctx.rotate(swing);
    ctx.fillStyle = "#10b981";
    ctx.fillRect(-2.2, -10, 4.4, 16);
    ctx.strokeStyle = "#fde047";
    ctx.strokeRect(-2.2, -10, 4.4, 16);
    ctx.restore();
  }

  static _drawHeavyMech(ctx, time, swing) {
    ctx.fillStyle = "#ca8a04";
    ctx.fillRect(-9.5, -6, 19, 15);
    ctx.strokeStyle = "#fef08a";
    ctx.lineWidth = 1.6;
    ctx.strokeRect(-9.5, -6, 19, 15);

    ctx.fillStyle = "#1e293b";
    ctx.fillRect(-6, -4, 12, 4);
    ctx.fillStyle = "#38bdf8";
    ctx.fillRect(-4, -3, 8, 2);

    ctx.save();
    ctx.translate(10.5, 0);
    ctx.rotate(swing * 1.5);
    ctx.fillStyle = "#94a3b8";
    ctx.fillRect(-3.5, -12, 7, 9);
    ctx.strokeStyle = "#facc15";
    ctx.lineWidth = 1.2;
    ctx.strokeRect(-3.5, -12, 7, 9);
    ctx.restore();
  }

  static _drawSpectralHunter(ctx, time) {
    ctx.fillStyle = "rgba(56, 189, 248, 0.85)";
    ctx.beginPath();
    ctx.arc(0, -6, 6.8, Math.PI, 0);
    ctx.lineTo(7.5, 8 + Math.sin(time * 10) * 2);
    ctx.lineTo(0, 5);
    ctx.lineTo(-7.5, 8 - Math.sin(time * 10) * 2);
    ctx.closePath();
    ctx.fill();

    ctx.strokeStyle = "#e0f2fe";
    ctx.lineWidth = 2.2;
    ctx.beginPath();
    ctx.arc(6.5, -1, 7.5, -Math.PI * 0.45, Math.PI * 0.45);
    ctx.stroke();
  }

  static _drawBeastBerserker(ctx, time, swing) {
    ctx.fillStyle = "#c2410c";
    ctx.beginPath();
    ctx.arc(0, 1, 8.5, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = "#fef3c7";
    ctx.lineWidth = 2.4;
    ctx.beginPath();
    ctx.moveTo(-5, -7); ctx.lineTo(-10.5, -13.5);
    ctx.moveTo(5, -7); ctx.lineTo(10.5, -13.5);
    ctx.stroke();

    ctx.fillStyle = "#ea580c";
    ctx.beginPath();
    ctx.arc(0, -6, 6.2, 0, Math.PI * 2);
    ctx.fill();

    ctx.save();
    ctx.translate(8.5, -1);
    ctx.rotate(swing * 1.8);
    ctx.fillStyle = "#e2e8f0";
    ctx.beginPath();
    ctx.arc(2, -6, 5.5, -0.85, 0.85);
    ctx.lineTo(0, -6);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }

  /**
   * 繪製魔物、特色小 Boss 與 9 大君王大 Boss (含沖天威壓光柱、腳下警戒星環與浮空王冠血條名牌)
   */
  static drawEnemy(ctx, enemy, time) {
    const seed = (enemy.x * 0.03 + enemy.y * 0.03) % 6.28;
    const isHit = enemy.hitFlashTimer > 0;
    const r = enemy.radius;
    const isImportantBoss = enemy.isBoss || enemy.isMiniBoss;

    ctx.save();
    ctx.translate(enemy.x, enemy.y);

    // 🌟 1. 小Boss 與 大Boss 專屬「沖天威壓光柱 + 雙層旋轉警戒星芒環」（保證在怪群中一眼就能看見！）
    if (isImportantBoss) {
      const bossCol = enemy.color || "#facc15";
      const pillarW = enemy.isBoss ? r * 1.45 : r * 1.25;
      const pillarH = enemy.isBoss ? r * 3.2 : r * 2.5;

      // 背後沖天光柱 (Vertical Light Beacon)
      ctx.save();
      const pillarGrad = ctx.createLinearGradient(0, r * 0.6, 0, -pillarH);
      pillarGrad.addColorStop(0, `${bossCol}66`);
      pillarGrad.addColorStop(0.45, `${bossCol}28`);
      pillarGrad.addColorStop(1, "rgba(0, 0, 0, 0)");
      ctx.fillStyle = pillarGrad;
      ctx.beginPath();
      ctx.moveTo(-pillarW * 0.55, r * 0.5);
      ctx.lineTo(-pillarW * 0.85, -pillarH);
      ctx.lineTo(pillarW * 0.85, -pillarH);
      ctx.lineTo(pillarW * 0.55, r * 0.5);
      ctx.closePath();
      ctx.fill();
      ctx.restore();

      // 腳下高亮度雙層旋轉星芒警戒陣
      ctx.save();
      const pulse = 1 + Math.sin(time * 6) * 0.06;
      const ringR = r * (enemy.isBoss ? 1.42 : 1.35) * pulse;
      const glowGrad = ctx.createRadialGradient(0, 4, r * 0.2, 0, 4, ringR * 1.15);
      glowGrad.addColorStop(0, `${bossCol}55`);
      glowGrad.addColorStop(0.7, `${bossCol}22`);
      glowGrad.addColorStop(1, "rgba(0, 0, 0, 0)");
      ctx.fillStyle = glowGrad;
      ctx.beginPath();
      ctx.arc(0, 4, ringR * 1.15, 0, Math.PI * 2);
      ctx.fill();

      ctx.rotate(time * (enemy.isBoss ? 1.2 : 1.6));
      ctx.strokeStyle = enemy.enraged ? "#f43f5e" : "#fde047";
      ctx.lineWidth = enemy.isBoss ? 3.2 : 2.4;
      ctx.setLineDash([10, 6]);
      ctx.beginPath();
      ctx.arc(0, 0, ringR, 0, Math.PI * 2);
      ctx.stroke();

      // 外圈四角/八角定位箭頭尖刺
      ctx.setLineDash([]);
      ctx.fillStyle = bossCol;
      const spikes = enemy.isBoss ? 8 : 4;
      for (let s = 0; s < spikes; s++) {
        const a = (s * Math.PI * 2) / spikes;
        ctx.save();
        ctx.rotate(a);
        ctx.beginPath();
        ctx.moveTo(ringR - 2, -5);
        ctx.lineTo(ringR + 10, 0);
        ctx.lineTo(ringR - 2, 5);
        ctx.closePath();
        ctx.fill();
        ctx.restore();
      }
      ctx.restore();
    }

    // 地面陰影
    ctx.fillStyle = "rgba(0, 0, 0, 0.55)";
    ctx.beginPath();
    ctx.ellipse(0, r * 0.86, r * 0.95, r * 0.42, 0, 0, Math.PI * 2);
    ctx.fill();

    // 依敵人 ID 分派精緻外觀繪製 (支援 9 大傳說君王 & 3 大特色小 Boss)
    if (enemy.id === "b_10") {
      this._drawBossIgnis(ctx, enemy, time, isHit);
    } else if (enemy.id === "b_10_frost") {
      this._drawBossFrost(ctx, enemy, time, isHit);
    } else if (enemy.id === "b_10_treant") {
      this._drawBossTreant(ctx, enemy, time, isHit);
    } else if (enemy.id === "b_20") {
      this._drawBossArachne(ctx, enemy, time, isHit);
    } else if (enemy.id === "b_20_mech") {
      this._drawBossMech(ctx, enemy, time, isHit);
    } else if (enemy.id === "b_20_vampire") {
      this._drawBossVampire(ctx, enemy, time, isHit);
    } else if (enemy.id === "b_30") {
      this._drawBossMalzahar(ctx, enemy, time, isHit);
    } else if (enemy.id === "b_30_dragon") {
      this._drawBossDragon(ctx, enemy, time, isHit);
    } else if (enemy.id === "b_30_seraph") {
      this._drawBossSeraph(ctx, enemy, time, isHit);
    } else if (enemy.id === "mb_05") {
      this._drawMiniBossBrute(ctx, enemy, time, isHit, seed);
    } else if (enemy.id === "mb_15") {
      this._drawMiniBossExecutioner(ctx, enemy, time, isHit);
    } else if (enemy.id === "mb_25") {
      this._drawMiniBossTwinAssassin(ctx, enemy, time, isHit);
    } else if (enemy.id === "e_egg") {
      this._drawSpiderEgg(ctx, enemy, time, isHit);
    } else if (enemy.id === "e_goblin") {
      // 💰 貪婪黃金哥布林盜寶賊：腳下脈動金光追蹤環 + 背著巨大發光黃金寶袋 (穿透半透明 UI 也極度顯眼！)
      const pulse = 1 + Math.sin(time * 10) * 0.1;
      ctx.save();
      ctx.strokeStyle = "rgba(250, 204, 21, 0.9)";
      ctx.fillStyle = "rgba(250, 204, 21, 0.18)";
      ctx.lineWidth = 2.4;
      ctx.beginPath();
      ctx.arc(0, 2, 24 * pulse, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.restore();

      const hop = Math.abs(Math.sin(time * 18)) * 5;
      ctx.translate(0, -hop);

      ctx.fillStyle = isHit ? "#ffffff" : "#ca8a04";
      ctx.strokeStyle = "#fef08a";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(-8, -2, 13, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = "#fde047";
      ctx.beginPath();
      ctx.arc(-11, -12, 4, 0, Math.PI * 2);
      ctx.arc(-5, -14, 3.5, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = isHit ? "#ffffff" : "#65a30d";
      ctx.beginPath();
      ctx.arc(4, 2, 10, 0, Math.PI * 2);
      ctx.arc(5, -7, 8, 0, Math.PI * 2);
      ctx.moveTo(0, -9);
      ctx.lineTo(-10, -14);
      ctx.lineTo(1, -5);
      ctx.moveTo(9, -9);
      ctx.lineTo(18, -14);
      ctx.lineTo(9, -5);
      ctx.fill();

      ctx.fillStyle = "#fef08a";
      ctx.beginPath();
      ctx.arc(3, -8, 2, 0, Math.PI * 2);
      ctx.arc(8, -8, 2, 0, Math.PI * 2);
      ctx.fill();

      if (enemy.goblinEscapeTimer !== undefined) {
        ctx.font = "bold 11px 'Segoe UI', 'Microsoft JhengHei', sans-serif";
        ctx.fillStyle = "#fde047";
        ctx.textAlign = "center";
        ctx.fillText(
          `💰 盜寶哥布林 ${enemy.goblinEscapeTimer.toFixed(1)}s`,
          0,
          -24
        );
      }
    } else if (enemy.id === "e_01") {
      const squashX = 1 + Math.sin(time * 10 + seed) * 0.14;
      const squashY = 1 - Math.sin(time * 10 + seed) * 0.14;
      ctx.scale(squashX, squashY);

      ctx.fillStyle = isHit ? "#ffffff" : "rgba(132, 204, 22, 0.9)";
      ctx.beginPath();
      ctx.arc(0, 0, r, Math.PI, 0);
      ctx.quadraticCurveTo(r * 1.1, r * 0.8, 0, r * 0.85);
      ctx.quadraticCurveTo(-r * 1.1, r * 0.8, -r, 0);
      ctx.fill();
      ctx.strokeStyle = "#bef264";
      ctx.lineWidth = 1.6;
      ctx.stroke();

      ctx.fillStyle = "rgba(255,255,255,0.55)";
      ctx.beginPath();
      ctx.ellipse(-r * 0.35, -r * 0.35, 3.2, 1.8, -0.5, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = "#1a2e05";
      ctx.beginPath();
      ctx.arc(-4, -1, 2, 0, Math.PI * 2);
      ctx.arc(4, -1, 2, 0, Math.PI * 2);
      ctx.fill();
    } else if (enemy.id === "e_02") {
      const wingFlap = Math.sin(time * 26 + seed) * 7.5;
      ctx.translate(0, Math.sin(time * 12 + seed) * 3 - 3);

      ctx.fillStyle = isHit ? "#ffffff" : "#be185d";
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.quadraticCurveTo(-11, -11 + wingFlap, -17, 2 + wingFlap);
      ctx.quadraticCurveTo(-8, 4, 0, 4);
      ctx.moveTo(0, 0);
      ctx.quadraticCurveTo(11, -11 + wingFlap, 17, 2 + wingFlap);
      ctx.quadraticCurveTo(8, 4, 0, 4);
      ctx.fill();

      ctx.fillStyle = isHit ? "#ffffff" : "#ec4899";
      ctx.beginPath();
      ctx.arc(0, 0, r * 0.65, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = "#fef08a";
      ctx.fillRect(-3.5, -2, 2, 2);
      ctx.fillRect(1.5, -2, 2, 2);
    } else {
      const isBomb = enemy.id === "e_spider_bomb";
      const legWave = Math.sin(time * 22 + seed) * 3.2;
      ctx.strokeStyle = isHit ? "#ffffff" : isBomb ? "#f43f5e" : "#a855f7";
      ctx.lineWidth = 2;
      for (let i = -1; i <= 1; i += 2) {
        for (let j = -1; j <= 1; j++) {
          ctx.beginPath();
          ctx.moveTo(i * 4, j * 3);
          ctx.lineTo(i * (r + 5), j * 6 + legWave * j);
          ctx.stroke();
        }
      }
      ctx.fillStyle = isHit ? "#ffffff" : isBomb ? "#be123c" : "#581c87";
      ctx.beginPath();
      ctx.ellipse(0, 2, r * 0.78, r * 0.88, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = isBomb ? "#fda4af" : "#c084fc";
      ctx.lineWidth = 1.5;
      ctx.stroke();

      if (isBomb) {
        ctx.fillStyle = Math.floor(time * 12) % 2 === 0 ? "#fde047" : "#fb7185";
        ctx.beginPath();
        ctx.arc(0, 4, 4.5, 0, Math.PI * 2);
        ctx.fill();
      }

      ctx.fillStyle = "#ef4444";
      ctx.fillRect(-4, -5, 2, 2);
      ctx.fillRect(2, -5, 2, 2);
    }

    ctx.restore();

    // 👑 2. 繪製高顯眼度「頭頂鑲金名牌與血條」（小Boss 與 大Boss 皆有巨型浮空名牌，絕不混淆！）
    if (enemy.isBoss || enemy.isMiniBoss || enemy.isEgg) {
      const barW = enemy.isBoss ? 156 : enemy.isMiniBoss ? 112 : 64;
      const barH = enemy.isBoss ? 10 : enemy.isMiniBoss ? 8 : 6;
      const barX = enemy.x - barW / 2;
      const barY = enemy.y - enemy.radius - (enemy.isBoss ? 38 : 26);
      const ratio = Math.max(0, enemy.hp / enemy.maxHp);

      ctx.save();
      // 名牌背板與鑲金外框
      ctx.fillStyle = "rgba(9, 13, 22, 0.92)";
      ctx.strokeStyle = enemy.isBoss ? "#facc15" : enemy.isMiniBoss ? "#f97316" : "#c084fc";
      ctx.lineWidth = enemy.isBoss ? 2.2 : 1.8;
      ctx.fillRect(barX - 4, barY - 22, barW + 8, barH + 26);
      ctx.strokeRect(barX - 4, barY - 22, barW + 8, barH + 26);

      // 血條槽與漸層填充
      ctx.fillStyle = "rgba(0, 0, 0, 0.9)";
      ctx.fillRect(barX, barY, barW, barH);
      ctx.fillStyle = enemy.isBoss
        ? enemy.enraged
          ? "#f43f5e"
          : "#ef4444"
        : enemy.isMiniBoss
          ? "#f59e0b"
          : "#c084fc";
      ctx.fillRect(barX, barY, barW * ratio, barH);

      // 頭頂角色名稱與王冠圖示
      ctx.font = enemy.isBoss
        ? "900 13px 'Segoe UI', 'Microsoft JhengHei', sans-serif"
        : "800 11.5px 'Segoe UI', 'Microsoft JhengHei', sans-serif";
      ctx.textAlign = "center";
      ctx.fillStyle = enemy.isBoss ? "#fde047" : enemy.isEgg ? "#e879f9" : "#fed7aa";
      const prefix = enemy.isBoss ? "👑 " : enemy.isMiniBoss ? "⚔️ " : "🥚 ";
      ctx.fillText(`${prefix}${enemy.name}`, enemy.x, barY - 6);
      ctx.restore();
    } else if (enemy.hp < enemy.maxHp) {
      const barW = enemy.size + 10;
      const barH = 4.5;
      const barX = enemy.x - barW / 2;
      const barY = enemy.y - enemy.radius - 12;
      const ratio = Math.max(0, enemy.hp / enemy.maxHp);
      ctx.fillStyle = "rgba(0, 0, 0, 0.8)";
      ctx.fillRect(barX - 1, barY - 1, barW + 2, barH + 2);
      ctx.fillStyle = "#ef4444";
      ctx.fillRect(barX, barY, barW * ratio, barH);
    }
  }

  /**
   * 🌋 【Wave 10 大 Boss】煉獄熔岩巨像・伊格尼斯 (b_10)
   * 黑曜石巨型裝甲、熔岩核心裂紋、雙肩噴火火山口、燃燒熔岩重拳與烈焰王冠
   */
  static _drawBossIgnis(ctx, enemy, time, isHit) {
    const r = enemy.radius;
    const isEnraged = enemy.hp < enemy.maxHp * 0.5;
    const breath = Math.sin(time * 5) * 2.5;

    // 1. 腳下熔岩煉獄火環
    ctx.save();
    ctx.rotate(time * 0.7);
    const lavaGrad = ctx.createRadialGradient(0, 4, 8, 0, 4, r * 1.35);
    lavaGrad.addColorStop(0, "rgba(234, 88, 12, 0.45)");
    lavaGrad.addColorStop(0.7, "rgba(220, 38, 38, 0.25)");
    lavaGrad.addColorStop(1, "rgba(0, 0, 0, 0)");
    ctx.fillStyle = lavaGrad;
    ctx.beginPath();
    ctx.arc(0, 4, r * 1.35, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = isEnraged ? "#fde047" : "#f97316";
    ctx.lineWidth = 2.5;
    ctx.setLineDash([8, 6]);
    ctx.beginPath();
    ctx.arc(0, 0, r * 1.15, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();

    ctx.translate(0, breath);

    // 2. 雙肩火山熔岩巨甲
    ctx.fillStyle = isHit ? "#ffffff" : "#450a0a";
    ctx.strokeStyle = "#f97316";
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.arc(-r * 0.78, -6, 16, 0, Math.PI * 2);
    ctx.arc(r * 0.78, -6, 16, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // 肩甲噴發火核
    ctx.fillStyle = "#fde047";
    ctx.beginPath();
    ctx.arc(-r * 0.78, -8, 6, 0, Math.PI * 2);
    ctx.arc(r * 0.78, -8, 6, 0, Math.PI * 2);
    ctx.fill();

    // 3. 黑曜石熔岩重裝胸甲
    ctx.shadowColor = isEnraged ? "#facc15" : "#ef4444";
    ctx.shadowBlur = isEnraged ? 24 : 14;
    const bodyGrad = ctx.createRadialGradient(0, -4, 5, 0, 0, r);
    bodyGrad.addColorStop(0, isHit ? "#ffffff" : "#991b1b");
    bodyGrad.addColorStop(0.6, isHit ? "#ffffff" : "#450a0a");
    bodyGrad.addColorStop(1, "#1c1917");
    ctx.fillStyle = bodyGrad;
    ctx.beginPath();
    ctx.moveTo(-r * 0.85, -r * 0.4);
    ctx.lineTo(0, -r * 0.95);
    ctx.lineTo(r * 0.85, -r * 0.4);
    ctx.lineTo(r * 0.7, r * 0.8);
    ctx.lineTo(-r * 0.7, r * 0.8);
    ctx.closePath();
    ctx.fill();
    ctx.shadowBlur = 0;

    ctx.strokeStyle = isEnraged ? "#fde047" : "#ea580c";
    ctx.lineWidth = 3;
    ctx.stroke();

    // 4. 胸口發光熔岩爐心與裂紋
    ctx.fillStyle = "#fef08a";
    ctx.beginPath();
    ctx.arc(0, 4, 9 + Math.sin(time * 12) * 1.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "#f97316";
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(0, 4); ctx.lineTo(-16, -12);
    ctx.moveTo(0, 4); ctx.lineTo(16, -12);
    ctx.moveTo(0, 4); ctx.lineTo(-14, 18);
    ctx.moveTo(0, 4); ctx.lineTo(14, 18);
    ctx.stroke();

    // 5. 巨像頭顱與惡魔熔岩雙角
    ctx.strokeStyle = "#fb923c";
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.moveTo(-12, -16);
    ctx.quadraticCurveTo(-28, -28, -22, -40);
    ctx.moveTo(12, -16);
    ctx.quadraticCurveTo(28, -28, 22, -40);
    ctx.stroke();

    // 燃燒怒目
    ctx.fillStyle = "#fef08a";
    ctx.beginPath();
    ctx.moveTo(-12, -14); ctx.lineTo(-3, -11); ctx.lineTo(-10, -8); ctx.closePath();
    ctx.moveTo(12, -14); ctx.lineTo(3, -11); ctx.lineTo(10, -8); ctx.closePath();
    ctx.fill();

    // 6. 左右懸浮熔岩巨拳
    const fistY = Math.sin(time * 8) * 5;
    ctx.fillStyle = "#7f1d1d";
    ctx.strokeStyle = "#fde047";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(-r * 1.05, 10 + fistY, 12, 0, Math.PI * 2);
    ctx.arc(r * 1.05, 10 - fistY, 12, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
  }

  /**
   * 🕸️ 【Wave 20 大 Boss】深淵織網女皇・阿拉克涅 (b_20)
   * 華麗紫晶蜘蛛巨腹、8 根鋒利動態鐮刀蛛腿、半身深淵女皇皇冠與毒液利爪
   */
  static _drawBossArachne(ctx, enemy, time, isHit) {
    const r = enemy.radius;
    const isEnraged = enemy.hp < enemy.maxHp * 0.5;

    // 1. 腳下劇毒蛛網法陣
    ctx.save();
    ctx.rotate(-time * 0.5);
    ctx.strokeStyle = isEnraged ? "rgba(163, 230, 53, 0.6)" : "rgba(192, 132, 252, 0.45)";
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(0, 0, r * 1.2, 0, Math.PI * 2);
    ctx.arc(0, 0, r * 0.8, 0, Math.PI * 2);
    for (let i = 0; i < 8; i++) {
      const a = (i * Math.PI) / 4;
      ctx.moveTo(0, 0);
      ctx.lineTo(Math.cos(a) * r * 1.25, Math.sin(a) * r * 1.25);
    }
    ctx.stroke();
    ctx.restore();

    // 2. 八根鐮刀骨刺巨型蛛腿
    for (let side = -1; side <= 1; side += 2) {
      for (let i = 0; i < 4; i++) {
        const wave = Math.sin(time * 14 + i * 1.3 + side) * 5;
        const baseY = -8 + i * 8;
        const kneeX = side * (r * 0.85 + i * 3);
        const kneeY = baseY - 12 + wave * 0.6;
        const tipX = side * (r * 1.35 - i * 2);
        const tipY = baseY + 12 + wave;

        ctx.strokeStyle = isHit ? "#ffffff" : "#4c1d95";
        ctx.lineWidth = 4.5;
        ctx.beginPath();
        ctx.moveTo(side * 10, baseY);
        ctx.lineTo(kneeX, kneeY);
        ctx.lineTo(tipX, tipY);
        ctx.stroke();

        ctx.strokeStyle = isEnraged ? "#a3e635" : "#e879f9";
        ctx.lineWidth = 1.8;
        ctx.stroke();
      }
    }

    // 3. 紫晶劇毒蜘蛛巨腹 (Abdomen)
    ctx.shadowColor = isEnraged ? "#84cc16" : "#a855f7";
    ctx.shadowBlur = 16;
    const abdGrad = ctx.createRadialGradient(0, 12, 4, 0, 10, r * 0.85);
    abdGrad.addColorStop(0, isHit ? "#ffffff" : "#7e22ce");
    abdGrad.addColorStop(0.65, "#3b0764");
    abdGrad.addColorStop(1, "#1e1b4b");
    ctx.fillStyle = abdGrad;
    ctx.beginPath();
    ctx.ellipse(0, 10, r * 0.72, r * 0.82, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;

    ctx.strokeStyle = "#d8b4fe";
    ctx.lineWidth = 2.5;
    ctx.stroke();

    // 腹部翠綠劇毒沙漏圖騰
    ctx.fillStyle = "#84cc16";
    ctx.beginPath();
    ctx.moveTo(-9, 2); ctx.lineTo(9, 2); ctx.lineTo(-9, 20); ctx.lineTo(9, 20);
    ctx.closePath();
    ctx.fill();

    // 4. 上半身深淵女皇軀幹與骨翼王冠
    ctx.fillStyle = isHit ? "#ffffff" : "#581c87";
    ctx.beginPath();
    ctx.arc(0, -14, 14, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "#f0abfc";
    ctx.lineWidth = 2;
    ctx.stroke();

    // 女皇六眼腥紅複眼
    ctx.fillStyle = "#bef264";
    for (let row = 0; row < 2; row++) {
      ctx.beginPath();
      ctx.arc(-5 - row * 2, -15 - row * 3, 2, 0, Math.PI * 2);
      ctx.arc(5 + row * 2, -15 - row * 3, 2, 0, Math.PI * 2);
      ctx.fill();
    }

    // 女皇蛛后高冠
    ctx.fillStyle = "#facc15";
    ctx.beginPath();
    ctx.moveTo(-10, -24);
    ctx.lineTo(-14, -36);
    ctx.lineTo(-5, -28);
    ctx.lineTo(0, -40);
    ctx.lineTo(5, -28);
    ctx.lineTo(14, -36);
    ctx.lineTo(10, -24);
    ctx.closePath();
    ctx.fill();
  }

  /**
   * 💀 【Wave 30 終極 Boss】虛空死靈大君・瑪爾扎哈 (b_30)
   * 六翼虛空骨翼、帝王星雲黑袍、環繞五顆噬魂魔球、死神巨型鐮刀與永恆虛空王冠
   */
  static _drawBossMalzahar(ctx, enemy, time, isHit) {
    const r = enemy.radius;
    const isEnraged = enemy.hp < enemy.maxHp * 0.5;
    const floatY = Math.sin(time * 4.5) * 4.5;

    // 1. 腳下虛空深淵黑洞星雲陣
    ctx.save();
    ctx.rotate(-time * 1.1);
    const voidGrad = ctx.createRadialGradient(0, 0, 6, 0, 0, r * 1.4);
    voidGrad.addColorStop(0, "rgba(0, 0, 0, 0.9)");
    voidGrad.addColorStop(0.55, "rgba(147, 51, 234, 0.45)");
    voidGrad.addColorStop(1, "rgba(236, 72, 153, 0)");
    ctx.fillStyle = voidGrad;
    ctx.beginPath();
    ctx.arc(0, 0, r * 1.4, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = isEnraged ? "#f43f5e" : "#c084fc";
    ctx.lineWidth = 2.5;
    for (let i = 0; i < 4; i++) {
      const a = (i * Math.PI) / 2;
      ctx.beginPath();
      ctx.arc(0, 0, r * 1.18, a, a + 0.9);
      ctx.stroke();
    }
    ctx.restore();

    ctx.translate(0, floatY);

    // 2. 背部張開的虛空墮天使雙翼
    const wingBeat = Math.sin(time * 6) * 5;
    ctx.fillStyle = isHit ? "#ffffff" : "rgba(46, 16, 101, 0.92)";
    ctx.strokeStyle = isEnraged ? "#fb7185" : "#e879f9";
    ctx.lineWidth = 2.2;
    for (let side = -1; side <= 1; side += 2) {
      ctx.beginPath();
      ctx.moveTo(0, -8);
      ctx.quadraticCurveTo(side * 38, -36 + wingBeat, side * 56, -12 + wingBeat);
      ctx.quadraticCurveTo(side * 42, 6, side * 46, 18 + wingBeat);
      ctx.quadraticCurveTo(side * 22, 10, 0, 8);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
    }

    // 3. 大君帝王破空黑袍與黃金肩甲
    ctx.shadowColor = isEnraged ? "#f43f5e" : "#ec4899";
    ctx.shadowBlur = 22;
    ctx.fillStyle = isHit ? "#ffffff" : "#090d16";
    ctx.beginPath();
    ctx.moveTo(-18, -14);
    ctx.lineTo(18, -14);
    ctx.lineTo(28, 30);
    ctx.lineTo(0, 22);
    ctx.lineTo(-28, 30);
    ctx.closePath();
    ctx.fill();
    ctx.shadowBlur = 0;

    ctx.strokeStyle = "#facc15";
    ctx.lineWidth = 2.5;
    ctx.stroke();

    // 4. 死靈大君骷髏皇冠頭顱
    ctx.fillStyle = "#f8fafc";
    ctx.beginPath();
    ctx.arc(0, -18, 12, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = isEnraged ? "#f43f5e" : "#38bdf8";
    ctx.beginPath();
    ctx.arc(-4.5, -18, 3, 0, Math.PI * 2);
    ctx.arc(4.5, -18, 3, 0, Math.PI * 2);
    ctx.fill();

    // 虛空三尖冥王冠
    ctx.fillStyle = "#facc15";
    ctx.beginPath();
    ctx.moveTo(-12, -26);
    ctx.lineTo(-16, -42);
    ctx.lineTo(-5, -31);
    ctx.lineTo(0, -46);
    ctx.lineTo(5, -31);
    ctx.lineTo(16, -42);
    ctx.lineTo(12, -26);
    ctx.closePath();
    ctx.fill();

    // 5. 右手死神噬魂巨鐮 (Great Scythe)
    ctx.save();
    ctx.translate(22, -4);
    ctx.rotate(Math.sin(time * 4) * 0.25 - 0.2);
    ctx.strokeStyle = "#cbd5e1";
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(0, -34);
    ctx.lineTo(0, 32);
    ctx.stroke();

    // 巨型紫紅新月鐮刃
    ctx.fillStyle = "#ec4899";
    ctx.strokeStyle = "#fef08a";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(0, -32);
    ctx.quadraticCurveTo(34, -36, 40, -12);
    ctx.quadraticCurveTo(22, -22, 0, -20);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.restore();

    // 6. 環繞大君旋轉的 5 顆虛空噬魂法球
    for (let i = 0; i < 5; i++) {
      const a = time * 2.5 + (i * Math.PI * 2) / 5;
      const ox = Math.cos(a) * (r * 0.95);
      const oy = Math.sin(a) * (r * 0.55) - 6;
      ctx.fillStyle = i % 2 === 0 ? "#ec4899" : "#38bdf8";
      ctx.beginPath();
      ctx.arc(ox, oy, 5, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = "#ffffff";
      ctx.lineWidth = 1.2;
      ctx.stroke();
    }
  }

  /**
   * ⚔️ Wave 5 小 Boss：骸骨暴徒隊長 (mb_05)
   */
  static _drawMiniBossBrute(ctx, enemy, time, isHit, seed) {
    const r = enemy.radius;
    const step = Math.sin(time * 8 + seed) * 2.5;
    ctx.translate(0, step);

    ctx.strokeStyle = "#fca5a5";
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(-10, -8); ctx.quadraticCurveTo(-22, -20, -15, -26);
    ctx.moveTo(10, -8); ctx.quadraticCurveTo(22, -20, 15, -26);
    ctx.stroke();

    ctx.fillStyle = isHit ? "#ffffff" : "#991b1b";
    ctx.beginPath();
    ctx.arc(0, 2, r * 0.9, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "#facc15";
    ctx.lineWidth = 2.5;
    ctx.stroke();

    ctx.fillStyle = "#f1f5f9";
    ctx.beginPath();
    ctx.arc(0, -5, r * 0.55, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#dc2626";
    ctx.beginPath();
    ctx.arc(-4.5, -6, 2.8, 0, Math.PI * 2);
    ctx.arc(4.5, -6, 2.8, 0, Math.PI * 2);
    ctx.fill();
  }

  /**
   * ⚔️ Wave 15 小 Boss：發條處刑者 (mb_15)
   */
  static _drawMiniBossExecutioner(ctx, enemy, time, isHit) {
    const r = enemy.radius;
    ctx.fillStyle = isHit ? "#ffffff" : "#b45309";
    ctx.fillRect(-r * 0.8, -r * 0.7, r * 1.6, r * 1.5);
    ctx.strokeStyle = "#fde047";
    ctx.lineWidth = 2.5;
    ctx.strokeRect(-r * 0.8, -r * 0.7, r * 1.6, r * 1.5);

    // 處刑者紅光狙擊鏡頭與巨型電鋸砲管
    ctx.fillStyle = "#090d16";
    ctx.fillRect(-12, -10, 24, 7);
    ctx.fillStyle = "#ef4444";
    ctx.beginPath();
    ctx.arc(Math.sin(time * 8) * 6, -6.5, 3, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = "#475569";
    ctx.fillRect(r * 0.5, -5, 16, 10);
  }

  /**
   * ⚔️ Wave 25 小 Boss：深淵雙子刺客 (mb_25)
   */
  static _drawMiniBossTwinAssassin(ctx, enemy, time, isHit) {
    const r = enemy.radius;
    ctx.fillStyle = isHit ? "#ffffff" : "#3b0764";
    ctx.beginPath();
    ctx.moveTo(0, -r);
    ctx.lineTo(-r * 0.9, r * 0.85);
    ctx.lineTo(0, r * 0.4);
    ctx.lineTo(r * 0.9, r * 0.85);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = "#e879f9";
    ctx.lineWidth = 2.2;
    ctx.stroke();

    // 雙持十字紫光魔刃
    ctx.strokeStyle = "#f43f5e";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(-16, -8); ctx.lineTo(16, 12);
    ctx.moveTo(16, -8); ctx.lineTo(-16, 12);
    ctx.stroke();
  }

  /**
   * 🥚 劇毒魔蛛卵囊 (e_egg：倒數孵化脈動特效)
   */
  static _drawSpiderEgg(ctx, enemy, time, isHit) {
    const pulse = 1 + Math.sin(time * 14) * 0.12;
    ctx.scale(pulse, 1 / pulse);
    const r = enemy.radius;

    ctx.shadowColor = "#a855f7";
    ctx.shadowBlur = 12;
    ctx.fillStyle = isHit ? "#ffffff" : "#6b21a8";
    ctx.beginPath();
    ctx.ellipse(0, 0, r * 0.8, r, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;

    ctx.strokeStyle = "#bef264";
    ctx.lineWidth = 2;
    ctx.stroke();

    // 顯示孵化剩餘秒數警示
    if (enemy.eggTimer !== undefined) {
      ctx.font = "900 12px 'Segoe UI', sans-serif";
      ctx.fillStyle = "#fde047";
      ctx.textAlign = "center";
      ctx.fillText(`孵化 ${Math.ceil(enemy.eggTimer)}s`, 0, 4);
    }
  }

  /**
   * ❄️ 【Wave 10 君王 2】永冬冰霜暴君・波瑞亞斯 (b_10_frost)
   */
  static _drawBossFrost(ctx, enemy, time, isHit) {
    const r = enemy.radius;
    const bob = Math.sin(time * 4.5) * 3;
    ctx.translate(0, bob);

    // 1. 環繞暴風雪冰晶稜鏡
    for (let i = 0; i < 6; i++) {
      const a = time * 1.8 + (i * Math.PI * 2) / 6;
      const ix = Math.cos(a) * (r * 1.12);
      const iy = Math.sin(a) * (r * 0.75);
      ctx.save();
      ctx.translate(ix, iy);
      ctx.rotate(a + Math.PI / 4);
      ctx.fillStyle = "#7dd3fc";
      ctx.strokeStyle = "#ffffff";
      ctx.lineWidth = 1.5;
      ctx.fillRect(-5, -5, 10, 10);
      ctx.strokeRect(-5, -5, 10, 10);
      ctx.restore();
    }

    // 2. 寒冰玄甲巨人軀幹與冰刺肩甲
    ctx.fillStyle = isHit ? "#ffffff" : "#0c4a6e";
    ctx.strokeStyle = "#38bdf8";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(-r * 0.85, -r * 0.35);
    ctx.lineTo(0, -r * 0.95);
    ctx.lineTo(r * 0.85, -r * 0.35);
    ctx.lineTo(r * 0.65, r * 0.82);
    ctx.lineTo(-r * 0.65, r * 0.82);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // 雙肩巨大冰柱尖刺
    ctx.fillStyle = "#bae6fd";
    for (const side of [-1, 1]) {
      ctx.beginPath();
      ctx.moveTo(side * r * 0.55, -8);
      ctx.lineTo(side * r * 1.25, -28);
      ctx.lineTo(side * r * 0.95, 8);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
    }

    // 胸口永冬冰核與寒冰王冠
    ctx.fillStyle = "#e0f2fe";
    ctx.beginPath();
    ctx.arc(0, 4, 11, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = "#38bdf8";
    ctx.beginPath();
    ctx.moveTo(-14, -20);
    ctx.lineTo(-20, -42);
    ctx.lineTo(-6, -28);
    ctx.lineTo(0, -48);
    ctx.lineTo(6, -28);
    ctx.lineTo(20, -42);
    ctx.lineTo(14, -20);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = "#ffffff";
    ctx.lineWidth = 1.8;
    ctx.stroke();
  }

  /**
   * 🌳 【Wave 10 君王 3】腐化世界古樹・尤格拉希爾 (b_10_treant)
   */
  static _drawBossTreant(ctx, enemy, time, isHit) {
    const r = enemy.radius;
    const sway = Math.sin(time * 3.5) * 0.06;
    ctx.rotate(sway);

    // 1. 地底揮舞的 6 條荊棘毒藤觸手
    ctx.strokeStyle = "#15803d";
    ctx.lineWidth = 5;
    for (let i = 0; i < 6; i++) {
      const a = (i * Math.PI * 2) / 6 + Math.sin(time * 4 + i) * 0.25;
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.quadraticCurveTo(
        Math.cos(a + 0.3) * r * 0.7,
        Math.sin(a + 0.3) * r * 0.7,
        Math.cos(a) * r * 1.22,
        Math.sin(a) * r * 1.22
      );
      ctx.stroke();
    }

    // 2. 扭曲古木巨軀與腐化樹皮
    ctx.fillStyle = isHit ? "#ffffff" : "#271c19";
    ctx.strokeStyle = "#22c55e";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(0, 0, r * 0.82, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // 頂部繁茂毒霧樹冠
    ctx.fillStyle = isHit ? "#ffffff" : "#14532d";
    ctx.beginPath();
    ctx.arc(-18, -22, 18, 0, Math.PI * 2);
    ctx.arc(18, -22, 18, 0, Math.PI * 2);
    ctx.arc(0, -30, 22, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "#4ade80";
    ctx.lineWidth = 2;
    ctx.stroke();

    // 樹幹中央劇毒翡翠核心與邪眼
    ctx.fillStyle = "#a3e635";
    ctx.beginPath();
    ctx.arc(-10, -6, 4.5, 0, Math.PI * 2);
    ctx.arc(10, -6, 4.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#a855f7";
    ctx.beginPath();
    ctx.arc(0, 10, 10 + Math.sin(time * 8) * 2, 0, Math.PI * 2);
    ctx.fill();
  }

  /**
   * ⚙️ 【Wave 20 君王 2】殲滅機械帝皇・奧米茄零式 (b_20_mech)
   */
  static _drawBossMech(ctx, enemy, time, isHit) {
    const r = enemy.radius;
    const hover = Math.sin(time * 6) * 3.5;
    ctx.translate(0, hover);

    // 1. 背部黃金光束推進翼
    ctx.fillStyle = "rgba(245, 158, 11, 0.78)";
    ctx.strokeStyle = "#fef08a";
    ctx.lineWidth = 2;
    for (const side of [-1, 1]) {
      ctx.beginPath();
      ctx.moveTo(side * 14, -10);
      ctx.lineTo(side * r * 1.35, -32);
      ctx.lineTo(side * r * 1.15, 14);
      ctx.lineTo(side * 14, 10);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
    }

    // 2. 雙肩超載電磁軌道巨砲
    ctx.fillStyle = "#1e293b";
    ctx.strokeStyle = "#facc15";
    ctx.lineWidth = 2.5;
    ctx.fillRect(-r * 0.92, -36, 16, 38);
    ctx.strokeRect(-r * 0.92, -36, 16, 38);
    ctx.fillRect(r * 0.92 - 16, -36, 16, 38);
    ctx.strokeRect(r * 0.92 - 16, -36, 16, 38);

    // 3. 帝皇重裝機神裝甲核心
    ctx.fillStyle = isHit ? "#ffffff" : "#7c2d12";
    ctx.strokeStyle = "#fde047";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(-r * 0.75, -r * 0.65);
    ctx.lineTo(r * 0.75, -r * 0.65);
    ctx.lineTo(r * 0.6, r * 0.78);
    ctx.lineTo(-r * 0.6, r * 0.78);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // 胸口赤紅核融合反應爐與單眼雷射目鏡
    ctx.fillStyle = "#ef4444";
    ctx.beginPath();
    ctx.arc(0, 4, 13, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#fef08a";
    ctx.beginPath();
    ctx.arc(0, 4, 6.5, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = "#090d16";
    ctx.fillRect(-18, -20, 36, 9);
    ctx.fillStyle = "#38bdf8";
    ctx.fillRect(-14, -18, 28, 5);
  }

  /**
   * 🩸 【Wave 20 君王 3】鮮血緋紅真祖・德古拉 (b_20_vampire)
   */
  static _drawBossVampire(ctx, enemy, time, isHit) {
    const r = enemy.radius;
    const floatY = Math.sin(time * 5) * 4;
    ctx.translate(0, floatY);

    // 1. 環繞身邊飛舞的 6 把腥紅血魔劍
    for (let i = 0; i < 6; i++) {
      const a = -time * 2.4 + (i * Math.PI * 2) / 6;
      const sx = Math.cos(a) * (r * 1.15);
      const sy = Math.sin(a) * (r * 0.85);
      ctx.save();
      ctx.translate(sx, sy);
      ctx.rotate(a + Math.PI / 2);
      ctx.fillStyle = "#f43f5e";
      ctx.strokeStyle = "#fecdd3";
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.moveTo(0, -14);
      ctx.lineTo(-3.5, 6);
      ctx.lineTo(3.5, 6);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      ctx.restore();
    }

    // 2. 巨大黑紅血族惡魔雙翼與貴族高領披風
    const flap = Math.sin(time * 7) * 5;
    ctx.fillStyle = isHit ? "#ffffff" : "#4c0519";
    ctx.strokeStyle = "#e11d48";
    ctx.lineWidth = 2.5;
    for (const side of [-1, 1]) {
      ctx.beginPath();
      ctx.moveTo(0, -6);
      ctx.quadraticCurveTo(side * 38, -34 + flap, side * 54, -8 + flap);
      ctx.quadraticCurveTo(side * 34, 14, 0, 12);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
    }

    // 3. 真祖黑金禮服與蒼白貴族面容
    ctx.fillStyle = "#090d16";
    ctx.beginPath();
    ctx.moveTo(-18, -14);
    ctx.lineTo(18, -14);
    ctx.lineTo(24, 28);
    ctx.lineTo(-24, 28);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = "#f43f5e";
    ctx.stroke();

    ctx.fillStyle = "#f8fafc";
    ctx.beginPath();
    ctx.arc(0, -16, 11.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#e11d48";
    ctx.beginPath();
    ctx.arc(-4, -16, 2.8, 0, Math.PI * 2);
    ctx.arc(4, -16, 2.8, 0, Math.PI * 2);
    ctx.fill();
  }

  /**
   * 🐉 【Wave 30 終焉君王 2】滅世混沌古龍・巴哈姆特 (b_30_dragon)
   */
  static _drawBossDragon(ctx, enemy, time, isHit) {
    const r = enemy.radius;
    const flap = Math.sin(time * 6.5) * 7;
    ctx.translate(0, Math.sin(time * 4) * 4);

    // 1. 遮天蔽日的黑金熔岩龍翼
    ctx.fillStyle = isHit ? "#ffffff" : "#450a0a";
    ctx.strokeStyle = "#f97316";
    ctx.lineWidth = 3;
    for (const side of [-1, 1]) {
      ctx.beginPath();
      ctx.moveTo(side * 10, -8);
      ctx.quadraticCurveTo(side * 48, -44 + flap, side * 68, -14 + flap);
      ctx.quadraticCurveTo(side * 50, 12, side * 54, 24 + flap);
      ctx.quadraticCurveTo(side * 26, 14, side * 8, 12);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
    }

    // 2. 混沌古龍鱗甲身軀與燃燒龍尾
    ctx.fillStyle = isHit ? "#ffffff" : "#1c1917";
    ctx.strokeStyle = "#facc15";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.ellipse(0, 4, r * 0.68, r * 0.82, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // 胸口滅世龍炎爐心
    ctx.fillStyle = "#fde047";
    ctx.beginPath();
    ctx.arc(0, 6, 13 + Math.sin(time * 12) * 2, 0, Math.PI * 2);
    ctx.fill();

    // 3. 威嚴龍首與黃金雙龍角
    ctx.strokeStyle = "#fde047";
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.moveTo(-10, -20);
    ctx.quadraticCurveTo(-28, -38, -22, -52);
    ctx.moveTo(10, -20);
    ctx.quadraticCurveTo(28, -38, 22, -52);
    ctx.stroke();

    ctx.fillStyle = "#7f1d1d";
    ctx.beginPath();
    ctx.arc(0, -20, 15, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "#f97316";
    ctx.lineWidth = 2.5;
    ctx.stroke();

    ctx.fillStyle = "#fef08a";
    ctx.beginPath();
    ctx.arc(-6, -21, 3.2, 0, Math.PI * 2);
    ctx.arc(6, -21, 3.2, 0, Math.PI * 2);
    ctx.fill();
  }

  /**
   * 👁️ 【Wave 30 終焉君王 3】墮落六翼熾天使・路西法 (b_30_seraph)
   */
  static _drawBossSeraph(ctx, enemy, time, isHit) {
    const r = enemy.radius;
    const floatY = Math.sin(time * 4.8) * 4.5;
    ctx.translate(0, floatY);

    // 1. 背後旋轉的聖魔雙色審判光輪
    ctx.save();
    ctx.rotate(time * 1.4);
    ctx.strokeStyle = "#facc15";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(0, -12, r * 0.95, 0, Math.PI * 2);
    ctx.stroke();
    ctx.strokeStyle = "#c084fc";
    ctx.lineWidth = 2;
    ctx.strokeRect(-r * 0.65, -12 - r * 0.65, r * 1.3, r * 1.3);
    ctx.restore();

    // 2. 光暗交織的六翼神聖/墮落羽翼 (上翼純金、中翼紫晶、下翼深淵黑金)
    const wingColors = ["#fde047", "#c084fc", "#f43f5e"];
    for (let w = 0; w < 3; w++) {
      const flap = Math.sin(time * 7 + w * 0.8) * 4;
      for (const side of [-1, 1]) {
        ctx.fillStyle = isHit ? "#ffffff" : wingColors[w];
        ctx.strokeStyle = "#ffffff";
        ctx.lineWidth = 1.4;
        ctx.beginPath();
        ctx.moveTo(side * 8, -14 + w * 10);
        ctx.quadraticCurveTo(
          side * (44 - w * 4),
          -34 + w * 12 + flap,
          side * (62 - w * 5),
          -12 + w * 13 + flap
        );
        ctx.quadraticCurveTo(side * 30, 0 + w * 10, side * 8, -4 + w * 10);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
      }
    }

    // 3. 熾天使白金聖鎧與神罰朗基努斯聖槍
    ctx.fillStyle = isHit ? "#ffffff" : "#1e1b4b";
    ctx.strokeStyle = "#fde047";
    ctx.lineWidth = 2.8;
    ctx.beginPath();
    ctx.moveTo(-16, -14);
    ctx.lineTo(16, -14);
    ctx.lineTo(22, 28);
    ctx.lineTo(-22, 28);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = "#fef08a";
    ctx.beginPath();
    ctx.arc(0, -20, 12, 0, Math.PI * 2);
    ctx.fill();

    // 右手黃金神罰聖槍
    ctx.strokeStyle = "#facc15";
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(22, -42);
    ctx.lineTo(22, 34);
    ctx.stroke();
  }
}
