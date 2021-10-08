import { constructMatrix, vec3 } from "../util/vector";
import { resolution } from "./resolution";
import { Texture } from "./texture";

export interface element_json{
  uuid:string
  rescale: boolean
  from: vec3
  to: vec3
  origin:vec3
  rotation?:vec3
  faces:{
    north?:face_json
    south?:face_json
    east? :face_json
    west? :face_json
    up?   :face_json
    down? :face_json
  }
}

export const jsonToElement = (textures:Texture[],resolution:resolution,json:element_json) => new BBElement({
  uuid : json.uuid,
  rescale : json.rescale,
  from : json.from,
  to : json.to,
  origin : json.origin,
  rotation : json.rotation??[0,0,0],
  faces : {
    north : json.faces.north?jsonToFace(textures,resolution,json.faces.north):undefined,
    south : json.faces.south?jsonToFace(textures,resolution,json.faces.south):undefined,
    east  : json.faces.east ?jsonToFace(textures,resolution,json.faces.east ):undefined,
    west  : json.faces.west ?jsonToFace(textures,resolution,json.faces.west ):undefined,
    up    : json.faces.up   ?jsonToFace(textures,resolution,json.faces.up   ):undefined,
    down  : json.faces.down ?jsonToFace(textures,resolution,json.faces.down ):undefined,
  }
})

interface element{
  uuid:string
  rescale: boolean
  from: vec3
  to: vec3
  origin:vec3
  rotation:vec3
  faces:{
    north?:face
    south?:face
    east? :face
    west? :face
    up?   :face
    down? :face
  }
}

export class BBElement implements element{
  uuid:string
  rescale: boolean
  from: vec3
  to: vec3
  origin:vec3
  rotation:vec3
  faces:{
    north?:face
    south?:face
    east? :face
    west? :face
    up?   :face
    down? :face
  }
  constructor(element:element){
    this.uuid     = element.uuid
    this.rescale  = element.rescale
    this.from     = element.from
    this.to       = element.to
    this.origin   = element.origin
    this.rotation = element.rotation??[0,0,0]
    this.faces    = element.faces
  }
}



export interface face_json{
  rotation?:0|90|180|270
  uv:[number,number,number,number]
  texture:number
}

export interface face{
  uv:[number,number,number,number]
  texture:Texture
  rotation:0|90|180|270
}

export type uv_json = [number,number,number,number]
export type uv = [number,number,number,number]

const jsonToFace = (textures:Texture[],resolution:resolution,json:face_json):face => ({
  rotation:json.rotation??0,
  uv:json.uv.map((v,i)=>v/resolution[i%2==0?'width':'height']) as uv,
  texture:textures[json.texture]
})
