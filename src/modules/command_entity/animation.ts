import { Curve3D } from "../curve/curve3d";
import { Modelanimator, ModelAnimation } from "../model/animation";
import { BBmodel } from "../model/bbmodel";
import { face, ModelElement } from "../model/element";
import { ModelOutliner } from "../model/outliner";
import { Counter } from "../util/counter";
import { mcPath } from "../util/datapack";
import { Path } from "../util/folder";
import { float_round } from "../util/number";
import { deconstructMatrix, matrix, matrix_mul, relativeOrigin, UNIT_MATRIX, vec3 } from "../vector";
import { CommandEntity } from "./command_entity";
import { ARMORSTAND_SELECTOR, SCORE_FRAME, SCORE_ID, TAG_ACTIVE, TAG_ALL, TAG_ENTITYPART, TAG_GC, TAG_TEMP } from "./consts";
import { model_override } from "./resourcepack";

export class CommandEntityOutliner {
  outliner: ModelOutliner
  position: Curve3D
  rotation: Curve3D
  elements: CommandEntityItemModel[]
  outliners: CommandEntityOutliner[]
  constructor(outliner: ModelOutliner, animators: Modelanimator[], itemModels:CommandEntityItemModel[]) {
    this.outliner = outliner
    // TODO: 参照元がなかった場合の処理
    const animator: Modelanimator = animators.find(animator => animator.target.uuid == outliner.uuid) as Modelanimator
    this.position = new Curve3D()
    this.rotation = new Curve3D()
    animator.keyframes.forEach((keyframe) => {
      if (keyframe.channel == 'position') {
        this.position.addVector(keyframe.time, keyframe.data_points[0], keyframe.interpolation == 'linear', keyframe.data_points[1])
      } else if (keyframe.channel == 'rotation') {
        this.rotation.addVector(keyframe.time, keyframe.data_points[0], keyframe.interpolation == 'linear', keyframe.data_points[1])
      }
    })
    this.elements = []
    this.outliners = []
    this.outliner.children.forEach((child, i) => {
      if (child instanceof ModelElement) {
        this.elements.push( itemModels.find( model => model.element === child ) as CommandEntityItemModel )
      } else {
        this.outliners.push(new CommandEntityOutliner(child, animators, itemModels))
      }
    })
  }
  getRalativeOrigin(tick: number) {
    return relativeOrigin(this.position.eval(tick/20), this.rotation.eval(tick/20))
  }

