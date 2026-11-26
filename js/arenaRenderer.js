/**
 * 高質感暗黑奇幻古戰場背景渲染器 (Organic Dark-Fantasy Sanctuary Terrain Renderer)
 * ---------------------------------------------------------------------------------
 * 徹底移除所有「藍色方格 / 棋盤格線」，改用無縫環繞 (Toroidal Seamless) 的多層次自然地貌：
 * 1. 512x512 無縫手繪感岩土肌理層 (玄武岩暗褐、古苔蘚深綠、風化砂岩顆粒、超過 1,800 點石材細微孔隙與不規則鵝卵石板)
 * 2. 暖金篝火光影與古文明環形石雕廣場 (摒棄生硬的直線網格，改以溫暖火光投影、古老金紋浮雕石環呈現質感)
 * 3. 中央「太古黃金星盤祭壇」與 8 座環繞聖火石碑 (帶真實徑向暖光照明與搖曳火光)
 * 4. 四方「遠古巨石遺跡拱門」與 6 種自然戰場地景 (琥珀魔晶簇、風化斷柱、暖光篝火盆、自然岩縫、遠古巨獸遺骸、苔蘚古碑)
 * 5. 隨三大傳說君王 Boss (熔岩伊格尼斯 / 蛛后阿拉克涅 / 死靈瑪爾扎哈) 動態轉換戰場光影氛圍
 */
export class ArenaRenderer {
  constructor(worldConfig) {
    this.world = worldConfig;
    this.cx = this.world.width / 2;
    this.cy = this.world.height / 2;

    // 離屏無縫高質感自然岩土與古石板紋理 (512x512 無網格感材質)
    this.terrainCanvas = null;
    this.terrainPattern = null;
    this._buildOrganicTerrainTexture();

    // 中央祭壇外圍 8 座古老聖火方尖碑
    this.obelisks = [];
    const obeliskCount = 8;
    const obeliskRadius = 460;
    for (let i = 0; i < obeliskCount; i++) {
      const angle = (i * Math.PI * 2) / obeliskCount;
      this.obelisks.push({
        x: this.cx + Math.cos(angle) * obeliskRadius,
        y: this.cy + Math.sin(angle) * obeliskRadius,
        angle,
        phase: i * 0.85
      });
    }

    // 東南西北四座「遠古巨石裂隙拱門」
    const pad = this.world.boundaryPadding + 165;
    this.portals = [
      { x: this.cx, y: pad, dir: "N" },
      { x: this.cx, y: this.world.height - pad, dir: "S" },
      { x: pad, y: this.cy, dir: "W" },
      { x: this.world.width - pad, y: this.cy, dir: "E" }
    ];

    // 自然散佈的古戰場遺跡與不規則石塊群
    this.props = this._generateSanctumProps();

    // 結界外圍深淵漂浮岩塊
    this.abyssRocks = this._generateAbyssRocks();

    // 螢幕空間環境漂浮微粒 (暖金火光餘燼 / 森林螢光微塵 / 君王領域粒子)
    this.ambientMotes = [];
    for (let i = 0; i < 55; i++) {
      this.ambientMotes.push({
        x: Math.random() * 1920,
        y: Math.random() * 1080,
        size: 1.4 + Math.random() * 2.6,
        vx: (Math.random() - 0.5) * 16,
        vy: -10 - Math.random() * 20,
        alpha: 0.25 + Math.random() * 0.5,
        phase: Math.random() * Math.PI * 2
      });
    }
  }

  /**
   * 固定隨機種子產生器，確保無縫貼圖與地景每次生成穩定一致
   */
  _seededRandom(seed) {
    const x = Math.sin(seed * 12.9898 + 78.233) * 43758.5453;
    return x - Math.floor(x);
  }

