import { invertZ, matrix, matrix_mul, matrix_vec3_mul, relativeOrigin, rotation_matrix, vec3, vec3_add, vec3_mul, vec3_sub } from "../util/vector"

const face_matrix_map = {
  'east': [
    1, 0, 0, 0,
    0, 0, -1, 0,
    0, -1, 0, 0,
  ] as matrix,
  'west': [
    -1, 0, 0, 0,
    0, 0, -1, 0,
    0, 1, 0, 0,
  ] as matrix,
  'north': [
    0, -1, 0, 0,
    0, 0, -1, 0,
    -1, 0, 0, 0,
  ] as matrix,
  'south': [
    0, 1, 0, 0,
    0, 0, -1, 0,
    1, 0, 0, 0,
  ] as matrix,
  'up': [
    0, 1, 0, 0,
    1, 0, 0, 0,
    0, 0, 1, 0,
  ] as matrix,
  'down': [
    0, 1, 0, 0,
    -1, 0, 0, 0,
    0, 0, -1, 0,
  ] as matrix,
}

const face_roation_matrix_map = {
  0: [
    1, 0, 0, 0,
    0, 1, 0, 0,
    0, 0, 1, 0,
  ] as matrix,
  90: [
    1, 0, 0, 0,
    0, 0, -1, 0,
    0, 1, 0, 0,
  ] as matrix,
  180: [
    1, 0, 0, 0,
    0, -1, 0, 0,
    0, 0, -1, 0,
  ] as matrix,
  270: [
    1, 0, 0, 0,
    0, 0, 1, 0,
    0, -1, 0, 0,
  ] as matrix,
}

const face2matrix = (direction: Direction, face: JavaFace): matrix => {
  const m: matrix = face_matrix_map[direction]
  const uv: matrix = face_roation_matrix_map[face.rotation]
  return matrix_mul(m, uv)
}

const matrix2face = (matrix: matrix): [Direction, 0 | 90 | 180 | 270] => {
  const find_rotation = (direction: Direction, matrix: matrix): 0 | 90 | 180 | 270 => {
    const face = face_matrix_map[direction]
    for (const key of ([0, 90, 180, 270] as (0 | 90 | 180 | 270)[])) {
      let flag = true
      const rotated = matrix_mul(face, face_roation_matrix_map[key])
      for (let i = 0; i < 3; i++) {
        for (let j = 0; j < 3; j++) {
          if (matrix[4 * i + j] !== rotated[4 * i + j]) {
            flag = false
            break
          }
        }
        if (!flag) { break }
      }
      if (flag) {
        return key
      }
    }
    throw new BioBlockConvertError(`変換後の面の回転方向が解決できません,${matrix}`)
  }

  let axis: 'x' | 'y' | 'z'
  let direction: Direction
  switch (matrix_vec3_mul(matrix, [1, 0, 0]).toString()) {
    case [1, 0, 0].toString():
      axis = 'x'
      direction = 'east'
      break;

    case [-1, 0, 0].toString():
      axis = 'x'
      direction = 'west'
      break;

    case [0, 1, 0].toString():
      axis = 'y'
      direction = 'up'
      break;

    case [0, -1, 0].toString():
      axis = 'y'
      direction = 'down'
      break;

    case [0, 0, 1].toString():
      axis = 'z'
      direction = 'south'
      break;

    case [0, 0, -1].toString():
      axis = 'z'
      direction = 'north'
      break;

    default:
      throw new BioBlockConvertError(matrix.toString())
  }
  return [direction, find_rotation(direction, matrix)]
}

import { JavaElement, JavaElementAngle, JavaFace, JavaFaces, JavaModel, JavaRotation } from "../model/types/java_model"
import { Axis, Direction } from "../model/types/general_model"
import { BBmodel_element, BBmodel_face, BBmodel_resolution } from "../model/types/bbmodel"
import { Path } from "../util/folder"
import { mcPath } from "../util/datapack"
import { BioBlockConvertError } from "./bioblock"
type right_angled = 0 | 90 | 180 | 270

export const rotateJavaElement = (element: JavaElement, rotation: vec3<right_angled>): JavaElement => {

  const rot_angle: JavaElementAngle = element.rotation?.angle ?? 0
  const rot_origin = element.rotation?.origin ?? [0, 0, 0]
  const rot_axis: vec3 = {
    x: [1, 0, 0] as vec3,
    y: [0, 1, 0] as vec3,
    z: [0, 0, 1] as vec3,
  }[element.rotation?.axis ?? 'x']


  const origin = relativeOrigin((rot_origin), rotation)
  const from_ = matrix_vec3_mul(origin, (element.from))
  const to_ = matrix_vec3_mul(origin, (element.to))
  const from = from_.map((v, i) => Math.min(v, to_[i])) as vec3
  const to = from_.map((v, i) => Math.max(v, to_[i])) as vec3

  let result_rotation: JavaRotation = {
    angle: rot_angle,
    axis: 'x',
    origin: rot_origin
  }


  matrix_vec3_mul(rotation_matrix(rotation), rot_axis).forEach((v, i) => {
    if (Math.round(v) === 1) {
      result_rotation.axis = ['x', 'y', 'z'][i] as Axis
    } else if (Math.round(v) === -1) {
      result_rotation.axis = ['x', 'y', 'z'][i] as Axis
      result_rotation.angle *= -1
    }
  })


  const faces: JavaFaces = {};

  (Object.keys(element.faces) as Direction[]).forEach(direction => {
    const face = element.faces[direction] as JavaFace
    const face_matrix: matrix = face2matrix(direction, face)
    const [new_direction, new_facerot] = matrix2face(matrix_mul(origin, face_matrix))

    faces[new_direction] = {
      uv: face.uv,
      texture: face.texture,
      rotation: new_facerot
    }
  })

  return {
    rescale: element.rescale,
    from: from,
    to: to,
    rotation: result_rotation,
    faces: faces
  }
}

