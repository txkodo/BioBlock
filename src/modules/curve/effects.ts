import { time_to_tick } from "../util/tick";

type scriptTimeline_josn = {
  script: string
}

interface ScriptTimeline {
  eval(tick: number): string[]
}

class ScriptPoint {
  tick: number;
  script: string;
  constructor(time: number, script: string) {
    this.tick = time_to_tick(time)
    this.script = script
  }

  eval(tick: number): string[] {
    return tick == this.tick ? [this.script] : []
  }
}

class ScriptSequence {
  tick: number;
  script: string;
  span: number;
  start: number;
  step: number;
  constructor(time: number, script: string, start: number, end: number) {
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
        this.script
          .replace('(?<!\\)%', (this.start + this.step * tick_difference).toString())
          .replace('\\%', '%')
      ] : []
  }
}

export class Timeline {
  scripts: ScriptTimeline[];

  constructor() {
    this.scripts = []
  }

  addScript(time: number, script_json: scriptTimeline_josn) {
    const script = script_json.script
    script.split('\n+').forEach(command => {
      const matches = command.match(/^\s*\[\s*(\d+)\s*\.\.\s*(\d+)\s*\]\s*(.*)\s*/)
      if (matches) {
        this.scripts.push(new ScriptSequence(time, matches[3], parseInt(matches[1]), parseInt(matches[2])))
      } else {
        this.scripts.push(new ScriptPoint(time, script))
      }
    });
  }

  eval(tick: number): string[] {
    return this.scripts.flatMap(script => script.eval(tick))
  }
}
