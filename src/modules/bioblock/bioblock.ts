import { ANIMATION_FUNCTION, ARMORSTAND_SELECTOR, NAMESPACE, SCORE_FRAME, SCORE_ID, SCORE_ID_GLOBAL, SCORE_NEXT, TAG_ACTIVE, TAG_ALL, TAG_ENTITY, TAG_ENTITYPART, TAG_GC, TAG_SLEEP, TAG_TEMP } from "../command_entity/consts";
import { Curve3D } from "../curve/curve3d";
import { Timeline } from "../curve/effects";
import { BBmodel, BBmodel_animation, BBmodel_animator, BBmodel_effect_animator, BBmodel_keyframe, BBmodel_outliner, isBBmodel_timeline_keyframe } from "../model/types/bbmodel";
import { JavaItemOverride, JavaModel } from "../model/types/java_model";
import { base64mimeToBlob } from "../util/base64blob";
import { Counter } from "../util/counter";
import { mcPath } from "../util/datapack";
import { Path } from "../util/folder";
import { float_round } from "../util/number";
import { constructMatrix, deconstructMatrix, matrix, matrix_mul, relativeOrigin, UNIT_MATRIX, vec3, vec3_add } from "../util/vector";
import { combine_elements } from "./bbelem_to_java";

export class BioBlockConvertError extends Error {
  constructor(message?: string | undefined) {
    super(message)
  }
}

const throwBioBlockConvertError = (message?: string) => { throw new BioBlockConvertError(message) }

export const getModelItem = (item: string, custom_model_data_start: number = 0): modelItem => {
  if (!item.match(/[a-z_-]+(:[a-z_-]+)?/)) {
    throwBioBlockConvertError('item name is invalid. use {namespace}:{item} or {item} like "minecraft:bone"')
  }
  const splitted = item.split(':')
  return {
    name: splitted[splitted.length - 1],
    namespace: splitted[1] ? splitted[0] : 'minecraft',
    start: custom_model_data_start
  }
}

export type modelItem = {
  namespace: string
  name: string
  start: number
}

export class BioBlock {
  models: BioBlockModel[];
  datapack: Path
  resourcepack: Path
  item: modelItem;
  constructor(models: BBmodel[], modelItem: modelItem) {
    this.item = modelItem
    this.datapack = new Path()
    this.resourcepack = new Path()
    const customModelData = new Counter(modelItem.start)
    this.models = models.map(model => new BioBlockModel(this, model, this.funcstions_folder, this.models_folder, this.textures_folder, customModelData))
  }

  get funcstions_folder() {
    return this.datapack.child('data', NAMESPACE, 'functions')
  }

  get models_folder() {
    return this.resourcepack.child('assets', NAMESPACE, 'models')
  }

  get textures_folder() {
    return this.resourcepack.child('assets', NAMESPACE, 'textures')
  }

  export(): [Path, Path] {
    const model_overrides = this.models.flatMap(model => model.export())

    this.write_init_function()

    this.write_itemmodel(model_overrides)

    this.write_datapack_mcmeta()
    this.write_resourcepack_mcmeta()
    return [this.datapack, this.resourcepack]
  }

  get model_item(): string {
    return `${this.item.namespace}:${this.item.name}`
  }

  write_datapack_mcmeta(): void {
    const content = {
      pack: {
        pack_format: 7,
        description: 'datapack for "Command Entity" by @txkodo'
      }
    }
    this.datapack.child('pack.mcmeta').write_json(content, true)
  }

  write_resourcepack_mcmeta() {
    const content = {
      pack: {
        pack_format: 7,
        description: 'resourcepack for "Command Entity" by @txkodo'
      }
    }
    this.resourcepack.child('pack.mcmeta').write_json(content, true)
  }

  write_init_function() {
    const initfunc = [
      `scoreboard objectives add ${SCORE_FRAME} dummy`,
      `scoreboard objectives add ${SCORE_ID} dummy`,
      `scoreboard objectives add ${SCORE_NEXT} dummy`,
      `scoreboard objectives add ${SCORE_ID} dummy`,
      `scoreboard players set ${SCORE_ID_GLOBAL} ${SCORE_ID} 0`,
    ]
    this.funcstions_folder.child('init.mcfunction').write_text(initfunc.join('\n'), true)
  }

