import { time_to_tick } from "../util/tick";

type scriptTimeline_json = {
  script: string
}

interface ScriptTimeline {
  eval(tick: number): string[]
}

class ScriptPoint {
  tick: number;
  script: () => string;
  constructor(time: number, script:() => string) {
    this.tick = time_to_tick(time)
    this.script = script
  }

  eval(tick: number): string[] {
    return tick == this.tick ? [this.script()] : []
  }
}


class ScriptSequence {
  tick: number;
  span: number;
  start: number;
  step: number;
  script: () => string;
  constructor(time: number, script:()=> string, start: number, end: number | undefined) {
    end ??= Infinity
    this.tick = time_to_tick(time)
    this.script = script
    this.start = start
    this.span = Math.abs(end - start)
    this.step = end > start ? 1 : -1
  }

  eval(tick: number): string[] {
    const tick_difference = tick - this.tick
    return 0 <= tick_difference && tick_difference <= this.span ?
      [
        this.script()
          .replace(/(?<!\\)%/, (this.start + this.step * tick_difference).toString())
          .replace('\\%', '%')
      ] : []
  }
}

export type ScriptOptions = {
  time?: {
    start: number
    end?: number
  }
  positions?: (() => string)[]
}

export class Timeline {
  scripts: ScriptTimeline[];

  constructor() {
    this.scripts = []
  }

  addScript(time: number, script: string, options: ScriptOptions) {
    let scriptgen = () => script
    const pos = options.positions
    if (pos !== undefined){
      scriptgen = () => pos.map( pos => pos() + script ).join('\n')
    }

    if (options.time?.start === undefined) {
      this.scripts.push(new ScriptPoint(time, scriptgen))
    } else {
      this.scripts.push(new ScriptSequence(time, scriptgen, options.time.start, options.time.end))
    }
  }

  eval(tick: number): string[] {
    return this.scripts.flatMap(script => script.eval(tick))
  }
}