  /**
   * 打造 512x512 無縫自然暗黑奇幻岩土地面 (完全零方格線！具備土壤、苔蘚、砂岩顆粒與不規則風化石板)
   */
  _buildOrganicTerrainTexture() {
    const size = 512;
    const c = document.createElement("canvas");
    c.width = size;
    c.height = size;
    const ctx = c.getContext("2d");

    // 1. 基底：深邃溫潤的暗黑玄武岩與古戰場泥岩底色 (非死板藍底)
    ctx.fillStyle = "#17151c";
    ctx.fillRect(0, 0, size, size);

    // 輔助函式：9 宮格環繞繪製 (確保 512x512 四邊完全無縫拼接，看不出重複接縫)
    const drawSeamless = (drawFn) => {
      for (let ox = -size; ox <= size; ox += size) {
        for (let oy = -size; oy <= size; oy += size) {
          ctx.save();
          ctx.translate(ox, oy);
          drawFn();
          ctx.restore();
        }
      }
    };

    // 2. 第一層：多層次自然地貌色塊 (暗褐泥岩、幽暗古苔蘚、深邃凹陷陰影、風化暖灰岩)
    const patches = [
      { color: "rgba(38, 33, 43, 0.36)", count: 45, minR: 45, maxR: 110 }, // 暖灰玄武岩高地
      { color: "rgba(14, 12, 18, 0.45)", count: 40, minR: 40, maxR: 95 },  // 深邃岩層低窪
      { color: "rgba(28, 39, 33, 0.26)", count: 32, minR: 35, maxR: 85 },  // 遠古幽林暗苔蘚
      { color: "rgba(48, 38, 32, 0.22)", count: 30, minR: 30, maxR: 80 }   // 風化古銅砂岩土
    ];

    let seed = 1;
    for (const group of patches) {
      for (let i = 0; i < group.count; i++) {
        const px = this._seededRandom(seed++) * size;
        const py = this._seededRandom(seed++) * size;
        const r = group.minR + this._seededRandom(seed++) * (group.maxR - group.minR);

        drawSeamless(() => {
          const grad = ctx.createRadialGradient(px, py, r * 0.1, px, py, r);
          grad.addColorStop(0, group.color);
          grad.addColorStop(1, "rgba(0, 0, 0, 0)");
          ctx.fillStyle = grad;
          ctx.beginPath();
          ctx.arc(px, py, r, 0, Math.PI * 2);
          ctx.fill();
        });
      }
    }

    // 3. 第二層：不規則多邊形古老風化石板群 (Organic Irregular Flagstones，自然散落而非方格排列)
    for (let i = 0; i < 42; i++) {
      const sx = this._seededRandom(seed++) * size;
      const sy = this._seededRandom(seed++) * size;
      const baseR = 14 + this._seededRandom(seed++) * 22;
      const sides = 6 + Math.floor(this._seededRandom(seed++) * 3);
      const rot = this._seededRandom(seed++) * Math.PI * 2;
      const tone = this._seededRandom(seed++);

      const vertices = [];
      for (let v = 0; v < sides; v++) {
        const a = rot + (v * Math.PI * 2) / sides;
        const vr = baseR * (0.72 + this._seededRandom(seed++) * 0.42);
        vertices.push({
          x: Math.cos(a) * vr,
          y: Math.sin(a) * vr * 0.82 // 略呈自然扁平鵝卵石/石板透視
        });
      }

      drawSeamless(() => {
        ctx.save();
        ctx.translate(sx, sy);

        // 石板底部環境閉塞陰影 (Ambient Occlusion Shadow)
        ctx.fillStyle = "rgba(7, 6, 10, 0.65)";
        ctx.beginPath();
        for (let v = 0; v < vertices.length; v++) {
          const pt = vertices[v];
          if (v === 0) ctx.moveTo(pt.x + 2, pt.y + 3);
          else ctx.lineTo(pt.x + 2, pt.y + 3);
        }
        ctx.closePath();
        ctx.fill();

        // 石板本體色澤 (暖岩灰 / 深板岩 / 古青銅石)
        ctx.fillStyle =
          tone > 0.66
            ? "#25222c"
            : tone > 0.33
              ? "#1f1d26"
              : "#222428";
        ctx.beginPath();
        for (let v = 0; v < vertices.length; v++) {
          const pt = vertices[v];
          if (v === 0) ctx.moveTo(pt.x, pt.y);
          else ctx.lineTo(pt.x, pt.y);
        }
        ctx.closePath();
        ctx.fill();

        // 石板邊緣微弱受光面高光
        ctx.strokeStyle = "rgba(168, 162, 158, 0.11)";
        ctx.lineWidth = 1.2;
        ctx.stroke();

        ctx.restore();
      });
    }

    // 4. 第三層：自然蜿蜒的地表微裂紋與古樹根痕 (無直線感)
    ctx.strokeStyle = "rgba(9, 8, 13, 0.55)";
    ctx.lineCap = "round";
    for (let i = 0; i < 24; i++) {
      const cx = this._seededRandom(seed++) * size;
      const cy = this._seededRandom(seed++) * size;
      let curAngle = this._seededRandom(seed++) * Math.PI * 2;
      const segs = 4 + Math.floor(this._seededRandom(seed++) * 4);

      const pts = [{ x: cx, y: cy }];
      let lx = cx;
      let ly = cy;
      for (let s = 0; s < segs; s++) {
        curAngle += (this._seededRandom(seed++) - 0.5) * 1.2;
        const len = 8 + this._seededRandom(seed++) * 14;
        lx += Math.cos(curAngle) * len;
        ly += Math.sin(curAngle) * len;
        pts.push({ x: lx, y: ly });
      }

      drawSeamless(() => {
        ctx.lineWidth = 1.4;
        ctx.beginPath();
        ctx.moveTo(pts[0].x, pts[0].y);
        for (let s = 1; s < pts.length; s++) {
          ctx.lineTo(pts[s].x, pts[s].y);
        }
        ctx.stroke();
      });
    }

    // 5. 第四層：高密度微細礦物顆粒、小碎石與苔蘚斑點 (賦予真實岩石與大地肌理質感)
    const grainColors = [
      "rgba(214, 211, 209, 0.07)", // 淺暖灰砂粒
      "rgba(120, 113, 108, 0.09)", // 風化褐石粒
      "rgba(8, 7, 11, 0.28)",      // 深色孔隙
      "rgba(52, 78, 65, 0.11)"     // 微細青苔斑點
    ];
    for (let i = 0; i < 1600; i++) {
      const gx = this._seededRandom(seed++) * size;
      const gy = this._seededRandom(seed++) * size;
      const gr = 0.8 + this._seededRandom(seed++) * 1.8;
      ctx.fillStyle = grainColors[i % grainColors.length];
      ctx.beginPath();
      ctx.arc(gx, gy, gr, 0, Math.PI * 2);
      ctx.fill();
    }

    this.terrainCanvas = c;
  }

