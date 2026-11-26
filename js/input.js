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
      if (
        code === "KeyW" ||
        code === "KeyA" ||
        code === "KeyS" ||
        code === "KeyD" ||
        code === "ArrowUp" ||
        code === "ArrowDown" ||
        code === "ArrowLeft" ||
        code === "ArrowRight"
      ) {
        this.keys.add(code);
      }
      if (!e.repeat) {
        this.justPressed.add(code);
      }
    });

    window.addEventListener("keyup", (e) => {
      this.keys.delete(e.code);
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
