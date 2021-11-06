type point = {
  t: number
  y: number
}

interface curve {
  eval(t: number): number | undefined
}

interface segment extends curve {
  p1: point
  p2: point
  eval(t: number): number | undefined
  setPostPoint(p: point): void
}

class Line implements segment {
  p1: point
  p2: point

  constructor(p1: point, p2: point) {
    this.p1 = p1
    this.p2 = p2
  }

  eval(time: number): number | undefined {
    if (this.p1.t > time || time >= this.p2.t) return undefined
    const t = (time - this.p1.t) / (this.p2.t - this.p1.t)
    return this.p1.y + (this.p2.y - this.p1.y) * t
  }
  setPostPoint() { }
}

class Hermite implements segment {
  p1: point
  p2: point
  m1: any
  m2: any
  constructor(p1: point, p2: point, m1: number, m2: number) {
    this.p1 = p1
    this.p2 = p2
    this.m1 = m1
    this.m2 = m2
  }

  eval(time: number): number | undefined {
    if (this.p1.t > time || time >= this.p2.t) return undefined
    const t = (time - this.p1.t) / (this.p2.t - this.p1.t)
    const y1 = this.p1.y
    const y2 = this.p2.y
    const m1 = this.m1
    const m2 = this.m2
    return (
        (2 * y1 + m1 - 2 * y2 + m2) * t ** 3 +
        (-3 * y1 - 2 * m1 + 3 * y2 - m2) * t ** 2 +
        m1 * t + y1
      )
    }
  setPostPoint() { }
}

class CatmullRom implements segment {
  hermite: Hermite
  p1: point
  p2: point

  constructor(p1: point, p2: point) {
    this.p1 = p1
    this.p2 = p2
    const m = (p2.y - p1.y) / (p2.t - p1.t)
    this.hermite = new Hermite(p1, p2, m / 2, m / 2)
  }

  setPrePoint(p: point) {
    const m = (this.p2.y - p.y) / (this.p2.t - p.t)
    this.hermite = new Hermite(this.p1, this.p2, m, this.hermite.m2)
  }

  setPostPoint(p: point) {
    const m = (p.y - this.p1.y) / (p.t - this.p1.t)
    this.hermite = new Hermite(this.p1, this.p2, this.hermite.m1, m)
  }

  eval(t: number): number | undefined {
    return this.hermite.eval(t)
  }
}

class CatmullRom_jump extends CatmullRom {
  constructor(p1: point, p2: point) {
    super({ t: p1.t, y: p2.y }, p2)
  }

  // 一個あとの点のyを終点のyにする
  setPostPoint(p: point) {
    const m = (p.y - this.p1.y) / (this.p2.t - this.p1.t)
    this.hermite = new Hermite(this.p1, { t: this.p2.t, y: p.y }, this.hermite.m1, m / 2)
  }

  eval(t: number): number | undefined {
    return this.hermite.eval(t)
  }
}

export class Curve implements curve {
  last_point: point
  first_point: point | undefined
  last_isLine: boolean
  last_isDouble: boolean
  segments: segment[]
  normal: number
  constructor(start: number) {
    this.normal = start
    this.segments = []
    this.last_point = { t: 0, y: this.normal }
    this.last_isLine = true
    this.last_isDouble = false
    this.first_point = undefined
  }

  addPoint(t: number, y: number, isLine: boolean, y_?: number) {
    if (this.first_point === undefined) {
      // 最初の点
      this.first_point = { t, y }
      this.last_point = { t, y }
      this.last_isLine = isLine
      return
    }

    if (this.segments.length > 0) {
      // 直前のCatmull-Romの終点の傾きを変更
      this.segments[this.segments.length - 1].setPostPoint({ t, y })
    }
    if (isLine && this.last_isLine) {
      // 直線
      this.segments.push(new Line(this.last_point, { t, y }))
    } else {
      // Catmull-Rom
      if (this.last_isDouble && this.segments.length !== 0) {
        // 曲線の始点が二重化されていて、最初のセグメントでない場合
        const crv = new CatmullRom_jump({ t: this.last_point.t, y: y }, { t, y })
        crv.setPrePoint({ t: 2 * this.last_point.t - t, y: this.last_point.y })
        this.segments.push(crv)
      } else {
        // 通常の曲線
        const crv = new CatmullRom(this.last_point, { t, y })
        if (this.segments.length !== 0) {
          crv.setPrePoint(this.segments[this.segments.length-1].p1)
        }
        this.segments.push(crv)
      }
    }
    this.last_isDouble = y_ !== undefined
    this.last_point = { t, y: y_ ?? y }
    this.last_isLine = isLine
  }

  eval(t: number): number {
    const outRange = this.first_point ? (t <= this.first_point.t ? this.first_point.y : this.last_point.y) : this.last_point.y
    const a = this.segments.find(crv => crv.eval(t))?.eval(t) ?? outRange
    return a
  }
}