  exportAllTpCommand(tick: number, parent_matrix: matrix): string[] {
    let origin_matrix = matrix_mul(parent_matrix, this.getRalativeOrigin(tick))
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


export class CommandEntityAnimation {
  start_frame:number|undefined
  animation: ModelAnimation
  commandEntityOutliners: CommandEntityOutliner[];
  entity: CommandEntity;

  constructor(entity:CommandEntity,animation: ModelAnimation, outliner: ModelOutliner[], itemModels:CommandEntityItemModel[]) {
    this.entity = entity
    this.animation = animation
    this.commandEntityOutliners = outliner.map(outline => new CommandEntityOutliner(outline, animation.animators, itemModels))
    this.start_frame = undefined
  }

  writeAllFrameFunctions(tickCounter:Counter,animations_folder:Path):void{
    const last_tick = this.animation.length*20
    for (let i = 0 ; i <= last_tick; i++ ){
      const tick = tickCounter.next()
      this.start_frame = this.start_frame??tick
      const frames_folder = animations_folder.child(this.animation.name,'frames')
      this.writePreFrameFunction(frames_folder,i)
      this.writeFrameFunction(frames_folder,i,tick)
    }
  }

  writePreFrameFunction(frames_folder:Path,tick: number):void {
    frames_folder.child(tick.toString()+'_.mcfunction').write_text(
      `execute as ${ARMORSTAND_SELECTOR([this.entity.tag,TAG_GC],{[SCORE_FRAME]:tick.toString()})} at @s run function ${mcPath(frames_folder.child(tick.toString()+'.mcfunction'))}`,
    true)
  }


  writeFrameFunction(frames_folder:Path,tick: number,total_tick:number,isLast:boolean = false):void {
    const commands: string[] = [
      `scoreboard players operation _ ${SCORE_ID} = @s ${SCORE_ID}`,
      `scoreboard players operation ${ARMORSTAND_SELECTOR([TAG_ALL])} ${SCORE_ID} -= _ ${SCORE_ID}`,
      `tag ${ARMORSTAND_SELECTOR([TAG_ALL], { [SCORE_ID]: '0' })} add ${TAG_ACTIVE}`,
      `tag ${ARMORSTAND_SELECTOR([TAG_ACTIVE])} remove ${TAG_GC}`,
      '',
      ...this.commandEntityOutliners.flatMap(outliner => outliner.exportAllTpCommand(tick, UNIT_MATRIX)),
      `tag ${ARMORSTAND_SELECTOR([TAG_ACTIVE])} remove ${TAG_ACTIVE}`,
      `scoreboard players operation ${ARMORSTAND_SELECTOR([TAG_ALL])} ${SCORE_ID} += _ ${SCORE_ID}`,
      `scoreboard players set @s ${SCORE_FRAME} ${total_tick + 1}`,
      isLast?'# LSAT FRAME':`schedule function ${mcPath(frames_folder.child((tick+1).toString()+'_.mcfunction'))} 2t`
    ]
    frames_folder.child(tick.toString()+'.mcfunction').write_text(commands.join('\n'),true)
  }
}


export class CommandEntityItemModel {
  element: ModelElement;
  entity_name: string;
  part_id: string;
  custom_model_data: number;
  tag: string;
  entity: CommandEntity;

  constructor(entity:CommandEntity,element: ModelElement, entity_name: string, part_id: string, custom_model_data:number) {
    this.entity  = entity
    this.element = element
    this.entity_name = entity_name
    this.part_id = part_id
    this.custom_model_data = custom_model_data
    this.tag = TAG_ENTITYPART(this.entity_name, this.part_id)
  }

  exportSummonCommand(){
      return `summon armor_stand ~ ~ ~ {Tags:[${TAG_TEMP},${this.tag},${TAG_ALL}],Marker:1b,Invisible:1b,NoBasePlate:1b,ArmorItems:[{},{},{},{id:"${this.entity.pack.model_item}",Count:1b,tag:{CustomModelData:${this.custom_model_data}}}]}`
  }

  exportTpCommand(origin_matrix: matrix): string[] {
    const matrix = matrix_mul(origin_matrix, this.element.matrix())
    const [position, rotation] = deconstructMatrix(matrix)
    const result = [
      `tp ${ARMORSTAND_SELECTOR([TAG_ACTIVE, this.tag], {}, true)} ~${float_round(position[0]/16,5)} ~${float_round(position[1]/16,5)} ~${float_round(-position[2]/16,5)} ~ ~`,
      `data modify entity ${ARMORSTAND_SELECTOR([TAG_ACTIVE, this.tag], {}, true)} Pose.Head set value [${float_round(-rotation[0],5)}f,${float_round(rotation[1],5)}f,${float_round(-rotation[2],5)}f]`
    ]
    return result
  }

  writeModel(entitymodel_folder:Path): model_override {
    let faces: { [kay in itemModelFaceKey]?: itemModelFace } = {};
    (Object.keys(this.element.faces) as itemModelFaceKey[]).forEach((facename: itemModelFaceKey): void => {
      const face = this.element.faces[facename] as face
      faces[facename] = { texture: face.texture.id, uv: face.uv.map(x => 16 * x) as [number, number, number, number] }
    })
    const model_json = JSON.stringify({
      elements: [{
        from: this.element.from,
        to: this.element.to,
        faces: faces
      }],
      textures: {},
      display: {}
    })
    const exportpath = entitymodel_folder.child(this.part_id+'.json')
    exportpath.write_text(model_json,true)

    return {predicate:{custom_model_data:this.custom_model_data},model:mcPath(exportpath)}
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
