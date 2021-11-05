import { vec3 } from "../../util/vector"
import { bbmodel_animation_json, bbmodel_animator_json, bbmodel_effect_animator_json, bbmodel_element_json, bbmodel_face_json, bbmodel_json, bbmodel_keyframe_json, bbmodel_meta_json, bbmodel_outliner_json, bbmodel_resolution_json } from "./bbmodel_json"
import { Direction } from "./general_model"

export class BBmodelError extends Error {
  constructor(message?: string | undefined) {
    super(message)
  }
}
const throwBBmodelError = (message?: string) => {throw new BBmodelError(message) }

export class BBmodel {
  meta: BBmodel_meta
  name: string
  resolution: BBmodel_resolution
  elements: BBmodel_element[]
  outliner: BBmodel_outliner[]
  textures: BBmodel_texture[]
  animations: BBmodel_animation[]

  constructor(json: bbmodel_json) {

    this.meta = json.meta
    this.name = json.name
    this.resolution = json.resolution
    this.textures = json.textures

    this.elements = json.elements.map(element => new BBmodel_element(element, this.textures))
    this.outliner = json.outliner.map(outliner => new BBmodel_outliner(outliner, this.elements))
    this.animations = json.animations.map(animation => new BBmodel_animation(animation, this.outliner))
  }
}

export type BBmodel_meta = bbmodel_meta_json
export type BBmodel_resolution = bbmodel_resolution_json

export class BBmodel_element {
  name: string
  uuid: string
  rescale: boolean
  from: vec3
  to: vec3
  origin: vec3
  rotation: vec3
  faces: {
    north?: BBmodel_face
    south?: BBmodel_face
    east?: BBmodel_face
    west?: BBmodel_face
    up?: BBmodel_face
    down?: BBmodel_face
  }
  constructor(json: bbmodel_element_json, textures: BBmodel_texture[]) {
    this.uuid = json.uuid
    this.name = json.name
    this.rescale = json.rescale
    this.from = json.from
    this.to = json.to
    this.origin = json.origin
    this.rotation = json.rotation ?? [0, 0, 0]
    this.faces = Object.keys(json.faces).reduce((obj, direction) => Object.assign(obj, { [direction]: new BBmodel_face(json.faces[direction as Direction] ?? throwBBmodelError(), textures) }), {})
  }
}

export class BBmodel_face {
  rotation: BBmodel_face_rotation
  uv: BBmodel_face_uv
  texture: BBmodel_texture
  constructor(json: bbmodel_face_json, textures: BBmodel_texture[]) {
    this.rotation = json.rotation ?? 0
    this.uv = json.uv
    this.texture = textures[json.texture]
  }
}

export type BBmodel_face_rotation = 0 | 90 | 180 | 270

export type BBmodel_face_uv = [number, number, number, number]

export class BBmodel_outliner {
  uuid: string
  origin: vec3
  rotation: vec3
  elements: BBmodel_element[]
  sub_outliner: BBmodel_outliner[]
  name: string
  constructor(json: bbmodel_outliner_json, elements: BBmodel_element[]) {
    this.uuid = json.uuid
    this.name = json.name
    this.origin = json.origin
    this.rotation = json.rotation ?? [0, 0, 0]
    this.elements = json.children.filter(child => typeof child === 'string').map(uuid => elements.find(element => element.uuid === uuid) ?? throwBBmodelError(`cannot find element{uuid:${uuid}}.`))
    this.sub_outliner = json.children.filter(child => typeof child !== 'string').map(outliner => new BBmodel_outliner(outliner as bbmodel_outliner_json, elements))
  }

  find(f: (outliner: BBmodel_outliner) => boolean): BBmodel_outliner | undefined {
    if (f(this)) { return this }
    let result: BBmodel_outliner | undefined = undefined
    this.sub_outliner.forEach(outliner => {
      result = result ?? outliner.find(f)
    })
    return result
  }
}

export type BBmodel_texture = {
  namespace: string
  folder: string
  name: string
  source: string
  id: string
}

export type BBmodel_animation_types = 'once' | 'hold' | 'loop'

export class BBmodel_animation {
  name: string
  loop: BBmodel_animation_types
  length: number
  animators: BBmodel_animator[]
  effect_animator: BBmodel_effect_animator
  constructor(json: bbmodel_animation_json, outliners: BBmodel_outliner[]) {
    this.name = json.name
    this.loop = json.loop
    this.length = json.length
    this.animators = Object.keys(json.animators).filter( uuid => uuid !== 'effects' ).map(uuid => new BBmodel_animator(json.animators[uuid] as bbmodel_animator_json, outliners.reduce((obj: BBmodel_outliner | undefined, outliner) => (obj ?? outliner.find(o => o.uuid === uuid)), undefined) ?? throwBBmodelError(uuid)))
    this.effect_animator = new BBmodel_effect_animator(json.animators['effects'] as bbmodel_effect_animator_json | undefined ?? { name: "Effects", keyframes: [] })
  }
}

export class BBmodel_animator {
  outliner: BBmodel_outliner
  name: string
  keyframes: BBmodel_keyframe[]
  constructor(json: bbmodel_animator_json, outliner: BBmodel_outliner) {
    this.outliner = outliner
    this.name = json.name
    this.keyframes = json.keyframes.map(keyframe => new BBmodel_keyframe(keyframe))
  }
}

export class BBmodel_effect_animator {
  exportCommands(tick: number) {
    throw new Error("Method not implemented.")
  }
  name: string
  keyframes: BBmodel_effect_keyframe[]
  constructor(json: bbmodel_effect_animator_json) {
    this.name = json.name
    this.keyframes = json.keyframes
  }
}

export interface ikeyframe {
  channel: string,
  data_points: any[]
  uuid: string,
  time: number,
  interpolation: 'linear' | 'catmullrom'
}

export class BBmodel_keyframe implements ikeyframe {
  channel: 'rotation' | 'position' | 'scale'
  data_points: vec3[]
  uuid: string
  time: number
  interpolation: 'linear' | 'catmullrom'
  constructor(json: bbmodel_keyframe_json) {
    this.uuid = json.uuid
    this.time = json.time
    this.interpolation = json.interpolation
    this.channel = json.channel
    this.data_points = json.data_points.map(data_point => [parseFloat(data_point.x), parseFloat(data_point.y), parseFloat(data_point.z)])
  }
}

export type BBmodel_effect_keyframe = BBmodel_particle_keyframe | BBmodel_sound_keyframe | BBmodel_timeline_keyframe

export const isBBmodel_particle_keyframe = (test: unknown): test is BBmodel_particle_keyframe => {
  return (test as BBmodel_particle_keyframe).channel === 'particle';
};
export const isBBmodel_sound_keyframe = (test: unknown): test is BBmodel_sound_keyframe => {
  return (test as BBmodel_sound_keyframe).channel === 'sound';
};
export const isBBmodel_timeline_keyframe = (test: unknown): test is BBmodel_timeline_keyframe => {
  return (test as BBmodel_timeline_keyframe).channel === 'timeline';
};

export interface BBmodel_particle_keyframe extends ikeyframe {
  channel: 'particle',
  data_points: {
    effect: string,
    locator: string,
    script: string,
    file: string
  }[]
}

export interface BBmodel_sound_keyframe extends ikeyframe {
  channel: 'sound',
  data_points: {
    effect: string,
    file: string
  }[]
}

export interface BBmodel_timeline_keyframe extends ikeyframe {
  channel: 'timeline',
  data_points: {
    script: string
  }[]
}
