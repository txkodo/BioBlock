import { Curve3D } from "../curve/curve3d";
import { Timeline } from "../curve/effects";
import { BBAnimator, BBEffectAnimator, BBAnimation, isTimeline } from "../model/animation";
import { face, BBElement } from "../model/element";
import { BBOutliner } from "../model/outliner";
import { Texture } from "../model/texture";
import { Counter } from "../util/counter";
import { mcPath } from "../util/datapack";
import { Path } from "../util/folder";
import { float_round } from "../util/number";
import { constructMatrix, deconstructMatrix, matrix, matrix_mul, relativeOrigin, UNIT_MATRIX, vec3, vec3_add, vec3_neg, vec3_sub } from "../vector";
import { CE } from "./command_entity";
import { ANIMATION_FUNCTION, ARMORSTAND_SELECTOR, SCORE_FRAME, SCORE_ID, SCORE_NEXT, TAG_ACTIVE, TAG_ALL, TAG_ENTITYPART, TAG_GC, TAG_SLEEP, TAG_TEMP } from "./consts";
import { model_override } from "./resourcepack";

export class CEAnimatedOutliner {
  outliner: BBOutliner
  position: Curve3D
  rotation: Curve3D
  elements: CEItemModel[]
  outliners: CEAnimatedOutliner[]
  constructor(outliner: BBOutliner, animation: BBAnimation, itemModels: CEItemModel[]) {
    this.outliner = outliner
    this.rotation = new Curve3D(this.outliner.rotation ?? [0, 0, 0])
    this.position = new Curve3D(this.outliner.origin)

    const animator = animation.getAnimator(outliner.uuid)
    animator?.keyframes.forEach((keyframe) => {
      if (keyframe.channel == 'position') {
        this.position.addVector(keyframe.time, vec3_add(outliner.origin, keyframe.data_points[0]), keyframe.interpolation == 'linear', keyframe.data_points[1] ? vec3_add(outliner.origin, keyframe.data_points[1]) : undefined)
      } else if (keyframe.channel == 'rotation') {
        this.rotation.addVector(keyframe.time, vec3_add(outliner.rotation ?? [0, 0, 0], keyframe.data_points[0]), keyframe.interpolation == 'linear', keyframe.data_points[1] ? vec3_add(outliner.rotation ?? [0, 0, 0], keyframe.data_points[1]) : undefined)
      }
    })

    this.elements = []
    this.outliners = []
    this.outliner.children.forEach((child, i) => {
      if (child instanceof BBElement) {
        this.elements.push(itemModels.find(model => model.element === child) as CEItemModel)
      } else {
        this.outliners.push(new CEAnimatedOutliner(child, animation, itemModels))
      }
    })
  }
  getRalativeOrigin(tick: number) {
    const origin = this.position.eval(tick / 20)
    return relativeOrigin([origin[0],origin[1],-origin[2]], this.rotation.eval(tick / 20))
  }

  exportAllTpCommand(tick: number, parent_matrix: matrix): string[] {
    const origin_matrix = matrix_mul(parent_matrix, this.getRalativeOrigin(tick))

    let result: string[] = []
    this.elements.forEach(element => {
      result.push(...element.exportTpCommand(origin_matrix))
    })
    this.outliners.forEach(outline => {
      result.push(...outline.exportAllTpCommand(tick, origin_matrix))
    })
    return result
  }
}

export class CEEffectAnimatior {
  timeline: Timeline;
  constructor(animation: BBAnimation){
    this.timeline = new Timeline()
    animation.getEffectAnimator()?.keyframes.forEach(keyframe => {
      if (isTimeline(keyframe)){
        this.timeline.addScript(keyframe.time,keyframe.data_points[0])
      }
    })
  }
  
  exportCommands(t:number):string[]{
    return this.timeline.eval(t)
  }

}

export class CEAnimation {
  start_frame: number | undefined
  animation: BBAnimation
  ceOutliners: CEAnimatedOutliner[];
  entity: CE;
  animation_folder: Path;
  frames_folder: Path;
  id: number;
  api_function: Path;
  ceEffectAnimatior: CEEffectAnimatior;

  constructor(entity: CE, animation: BBAnimation, animation_id:number, outliner: BBOutliner[],animations_folder:Path,itemModels: CEItemModel[]) {
    this.entity = entity
    this.animation = animation
    this.id = animation_id

    this.api_function     = this.entity.api_folder.child(ANIMATION_FUNCTION(this.animation.name))
    this.animation_folder = animations_folder.child(this.animation.name)
    this.frames_folder    = this.animation_folder.child('frames')

    this.ceEffectAnimatior = new CEEffectAnimatior(animation)

    this.ceOutliners = outliner.map(outline => new CEAnimatedOutliner(outline, animation, itemModels))
    this.start_frame = undefined
  }

