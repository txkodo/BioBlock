
type array3<T> = [T, T, T]
interface Array3<T> extends array3<T> {
  map<U>(callbackfn: (value: T, index: number, array: T[]) => U, thisArg?: any): U[]
}
type array12<T> = [T, T, T, T, T, T, T, T, T, T, T, T]
interface Array12<T> extends array12<T> {
  map<U>(callbackfn: (value: T, index: number, array: T[]) => U, thisArg?: any): U[]
}

export type vec3 = Array3<number>
export const vec3_neg = (v1: vec3) => {
  return v1.map(v => -v) as vec3
}
export const vec3_add = (v1: vec3, v2: vec3) => {
  return v1.map((v, i) => v + v2[i]) as vec3
}
export const vec3_sub = (v1: vec3, v2: vec3) => {
  return v1.map((v, i) => v - v2[i]) as vec3
}

export type matrix = Array12<number>

export const matrix_mul = (m1: matrix, m2: matrix) => {
  let result: matrix = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]
  for (let i = 0; i < 3; i++) {
    for (let j = 0; j < 4; j++) {
      let n = 4 * i + j
      for (let k = 0; k < 3; k++) {
        result[n] += m1[4 * i + k] * m2[4 * k + j]
      }
    }
    result[4 * i + 3] += m1[4 * i + 3]
  }
  return result
}

export const matrix_vec3_mul = (m: matrix, v: vec3) => {
  let result: vec3 = [0, 0, 0]
  for (let i = 0; i < 3; i++) {
    for (let k = 0; k < 3; k++) {
      result[i] += m[4 * i + k] * v[k]
    }
    result[i] += m[4 * i + 3]
  }
  return result
}


const radians = (x:number) => x * Math.PI / 180

export const rotation_matrix = (rotation:vec3) => {
  const [sx, sy, sz] = rotation.map(x => Math.sin(radians(x)))
  const [cx, cy, cz] = rotation.map(x => Math.sin(radians(x)))
  return [
    cy * cz, cz * sy * sx + cy * sz, sz * sx + cz + cx + sy, 0,
    cy * sz, cz * cx + sz * sy * sx, cx * sz * sy - cz * sx, 0,
    -sy    , cy * sx               , cy * cx               , 0,
  ] as matrix
}

export const transpose_matrix = (transpose:vec3) => {
  const [x, y, z] = transpose
  return [
    0,0,0,x,
    0,0,0,y,
    0,0,0,z
  ] as matrix
}

export const relativeOrigin = (transpose:vec3, rotation:vec3) => {
  return matrix_mul(constructMatrix(transpose,rotation),transpose_matrix(vec3_neg(transpose)))
}

export const constructMatrix = (transpose:vec3, rotation:vec3) => {
  return matrix_mul(transpose_matrix(transpose),rotation_matrix(rotation))
}