  write_itemmodel(model_overrides: JavaItemOverride[]) {
    const item_model = {
      parent: "item/generated",
      textures: {
        layer0: "items/bone"
      },
      overrides: model_overrides
    }
    this.resourcepack.child('assets', this.item.namespace, 'models', 'item', this.item.name + '.json').write_text(JSON.stringify(item_model), true)
  }
}

export class BioBlockModel {
  model: BBmodel;
  outliner: BioBlock_outliner[];
  bioblock: BioBlock;
  functions_folder: Path;
  core_folder: Path;
  api_folder: Path;
  models_folder: Path;
  textures_folder: Path;
  select_function: Path;
  sleep_function: Path;
  awake_function: Path;
  summon_function: Path;
  animations: BioBlock_animation[];
  tag: string;
  snooze: BioBlock_animation;

  constructor(bioblock: BioBlock, model: BBmodel, functions: Path, models: Path, textures: Path, customModelDataCounter: Counter) {
    this.bioblock = bioblock
    this.model = model
    
    this.functions_folder = functions.child(this.model.name)
    this.core_folder = this.functions_folder.child('core')
    this.api_folder = this.functions_folder.child('api')
    
    this.models_folder = models.child(this.model.name)
    this.textures_folder = textures.child(this.model.name)
    
    this.tag = TAG_ENTITY(model.name)
    
    this.select_function = this.core_folder.child('__select__.mcfunction')
    this.sleep_function = this.core_folder.child('__sleep__.mcfunction')
    this.awake_function = this.core_folder.child('__awake__.mcfunction')
    this.summon_function = this.core_folder.child('__summon__.mcfunction')

    this.writeTextures()
    
    const part_id = new Counter()
    const animation_id = new Counter(0)
    const snooze_animation:BBmodel_animation = new BBmodel_animation({
      name: '__snooze__',
      loop: 'hold',
      length: 0.05,
      animators: {}
    },model.outliner)
    this.snooze = new BioBlock_animation(this, snooze_animation, animation_id.next(), this.core_folder)
    this.outliner = model.outliner.map(outliner => new BioBlock_outliner(this, outliner, part_id, customModelDataCounter,this.textures_folder))
    this.animations = model.animations.map(animation => new BioBlock_animation(this, animation,animation_id.next(),this.core_folder.child('animations')))

  }

  writeTextures(){
    this.model.textures.map( texture => {
      this.textures_folder.child(`${texture.id}.png`).write_bytes(base64mimeToBlob(texture.source),true)
    } )
  }

  setAnimation(animation: BBmodel_animation) {
    this.outliner.map(outliner => outliner.setAnimation(animation))
  }

  export(): JavaItemOverride[] {
    //// Datapack
    const core_folder = this.functions_folder.child('core')
    // summon
    this.writeSummonCommands()
    // awake
    this.writeAwakeCommands()
    // sleep
    this.writeSleepCommands()

    const tickCounter = new Counter()
    // snooze
    this.snooze.writeAllFrameFunctions(tickCounter, false)
    // // animate
    this.animations.map(animation => animation.writeAllFrameFunctions(tickCounter))

    // select
    this.writeSelectCommands()

    // Resourcepack
    const model_overrides: JavaItemOverride[] = this.outliner.flatMap(outliner => outliner.writeModels(this.models_folder))

    return model_overrides
  }

  writeSummonCommands(): void {
    let summon_commands = [
      `summon armor_stand ~ ~ ~ {Tags:[${TAG_TEMP},${this.tag},${TAG_ALL}],Marker:1b,Invisible:1b,NoBasePlate:1b}`,
      `scoreboard players set ${ARMORSTAND_SELECTOR({ tags: { [TAG_TEMP]: true }, single: true })} ${SCORE_FRAME} 0`,
      ...this.outliner.flatMap(outliner => outliner.exportSummons()),
      `scoreboard players operation ${ARMORSTAND_SELECTOR({ tags: { [TAG_TEMP]: true } })} ${SCORE_ID} = ${SCORE_ID_GLOBAL} ${SCORE_ID}`,
      `scoreboard players add ${SCORE_ID_GLOBAL} ${SCORE_ID} 1`,
      `tag ${ARMORSTAND_SELECTOR({ tags: { [TAG_TEMP]: true } })} remove ${TAG_TEMP}`,
      `schedule function ${mcPath(this.snooze.frames_folder.child('0_'))} 1`
    ]
    this.summon_function.write_text(summon_commands.join('\n'), true)
  }

