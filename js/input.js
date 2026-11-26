/**
 * 鍵盤與滑鼠輸入管理器 (InputHandler)
 * 支援：
 * - WASD / 方向鍵移動
 * - 空白鍵 (Space)：觸發主角「奧術閃現 (Dash)」
 * - E 鍵 或 滑鼠右鍵 / 左鍵點擊：觸發主角「狂暴集火號角 (Command Skill)」並記錄滑鼠指向的世界座標
 */
export class InputHandler {
  constructor(canvas) {
    this.canvas = canvas;
    this.keys = new Set();
    this.justPressed = new Set();

    // 滑鼠在畫布上的螢幕座標
    this.mouseScreen = { x: window.innerWidth / 2, y: window.innerHeight / 2 };
    this.rightClickTriggered = false;

    window.addEventListener("keydown", (e) => {
      const code = e.code;
      const key = (e.key || "").toLowerCase();

      // 防止方向鍵與 Tab 鍵觸發瀏覽器捲動或焦點跳轉 (避免焦點離開遊戲畫布)
      if (
        code === "Tab" ||
        code === "ArrowUp" ||
        code === "ArrowDown" ||
        code === "ArrowLeft" ||
        code === "ArrowRight"
      ) {
        e.preventDefault();
      }

      if (
        code === "KeyW" ||
        key === "w" ||
        code === "KeyA" ||
        key === "a" ||
        code === "KeyS" ||
        key === "s" ||
        code === "KeyD" ||
        key === "d" ||
        code === "ArrowUp" ||
        code === "ArrowDown" ||
        code === "ArrowLeft" ||
        code === "ArrowRight"
      ) {
        const mapped =
          key === "w"
            ? "KeyW"
            : key === "a"
              ? "KeyA"
              : key === "s"
                ? "KeyS"
                : key === "d"
                  ? "KeyD"
                  : code;
        this.keys.add(mapped);
      }

      if (!e.repeat) {
        this.justPressed.add(code);
        if (key === "e") this.justPressed.add("KeyE");
        if (key === "r") this.justPressed.add("KeyR");
      }
    });

    window.addEventListener("keyup", (e) => {
      const code = e.code;
      const key = (e.key || "").toLowerCase();
      this.keys.delete(code);
      if (key === "w") this.keys.delete("KeyW");
      if (key === "a") this.keys.delete("KeyA");
      if (key === "s") this.keys.delete("KeyS");
      if (key === "d") this.keys.delete("KeyD");
    });

    window.addEventListener("mousemove", (e) => {
      this.mouseScreen.x = e.clientX;
      this.mouseScreen.y = e.clientY;
    });

    window.addEventListener("contextmenu", (e) => {
      e.preventDefault();
      this.rightClickTriggered = true;
    });

    window.addEventListener("blur", () => {
      this.keys.clear();
      this.justPressed.clear();
    });
  }

  /**
   * 消費單次觸發按鍵
   */
  consumeKey(code) {
    if (this.justPressed.has(code)) {
      this.justPressed.delete(code);
      return true;
    }
    return false;
  }

  consumeRightClick() {
    if (this.rightClickTriggered) {
      this.rightClickTriggered = false;
      return true;
    }
    return false;
  }

  /**
   * 取得滑鼠對應的世界座標
   */
  getMouseWorldPos(camera) {
    return {
      x: this.mouseScreen.x + camera.x,
      y: this.mouseScreen.y + camera.y
    };
  }

  /**
   * 取得正規化後的移動方向向量 { x, y }
   */
  getMovementVector() {
    let dx = 0;
    let dy = 0;

    if (this.keys.has("KeyW") || this.keys.has("ArrowUp")) dy -= 1;
    if (this.keys.has("KeyS") || this.keys.has("ArrowDown")) dy += 1;
    if (this.keys.has("KeyA") || this.keys.has("ArrowLeft")) dx -= 1;
    if (this.keys.has("KeyD") || this.keys.has("ArrowRight")) dx += 1;

    if (dx !== 0 && dy !== 0) {
      const invLen = 1 / Math.hypot(dx, dy);
      dx *= invLen;
      dy *= invLen;
    }

    return { x: dx, y: dy };
  }
}
