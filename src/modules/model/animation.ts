import { base64ToBlob } from "../file";
import { vec3 } from "../vector";
import { BBElement } from "./element";
import { BBOutliner } from "./outliner";
import { uuid } from "./types";

interface ikeyframe {
  channel: string,
  data_points: any[]
  uuid: string,
  time: number,
  interpolation: 'linear' | 'catmullrom'
}

interface keyframe_json extends ikeyframe {
  channel: 'rotation' | 'position' | 'scale',
  data_points: { x: string, y: string, z: string }[]
}

interface keyframe extends ikeyframe {
  data_points: vec3[]
}

const jsonToKeyframe = (keyframe_json: keyframe_json): keyframe => {
  const datapoints: vec3[] = keyframe_json.data_points.map(({ x, y, z }) => [parseFloat(x), parseFloat(y), parseFloat(z)])
  return {
    channel: keyframe_json.channel,
    data_points: datapoints,
    uuid: keyframe_json.uuid,
    time: keyframe_json.time,
    interpolation: keyframe_json.interpolation
  }
}

type effect_keyframe = particle_keyframe | sound_keyframe | timeline_keyframe

interface particle_keyframe extends ikeyframe {
  channel: 'particle',
  data_points: {
    effect: string,
    locator: string,
    script: string,
    file: string
  }[]
}

interface sound_keyframe extends ikeyframe {
  channel: 'sound',
  data_points: {
    effect: string,
    file: string
  }[]
}

interface timeline_keyframe extends ikeyframe {
  channel: 'timeline',
  data_points: {
    script: string
  }[]
}

// TODO: arg.keyframes のバリデーション
export const isTimeline = (arg: unknown): arg is timeline_keyframe =>
  (
    typeof arg !== undefined &&
    typeof arg !== null &&
    (arg as timeline_keyframe).channel === 'timeline' &&
    typeof (arg as timeline_keyframe).data_points[0].script === 'string'
  ) ? true : false

const jsonToEffectKeyframe = (keyframe_json: effect_keyframe): effect_keyframe => keyframe_json

interface animator_json {
  name: string
  keyframes: keyframe_json[]
}

interface effect_animator_json {
  name: string
  keyframes: effect_keyframe[]
}

export interface BBAnimator {
  type: 'normal'
  name: string
  target: BBOutliner
  keyframes: keyframe[]
}

const isBBAnimator = (arg: unknown): arg is BBAnimator =>
  (
    typeof arg !== undefined &&
    typeof arg !== null &&
    typeof (arg as BBAnimator).name === "string" &&
    (arg as BBAnimator).type === 'normal' &&
    (arg as BBAnimator).target instanceof BBOutliner
  ) ? true : false

export interface BBEffectAnimator {
  type: 'effect'
  name: string
  keyframes: effect_keyframe[]
}

// TODO: arg.keyframes のバリデーション
const isBBEffectAnimator = (arg: unknown): arg is BBEffectAnimator => {
  console.log((arg as BBEffectAnimator).type, (arg as BBEffectAnimator).type === 'effect')
  return (
    typeof arg !== undefined &&
    typeof arg !== null &&
    typeof (arg as BBEffectAnimator).name === "string" &&
    (arg as BBEffectAnimator).type === 'effect' &&
    (arg as BBEffectAnimator).keyframes instanceof Array) ? true : false
}

const jsonToAnimator = (animator_json: animator_json, outliner: BBOutliner): BBAnimator => {
  return {
    type: 'normal',
    name: animator_json.name,
    target: outliner,
    keyframes: animator_json.keyframes.map(jsonToKeyframe)
  }
}

const jsonToEffectAnimator = (animator_json: effect_animator_json): BBEffectAnimator => {
  return {
    type: 'effect',
    name: animator_json.name,
    keyframes: animator_json.keyframes.map(jsonToEffectKeyframe)
  }
}


export interface animation_json {
  name: string
  loop: 'once' | 'hold' | 'loop'
  length: number
  animators: {
    [index: string]: animator_json | effect_animator_json
  }
}

interface animation {
  name: string
  loop: 'once' | 'hold' | 'loop'
  length: number
  animators: (BBAnimator | BBEffectAnimator)[]
}

export const jsonToAnimation = (outliners: BBOutliner[], animation_json: animation_json): BBAnimation => {
  const outliner_find = (outliners: (BBOutliner | BBElement)[], func: (outliner: BBOutliner) => boolean): BBOutliner | undefined => {
    let result: BBOutliner | undefined = undefined
    for (let outliner of outliners) {
      if (outliner instanceof BBOutliner) {
        if (func(outliner)) {
          result = outliner
          break
        }
        result = outliner_find(outliner.children, func)
        break
      }
    }
    return result
  }

  let animators: (BBAnimator | BBEffectAnimator)[] = []

  Object.keys(animation_json.animators).forEach(key => {
    const animator_json = animation_json.animators[key]
    if (key === 'effects') {
      animators.push(jsonToEffectAnimator(animator_json as effect_animator_json))
    }
    const outliner = outliner_find(outliners, outliner => outliner.uuid == key)
    if (outliner) {
      animators.push(jsonToAnimator(animator_json as animator_json, outliner))
    }
  })

  return new BBAnimation({
    name: animation_json.name,
    loop: animation_json.loop,
    length: animation_json.length,
    animators: animators
  })
}

export class BBAnimation implements animation {
  name: string
  loop: 'once' | 'hold' | 'loop'
  length: number
  animators: (BBAnimator | BBEffectAnimator)[]
  constructor(animation: animation) {
    this.name = animation.name
    this.loop = animation.loop
    this.length = animation.length
    this.animators = animation.animators

  }

  getAnimator(uuid: uuid): BBAnimator | undefined {
    return this.animators.find(animator => isBBAnimator(animator) ? animator.target.uuid === uuid : false) as BBAnimator | undefined
  }

  getEffectAnimator(): BBEffectAnimator | undefined {
    const a = this.animators.find(animator => isBBEffectAnimator(animator)) as BBEffectAnimator | undefined
    console.log(a);
    return a
  }
}
