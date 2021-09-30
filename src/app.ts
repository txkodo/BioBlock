import "./app.scss";

import "./modules/filedrop"


import { constructMatrix, matrix, matrix_mul, relativeOrigin, rotation_matrix, transpose_matrix, UNIT_MATRIX, vec3 } from "./modules/vector";

const a:matrix = [
  1,0,0,0,
  0,0,-1,0,
  0,1,0,0,
]

const b:matrix = [
  1,0,0,0,
  0,0,1,2,
  0,-1,0,32,
]

console.log(matrix_mul(a,b))
