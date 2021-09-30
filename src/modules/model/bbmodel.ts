import { ModelAnimation, animation_json, jsonToAnimation } from "./animation"
import { ModelElement as ModelElement, element_json, jsonToElement } from "./element"
import { jsonToOutliner, ModelOutliner as ModelOutliner, outliner_json } from "./outliner"
import { resolution as Modelresolution } from "./resolution"
import { Texture as ModelTexture, Texture } from "./texture"



interface meta{
  format_version: string,
  creation_time : number,
  model_format  : string,
  box_uv: boolean
}

// const createBBmodel = ( name:string,model_format:'bedrock'|'java_block',resolution:{width:number,height:number}={width:16,height:16}) => new BBmodel({
//   meta:{
//     format_version: "3.6",
//     creation_time : new Date().getTime() / 1000,
//     model_format  : model_format,
//     box_uv: true
//   },
//   name:name,
//   resolution:resolution,
//   elements:[],
//   outliner:[]
// })


export interface bbmodel_json{
  meta:meta
  name:string
  resolution: Modelresolution
  elements: element_json[]
  outliner: outliner_json[]
  textures: ModelTexture[]
  animations:animation_json[]
}

export const jsonToBBmodel = (json:bbmodel_json) => {
  const resolution = json.resolution
  const textures   = json.textures.map(texture_json=>new Texture(texture_json))
  const elements   = json.elements.map(element_json=>jsonToElement(textures,resolution,element_json))
  const outliner   = json.outliner.map(outline_json=>jsonToOutliner(elements,outline_json))
  const animations = json.animations.map(animation_json=>jsonToAnimation(outliner,animation_json))

  return new BBmodel({
    meta:json.meta,
    name:json.name,
    resolution:resolution,
    elements: elements,
    outliner: outliner,
    textures: textures,
    animations: animations
  })
}

interface bbmodel{
  meta:meta
  name:string
  resolution: Modelresolution
  elements: ModelElement[]
  outliner: ModelOutliner[]
  textures: ModelTexture[]
  animations: ModelAnimation[]
}

export class BBmodel implements bbmodel{
  meta:meta
  name:string
  resolution: Modelresolution
  elements: ModelElement[]
  outliner: ModelOutliner[]
  textures: ModelTexture[]
  animations: ModelAnimation[]
  
  constructor(bbmodel:bbmodel){
    this.meta = bbmodel.meta
    this.name = bbmodel.name
    this.resolution = bbmodel.resolution
    this.elements = bbmodel.elements
    this.outliner = bbmodel.outliner
    this.textures = bbmodel.textures
    this.animations = bbmodel.animations
  }
}