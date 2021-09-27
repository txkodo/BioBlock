import { vec3 } from "../vector"
import { Curve } from "./curve"

export class Curve3D {
  x:Curve
  y:Curve
  z:Curve
  constructor(){
    this.x = new Curve()
    this.y = new Curve()
    this.z = new Curve()
  }

  addVector(t:number,v:vec3,isLine:boolean,v_?:vec3){
    this.x.addPoint(t,v[0],isLine,v_?v_[0]:undefined)
    this.y.addPoint(t,v[1],isLine,v_?v_[1]:undefined)
    this.z.addPoint(t,v[2],isLine,v_?v_[2]:undefined)
  }

  eval(t:number):vec3{
    return [
      this.x.eval(t),
      this.y.eval(t),
      this.z.eval(t)
    ]
  }
}