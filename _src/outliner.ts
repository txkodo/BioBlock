import { vec3 } from "../util/vector";
import { BBElement } from "./element";

export interface outliner_json{
  uuid     :string
  origin   :vec3
  rotation?:vec3
  children : (outliner_json | string)[]
}

export const jsonToOutliner = (elements:BBElement[],outliner_json:outliner_json):BBOutliner => new BBOutliner({
  uuid:outliner_json.uuid,
  origin:outliner_json.origin,
  rotation:outliner_json.rotation,
  // TODO: 現状elements内に同uuidを持つElementがないケースを無視している
  children:outliner_json.children.map(child => typeof child === 'string'?elements.find(element => element.uuid == child) as BBElement:jsonToOutliner(elements,child)),
})

interface outliner<T>{
  uuid     :string
  origin   :vec3
  rotation?:vec3
  children :(T | BBElement)[]
}

export class BBOutliner implements outliner<BBOutliner>{
  uuid :string
  origin   :vec3
  rotation?:vec3
  children :(BBOutliner | BBElement)[]
  constructor(outliner:outliner<BBOutliner>){
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