import { vec3 } from "../../util/vector";
import { Direction, FaceRotation } from "./general_model";


export type JavaModel = {
  credit?: string,
  textures: {
    [key: string]: string
  },
  elements: JavaElement[],
  display?: {
    [key: string]: JavaDisplay
  }
}

export type JavaElement = {
  rescale?: boolean
  from: vec3,
  to: vec3,
  rotation?: JavaRotation,
  faces: JavaFaces
}


export type JavaElementAngle = -45 | -22.5 | 0 | 22.5 | 45

export type JavaRotation = {
  angle: JavaElementAngle,
  axis: 'x' | 'y' | 'z',
  origin: vec3
}

export type JavaFaces = {
  [key in Direction]?: JavaFace
}

export type JavaFace = {
  uv: [number, number, number, number],
  texture: string
  rotation: FaceRotation
}

export type JavaDisplay = {
  translation?: vec3,
  rotation?: vec3,
  scale?: vec3,
}

export interface JavaItemOverride{
  predicate:{
    custom_model_data:number
  }
  model:string
}
