import { vec3 } from "../vector"
import { Curve } from "./curve"

export class Curve3D {
  x:Curve
  y:Curve
  z:Curve
  constructor(vector:vec3){
    this.x = new Curve(vector[0])
    this.y = new Curve(vector[1])
    this.z = new Curve(vector[2])
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