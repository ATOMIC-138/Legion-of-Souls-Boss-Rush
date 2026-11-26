/**
 * 通用物件池 (ObjectPool)
 * 用於重複利用頻繁生成與銷毀的實體 (如 Enemies 敵人、Items 經驗寶石、Projectiles 子彈)，
 * 避免頻繁觸發 Garbage Collection (GC) 造成遊戲卡頓。
 */
export class ObjectPool {
  /**
   * @param {() => T} createFn - 建立新物件的工廠函式
   * @param {number} initialSize - 初始預先配置的物件數量
   */
  constructor(createFn, initialSize = 50) {
    this.createFn = createFn;
    this.freeList = [];
    this.activeList = [];

    for (let i = 0; i < initialSize; i++) {
      const obj = this.createFn();
      obj.active = false;
      this.freeList.push(obj);
    }
  }

  /**
   * 從物件池取出一個可用物件 (若池空則自動擴充)
   */
  acquire() {
    let obj;
    if (this.freeList.length > 0) {
      obj = this.freeList.pop();
    } else {
      obj = this.createFn();
    }
    obj.active = true;
    this.activeList.push(obj);
    return obj;
  }

  /**
   * 將不再使用的物件重置並歸還物件池 (使用 swap-and-pop 達成 O(1) 移除)
   * @param {T} obj
   */
  release(obj) {
    const idx = this.activeList.indexOf(obj);
    if (idx !== -1) {
      const last = this.activeList.pop();
      if (idx < this.activeList.length) {
        this.activeList[idx] = last;
      }
    }
    if (typeof obj.reset === "function") {
      obj.reset();
    }
    obj.active = false;
    this.freeList.push(obj);
  }

  /**
   * 清空所有活躍物件並歸還池中
   */
  releaseAll() {
    while (this.activeList.length > 0) {
      const obj = this.activeList.pop();
      if (typeof obj.reset === "function") {
        obj.reset();
      }
      obj.active = false;
      this.freeList.push(obj);
    }
  }
}
