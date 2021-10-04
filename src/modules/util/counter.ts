export class Counter {
  private i: number;
  constructor(startnum = 0) {
    this.i = startnum - 1
  }
  next() {
    this.i += 1
    return this.i
  }
}