  _generateSanctumProps() {
    const props = [];
    const pad = this.world.boundaryPadding + 95;
    const w = this.world.width;
    const h = this.world.height;

    const types = [
      "soul_brazier",
      "ruined_pillar",
      "crystal_cluster",
      "mossy_boulder",
      "ancient_bones",
      "rune_tablet"
    ];

    for (let i = 1; i <= 175; i++) {
      const rx = this._seededRandom(i * 3.17);
      const ry = this._seededRandom(i * 7.91);
      const rType = this._seededRandom(i * 13.37);
      const rScale = this._seededRandom(i * 5.23);

      const x = pad + rx * (w - pad * 2);
      const y = pad + ry * (h - pad * 2);

      // 避開正中央太古大祭壇核心與 8 座方尖碑環
      const distCenter = Math.hypot(x - this.cx, y - this.cy);
      if (distCenter < 355) continue;
      if (distCenter > 420 && distCenter < 500) continue;

      const type = types[Math.floor(rType * types.length)];
      props.push({
        x,
        y,
        type,
        scale: 0.85 + rScale * 0.65,
        rotation: (this._seededRandom(i * 19.1) - 0.5) * 1.2,
        phase: i * 0.7
      });
    }
    return props;
  }

  _generateAbyssRocks() {
    const rocks = [];
    const w = this.world.width;
    const h = this.world.height;
    for (let i = 0; i < 64; i++) {
      const side = i % 4;
      const t = (i / 64) * 1.05;
      let x = 0;
      let y = 0;
      if (side === 0) {
        x = t * w;
        y = -35 - (i % 5) * 22;
      } else if (side === 1) {
        x = t * w;
        y = h + 35 + (i % 5) * 22;
      } else if (side === 2) {
        x = -35 - (i % 5) * 22;
        y = t * h;
      } else {
        x = w + 35 + (i % 5) * 22;
        y = t * h;
      }
      rocks.push({
        x,
        y,
        size: 16 + (i % 4) * 10,
        phase: i * 0.6
      });
    }
    return rocks;
  }

  /**
   * 根據當前波次與在場大 Boss 決定戰場的火光與古文明主題色調 (預設為溫暖古銅鎏金與翡翠森林微光，不再是刺眼藍格)
   */
  getRealmTheme(currentWave = 1, activeMajorBoss = null) {
    if (activeMajorBoss) {
      if (activeMajorBoss.id === "b_10" || activeMajorBoss.id === "b_30_dragon") {
        // 熾熱熔岩與滅世龍炎領域
        return {
          name: "INFERNAL_CALDERA",
          primary: "#f97316",
          secondary: "#facc15",
          glow: "rgba(249, 115, 22, 0.25)",
          ringStroke: "rgba(251, 146, 60, 0.28)",
          ambientTint: "rgba(124, 45, 18, 0.14)",
          borderGlow: "#ea580c",
          moteColor: "#fb923c"
        };
      }
      if (activeMajorBoss.id === "b_10_frost") {
        // 永冬寒霜領域
        return {
          name: "ETERNAL_FROST",
          primary: "#38bdf8",
          secondary: "#e0f2fe",
          glow: "rgba(56, 189, 248, 0.22)",
          ringStroke: "rgba(125, 211, 252, 0.26)",
          ambientTint: "rgba(12, 74, 110, 0.14)",
          borderGlow: "#0284c7",
          moteColor: "#bae6fd"
        };
      }
      if (activeMajorBoss.id === "b_10_treant") {
        // 腐化古木毒霧領域
        return {
          name: "CORRUPTED_GROVE",
          primary: "#22c55e",
          secondary: "#a3e635",
          glow: "rgba(34, 197, 94, 0.22)",
          ringStroke: "rgba(74, 222, 128, 0.26)",
          ambientTint: "rgba(20, 83, 45, 0.14)",
          borderGlow: "#16a34a",
          moteColor: "#86efac"
        };
      }
      if (activeMajorBoss.id === "b_20") {
        // 深淵織網女皇領域
        return {
          name: "ABYSSAL_WEB",
          primary: "#a855f7",
          secondary: "#4ade80",
          glow: "rgba(168, 85, 247, 0.22)",
          ringStroke: "rgba(74, 222, 128, 0.24)",
          ambientTint: "rgba(59, 7, 100, 0.15)",
          borderGlow: "#9333ea",
          moteColor: "#4ade80"
        };
      }
      if (activeMajorBoss.id === "b_20_mech" || activeMajorBoss.id === "b_30_seraph") {
        // 帝皇金紅與熾天使聖裁領域
        return {
          name: "CELESTIAL_JUDGMENT",
          primary: "#facc15",
          secondary: "#f43f5e",
          glow: "rgba(250, 204, 21, 0.24)",
          ringStroke: "rgba(244, 63, 94, 0.26)",
          ambientTint: "rgba(113, 63, 18, 0.14)",
          borderGlow: "#eab308",
          moteColor: "#fde047"
        };
      }
      if (activeMajorBoss.id === "b_30" || activeMajorBoss.id === "b_20_vampire") {
        // 腥紅血月與虛空冥界領域
        return {
          name: "VOID_NECROPOLIS",
          primary: "#e879f9",
          secondary: "#f43f5e",
          glow: "rgba(232, 121, 249, 0.25)",
          ringStroke: "rgba(244, 63, 94, 0.28)",
          ambientTint: "rgba(76, 5, 25, 0.16)",
          borderGlow: "#e11d48",
          moteColor: "#f43f5e"
        };
      }
    }

    if (currentWave >= 21) {
      // 後期波次：深邃暗金與紫晶餘暉
      return {
        name: "TWILIGHT_SANCTUM",
        primary: "#eab308",
        secondary: "#c084fc",
        glow: "rgba(234, 179, 8, 0.18)",
        ringStroke: "rgba(217, 119, 6, 0.22)",
        ambientTint: "rgba(46, 16, 101, 0.06)",
        borderGlow: "#d97706",
        moteColor: "#fde047"
      };
    }

    // 預設：高質感「太古鎏金與篝火暖光古聖殿」(Warm Ancient Gold & Torchlight Sanctuary)
    return {
      name: "ANCIENT_SANCTUARY",
      primary: "#f59e0b",
      secondary: "#fbbf24",
      glow: "rgba(245, 158, 11, 0.18)",
      ringStroke: "rgba(217, 119, 6, 0.2)",
      ambientTint: "rgba(41, 37, 36, 0.05)",
      borderGlow: "#b45309",
      moteColor: "#fbbf24"
    };
  }