  writeAllFrameFunctions(tickCounter: Counter,export_api:boolean = true): void {
    const last_tick = Math.max( Math.round((this.animation.length - 0.025) * 20),0)
    let first_tick: undefined | number = undefined
    for (let i = 0; i <= last_tick; i++) {
      const tick = tickCounter.next()
      first_tick = first_tick ?? tick
      this.start_frame = this.start_frame ?? tick
      this.writePreFrameFunction(i,tick)
      this.writeFrameFunction(i, tick, i === last_tick,first_tick)
    }

    this.writeMainFunction(first_tick as number)

    if (export_api) {
      this.writeApiFunction()
    }
  }

  writeMainFunction(first_tick:number): void {
    const main_function: string[] = [
      `scoreboard players set @s ${SCORE_FRAME} ${first_tick}`,
      `schedule function ${mcPath(this.frames_folder.child(`${first_tick}_.mcfunction`))} 1 replace`
    ]
    this.animation_folder.child('.mcfunction').write_text(main_function.join('\n'))
  }

  writeApiFunction(): void {
    const commands = [
      `execute unless entity ${ARMORSTAND_SELECTOR({tags:{[this.entity.tag]:true,[TAG_SLEEP]:false},scores:{},as_executer:true})} run tellraw @a {"color":"red","text":"Error from CommandEntity\\nfunction ${mcPath(this.api_function)} must be called as ${ARMORSTAND_SELECTOR({tags:{[this.entity.tag]:true,[TAG_SLEEP]:false},as_executer:true})}"}`,
      `execute if entity ${ARMORSTAND_SELECTOR({tags:{[this.entity.tag]:true,[TAG_SLEEP]:false},scores:{},as_executer:true})} run scoreboard players set @s ${SCORE_NEXT} ${this.id}`
    ]
    this.api_function.write_text(
      commands.join('\n'),
      true
    )
  }

  writePreFrameFunction(tick: number, total_tick: number): void {
    this.frames_folder.child(tick.toString() + '_.mcfunction').write_text(
      `execute as ${ARMORSTAND_SELECTOR({tags:{[this.entity.tag]:true,[TAG_GC]:true}, scores:{ [SCORE_FRAME]: total_tick.toString() }})} at @s run function ${mcPath(this.frames_folder.child(tick.toString() + '.mcfunction'))}`,
      true)
  }

  writeFrameFunction(tick: number, total_tick: number, isLast: boolean,first_frame:number): void {
    const commands: string[] = [
      `scoreboard players operation _ ${SCORE_ID} = @s ${SCORE_ID}`,
      `scoreboard players operation ${ARMORSTAND_SELECTOR({tags:{[TAG_ALL]:true}})} ${SCORE_ID} -= _ ${SCORE_ID}`,
      `tag ${ARMORSTAND_SELECTOR({tags:{[TAG_ALL]:true}, scores:{[SCORE_ID]: '0' }})} add ${TAG_ACTIVE}`,
      `tag ${ARMORSTAND_SELECTOR({tags:{[TAG_ACTIVE]:true}})} remove ${TAG_GC}`,
      '',
      ...this.ceOutliners.flatMap(outliner => outliner.exportAllTpCommand(tick, UNIT_MATRIX)),
      ...this.ceEffectAnimatior.exportCommands(tick),
      '',
      `tag ${ARMORSTAND_SELECTOR({tags:{[TAG_ACTIVE]:true}})} remove ${TAG_ACTIVE}`,
      `scoreboard players operation ${ARMORSTAND_SELECTOR({tags:{[TAG_ALL]:true}})} ${SCORE_ID} += _ ${SCORE_ID}`,
      ...(isLast
        ? [
          ...{
            // 1tick後に__snooze__状態になる
            once:[
              `execute unless score @s ${SCORE_NEXT} matches 1..${this.entity.commandEntityAnimations.length} run scoreboard players set @s ${SCORE_FRAME} 0`,
              `execute unless score @s ${SCORE_NEXT} matches 1..${this.entity.commandEntityAnimations.length} run schedule function ${mcPath(this.entity.snooze.frames_folder.child('0_.mcfunction'))} 1`
            ],
            // 1tick後にこのファンクションを呼び出す
            hold:[`execute unless score @s ${SCORE_NEXT} matches 1..${this.entity.commandEntityAnimations.length} run schedule function ${mcPath(this.frames_folder.child(tick.toString() + '_.mcfunction'))} 1`],
            // 1tick後にこのアニメーションの最初に戻る
            loop:[
              `execute unless score @s ${SCORE_NEXT} matches 1..${this.entity.commandEntityAnimations.length} run scoreboard players set @s ${SCORE_FRAME} ${first_frame}`,
              `execute unless score @s ${SCORE_NEXT} matches 1..${this.entity.commandEntityAnimations.length} run schedule function ${mcPath(this.frames_folder.child('0_.mcfunction'))}`
            ],
          }[this.animation.loop],
          `function ${mcPath(this.entity.select_function)}`
        ]
        : [
          `scoreboard players set @s ${SCORE_FRAME} ${total_tick + 1}`,
          `schedule function ${mcPath(this.frames_folder.child((tick + 1).toString() + '_.mcfunction'))} 1t`
        ])
    ]
    this.frames_folder.child(tick.toString() + '.mcfunction').write_text(commands.join('\n'), true)
  }
}


