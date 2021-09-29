import { vec3 } from "../vector";
import { ModelElement } from "./element";

export interface outliner_json{
  uuid     :string
  origin   :vec3
  rotation?:vec3
  children : (outliner_json | string)[]
}

export const jsonToOutliner = (elements:ModelElement[],outliner_json:outliner_json):ModelOutliner => new ModelOutliner({
  uuid:outliner_json.uuid,
  origin:outliner_json.origin,
  rotation:outliner_json.rotation,
  // TODO: 現状elements内に同uuidを持つElementがないケースを無視している
  children:outliner_json.children.map(child => typeof child === 'string'?elements.find(element => element.uuid == child) as ModelElement:jsonToOutliner(elements,child)),
})

interface outliner<T>{
  uuid     :string
  origin   :vec3
  rotation?:vec3
  children :(T | ModelElement)[]
}

export class ModelOutliner implements outliner<ModelOutliner>{
  uuid :string
  origin   :vec3
  rotation?:vec3
  children :(ModelOutliner | ModelElement)[]
  constructor(outliner:outliner<ModelOutliner>){
    this.uuid = outliner.uuid
    this.origin = outliner.origin
    this.rotation = outliner.rotation
    this.children = outliner.children
  }
  // setAnimaion(animation){
    
  // }
}

// export class AnimatedOutliner implements outliner<AnimatedOutliner>{
//   origin   :vec3
//   rotation?:vec3
//   children :(AnimatedOutliner | Element)[]
//   constructor(outliner:Outliner){
//     this.origin = outliner.origin
//     this.rotation = outliner.rotation
//     this.children = outliner.children
//   }
// }