  writeAwakeCommands(): void {
    const commands = [
      `scoreboard players operation _ ${SCORE_ID} = @s ${SCORE_ID}`,
      `scoreboard players operation @e[type=armor_stand,tag=${TAG_ALL}] ${SCORE_ID} -= _ ${SCORE_ID}`,
      `tag ${ARMORSTAND_SELECTOR({ tags: { [TAG_ALL]: true }, scores: { [SCORE_ID]: '0' } })} add ${TAG_ACTIVE}`,
      `tag ${ARMORSTAND_SELECTOR({ tags: { [TAG_ACTIVE]: true } })} add ${TAG_SLEEP}`,
      `tag ${ARMORSTAND_SELECTOR({ tags: { [TAG_ACTIVE]: true } })} remove ${TAG_GC}`,
      `tag ${ARMORSTAND_SELECTOR({ tags: { [TAG_ACTIVE]: true } })} remove ${TAG_ACTIVE}`,
      `scoreboard players operation ${ARMORSTAND_SELECTOR({ tags: { [TAG_ALL]: true } })} ${SCORE_ID} += _ ${SCORE_ID}`,
    ]
    this.sleep_function.write_text(commands.join('\n'), true)
  }

  writeSleepCommands(): void {
    const commands = [
      `scoreboard players operation _ ${SCORE_ID} = @s ${SCORE_ID}`,
      `scoreboard players operation @e[type=armor_stand,tag=${TAG_ALL}] ${SCORE_ID} -= _ ${SCORE_ID}`,
      `tag ${ARMORSTAND_SELECTOR({ tags: { [TAG_ALL]: true }, scores: { [SCORE_ID]: '0' } })} add ${TAG_ACTIVE}`,
      `tag ${ARMORSTAND_SELECTOR({ tags: { [TAG_ACTIVE]: true } })} remove ${TAG_SLEEP}`,
      `tag ${ARMORSTAND_SELECTOR({ tags: { [TAG_ACTIVE]: true } })} remove ${TAG_GC}`,
      `tag ${ARMORSTAND_SELECTOR({ tags: { [TAG_ACTIVE]: true } })} remove ${TAG_ACTIVE}`,
      `scoreboard players operation ${ARMORSTAND_SELECTOR({ tags: { [TAG_ALL]: true } })} ${SCORE_ID} += _ ${SCORE_ID}`,
    ]
    this.awake_function.write_text(commands.join('\n'), true)
  }

  writeSelectCommands(): void {
    const commands = this.animations.flatMap(animation => [
      `execute if score @s ${SCORE_NEXT} matches ${animation.id} run scoreboard players set @s ${SCORE_FRAME} ${animation.start_frame}`,
      `execute if score @s ${SCORE_NEXT} matches ${animation.id} run schedule function ${mcPath(animation.frames_folder.child('0_'))} 1`
    ])

    commands.push(`scoreboard players set @s ${SCORE_NEXT} 0`)
    this.select_function.write_text(commands.join('\n'), true)
  }
}

export class BioBlock_outliner {
  bioblockmodel: BioBlockModel;
  outliner: BBmodel_outliner;
  keyframes: BioBlock_keyframes;
  sub_outliner: BioBlock_outliner[];
  elements: BioBlock_element[];