export class CEItemModel {
  element: BBElement;
  entity_name: string;
  part_id: string;
  custom_model_data: number;
  tag: string;
  entity: CE;
  textures_folder: Path;
  entitymodel_folder: Path;
  origin:vec3

  constructor(entity: CE, element: BBElement, entitymodel_folder:Path, textures_folder:Path, entity_name: string, part_id: string, custom_model_data: number) {
    this.entity = entity
    this.element = element

    this.entitymodel_folder = entitymodel_folder
    this.textures_folder    = textures_folder

    this.entity_name = entity_name
    this.part_id = part_id
    this.custom_model_data = custom_model_data
    this.tag = TAG_ENTITYPART(this.entity_name, this.part_id)

    const added = vec3_add(this.element.from,this.element.to)
    this.origin = [added[0]/2,added[1]/2,added[2]/2]
  }

  exportSummonCommand() {
    return `summon armor_stand ~ ~ ~ {Tags:[${TAG_TEMP},${this.tag},${TAG_ALL}],Marker:1b,Invisible:1b,NoBasePlate:1b,ArmorItems:[{},{},{},{id:"${this.entity.pack.model_item}",Count:1b,tag:{CustomModelData:${this.custom_model_data}}}]}`
  }

  exportTpCommand(origin_matrix: matrix): string[] {
    const matrix = matrix_mul(origin_matrix, constructMatrix([this.origin[0],this.origin[1],-this.origin[2]],this.element.rotation))
    const [position, rotation] = deconstructMatrix(matrix)
    const result = [
      `tp ${ARMORSTAND_SELECTOR({tags:{[TAG_ACTIVE]:true, [this.tag]:true},single:true})} ~${float_round(position[0] / 16, 5)} ~${float_round(position[1] / 16, 5)} ~${float_round(-position[2] / 16, 5)} ~ ~`,
      `data modify entity ${ARMORSTAND_SELECTOR({tags:{[TAG_ACTIVE]:true, [this.tag]:true},single:true})} Pose.Head set value [${float_round(-rotation[0], 5)}f,${float_round(rotation[1], 5)}f,${float_round(-rotation[2], 5)}f]`
    ]
    return result
  }

  writeModel(): model_override {
    // 使用されたテクスチャの集合
    let texture_set: Set<Texture> = new Set()
    // テクスチャの{id:mcPath}
    let textures: { [index: string]: string } = {}

    const texturepath = (texture: Texture) => this.textures_folder.child(texture.id + '.png')

    let faces: { [kay in itemModelFaceKey]?: itemModelFace } = {};
    (Object.keys(this.element.faces) as itemModelFaceKey[]).forEach((facename: itemModelFaceKey): void => {
      const face = this.element.faces[facename] as face
      textures[face.texture.id] = mcPath(texturepath(face.texture))
      texture_set.add(face.texture)
      faces[facename] = { texture: face.texture.id, uv: face.uv.map(x => 16 * x) as [number, number, number, number] }
    })
    // テクスチャの生成
    texture_set.forEach(texture => {
      texturepath(texture).write_bytes(texture.getFile(), true)
    });

    // モデルの生成
    const model_json = JSON.stringify({
      elements: [{
        from: vec3_add(vec3_sub(this.element.from, this.origin), [8, 0, 8]),
        to: vec3_add(vec3_sub(this.element.to, this.origin), [8, 0, 8]),
        faces: faces
      }],
      textures: textures,
      display: {
        head: {
          rotation: [0, -180, 0],
          scale: [1.6, 1.6, 1.6],
          translation: [0, 6.5, 0],
        }
      }
    })
    const exportpath = this.entitymodel_folder.child(this.part_id + '.json')
    exportpath.write_text(model_json, true)

    return { predicate: { custom_model_data: this.custom_model_data }, model: mcPath(exportpath) }
  }
}

type itemModelDisplay = {
  rotation: vec3
  scale: vec3
  translation: vec3
}

type itemModelFace = {
  texture: string
  uv: [number, number, number, number]
}

type itemModelFaceKey = 'north' | 'south' | 'east' | 'west' | 'up' | 'down'

type itemModel = {
  elements:
  {
    from: vec3
    to: vec3
    faces: {
      [kay in itemModelFaceKey]?: itemModelFace
    }
  }[]
  textures: {
    [index: string]: string
  }
  display: {
    head?: itemModelDisplay
  }
}
