/**
 * 四叉樹空間劃分 (Quadtree)
 * 用於優化大數量實體的碰撞檢測與索敵範圍查詢 (O(N log N))
 */
export class Quadtree {
  /**
   * @param {{ x: number, y: number, width: number, height: number }} bounds - 節點邊界 (左上角 x, y 與寬高)
   * @param {number} capacity - 每個節點分裂前的最大容納數量
   * @param {number} maxDepth - 最大遞迴深度
   * @param {number} depth - 當前深度
   */
  constructor(bounds, capacity = 8, maxDepth = 6, depth = 0) {
    this.bounds = bounds;
    this.capacity = capacity;
    this.maxDepth = maxDepth;
    this.depth = depth;
    this.objects = [];
    this.divided = false;

    this.nw = null;
    this.ne = null;
    this.sw = null;
    this.se = null;
  }

  /**
   * 清空四叉樹以便每幀重建
   */
  clear() {
    this.objects.length = 0;
    if (this.divided) {
      this.nw.clear();
      this.ne.clear();
      this.sw.clear();
      this.se.clear();
      this.divided = false;
    }
  }

  /**
   * 分裂為四個子象限
   */
  subdivide() {
    const { x, y, width, height } = this.bounds;
    const halfW = width / 2;
    const halfH = height / 2;
    const nextDepth = this.depth + 1;

    if (!this.nw) {
      this.nw = new Quadtree({ x, y, width: halfW, height: halfH }, this.capacity, this.maxDepth, nextDepth);
      this.ne = new Quadtree({ x: x + halfW, y, width: halfW, height: halfH }, this.capacity, this.maxDepth, nextDepth);
      this.sw = new Quadtree({ x, y: y + halfH, width: halfW, height: halfH }, this.capacity, this.maxDepth, nextDepth);
      this.se = new Quadtree({ x: x + halfW, y: y + halfH, width: halfW, height: halfH }, this.capacity, this.maxDepth, nextDepth);
    } else {
      this.nw.bounds = { x, y, width: halfW, height: halfH };
      this.ne.bounds = { x: x + halfW, y, width: halfW, height: halfH };
      this.sw.bounds = { x, y: y + halfH, width: halfW, height: halfH };
      this.se.bounds = { x: x + halfW, y: y + halfH, width: halfW, height: halfH };
    }
    this.divided = true;
  }

  /**
   * 檢查點是否落在節點邊界內
   */
  containsPoint(px, py) {
    const { x, y, width, height } = this.bounds;
    return px >= x && px < x + width && py >= y && py < y + height;
  }

  /**
   * 將實體插入四叉樹 (實體需具備 x, y 座標)
   * @param {{ x: number, y: number }} entity
   * @returns {boolean}
   */
  insert(entity) {
    if (!this.containsPoint(entity.x, entity.y)) {
      return false;
    }

    if (this.objects.length < this.capacity || this.depth >= this.maxDepth) {
      this.objects.push(entity);
      return true;
    }

    if (!this.divided) {
      this.subdivide();
    }

    return (
      this.nw.insert(entity) ||
      this.ne.insert(entity) ||
      this.sw.insert(entity) ||
      this.se.insert(entity)
    );
  }

  /**
   * 檢查圓形範圍是否與節點矩形相交
   */
  intersectsCircle(cx, cy, radius) {
    const { x, y, width, height } = this.bounds;
    const closestX = Math.max(x, Math.min(cx, x + width));
    const closestY = Math.max(y, Math.min(cy, y + height));
    const dx = cx - closestX;
    const dy = cy - closestY;
    return dx * dx + dy * dy <= radius * radius;
  }

  /**
   * 查詢圓形範圍內的所有實體
   * @param {number} cx - 圓心 X
   * @param {number} cy - 圓心 Y
   * @param {number} radius - 查詢半徑
   * @param {Array} found - 結果陣列
   * @returns {Array}
   */
  queryCircle(cx, cy, radius, found = []) {
    if (!this.intersectsCircle(cx, cy, radius)) {
      return found;
    }

    const rSq = radius * radius;
    for (let i = 0; i < this.objects.length; i++) {
      const obj = this.objects[i];
      const dx = obj.x - cx;
      const dy = obj.y - cy;
      const objR = obj.radius || 0;
      const maxDist = radius + objR;
      if (dx * dx + dy * dy <= maxDist * maxDist) {
        found.push(obj);
      } else if (dx * dx + dy * dy <= rSq) {
        found.push(obj);
      }
    }

    if (this.divided) {
      this.nw.queryCircle(cx, cy, radius, found);
      this.ne.queryCircle(cx, cy, radius, found);
      this.sw.queryCircle(cx, cy, radius, found);
      this.se.queryCircle(cx, cy, radius, found);
    }

    return found;
  }
}