  constructor(bioblockmodel: BioBlockModel, outliner: BBmodel_outliner, part_id: Counter, custom_model_data: Counter, texture_path:Path) {
    this.bioblockmodel = bioblockmodel
    this.outliner = outliner
    this.elements = combine_elements(outliner.elements,bioblockmodel.model.resolution,texture_path).map(([JavaModel, origin, rotation]) => new BioBlock_element(bioblockmodel, JavaModel, origin, rotation, part_id.next().toString(), custom_model_data.next()))
    this.sub_outliner = outliner.sub_outliner.map(child => new BioBlock_outliner(bioblockmodel, child, part_id, custom_model_data,texture_path))
    this.keyframes = new BioBlock_keyframes([], this.outliner.origin, this.outliner.rotation)
  }

  setAnimation(animation: BBmodel_animation) {
    this.sub_outliner.map(outliner => outliner.setAnimation(animation))
    const keyframes = (animation.animators.find(animator => animator.outliner.uuid === this.outliner.uuid) ?? new BBmodel_animator({name:'_',keyframes:[]},this.outliner)).keyframes
    this.keyframes = new BioBlock_keyframes(keyframes, this.outliner.origin, this.outliner.rotation)
  }

  exportSummons(): string[] {
    return [...this.elements.map(element => element.exportSummon()), ...this.sub_outliner.flatMap(outliner => outliner.exportSummons())]
  }

  writeModels(entitymodel_folder: Path): JavaItemOverride[] {
    return [
      ...this.elements.map(element => element.writeModel(entitymodel_folder)),
      ...this.sub_outliner.flatMap(outliner => outliner.writeModels(entitymodel_folder))
    ]
  }

  getRalativeOrigin(tick: number) {    
    const origin = this.keyframes.position.eval(tick / 20)
    return relativeOrigin([origin[0],origin[1],-origin[2]], this.keyframes.rotation.eval(tick / 20))
  }

  exportTpCommands(tick: number,matrix:matrix) {
    const origin_matrix = matrix_mul(matrix, this.getRalativeOrigin(tick))

    let result: string[] = []
    this.elements.forEach(element => {
      result.push(...element.exportTpCommand(origin_matrix))
    })
    this.sub_outliner.forEach(outline => {
      result.push(...outline.exportTpCommands(tick, origin_matrix))
    })
    return result
  }
}

export class BioBlock_keyframes {
  rotation: Curve3D;
  position: Curve3D;

  constructor(keyframes: BBmodel_keyframe[], origin: vec3, rotation: vec3) {
    this.rotation = new Curve3D(rotation)
    this.position = new Curve3D(origin)

    keyframes.forEach((keyframe) => {
      const inlinear = keyframe.interpolation == 'linear'
      if (keyframe.channel == 'position') {
        const pre_origin = vec3_add(origin, keyframe.data_points[0])
        const post_origin = keyframe.data_points[1] ? vec3_add(origin, keyframe.data_points[1]) : undefined
        this.position.addVector(keyframe.time, pre_origin, inlinear, post_origin)
      } else if (keyframe.channel == 'rotation') {
        const pre_rotation = vec3_add(rotation, keyframe.data_points[0])
        const post_rotation = keyframe.data_points[1] ? vec3_add(rotation, keyframe.data_points[1]) : undefined
        this.rotation.addVector(keyframe.time, pre_rotation, inlinear, post_rotation)
      }
    })
  }
}

export class BioBlock_element {
  
  exportTpCommand(origin_matrix: matrix): string[] {
    const matrix = matrix_mul(origin_matrix, constructMatrix([this.origin[0],this.origin[1],-this.origin[2]],this.rotation))
    const [position, rotation] = deconstructMatrix(matrix)
    const result = [
      `tp ${ARMORSTAND_SELECTOR({tags:{[TAG_ACTIVE]:true, [this.tag]:true},single:true})} ~${float_round(position[0] / 16, 5)} ~${float_round(position[1] / 16, 5) - 0.725} ~${float_round(-position[2] / 16, 5)} ~ ~`,
      `data modify entity ${ARMORSTAND_SELECTOR({tags:{[TAG_ACTIVE]:true, [this.tag]:true},single:true})} Pose.Head set value [${float_round(-rotation[0], 5)}f,${float_round(rotation[1], 5)}f,${float_round(-rotation[2], 5)}f]`
    ]
    return result
  }