  /**
   * 繪製世界空間底層背景 (無縫自然岩土地面、古石雕同心環道、中央黃金大祭壇、四方遺跡拱門、地景裝飾與古石城牆)
   */
  drawWorld(ctx, camera, canvasWidth, canvasHeight, elapsedTime, currentWave, activeMajorBoss) {
    const theme = this.getRealmTheme(currentWave, activeMajorBoss);
    const { width, height, boundaryPadding } = this.world;

    const viewLeft = camera.x;
    const viewTop = camera.y;
    const viewRight = camera.x + canvasWidth;
    const viewBottom = camera.y + canvasHeight;

    // 1. 場外深淵底色與漂浮古岩塊
    ctx.fillStyle = "#09080c";
    ctx.fillRect(
      Math.min(0, viewLeft - 60),
      Math.min(0, viewTop - 60),
      Math.max(width, canvasWidth + 120),
      Math.max(height, canvasHeight + 120)
    );
    this._drawAbyssOuterRocks(ctx, viewLeft, viewTop, viewRight, viewBottom, elapsedTime, theme);

    // 2. 鋪設 512x512 無縫自然岩土與古石板肌理 (完全無方格線！)
    const clampLeft = Math.max(0, viewLeft);
    const clampTop = Math.max(0, viewTop);
    const clampRight = Math.min(width, viewRight);
    const clampBottom = Math.min(height, viewBottom);

    if (!this.terrainPattern && this.terrainCanvas) {
      this.terrainPattern = ctx.createPattern(this.terrainCanvas, "repeat");
    }
    if (this.terrainPattern && clampRight > clampLeft && clampBottom > clampTop) {
      ctx.fillStyle = this.terrainPattern;
      ctx.fillRect(clampLeft, clampTop, clampRight - clampLeft, clampBottom - clampTop);
    }

    // 領域微光色調融合
    ctx.fillStyle = theme.ambientTint;
    ctx.fillRect(clampLeft, clampTop, clampRight - clampLeft, clampBottom - clampTop);

    // 3. 繪製古文明石雕環形步道與暖光地脈環 (取代原本的十字藍色直線)
    this._drawAncientStoneRings(ctx, elapsedTime, theme);

    // 4. 繪製場地正中央「太古黃金星盤大祭壇」
    if (
      this.cx + 560 >= viewLeft &&
      this.cx - 560 <= viewRight &&
      this.cy + 560 >= viewTop &&
      this.cy - 560 <= viewBottom
    ) {
      this._drawCentralGrandAltar(ctx, elapsedTime, theme, activeMajorBoss);
    }

    // 5. 繪製東南西北四方「遠古巨石遺跡拱門」
    this._drawCardinalPortals(ctx, viewLeft, viewTop, viewRight, viewBottom, elapsedTime, theme);

    // 6. 繪製可視範圍內的 6 大類自然古戰場地景與篝火光暈
    this._drawSanctumProps(ctx, viewLeft, viewTop, viewRight, viewBottom, elapsedTime, theme);

    // 7. 繪製中央祭壇外圍 8 座「太古聖火方尖碑」
    this._drawObelisks(ctx, viewLeft, viewTop, viewRight, viewBottom, elapsedTime, theme);

    // 8. 繪製戰場四周「遠古黑曜石城牆與四角烽火塔座」
    this._drawSanctumBoundary(ctx, boundaryPadding, width, height, elapsedTime, theme);
  }

