export class Counter {
  private i: number;
  constructor() {
    this.i = -1
  }
  next() {
    this.i += 1
    return this.i
  }
}
