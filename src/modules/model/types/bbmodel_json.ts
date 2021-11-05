import { vec3 } from "../../util/vector"

export type bbmodel_json = {
  meta:bbmodel_meta_json
  name:string
  resolution :bbmodel_resolution_json
  elements   :bbmodel_element_json[]
  outliner   :bbmodel_outliner_json[]
  textures   :bbmodel_texture_json[]
  animations :bbmodel_animation_json[]
}

export type bbmodel_meta_json = {
  format_version: string,
  creation_time : number,
  model_format  : string,
  box_uv: boolean
}

export type bbmodel_resolution_json = {
  width : number,
  height: number
}

export type bbmodel_element_json = {
  name:string
  uuid:string
  rescale: boolean
  from: vec3
  to: vec3
  origin:vec3
  rotation?:vec3
  faces:{
    north?:bbmodel_face_json
    south?:bbmodel_face_json
    east? :bbmodel_face_json
    west? :bbmodel_face_json
    up?   :bbmodel_face_json
    down? :bbmodel_face_json
  }
}

export type bbmodel_face_json = {
  rotation?:bbmodel_face_rotation_json
  uv:bbmodel_face_uv_json
  texture:number
}

export type bbmodel_face_rotation_json = 0|90|180|270
export type bbmodel_face_uv_json = [number,number,number,number]

export type bbmodel_outliner_json = {
  name     :string
  uuid     :string
  origin   :vec3
  rotation?:vec3
  children : ( bbmodel_outliner_json | string )[]
}

export type bbmodel_texture_json = {
  namespace: string
  folder: string
  name: string
  source: string
  id: string
}

export type bbmodel_animation_types_json = 'once' | 'hold' | 'loop'

export type bbmodel_animation_json = {
  name: string
  loop: bbmodel_animation_types_json
  length: number
  animators: {
    [index: string]: bbmodel_animator_json | bbmodel_effect_animator_json
  }
}

export type bbmodel_animator_json = {
  name: string
  keyframes: bbmodel_keyframe_json[]
}

export type bbmodel_effect_animator_json = {
  name: string
  keyframes: bbmodel_effect_keyframe_json[]
}

export interface ikeyframe {
  channel: string,
  data_points: any[]
  uuid: string,
  time: number,
  interpolation: 'linear' | 'catmullrom'
}

export interface bbmodel_keyframe_json extends ikeyframe {
  channel: 'rotation' | 'position' | 'scale',
  data_points: { x: string, y: string, z: string }[]
}

export type bbmodel_effect_keyframe_json = bbmodel_particle_keyframe_json | bbmodel_sound_keyframe_json | bbmodel_timeline_keyframe_json

export interface bbmodel_particle_keyframe_json extends ikeyframe {
  channel: 'particle',
  data_points: {
    effect: string,
    locator: string,
    script: string,
    file: string
  }[]
}

export interface bbmodel_sound_keyframe_json extends ikeyframe {
  channel: 'sound',
  data_points: {
    effect: string,
    file: string
  }[]
}

export interface bbmodel_timeline_keyframe_json extends ikeyframe {
  channel: 'timeline',
  data_points: {
    script: string
  }[]
}