  /**
   * 繪製螢幕空間環境漂浮微粒與電影級暖暗角景深
   */
  drawScreenAtmosphere(ctx, canvasWidth, canvasHeight, elapsedTime, currentWave, activeMajorBoss) {
    const theme = this.getRealmTheme(currentWave, activeMajorBoss);

    ctx.save();
    // 1. 漂浮環境微粒 (篝火金芒 / 螢光微塵 / 君王領域粒子)
    for (let i = 0; i < this.ambientMotes.length; i++) {
      const m = this.ambientMotes[i];
      const px =
        (m.x +
          elapsedTime * m.vx +
          Math.sin(elapsedTime * 1.4 + m.phase) * 18 +
          canvasWidth * 10) %
        canvasWidth;
      const py = (m.y + elapsedTime * m.vy + canvasHeight * 10) % canvasHeight;
      const pulse = 0.4 + 0.6 * Math.sin(elapsedTime * 2.8 + m.phase);

      ctx.globalAlpha = m.alpha * pulse;
      ctx.fillStyle = i % 3 === 0 ? theme.secondary : theme.moteColor;
      ctx.beginPath();
      ctx.arc(px, py, m.size, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;

    // 2. 電影級四周柔和暗角 (Cinematic Vignette)，讓戰場光影更有立體層次感
    const radGrad = ctx.createRadialGradient(
      canvasWidth / 2,
      canvasHeight / 2,
      Math.min(canvasWidth, canvasHeight) * 0.36,
      canvasWidth / 2,
      canvasHeight / 2,
      Math.max(canvasWidth, canvasHeight) * 0.74
    );
    radGrad.addColorStop(0, "rgba(0, 0, 0, 0)");
    radGrad.addColorStop(0.75, "rgba(10, 8, 14, 0.24)");
    radGrad.addColorStop(1, "rgba(6, 5, 9, 0.62)");
    ctx.fillStyle = radGrad;
    ctx.fillRect(0, 0, canvasWidth, canvasHeight);

    if (activeMajorBoss) {
      const bossPulse = 0.08 + 0.04 * Math.sin(elapsedTime * 4);
      ctx.strokeStyle = theme.primary;
      ctx.globalAlpha = bossPulse;
      ctx.lineWidth = 16;
      ctx.strokeRect(0, 0, canvasWidth, canvasHeight);
    }

    ctx.restore();
  }

  _drawAbyssOuterRocks(ctx, viewLeft, viewTop, viewRight, viewBottom, elapsedTime, theme) {
    ctx.save();
    for (let i = 0; i < this.abyssRocks.length; i++) {
      const r = this.abyssRocks[i];
      if (
        r.x < viewLeft - 60 ||
        r.x > viewRight + 60 ||
        r.y < viewTop - 60 ||
        r.y > viewBottom + 60
      ) {
        continue;
      }
      const bobY = Math.sin(elapsedTime * 1.4 + r.phase) * 6;
      ctx.fillStyle = "#26232e";
      ctx.strokeStyle = theme.primary;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(r.x, r.y + bobY - r.size);
      ctx.lineTo(r.x + r.size * 0.85, r.y + bobY - r.size * 0.2);
      ctx.lineTo(r.x + r.size * 0.5, r.y + bobY + r.size * 0.8);
      ctx.lineTo(r.x - r.size * 0.7, r.y + bobY + r.size * 0.6);
      ctx.lineTo(r.x - r.size * 0.9, r.y + bobY - r.size * 0.3);
      ctx.closePath();
      ctx.fill();
      ctx.globalAlpha = 0.3;
      ctx.stroke();
      ctx.globalAlpha = 1;
    }
    ctx.restore();
  }

  /**
   * 繪製古文明環形石板步道與鎏金銘刻環 (不畫任何橫豎網格直線！)
   */
  _drawAncientStoneRings(ctx, elapsedTime, theme) {
    ctx.save();

    // 兩道古老石雕同心環形步道 (半徑 760 與 1140)
    for (const ringRadius of [760, 1140]) {
      // 環形石道寬幅陰影底襯
      ctx.strokeStyle = "rgba(12, 10, 16, 0.55)";
      ctx.lineWidth = 38;
      ctx.beginPath();
      ctx.arc(this.cx, this.cy, ringRadius, 0, Math.PI * 2);
      ctx.stroke();

      // 環形暖灰石板路主體
      ctx.strokeStyle = "rgba(44, 39, 50, 0.48)";
      ctx.lineWidth = 30;
      ctx.beginPath();
      ctx.arc(this.cx, this.cy, ringRadius, 0, Math.PI * 2);
      ctx.stroke();

      // 石道兩側暗金鑲邊與古老石縫分節
      ctx.strokeStyle = theme.ringStroke;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(this.cx, this.cy, ringRadius - 15, 0, Math.PI * 2);
      ctx.arc(this.cx, this.cy, ringRadius + 15, 0, Math.PI * 2);
      ctx.stroke();
    }

    ctx.restore();
  }

  /**
   * 繪製世界中心 (1500, 1500) 的「太古黃金星盤大祭壇」
   */
  _drawCentralGrandAltar(ctx, elapsedTime, theme, activeMajorBoss) {
    ctx.save();
    ctx.translate(this.cx, this.cy);

    // 1. 祭壇地面溫暖神聖光暈
    const altarGrad = ctx.createRadialGradient(0, 0, 20, 0, 0, 440);
    altarGrad.addColorStop(0, theme.glow);
    altarGrad.addColorStop(0.55, "rgba(28, 24, 34, 0.65)");
    altarGrad.addColorStop(1, "rgba(23, 21, 28, 0)");
    ctx.fillStyle = altarGrad;
    ctx.beginPath();
    ctx.arc(0, 0, 440, 0, Math.PI * 2);
    ctx.fill();

    // 2. 圓弧與十二角交錯的古石浮雕圓台基座
    for (let step = 0; step < 3; step++) {
      const r = 385 - step * 42;
      ctx.fillStyle =
        step % 2 === 0 ? "rgba(31, 28, 38, 0.85)" : "rgba(24, 21, 30, 0.78)";
      ctx.strokeStyle =
        step === 0 ? theme.primary : "rgba(168, 162, 158, 0.22)";
      ctx.lineWidth = step === 0 ? 2.2 : 1.5;
      ctx.beginPath();
      ctx.arc(0, 0, r, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
    }

    // 3. 外環：順時針緩慢轉動的太古黃金日晷星環
    ctx.save();
    ctx.rotate(elapsedTime * 0.1);
    ctx.strokeStyle = theme.primary;
    ctx.globalAlpha = 0.42;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(0, 0, 285, 0, Math.PI * 2);
    ctx.arc(0, 0, 255, 0, Math.PI * 2);
    ctx.stroke();

    for (let i = 0; i < 12; i++) {
      const a = (i * Math.PI) / 6;
      ctx.save();
      ctx.rotate(a);
      ctx.beginPath();
      ctx.moveTo(255, 0);
      ctx.lineTo(285, 0);
      ctx.arc(270, 0, 5, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }
    ctx.restore();

    // 4. 中環：逆時針旋轉的古文明八芒星盤 (以圓弧與星芒構成，避免正方形網格感)
    ctx.save();
    ctx.rotate(-elapsedTime * 0.15);
    ctx.strokeStyle = theme.secondary;
    ctx.globalAlpha = 0.34;
    ctx.lineWidth = 1.8;

    ctx.beginPath();
    for (let i = 0; i < 8; i++) {
      const a1 = (i * Math.PI) / 4;
      const a2 = ((i + 3) * Math.PI) / 4;
      ctx.moveTo(Math.cos(a1) * 185, Math.sin(a1) * 185);
      ctx.lineTo(Math.cos(a2) * 185, Math.sin(a2) * 185);
    }
    ctx.stroke();

    ctx.beginPath();
    ctx.arc(0, 0, 185, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();

    // 5. 核心陣眼：呼吸脈衝的黃金太陽羅盤
    const pulse = 1 + 0.05 * Math.sin(elapsedTime * 3);
    ctx.save();
    ctx.scale(pulse, pulse);
    ctx.fillStyle = theme.glow;
    ctx.strokeStyle = theme.primary;
    ctx.lineWidth = 2.4;
    ctx.beginPath();
    ctx.arc(0, 0, 74, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    ctx.beginPath();
    for (let i = 0; i < 8; i++) {
      const a = (i * Math.PI) / 4;
      const rOuter = i % 2 === 0 ? 70 : 42;
      ctx.moveTo(0, 0);
      ctx.lineTo(Math.cos(a) * rOuter, Math.sin(a) * rOuter);
    }
    ctx.stroke();

    if (activeMajorBoss && activeMajorBoss.id === "b_20") {
      ctx.strokeStyle = "rgba(168, 85, 247, 0.45)";
      ctx.lineWidth = 1.5;
      for (let r = 90; r <= 330; r += 60) {
        ctx.beginPath();
        for (let i = 0; i <= 8; i++) {
          const a = (i * Math.PI) / 4;
          const px = Math.cos(a) * r;
          const py = Math.sin(a) * r;
          if (i === 0) ctx.moveTo(px, py);
          else ctx.lineTo(px, py);
        }
        ctx.stroke();
      }
    }
    ctx.restore();

    ctx.restore();
  }

  /**
   * 繪製東南西北四方「遠古巨石遺跡拱門」
   */
  _drawCardinalPortals(ctx, viewLeft, viewTop, viewRight, viewBottom, elapsedTime, theme) {
    for (const p of this.portals) {
      if (
        p.x + 160 < viewLeft ||
        p.x - 160 > viewRight ||
        p.y + 160 < viewTop ||
        p.y - 160 > viewBottom
      ) {
        continue;
      }

      ctx.save();
      ctx.translate(p.x, p.y);

      const grad = ctx.createRadialGradient(0, 0, 10, 0, 0, 120);
      grad.addColorStop(0, theme.glow);
      grad.addColorStop(0.6, "rgba(28, 25, 35, 0.7)");
      grad.addColorStop(1, "rgba(23, 21, 28, 0)");
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(0, 0, 120, 0, Math.PI * 2);
      ctx.fill();

      ctx.save();
      ctx.rotate(elapsedTime * 0.4);
      ctx.strokeStyle = theme.primary;
      ctx.globalAlpha = 0.5;
      ctx.lineWidth = 2;
      ctx.setLineDash([14, 10]);
      ctx.beginPath();
      ctx.arc(0, 0, 74, 0, Math.PI * 2);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.restore();

      // 兩側圓形古老石柱與篝火台
      for (const px of [-76, 76]) {
        ctx.fillStyle = "#292532";
        ctx.strokeStyle = "#57534e";
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.arc(px, 0, 22, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        ctx.fillStyle = theme.primary;
        ctx.beginPath();
        ctx.arc(px, 0, 8, 0, Math.PI * 2);
        ctx.fill();
      }

      ctx.restore();
    }
  }

  /**
   * 繪製中央祭壇外圍 8 座「太古聖火方尖碑」
   */
  _drawObelisks(ctx, viewLeft, viewTop, viewRight, viewBottom, elapsedTime, theme) {
    for (const ob of this.obelisks) {
      if (
        ob.x + 90 < viewLeft ||
        ob.x - 90 > viewRight ||
        ob.y + 90 < viewTop ||
        ob.y - 90 > viewBottom
      ) {
        continue;
      }

      ctx.save();
      ctx.translate(ob.x, ob.y);

      // 溫暖的聖火地面投影光池
      const flicker = 0.88 + 0.12 * Math.sin(elapsedTime * 6 + ob.phase);
      const lightGrad = ctx.createRadialGradient(0, 0, 4, 0, 0, 76 * flicker);
      lightGrad.addColorStop(0, theme.glow);
      lightGrad.addColorStop(1, "rgba(0, 0, 0, 0)");
      ctx.fillStyle = lightGrad;
      ctx.beginPath();
      ctx.arc(0, 0, 76 * flicker, 0, Math.PI * 2);
      ctx.fill();

      // 古石圓座
      ctx.fillStyle = "#221f2a";
      ctx.strokeStyle = "#57534e";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(0, 0, 22, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      // 方尖碑立體石柱
      ctx.fillStyle = "#2e2a38";
      ctx.beginPath();
      ctx.moveTo(-12, 8);
      ctx.lineTo(-8, -26);
      ctx.lineTo(0, -38);
      ctx.lineTo(8, -26);
      ctx.lineTo(12, 8);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      // 碑頂懸浮琥珀聖火晶體
      const bob = Math.sin(elapsedTime * 3.5 + ob.phase) * 3;
      ctx.fillStyle = theme.primary;
      ctx.beginPath();
      ctx.moveTo(0, -48 + bob);
      ctx.lineTo(7, -38 + bob);
      ctx.lineTo(0, -28 + bob);
      ctx.lineTo(-7, -38 + bob);
      ctx.closePath();
      ctx.fill();

      ctx.strokeStyle = theme.secondary;
      ctx.lineWidth = 1.8;
      ctx.beginPath();
      ctx.moveTo(0, -20);
      ctx.lineTo(0, 2);
      ctx.stroke();

      ctx.restore();
    }
  }

  /**
   * 繪製 6 大類自然古戰場地景裝飾物
   */
  _drawSanctumProps(ctx, viewLeft, viewTop, viewRight, viewBottom, elapsedTime, theme) {
    for (let i = 0; i < this.props.length; i++) {
      const p = this.props[i];
      if (
        p.x + 65 < viewLeft ||
        p.x - 65 > viewRight ||
        p.y + 65 < viewTop ||
        p.y - 65 > viewBottom
      ) {
        continue;
      }

      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.scale(p.scale, p.scale);

      if (p.type === "soul_brazier") {
        // 1. 暖光篝火盆 (在地面投射溫暖火光池)
        const flicker = 0.85 + 0.18 * Math.sin(elapsedTime * 7 + p.phase);
        const fireGlow = ctx.createRadialGradient(0, 0, 2, 0, 0, 48 * flicker);
        fireGlow.addColorStop(0, theme.glow);
        fireGlow.addColorStop(1, "rgba(0,0,0,0)");
        ctx.fillStyle = fireGlow;
        ctx.beginPath();
        ctx.arc(0, 0, 48 * flicker, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = "#27232f";
        ctx.strokeStyle = "#57534e";
        ctx.lineWidth = 1.6;
        ctx.beginPath();
        ctx.arc(0, 0, 12, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        ctx.fillStyle = theme.primary;
        ctx.globalAlpha = 0.85;
        ctx.beginPath();
        ctx.arc(0, -2, 6.5 * flicker, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = "#fef08a";
        ctx.beginPath();
        ctx.arc(0, -3, 3.2 * flicker, 0, Math.PI * 2);
        ctx.fill();
      } else if (p.type === "crystal_cluster") {
        // 2. 琥珀/星界魔晶簇
        const glow = ctx.createRadialGradient(0, 0, 2, 0, 0, 32);
        glow.addColorStop(0, theme.glow);
        glow.addColorStop(1, "rgba(0, 0, 0, 0)");
        ctx.fillStyle = glow;
        ctx.beginPath();
        ctx.arc(0, 0, 32, 0, Math.PI * 2);
        ctx.fill();

        const shards = [
          { x: -7, y: 4, w: 6, h: 18, rot: -0.35, color: theme.primary },
          { x: 6, y: 5, w: 5, h: 15, rot: 0.4, color: theme.secondary },
          { x: 0, y: 2, w: 8, h: 24, rot: 0.05, color: theme.primary }
        ];
        for (const s of shards) {
          ctx.save();
          ctx.translate(s.x, s.y);
          ctx.rotate(s.rot);
          ctx.fillStyle = s.color;
          ctx.globalAlpha = 0.55;
          ctx.beginPath();
          ctx.moveTo(0, -s.h);
          ctx.lineTo(s.w, -s.h * 0.3);
          ctx.lineTo(s.w * 0.7, 0);
          ctx.lineTo(-s.w * 0.7, 0);
          ctx.lineTo(-s.w, -s.h * 0.3);
          ctx.closePath();
          ctx.fill();
          ctx.strokeStyle = "#fef3c7";
          ctx.globalAlpha = 0.6;
          ctx.lineWidth = 1;
          ctx.stroke();
          ctx.restore();
        }
      } else if (p.type === "ruined_pillar") {
        // 3. 風化斷裂古石柱與青苔
        ctx.fillStyle = "rgba(28, 25, 34, 0.9)";
        ctx.strokeStyle = "rgba(120, 113, 108, 0.55)";
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.arc(0, 0, 18, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        ctx.fillStyle = "rgba(41, 37, 48, 0.85)";
        ctx.beginPath();
        ctx.arc(-2, -3, 12, 0, Math.PI * 1.65);
        ctx.lineTo(0, 0);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        // 石柱邊緣青苔點綴
        ctx.fillStyle = "rgba(52, 102, 74, 0.45)";
        ctx.beginPath();
        ctx.arc(10, 8, 6, 0, Math.PI * 2);
        ctx.arc(14, 2, 4, 0, Math.PI * 2);
        ctx.fill();
      } else if (p.type === "mossy_boulder") {
        // 4. 自然苔蘚巨石與草叢
        ctx.rotate(p.rotation);
        ctx.fillStyle = "#26232e";
        ctx.strokeStyle = "#44403c";
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.ellipse(0, 0, 16, 11, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        ctx.fillStyle = "rgba(45, 90, 68, 0.5)";
        ctx.beginPath();
        ctx.ellipse(-5, -3, 8, 5, 0.3, 0, Math.PI * 2);
        ctx.fill();
      } else if (p.type === "ancient_bones") {
        // 5. 遠古巨獸半掩骸骨化石
        ctx.rotate(p.rotation);
        ctx.strokeStyle = "rgba(168, 162, 158, 0.35)";
        ctx.lineWidth = 2.5;
        ctx.lineCap = "round";
        for (let rib = -12; rib <= 12; rib += 8) {
          ctx.beginPath();
          ctx.arc(rib, 0, 10, -Math.PI * 0.65, Math.PI * 0.65);
          ctx.stroke();
        }
      } else {
        // 6. 古老圓頂符文石碑 (rune_tablet)
        ctx.rotate(p.rotation * 0.25);
        ctx.fillStyle = "rgba(38, 34, 46, 0.85)";
        ctx.strokeStyle = "rgba(120, 113, 108, 0.5)";
        ctx.lineWidth = 1.4;
        ctx.beginPath();
        ctx.arc(0, -6, 10, Math.PI, 0);
        ctx.lineTo(10, 14);
        ctx.lineTo(-10, 14);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        ctx.strokeStyle = theme.primary;
        ctx.globalAlpha = 0.5;
        ctx.beginPath();
        ctx.moveTo(0, -8);
        ctx.lineTo(0, 8);
        ctx.moveTo(-4, -2);
        ctx.lineTo(4, -2);
        ctx.stroke();
      }

      ctx.restore();
    }
  }

  /**
   * 繪製聖殿四周的「太古黑曜石城牆與四角烽火塔座」
   */
  _drawSanctumBoundary(ctx, pad, width, height, elapsedTime, theme) {
    ctx.save();

    const innerW = width - pad * 2;
    const innerH = height - pad * 2;

    // 1. 外框厚重古石城牆
    ctx.strokeStyle = "#1c1924";
    ctx.lineWidth = 28;
    ctx.strokeRect(pad - 14, pad - 14, innerW + 28, innerH + 28);

    ctx.strokeStyle = "#44403c";
    ctx.lineWidth = 4;
    ctx.strokeRect(pad - 26, pad - 26, innerW + 52, innerH + 52);

    // 2. 溫暖鎏金/領域結界封印線
    ctx.shadowColor = theme.borderGlow;
    ctx.shadowBlur = 14;
    ctx.strokeStyle = theme.primary;
    ctx.lineWidth = 3;
    ctx.strokeRect(pad, pad, innerW, innerH);
    ctx.shadowBlur = 0;

    // 3. 四角巨型烽火鎮魂塔座
    const corners = [
      [pad, pad],
      [width - pad, pad],
      [pad, height - pad],
      [width - pad, height - pad]
    ];
    for (const [cx, cy] of corners) {
      ctx.fillStyle = "#262230";
      ctx.strokeStyle = "#78716c";
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(cx, cy, 34, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = theme.primary;
      ctx.beginPath();
      ctx.arc(cx, cy, 12, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.restore();
  }
}