const optimizeJavaModel = (javaModel: JavaModel): [JavaModel, vec3] => {
  const bbox = [[Infinity, 0], [Infinity, 0], [Infinity, 0]]
  const updateBbox = (v: vec3) => {
    v.forEach((x, i) => {
      bbox[i][0] = Math.min(bbox[i][0], x)
      bbox[i][1] = Math.max(bbox[i][1], x)
    })
  }
  javaModel.elements.forEach(element => {
    updateBbox(element.from)
    updateBbox(element.to)
  })

  const maxsize = Math.max(...bbox.map(([s, e]) => e - s))
  const center = bbox.map(([s, e]) => (s + e) / 2) as vec3
  const scale = 2 ** Math.max(Math.ceil(Math.log2(maxsize / 48)), 0)

  const copy: JavaModel = { ...javaModel }

  copy.elements = javaModel.elements.map((element: JavaElement): JavaElement => ({
    from: vec3_add(vec3_mul(vec3_sub(element.from, center), 1 / scale), [8, 8, 8]),
    to: vec3_add(vec3_mul(vec3_sub(element.to, center), 1 / scale), [8, 8, 8]),
    faces: element.faces,
  }))

  console.log(`scale:${scale}`);

  if (copy.display) {
    copy.display.head.scale = [2.285 * scale, 2.285 * scale, 2.285 * scale]
  } else {
    copy.display = {
      head: {
        scale: [2.285 * scale, 2.285 * scale, 2.285 * scale]
      }
    }
  }
  return [copy, center]
}

export const combine_elements = (elements: BBmodel_element[], resolution: BBmodel_resolution, texture_path: Path): [JavaModel, vec3, vec3][] => {

  let has_standard_basis = false
  const elements_in_standard_basis: JavaModel = {
    textures: {},
    elements: [],
    display: {
      head: {
        rotation: [0, -180, 0],
        scale: [2.285, 2.285, 2.285],
        translation: [0, -6.5, 0],
      }
    }
  }

  const elements_in_other_basis: [JavaModel, vec3, vec3][] = []

  elements.forEach(element => {
    const multiple90: vec3<right_angled> = [0, 0, 0]
    const java_rotation: JavaRotation = { angle: 0, axis: 'x', origin: element.origin }
    let standard_basis = true
    element.rotation.forEach((x, i) => {
      if (x / 22.5 !== 0) {
        standard_basis = false
      } else if (x / 90 === 0) {
        multiple90[i] = x as right_angled
      } else {
        if (java_rotation.angle !== 0) {
          standard_basis = false
        }
        java_rotation.axis = 'xyz'[i] as Axis
        java_rotation.angle = ((x + 45) % 90) / 22.5 - 45 as JavaElementAngle
        multiple90[i] = x - java_rotation.angle as right_angled
      }
    })
    has_standard_basis ||= standard_basis

    // 標準座標系に乗る場合
    if (standard_basis) {
      const faces: JavaFaces = {};
      (Object.keys(element.faces) as Direction[]).forEach(direction => {
        const face = element.faces[direction] as BBmodel_face
        elements_in_standard_basis.textures[face.texture.id] = mcPath(texture_path.child(`${face.texture.id}.png`))
        faces[direction] = {
          texture: '#' + face.texture.id,
          uv: face.uv.map((x, i) => x * 16 / resolution[i % 2 === 0 ? 'width' : 'height']) as [number, number, number, number],
          rotation: face.rotation
        }
      })
      const javaElement: JavaElement = {
        rescale: element.rescale,
        from: element.from,
        to: element.to,
        rotation: java_rotation,
        faces: faces
      }
      elements_in_standard_basis.elements.push(rotateJavaElement(javaElement, multiple90))
    }
    // 標準座標系に乗らない場合
    else {
      const faces: JavaFaces = {};
      const textures: { [key: string]: string } = {};
      (Object.keys(element.faces) as Direction[]).forEach(direction => {
        const face = element.faces[direction] as BBmodel_face
        textures[face.texture.id] = mcPath(texture_path.child(`${face.texture.id}.png`))
        faces[direction] = {
          texture: '#' + face.texture.id,
          uv: face.uv.map((x, i) => x * 16 / resolution[i % 2 === 0 ? 'width' : 'height']) as [number, number, number, number],
          rotation: face.rotation
        }
      })
      const java_model: JavaModel = {
        textures: textures,
        elements: [{
          from: element.from,
          to: element.to,
          faces: faces,
        }],
        display: {
          head: {
            rotation: [0, -180, 0],
            scale: [2.285, 2.285, 2.285],
            translation: [0, -6.5, 0],
          }
        }
      }
      const [new_model, offset] = optimizeJavaModel(java_model)
      const rotated_offset = matrix_vec3_mul(relativeOrigin(element.origin, element.rotation), offset)
      // TODO: 回転座標系の整理
      const entity_rotation: vec3 = [-element.rotation[0], -element.rotation[1], element.rotation[2]]
      elements_in_other_basis.push([new_model, rotated_offset, entity_rotation])
    }
  })

  const [new_model, offset] = optimizeJavaModel(elements_in_standard_basis)
  const bioblock_standard_basis: [JavaModel, vec3, vec3] = [new_model, offset, [0, 0, 0]]
  return [...has_standard_basis ? [bioblock_standard_basis] : [], ...elements_in_other_basis]
}