  bioblockmodel: BioBlockModel;
  model: JavaModel;
  origin: vec3;
  rotation: vec3;
  custom_model_data: number;
  tag: string;
  part_id: string;
  constructor(bioblockmodel: BioBlockModel, model: JavaModel, origin: vec3, rotation: vec3, part_id: string, custom_model_data: number) {
    this.bioblockmodel = bioblockmodel
    this.part_id = part_id
    this.model = model
    this.origin = origin
    this.rotation = rotation
    this.custom_model_data = custom_model_data
    this.tag = TAG_ENTITYPART(this.bioblockmodel.model.name, this.part_id)
  }

  exportSummon(): string {
    return `summon armor_stand ~ ~ ~ {Tags:[${TAG_TEMP},${this.tag},${TAG_ALL}],Small:1b,Marker:1b,Invisible:1b,NoBasePlate:1b,ArmorItems:[{},{},{},{id:"${this.bioblockmodel.bioblock.model_item}",Count:1b,tag:{CustomModelData:${this.custom_model_data}}}]}`
  }

  writeModel(entitymodel_folder: Path): JavaItemOverride {
    const exportpath = entitymodel_folder.child(this.part_id + '.json')
    exportpath.write_text(JSON.stringify(this.model), true)
    return { predicate: { custom_model_data: this.custom_model_data }, model: mcPath(exportpath) }
  }
}

class BioBlock_animation {
  animation: BBmodel_animation;
  bioblockmodel: BioBlockModel;
  animation_folder: Path;
  api_function: Path;
  frames_folder: Path;
  start_frame: number | undefined;
  id: number;
  effect_animator: BioBlock_effect_animator;

  constructor(bioblockmodel: BioBlockModel, animation: BBmodel_animation, animation_id: number, animations_folder: Path) {
    this.bioblockmodel = bioblockmodel
    this.animation = animation
    this.effect_animator = new BioBlock_effect_animator(bioblockmodel,animation.effect_animator)

    this.api_function = this.bioblockmodel.api_folder.child(ANIMATION_FUNCTION(this.animation.name))
    this.animation_folder = animations_folder.child(this.animation.name)
    this.frames_folder = this.animation_folder.child('frames')

    this.id = animation_id
  }

  writeAllFrameFunctions(tickCounter: Counter, export_api: boolean = true): void {
    this.bioblockmodel.setAnimation(this.animation)

    const last_tick = Math.max(Math.round((this.animation.length - 0.025) * 20), 0)
    let first_tick: undefined | number = undefined

    for (let i = 0; i <= last_tick; i++) {
      const tick = tickCounter.next()
      first_tick = first_tick ?? tick
      this.start_frame = this.start_frame ?? tick
      this.writePreFrameFunction(i, tick)
      this.writeFrameFunction(i, tick, i === last_tick, first_tick)
    }

    this.writeMainFunction(first_tick as number)

    if (export_api) {
      this.writeApiFunction()
    }
  }

  writeMainFunction(first_tick: number): void {
    const main_function: string[] = [
      `scoreboard players set @s ${SCORE_FRAME} ${first_tick}`,
      `schedule function ${mcPath(this.frames_folder.child(`${first_tick}_.mcfunction`))} 1 replace`
    ]
    this.animation_folder.child('.mcfunction').write_text(main_function.join('\n'))
  }

  writeApiFunction(): void {
    const commands = [
      `execute unless entity ${ARMORSTAND_SELECTOR({ tags: { [this.bioblockmodel.tag]: true, [TAG_SLEEP]: false }, scores: {}, as_executer: true })} run tellraw @a {"color":"red","text":"Error from CommandEntity\\nfunction ${mcPath(this.api_function)} must be called as ${ARMORSTAND_SELECTOR({ tags: { [this.bioblockmodel.tag]: true, [TAG_SLEEP]: false }, as_executer: true })}"}`,
      `execute if entity ${ARMORSTAND_SELECTOR({ tags: { [this.bioblockmodel.tag]: true, [TAG_SLEEP]: false }, scores: {}, as_executer: true })} run scoreboard players set @s ${SCORE_NEXT} ${this.id}`
    ]
    this.api_function.write_text(
      commands.join('\n'),
      true
    )
  }

