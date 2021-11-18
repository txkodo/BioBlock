
type array3<T> = [T, T, T]
export interface vec3<T = number> extends array3<T> {
  map<U>(callbackfn: (value: T, index: number, array: T[]) => U, thisArg?: any): U[]
}

type array12<T> = [T, T, T, T, T, T, T, T, T, T, T, T]
export interface matrix<T = number> extends array12<T> {
  map<U>(callbackfn: (value: T, index: number, array: T[]) => U, thisArg?: any): U[]
}

export const vec3_neg = (v1: vec3) => {
  return v1.map(v => -v) as vec3
}
export const vec3_mul = (v1: vec3, s: number) => {
  return v1.map((v, i) => v * s) as vec3
}
export const vec3_add = (v1: vec3, v2: vec3) => {
  return v1.map((v, i) => v + v2[i]) as vec3
}
export const vec3_sub = (v1: vec3, v2: vec3) => {
  return v1.map((v, i) => v - v2[i]) as vec3
}

export const matrix_mul = (m1: matrix, m2: matrix) => {
  let result: matrix = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]
  for (let i = 0; i < 3; i++) {
    for (let j = 0; j < 3; j++) {
      for (let k = 0; k < 4; k++) {
        result[4 * i + k] += m1[4 * i + j] * m2[4 * j + k]
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


export const UNIT_MATRIX: matrix = [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0]

const degrees = (x: number) => x / Math.PI * 180
const radians = (x: number) => x * Math.PI / 180

export const rotation_matrix = (rotation: vec3) => {
  const [sx, sy, sz] = rotation.map(x => Math.sin(radians(x)))
  const [cx, cy, cz] = rotation.map(x => Math.cos(radians(x)))
  return [
    cy * cz, cz * sy * sx - cy * sz, sz * sx + cz * cx * sy, 0,
    cy * sz, cz * cx + sz * sy * sx, cx * sz * sy - cz * sx, 0,
    -sy, cy * sx, cy * cx, 0,
  ] as matrix
}

export const transpose_matrix = (transpose: vec3) => {
  const [x, y, z] = transpose
  return [
    1, 0, 0, x,
    0, 1, 0, y,
    0, 0, 1, z
  ] as matrix
}

export const invertZ = (transpose: vec3): vec3 => [transpose[0], transpose[1], -transpose[2]]

export const relativeOrigin = (transpose: vec3, rotation: vec3, offset: vec3) => {
  return matrix_mul(constructMatrix(transpose, rotation), transpose_matrix(vec3_neg(offset)))
}

export const constructMatrix = (transpose: vec3, rotation: vec3) => {
  return matrix_mul(transpose_matrix(transpose), rotation_matrix(rotation))
}

export const getRotation = (matrix: matrix): [number, number] => {
  const x = matrix[2]
  const y = matrix[6]
  const z = matrix[10]
  return [degrees(Math.atan2(z, -x)), degrees(Math.atan(y / (x ** 2 + z ** 2) ** 0.5))]
}

export const getTranspose = (matrix: matrix): vec3 => {
  return [matrix[3], matrix[7], matrix[11]]
}

export const deconstructMatrix = (matrix: matrix): [vec3, vec3] => {
  // rz: -180 ~ 180
  const rz = Math.atan2(matrix[4], matrix[0])
  // rx: -180 ~ 180
  const rx = Math.atan2(matrix[9], matrix[10])
  // ry: -90 ~ 90
  const ry = Math.atan(-matrix[8] / Math.sqrt(matrix[9] ** 2 + matrix[10] ** 2))
  return [getTranspose(matrix), [rx, ry, rz].map(x => degrees(x)) as vec3]
}