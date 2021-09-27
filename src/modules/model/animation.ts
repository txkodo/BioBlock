import { vec3 } from "../vector";
import { Element } from "./element";
import { Outliner } from "./outliner";

interface keyframe_json {
  channel: 'rotation' | 'position' | 'scale',
  data_points: { x: string, y: string, z: string }[]
  uuid: string,
  time: number,
  interpolation: 'linear' | 'catmullrom'
}

interface keyframe {
  channel: 'rotation' | 'position' | 'scale',
  data_points: vec3[]
  uuid: string,
  time: number,
  interpolation: 'linear' | 'catmullrom'
}

const jsonToKeyframe = (keyframe_json: keyframe_json): keyframe => {
  const datapoints: vec3[] = keyframe_json.data_points.map(({ x, y, z }) => [parseFloat(x), parseFloat(y), parseFloat(x)])
  return {
    channel: keyframe_json.channel,
    data_points: datapoints,
    uuid: keyframe_json.uuid,
    time: keyframe_json.time,
    interpolation: keyframe_json.interpolation
  }
}

interface animator_json {
  name: string
  keyframes: keyframe_json[]
}

interface animator {
  name: string
  target: Outliner
  keyframes: keyframe[]
}

const jsonToAnimator = (animator_json: animator_json, outliner: Outliner): animator => {
  return {
    name: animator_json.name,
    target: outliner,
    keyframes: animator_json.keyframes.map(jsonToKeyframe)
  }
}

export interface animation_json {
  name: string
  loop: 'once'
  length: number
  animators: {
    [index: string]: animator_json
  }
}

interface animation {
  name: string
  loop: 'once'
  length: number
  animators: animator[]
}

export const jsonToAnimation = (outliners: Outliner[], animation_json: animation_json): Animation => {
  const outliner_find = (outliners: (Outliner | Element)[], func: (outliner: Outliner) => boolean): Outliner | undefined => {
    let result: Outliner | undefined = undefined
    for (let outliner of outliners){
      if (outliner instanceof Outliner) {
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

  let animators: animator[] = []

  Object.keys(animation_json.animators).forEach(key => {
    const animator_json = animation_json.animators[key]
    const outliner = outliner_find(outliners, outliner => outliner.uuid == key)
    if (outliner) {
      animators.push(jsonToAnimator(animator_json, outliner))
    }
  })

  return new Animation({
    name: animation_json.name,
    loop: animation_json.loop,
    length: animation_json.length,
    animators: animators
  })
}

export class Animation implements animation {
  name: string
  loop: 'once'
  length: number
  animators: animator[]
  constructor(animation:animation){
    this.name = animation.name 
    this.loop = animation.loop 
    this.length = animation.length 
    this.animators = animation.animators 
  }

}