  writePreFrameFunction(tick: number, total_tick: number): void {
    this.frames_folder.child(tick.toString() + '_.mcfunction').write_text(
      `execute as ${ARMORSTAND_SELECTOR({ tags: { [this.bioblockmodel.tag]: true, [TAG_GC]: true }, scores: { [SCORE_FRAME]: total_tick.toString() } })} at @s run function ${mcPath(this.frames_folder.child(tick.toString() + '.mcfunction'))}`,
      true)
  }

  writeFrameFunction(tick: number, total_tick: number, isLast: boolean, first_frame: number): void {
    const commands: string[] = [
      `scoreboard players operation _ ${SCORE_ID} = @s ${SCORE_ID}`,
      `scoreboard players operation ${ARMORSTAND_SELECTOR({ tags: { [TAG_ALL]: true } })} ${SCORE_ID} -= _ ${SCORE_ID}`,
      `tag ${ARMORSTAND_SELECTOR({ tags: { [TAG_ALL]: true }, scores: { [SCORE_ID]: '0' } })} add ${TAG_ACTIVE}`,
      `tag ${ARMORSTAND_SELECTOR({ tags: { [TAG_ACTIVE]: true } })} remove ${TAG_GC}`,
      '',
      ...this.bioblockmodel.outliner.flatMap(outliner => outliner.exportTpCommands(tick, UNIT_MATRIX)),
      ...this.effect_animator.exportCommands(tick),
      '',
      `tag ${ARMORSTAND_SELECTOR({ tags: { [TAG_ACTIVE]: true } })} remove ${TAG_ACTIVE}`,
      `scoreboard players operation ${ARMORSTAND_SELECTOR({ tags: { [TAG_ALL]: true } })} ${SCORE_ID} += _ ${SCORE_ID}`,
      ...(isLast
        ? [
          ...{
            // 1tick後に__snooze__状態になる
            once: [
              `execute unless score @s ${SCORE_NEXT} matches 1..${this.bioblockmodel.animations.length} run scoreboard players set @s ${SCORE_FRAME} 0`,
              `execute unless score @s ${SCORE_NEXT} matches 1..${this.bioblockmodel.animations.length} run schedule function ${mcPath(this.bioblockmodel.snooze.frames_folder.child('0_.mcfunction'))} 1`
            ],
            // 1tick後にこのファンクションを呼び出す
            hold: [`execute unless score @s ${SCORE_NEXT} matches 1..${this.bioblockmodel.animations.length} run schedule function ${mcPath(this.frames_folder.child(tick.toString() + '_.mcfunction'))} 1`],
            // 1tick後にこのアニメーションの最初に戻る
            loop: [
              `execute unless score @s ${SCORE_NEXT} matches 1..${this.bioblockmodel.animations.length} run scoreboard players set @s ${SCORE_FRAME} ${first_frame}`,
              `execute unless score @s ${SCORE_NEXT} matches 1..${this.bioblockmodel.animations.length} run schedule function ${mcPath(this.frames_folder.child('0_.mcfunction'))}`
            ],
          }[this.animation.loop],
          `function ${mcPath(this.bioblockmodel.select_function)}`
        ]
        : [
          `scoreboard players set @s ${SCORE_FRAME} ${total_tick + 1}`,
          `schedule function ${mcPath(this.frames_folder.child((tick + 1).toString() + '_.mcfunction'))} 1t`
        ])
    ]
    this.frames_folder.child(tick.toString() + '.mcfunction').write_text(commands.join('\n'), true)
  }
}

class BioBlock_effect_animator{
  timeline: Timeline;
  exportCommands(tick: number):string[] {
    return this.timeline.eval(tick)
  }
  bioblockmodel: BioBlockModel;
  constructor(bioblockmodel:BioBlockModel, animator:BBmodel_effect_animator){
    this.bioblockmodel = bioblockmodel
    this.timeline = new Timeline()

    animator.keyframes.forEach(keyframe => {
      if (isBBmodel_timeline_keyframe(keyframe)){
        this.timeline.addScript(keyframe.time,keyframe.data_points[0])
      }
    })
  }
}