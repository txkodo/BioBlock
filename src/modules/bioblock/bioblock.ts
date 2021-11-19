import { Curve3D } from "../curve/curve3d";
import { ScriptOptions, Timeline } from "../curve/effects";
import { BBmodel, BBmodel_animation, BBmodel_animator, BBmodel_effect_animator, BBmodel_keyframe, BBmodel_outliner, isBBmodel_sound_keyframe, isBBmodel_timeline_keyframe } from "../model/types/bbmodel";
import { JavaItemOverride, JavaModel } from "../model/types/java_model";
import { base64mimeToBlob } from "../util/base64blob";
import { Counter } from "../util/counter";
import { Datapack, Function, FunctionFolder, mcPath, Tag } from "../util/datapack";
import { Path } from "../util/folder";
import { float_round } from "../util/number";
import { constructMatrix, deconstructMatrix, getRotation, getTranspose, invertZ, matrix, matrix_mul, relativeOrigin, UNIT_MATRIX, vec3, vec3_add } from "../util/vector";
import { combine_elements } from "./bbelem_to_java";
import { sound_json } from "../model/types/resourcepack";
import { bbmodel_json } from "../model/types/bbmodel_json";
import { ENTITY_SELECTOR, ENTITY_TYPES, NAMESPACE, SCOREHOLDER_x, SCOREHOLDER_y, SCORE_FRAME, SCORE_ID, SCORE_ID_GLOBAL, SCORE_NEXT, SCORE_TEMP, SOUND_FILE, STORAGE_CORE, TAG_ACTIVE, TAG_ALL, TAG_ENTITY, TAG_ENTITYHITBOX, TAG_ENTITYPART, TAG_GC, TAG_HITBOX, TAG_SLEEP, TAG_TEMP } from './consts';

const extractFileName = (path: string): string => {
  const file = path.split(/[\/\\]/)
  return file[file.length - 1]
}

export const extractSoundFileNames = (models: bbmodel_json[]): Set<string> => {
  const files: Set<string> = new Set<string>()
  models.forEach(model => {
    model.animations.forEach(anim => {
      if (anim.animators.effects) {

        anim.animators.effects.keyframes.forEach(keyframe => {
          if (keyframe.channel === "sound") {
            files.add(extractFileName(keyframe.data_points[0].file))
          }
        })
      }
    })
  })
  return files
}

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
  sounds_folder: Path;
  sounds: {
    [key: string]:
    {
      id: number
      file: File
    }
  }
  models: BioBlockModel[];
  datapack: Datapack
  resourcepack: Path
  item: modelItem;
  tick_function: Function;
  api_folder: FunctionFolder;
  core_folder: FunctionFolder;
  sounds_json: Path;
  function_folder: FunctionFolder;
  tick_tag: Tag;
  entity_tag: Tag;
  constructor(models: BBmodel[], modelItem: modelItem, sounds: { [key: string]: File }) {
    this.item = modelItem
    this.datapack = new Datapack()
    const datapackNamespace = this.datapack.namespace(NAMESPACE)
    this.function_folder = datapackNamespace.functionFolder
    this.core_folder = datapackNamespace.functionFolder.child('core')
    this.api_folder = datapackNamespace.functionFolder.child('api')

    this.resourcepack = new Path()

    this.sounds_folder = this.resourcepack.child('assets', NAMESPACE, 'sounds')
    this.sounds_json = this.resourcepack.child('assets', NAMESPACE, 'sounds.json')

    this.sounds = {}
    const sound_id = new Counter()
    Object.keys(sounds).forEach(sound => {
      this.sounds[sound] = {
        id: sound_id.next(),
        file: sounds[sound]
      }
    })
    this.writeSoundFiles()

    const customModelData = new Counter(modelItem.start)
    this.models = models.map(model => new BioBlockModel(this, model, this.api_folder, this.core_folder, this.models_folder, this.textures_folder, customModelData))
    this.tick_function = this.core_folder.function('tick')
    this.tick_tag = this.datapack.namespace('minecraft').tagsFolder.functions.tag('tick')
    this.entity_tag = datapackNamespace.tagsFolder.entity_types.child('core').tag('main')
  }

  get needSoundFiles(): boolean {
    return Object.keys(this.sounds).length >= 1
  }

  get models_folder() {
    return this.resourcepack.child('assets', NAMESPACE, 'models')
  }

  get textures_folder() {
    return this.resourcepack.child('assets', NAMESPACE, 'textures')
  }

  export(): [Datapack, Path] {
    const model_overrides = this.models.flatMap(model => model.export())

    this.write_init_function()
    this.wirte_tick_function()
    this.wirte_tick_tag()
    this.wirte_entity_tag()

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
    // TODO:mcmetaの対応
    this.datapack.path.child('pack.mcmeta').write_json(content, true)
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
      `scoreboard objectives add ${SCORE_TEMP} dummy`,
      `scoreboard players set ${SCORE_ID_GLOBAL} ${SCORE_ID} 0`,
      `data modify storage ${STORAGE_CORE} ids set value [I;]`,
    ]
    this.function_folder.function('init').addCommands(initfunc)
  }

  wirte_tick_function() {
    const tickfunc = [
      `execute if entity ${ENTITY_SELECTOR({ type: ENTITY_TYPES, tags: { [TAG_GC]: true } })} run tp ${ENTITY_SELECTOR({ type: ENTITY_TYPES, tags: { [TAG_GC]: true } })} ~ ~-1000 ~`,
      `execute if entity ${ENTITY_SELECTOR({ type: ENTITY_TYPES, tags: { [TAG_GC]: true } })} run kill ${ENTITY_SELECTOR({ type: ENTITY_TYPES, tags: { [TAG_GC]: true } })}`,
      `tag ${ENTITY_SELECTOR({ type: ENTITY_TYPES, tags: { [TAG_ALL]: true, [TAG_SLEEP]: false } })} add ${TAG_GC}`
    ]
    this.tick_function.addCommands(tickfunc)
  }

  wirte_entity_tag() {
    this.entity_tag.addValue('armor_stand', 'slime')
  }

  wirte_tick_tag() {
    this.tick_tag.addValue(this.tick_function.mcPath)
  }

  write_itemmodel(model_overrides: JavaItemOverride[]) {
    const item_model = {
      parent: "item/generated",
      textures: {
        layer0: `${this.item.namespace}:items/${this.item.name}`
      },
      overrides: model_overrides
    }
    this.resourcepack.child('assets', this.item.namespace, 'models', 'item', this.item.name + '.json').write_text(JSON.stringify(item_model), true)
  }

  // requireSound(file: string): number {
  //   const splitted = file.split(/[/\\]/)
  //   const name = splitted[splitted.length - 1]

  //   if (this.sounds[name] === undefined) {
  //     this.sounds[name] = Object.keys(this.sounds).length
  //   }
  //   return this.sounds[name]
  // }

  // getSoundList(): string[] {
  //   return Object.keys(this.sounds)
  // }

  writeSoundFiles(): void {
    const json: sound_json = {}
    Object.keys(this.sounds).forEach(key => {
      const sound_id = this.sounds[key].id.toString()
      this.sounds_folder.child(sound_id + '.ogg').write_bytes(this.sounds[key].file, true)
      json[sound_id] = {
        "replace": true,
        "sounds": [
          {
            "name": mcPath(this.sounds_folder.child(sound_id)),
            "volume": 1
          }
        ]
      }
    })
    this.sounds_json.write_json(json, true)
  }
}

export class BioBlockModel {
  model: BBmodel;
  outliner: BioBlock_outliner[];
  bioblock: BioBlock;
  core_folder: FunctionFolder;
  api_folder: FunctionFolder;
  models_folder: Path;
  textures_folder: Path;
  select_function: Function;
  sleep_function: Function;
  awake_function: Function;
  summon_function: Function;
  animations: BioBlock_animation[];
  tag: string;
  snooze: BioBlock_animation;
  sleep_api_function: Function;
  awake_api_function: Function;
  summon_api_function: Function;
  kill_function: Function;
  kill_api_function: Function;
  snooze_api_function: Function;
  hitbox_folder: FunctionFolder;
  die_function: Function;
  die_api_function: Function;

  constructor(bioblock: BioBlock, model: BBmodel, api: FunctionFolder, core: FunctionFolder, models: Path, textures: Path, customModelDataCounter: Counter) {
    this.bioblock = bioblock
    this.model = model

    this.api_folder = api.child(this.model.name)
    this.core_folder = core.child(this.model.name)

    this.hitbox_folder = this.core_folder.child('hitboxes')

    this.models_folder = models.child(this.model.name)
    this.textures_folder = textures.child(this.model.name)

    this.tag = TAG_ENTITY(model.name)

    this.select_function = this.core_folder.function('__select__')

    this.sleep_function = this.core_folder.function('__sleep__')
    this.sleep_api_function = this.api_folder.function('sleep')

    this.awake_function = this.core_folder.function('__awake__')
    this.awake_api_function = this.api_folder.function('awake')

    this.summon_function = this.core_folder.function('__summon__')
    this.summon_api_function = this.api_folder.function('summon')

    this.kill_function = this.core_folder.function('__kill__')
    this.kill_api_function = this.api_folder.function('kill')

    this.die_function = this.core_folder.function('__die__')
    this.die_api_function = this.api_folder.function('die')

    this.snooze_api_function = this.api_folder.function('snooze')

    this.writeTextures()

    const part_id = new Counter()
    const animation_id = new Counter(0)
    const snooze_animation: BBmodel_animation = new BBmodel_animation({
      name: '__snooze__',
      loop: 'hold',
      length: 0.04,
      animators: {}
    }, model.outliner)
    this.snooze = new BioBlock_animation(this, snooze_animation, animation_id.next(), this.core_folder, false)
    this.outliner = model.outliner.map(outliner => new BioBlock_outliner(this, outliner, part_id, customModelDataCounter, this.textures_folder))
    this.animations = model.animations.map(animation => new BioBlock_animation(this, animation, animation_id.next(), this.core_folder.child('animations')))

  }

  writeTextures() {
    this.model.textures.map(texture => {
      this.textures_folder.child(`${texture.id}.png`).write_bytes(base64mimeToBlob(texture.source), true)
    })
  }

  setAnimation(animation: BBmodel_animation) {
    this.outliner.map(outliner => outliner.setAnimation(animation))
  }

  export(): JavaItemOverride[] {
    //// Datapack
    this.outliner.forEach(outline => outline.exportHitboxFunction(this.hitbox_folder))
    // summon
    this.writeSummonCommands()
    // kill
    this.writeKillCommands()
    // die
    this.writeDieCommands()
    // awake
    this.writeAwakeCommands()
    // sleep
    this.writeSleepCommands()

    const tickCounter = new Counter()
    // snooze
    this.snooze.writeAllFrameFunctions(tickCounter)
    this.writeSnoozeCommands()

    // // animate
    this.animations.map(animation => animation.writeAllFrameFunctions(tickCounter))

    // select
    this.writeSelectCommands()

    // Resourcepack
    const model_overrides: JavaItemOverride[] = this.outliner.flatMap(outliner => outliner.writeModels(this.models_folder))

    return model_overrides
  }

  writeSummonCommands(): void {
    // const summon_commands = [
    //   `summon armor_stand ~ ~ ~ {Tags:[${TAG_TEMP},${this.tag},${TAG_ALL}],Marker:1b,Invisible:1b,NoBasePlate:1b}`,
    //   `scoreboard players set ${ENTITY_SELECTOR({ type:'armor_stand', tags: { [TAG_TEMP]: true }, single: true })} ${SCORE_FRAME} 0`,
    //   ...this.outliner.flatMap(outliner => outliner.exportSummons()),
    //   `scoreboard players operation ${ENTITY_SELECTOR({ type:'armor_stand', tags: { [TAG_TEMP]: true } })} ${SCORE_ID} = ${SCORE_ID_GLOBAL} ${SCORE_ID}`,
    //   `scoreboard players add ${SCORE_ID_GLOBAL} ${SCORE_ID} 1`,
    //   `tag ${ENTITY_SELECTOR({ type:'armor_stand', tags: { [TAG_TEMP]: true } })} remove ${TAG_TEMP}`,
    //   `schedule function ${mcPath(this.snooze.frames_folder.child('0_'))} 1t replace`
    // ]
    this.summon_function.addCommands([
      `tag @s add ${this.tag}`,
      `tag @s add ${TAG_ALL}`,
      `scoreboard players set @s ${SCORE_FRAME} 0`
    ])

    this.outliner.forEach(outliner => outliner.exportSummons(this.summon_function))

    this.summon_function.addCommands([
      `scoreboard players operation @s ${SCORE_ID} = ${SCORE_ID_GLOBAL} ${SCORE_ID}`,
      `scoreboard players operation ${ENTITY_SELECTOR({ type: ENTITY_TYPES, tags: { [TAG_TEMP]: true } })} ${SCORE_ID} = ${SCORE_ID_GLOBAL} ${SCORE_ID}`,
      `scoreboard players add ${SCORE_ID_GLOBAL} ${SCORE_ID} 1`,
      `tag ${ENTITY_SELECTOR({ type: ENTITY_TYPES, tags: { [TAG_TEMP]: true } })} remove ${TAG_TEMP}`,
      `schedule function ${this.snooze.preFrameFunction(0).mcPath} 1t replace`
    ])

    const api_commands = [
      `execute if entity ${ENTITY_SELECTOR({ tags: { [TAG_ALL]: true }, as_executer: true })} run tellraw @a {"color":"red","text":"Error from CommandEntity\\nfunction ${this.sleep_api_function.mcPath} must NOT be called as ${ENTITY_SELECTOR({ tags: { [TAG_ALL]: true }, as_executer: true })}"}`,
      `execute unless entity ${ENTITY_SELECTOR({ tags: { [TAG_ALL]: true }, as_executer: true })} at @s run function ${this.summon_function.mcPath}`
    ]
    this.summon_api_function.addCommands(api_commands)
  }

  writeKillCommands(): void {
    const commands = [
      `tag @s remove ${TAG_SLEEP}`,
      `tag @s remove ${TAG_ALL}`,
      `tag @s remove ${this.tag}`,
      `scoreboard players operation _ ${SCORE_ID} = @s ${SCORE_ID}`,
      `scoreboard players operation ${ENTITY_SELECTOR({ type: ENTITY_TYPES, tags: { [TAG_ALL]: true } })} ${SCORE_ID} -= _ ${SCORE_ID}`,
      `tp ${ENTITY_SELECTOR({ type: ENTITY_TYPES, tags: { [TAG_ALL]: true }, scores: { [SCORE_ID]: '0' } })} ~ -1000 ~`,
      `kill ${ENTITY_SELECTOR({ type: ENTITY_TYPES, tags: { [TAG_ALL]: true }, scores: { [SCORE_ID]: '0' } })}`,
      `scoreboard players operation ${ENTITY_SELECTOR({ type: ENTITY_TYPES, tags: { [TAG_ALL]: true } })} ${SCORE_ID} += _ ${SCORE_ID}`,
      `scoreboard players reset @s ${SCORE_ID}`
    ]
    this.kill_function.addCommands(commands)
    const api_commands = [
      `execute unless entity ${ENTITY_SELECTOR({ tags: { [this.tag]: true }, as_executer: true })} run tellraw @a {"color":"red","text":"Error from CommandEntity\\nfunction ${this.sleep_api_function.mcPath} must be called as ${ENTITY_SELECTOR({ tags: { [this.tag]: true }, as_executer: true })}"}`,
      `execute if entity ${ENTITY_SELECTOR({ tags: { [this.tag]: true }, as_executer: true })} run function ${this.kill_function.mcPath}`
    ]
    this.kill_api_function.addCommands(api_commands)
  }

  writeDieCommands(): void {
    const commands = [
      `tag @s remove ${TAG_SLEEP}`,
      `tag @s remove ${TAG_ALL}`,
      `tag @s remove ${this.tag}`,
      `scoreboard players operation _ ${SCORE_ID} = @s ${SCORE_ID}`,
      `scoreboard players operation ${ENTITY_SELECTOR({ type: ENTITY_TYPES, tags: { [TAG_ALL]: true } })} ${SCORE_ID} -= _ ${SCORE_ID}`,
      `execute at ${ENTITY_SELECTOR({ type: ENTITY_TYPES, tags: { [TAG_ALL]: true }, scores: { [SCORE_ID]: '0' } })} run particle minecraft:cloud ~-0.3 ~-0.3 ~-0.3 0.6 0.6 0.6 0.01 10`,
      `tp ${ENTITY_SELECTOR({ type: ENTITY_TYPES, tags: { [TAG_ALL]: true }, scores: { [SCORE_ID]: '0' } })} ~ -1000 ~`,
      `kill ${ENTITY_SELECTOR({ type: ENTITY_TYPES, tags: { [TAG_ALL]: true }, scores: { [SCORE_ID]: '0' } })}`,
      `scoreboard players operation ${ENTITY_SELECTOR({ type: ENTITY_TYPES, tags: { [TAG_ALL]: true } })} ${SCORE_ID} += _ ${SCORE_ID}`,
      `scoreboard players reset @s ${SCORE_ID}`
    ]
    this.die_function.addCommands(commands)
    const api_commands = [
      `execute unless entity ${ENTITY_SELECTOR({ tags: { [this.tag]: true }, as_executer: true })} run tellraw @a {"color":"red","text":"Error from CommandEntity\\nfunction ${this.sleep_api_function.mcPath} must be called as ${ENTITY_SELECTOR({ tags: { [this.tag]: true }, as_executer: true })}"}`,
      `execute if entity ${ENTITY_SELECTOR({ tags: { [this.tag]: true }, as_executer: true })} run function ${this.die_function.mcPath}`
    ]
    this.die_api_function.addCommands(api_commands)
  }

  writeSnoozeCommands(): void {
    const commands = [
      `execute unless entity ${ENTITY_SELECTOR({ tags: { [this.tag]: true, [TAG_SLEEP]: false }, scores: {}, as_executer: true })} run tellraw @a {"color":"red","text":"Error from CommandEntity\\nfunction ${this.snooze_api_function.mcPath} must be called as ${ENTITY_SELECTOR({ tags: { [this.tag]: true, [TAG_SLEEP]: false }, as_executer: true })}"}`,
      `execute if entity ${ENTITY_SELECTOR({ tags: { [this.tag]: true, [TAG_SLEEP]: false }, scores: {}, as_executer: true })} run function ${this.snooze.main_function.mcPath}`
    ]
    this.snooze_api_function.addCommands(commands)
  }

  writeSleepCommands(): void {
    const commands = [
      `tag @s add ${TAG_SLEEP}`,
      `scoreboard players operation _ ${SCORE_ID} = @s ${SCORE_ID}`,
      `scoreboard players operation ${ENTITY_SELECTOR({ type: ENTITY_TYPES, tags: { [TAG_ALL]: true } })} ${SCORE_ID} -= _ ${SCORE_ID}`,
      `tag ${ENTITY_SELECTOR({ type: ENTITY_TYPES, tags: { [TAG_ALL]: true }, scores: { [SCORE_ID]: '0' } })} add ${TAG_ACTIVE}`,
      `tag ${ENTITY_SELECTOR({ type: ENTITY_TYPES, tags: { [TAG_ACTIVE]: true } })} add ${TAG_SLEEP}`,
      `tag ${ENTITY_SELECTOR({ type: ENTITY_TYPES, tags: { [TAG_ACTIVE]: true } })} remove ${TAG_GC}`,
      `tag ${ENTITY_SELECTOR({ type: ENTITY_TYPES, tags: { [TAG_ACTIVE]: true } })} remove ${TAG_ACTIVE}`,
      `scoreboard players operation ${ENTITY_SELECTOR({ type: ENTITY_TYPES, tags: { [TAG_ALL]: true } })} ${SCORE_ID} += _ ${SCORE_ID}`,
    ]
    this.sleep_function.addCommands(commands)
    const api_commands = [
      `execute unless entity ${ENTITY_SELECTOR({ tags: { [this.tag]: true, [TAG_SLEEP]: false }, scores: {}, as_executer: true })} run tellraw @a {"color":"red","text":"Error from CommandEntity\\nfunction ${this.sleep_api_function.mcPath} must be called as ${ENTITY_SELECTOR({ tags: { [this.tag]: true, [TAG_SLEEP]: false }, as_executer: true })}"}`,
      `execute if entity ${ENTITY_SELECTOR({ tags: { [this.tag]: true, [TAG_SLEEP]: false }, scores: {}, as_executer: true })} run function ${this.sleep_function.mcPath}`
    ]
    this.sleep_api_function.addCommands(api_commands)
  }

  writeAwakeCommands(): void {
    const commands = [
      `tag @s remove ${TAG_SLEEP}`,
      `scoreboard players operation ${ENTITY_SELECTOR({ type: ENTITY_TYPES, tags: { [TAG_ALL]: true } })} ${SCORE_ID} -= @s ${SCORE_ID}`,
      `tag ${ENTITY_SELECTOR({ type: ENTITY_TYPES, tags: { [TAG_ALL]: true }, scores: { [SCORE_ID]: '0' } })} add ${TAG_ACTIVE}`,
      `tag ${ENTITY_SELECTOR({ type: ENTITY_TYPES, tags: { [TAG_ACTIVE]: true } })} remove ${TAG_SLEEP}`,
      `tag ${ENTITY_SELECTOR({ type: ENTITY_TYPES, tags: { [TAG_ACTIVE]: true } })} remove ${TAG_GC}`,
      `tag ${ENTITY_SELECTOR({ type: ENTITY_TYPES, tags: { [TAG_ACTIVE]: true } })} remove ${TAG_ACTIVE}`,
      `scoreboard players operation ${ENTITY_SELECTOR({ type: ENTITY_TYPES, tags: { [TAG_ALL]: true } })} ${SCORE_ID} += @s ${SCORE_ID}`,
      `function ${this.snooze.preFrameFunction(0).mcPath}`
    ]
    this.awake_function.addCommands(commands)

    const api_commands = [
      `execute unless entity ${ENTITY_SELECTOR({ tags: { [this.tag]: true, [TAG_SLEEP]: true }, scores: {}, as_executer: true })} run tellraw @a {"color":"red","text":"Error from CommandEntity\\nfunction ${this.awake_api_function.mcPath} must be called as ${ENTITY_SELECTOR({ tags: { [this.tag]: true, [TAG_SLEEP]: true }, as_executer: true })}"}`,
      `execute if entity ${ENTITY_SELECTOR({ tags: { [this.tag]: true, [TAG_SLEEP]: true }, scores: {}, as_executer: true })} run function ${this.awake_function.mcPath}`
    ]
    this.awake_api_function.addCommands(api_commands)
  }

  writeSelectCommands(): void {
    const commands = this.animations.flatMap(animation => [
      `execute if score @s ${SCORE_NEXT} matches ${animation.id} run scoreboard players set @s ${SCORE_FRAME} ${animation.start_frame}`,
      `execute if score @s ${SCORE_NEXT} matches ${animation.id} run schedule function ${animation.preFrameFunction(0).mcPath} 1`
    ])
    commands.push(`scoreboard players set @s ${SCORE_NEXT} 0`)
    this.select_function.addCommands(commands)
  }
}

export class BioBlock_outliner {
  bioblockmodel: BioBlockModel;
  outliner: BBmodel_outliner;
  keyframes: BioBlock_keyframes;
  sub_outliner: BioBlock_outliner[];
  elements?: BioBlock_element[];
  matrix: matrix;
  hitbox_size: number | undefined = undefined;
  tag: string;
  name: string;
  hitbox_function: Function | undefined = undefined;
  hitbox_pre_function: Function | undefined = undefined;

  constructor(bioblockmodel: BioBlockModel, outliner: BBmodel_outliner, part_id: Counter, custom_model_data: Counter, texture_path: Path) {
    this.bioblockmodel = bioblockmodel
    this.outliner = outliner

    this.name = outliner.name

    // hitboxかどうか
    const match = outliner.name.match(/^(.*)_hitbox([1-9][0-9]*)$/)
    if (match) {
      this.name = match[1]
      this.hitbox_size = parseInt(match[2])
    }
    console.log(outliner.name);
    console.log(this.hitbox_size);


    this.tag = TAG_ENTITYHITBOX(bioblockmodel.model.name, this.name)

    if (outliner.elements) {
      this.elements = combine_elements(outliner.elements, bioblockmodel.model.resolution, texture_path).map(([JavaModel, origin, rotation]) => new BioBlock_element(bioblockmodel, JavaModel, origin, rotation, part_id.next().toString(), custom_model_data.next()))
    }
    this.sub_outliner = outliner.sub_outliner.map(child => new BioBlock_outliner(bioblockmodel, child, part_id, custom_model_data, texture_path))
    this.keyframes = new BioBlock_keyframes([], this.outliner.origin, this.outliner.rotation)
    this.matrix = constructMatrix(invertZ(this.outliner.origin), this.outliner.rotation)
  }

  findOutliner(name: string): BioBlock_outliner[] {
    let result: BioBlock_outliner[] = []
    if (this.outliner.name === name) {
      result.push(this)
    }
    this.sub_outliner.forEach(sub => { result = result.concat(sub.findOutliner(name)) })
    return result
  }

  resetRotationCache() {
    this.elements?.forEach(element => {
      element.resetRotationCache()
    })
    this.sub_outliner.forEach(outline => {
      outline.resetRotationCache()
    })
  }

  setAnimation(animation: BBmodel_animation) {
    this.sub_outliner.map(outliner => outliner.setAnimation(animation))
    const keyframes = (animation.animators.find(animator => animator.outliner.uuid === this.outliner.uuid) ?? new BBmodel_animator({ name: '_', keyframes: [] }, this.outliner)).keyframes
    this.keyframes = new BioBlock_keyframes(keyframes, this.outliner.origin, this.outliner.rotation)
  }

  exportSummons(func: Function): void {
    if (this.hitbox_size !== undefined) {
      func.addCommand(
        `summon minecraft:slime ~ ~ ~ { Size: ${this.hitbox_size},Tags:[${TAG_TEMP},${TAG_HITBOX},${this.tag},${TAG_ALL}] , Attributes: [{Base: 1024.0d, Name: "minecraft:generic.max_health"}], Invulnerable: 0b, PersistenceRequired: 1b, Health: 1024.0f, Silent: 1b,OnGround: 0b, NoAI: 1b,ActiveEffects: [{Ambient: 0b, ShowIcon: 0b, ShowParticles: 0b, Duration: 2147483647, Id: 14b, Amplifier: 1b}]}`
      )
      
    }
    this.elements?.forEach(element => element.exportSummon(func))
    this.sub_outliner.forEach(outliner => outliner.exportSummons(func))
  }

  writeModels(entitymodel_folder: Path): JavaItemOverride[] {
    return [
      ...this.elements?.map(element => element.writeModel(entitymodel_folder)) ?? [],
      ...this.sub_outliner.flatMap(outliner => outliner.writeModels(entitymodel_folder))
    ]
  }

  getMatrix(tick: number) {
    const origin = this.keyframes.position.eval(tick / 20)
    return constructMatrix(invertZ(origin), this.keyframes.rotation.eval(tick / 20))
  }

  getRalativeOrigin(tick: number) {
    const origin = this.keyframes.position.eval(tick / 20)
    return relativeOrigin(invertZ(origin), this.keyframes.rotation.eval(tick / 20), invertZ(this.outliner.origin))
  }

  exportHitboxFunction(folder: FunctionFolder) {
    this.sub_outliner.forEach(outliner => outliner.exportHitboxFunction(folder))

    if (this.hitbox_size === undefined) return

    const func = folder.function(this.name)
    const multiply = 1024
    const maxhealth = 1024
    func.addCommands(
      [
        `# ヒットボックスがダメージを受けた状態で呼ばれる`,
        `# 減少後のHealthの値 (もとは1024f)`,
        `# storage ${STORAGE_CORE} Health ::float`,
        `# 実行者はヒットボックスではなくapi/summonの実行者`,
        `# デフォルトでは実行者のHealthを同量減らす`,

        `execute store result score ${SCOREHOLDER_x} ${SCORE_TEMP} run data get storage ${STORAGE_CORE} Health ${multiply}`,
        `execute store result score ${SCOREHOLDER_y} ${SCORE_TEMP} run data get entity @s Health ${multiply}`,
        `scoreboard players operation ${SCOREHOLDER_x} ${SCORE_TEMP} += ${SCOREHOLDER_y} ${SCORE_TEMP}`,
        `scoreboard players remove ${SCOREHOLDER_x} ${SCORE_TEMP} ${maxhealth * multiply}`,
        `execute if score ${SCOREHOLDER_x} ${SCORE_TEMP} matches ..0 run function ${this.bioblockmodel.die_function.mcPath}`,
        `execute store result entity @s Health float ${1 / multiply} run scoreboard players get ${SCOREHOLDER_x} ${SCORE_TEMP}`
      ]
    )
    const pre_func = folder.function(this.name + '_')
    console.log(func.mcPath);

    pre_func.addCommands([
      `# 編集禁止`,
      `tp @s ~ ~ ~`,
      `data modify storage ${STORAGE_CORE} Health set from entity @s Health`,
      `execute unless data storage ${STORAGE_CORE} {Health:1024f} run data modify entity @s Health set value 1024f`,
    ])

    this.hitbox_pre_function = pre_func
    this.hitbox_function = func
  }

  exportTpCommands(tick: number, matrix: matrix, include_tp: boolean, func: Function): void {
    this.matrix = matrix_mul(matrix, this.getMatrix(tick))
    const origin_matrix = matrix_mul(matrix, this.getRalativeOrigin(tick))
    let result: string[] = []

    if (include_tp && this.hitbox_size !== undefined) {
      const [x, y, z] = getTranspose(this.matrix)
      func.addCommand(
        `execute as ${ENTITY_SELECTOR({ distance: '..32', type: 'slime', tags: { [TAG_ACTIVE]: true, [this.tag]: true }, single: true })} ` +
        `positioned ^${float_round(x / 16, 5)} ^${float_round(y / 16, 5) - (this.hitbox_size + 1) * 0.25} ^${-float_round(z / 16, 5)} ` +
        `run function ${this.hitbox_pre_function?.mcPath}`
      )
      func.addCommand(
        `execute unless data storage ${STORAGE_CORE} {Health:1024f} run function ${this.hitbox_function?.mcPath}`
      )
    }

    this.elements?.forEach(element => {
      element.exportTpCommand(origin_matrix, include_tp, func)
    })
    this.sub_outliner.forEach(outline => {
      outline.exportTpCommands(tick, origin_matrix, include_tp, func)
    })
  }
}

export class BioBlock_keyframes {
  rotation: Curve3D;
  position: Curve3D;

  constructor(keyframes: BBmodel_keyframe[], origin: vec3, rotation: vec3) {
    this.rotation = new Curve3D(rotation)
    this.position = new Curve3D(origin)

    keyframes.sort((a, b) => a.time - b.time).forEach((keyframe) => {
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

  exportTpCommand(origin_matrix: matrix, include_tp: boolean, func: Function): void {
    const matrix = matrix_mul(origin_matrix, constructMatrix([this.origin[0], this.origin[1], -this.origin[2]], this.rotation))
    const [position, rotation] = deconstructMatrix(matrix_mul(
      [
        -1, 0, 0, 0,
        0, 1, 0, 0,
        0, 0, -1, 0,
      ],
      matrix))
    const tolerance = 1
    const same = this.last_rotation?.map((rot, i) => (rot - rotation[i]) ** 2 < tolerance)?.reduce((x, y) => x && y, true) ?? false
    if (!same) {
      this.last_rotation = rotation
    }

    const y_offset = -0.6
    if (include_tp && !same) {
      func.addCommands(
        [
          `tp @s ^${float_round(position[0] / 16, 5)} ^${float_round(position[1] / 16, 5) + y_offset} ^${float_round(-position[2] / 16, 5)} ~ ~`,
          `data modify entity @s Pose.Head set value [${float_round(-rotation[0], 5)}f,${float_round(rotation[1], 5)}f,${float_round(-rotation[2], 5)}f]`
        ],
        [`as ${ENTITY_SELECTOR({ distance: '..32', type: 'armor_stand', tags: { [TAG_ACTIVE]: true, [this.tag]: true }, single: true })}`],
        this.part_id
      )
      return
    }
    func.addCommands([
      ...include_tp ? [`tp ${ENTITY_SELECTOR({ distance: '..32', type: 'armor_stand', tags: { [TAG_ACTIVE]: true, [this.tag]: true }, single: true })} ^${float_round(position[0] / 16, 5)} ^${float_round(position[1] / 16, 5) + y_offset} ^${float_round(-position[2] / 16, 5)} ~ ~`] : [],
      ...same ? [] : [`data modify entity ${ENTITY_SELECTOR({ distance: '..32', type: 'armor_stand', tags: { [TAG_ACTIVE]: true, [this.tag]: true }, single: true })} Pose.Head set value [${float_round(-rotation[0], 5)}f,${float_round(rotation[1], 5)}f,${float_round(-rotation[2], 5)}f]`]
    ])
    return
  }

  bioblockmodel: BioBlockModel;
  model: JavaModel;
  origin: vec3;
  rotation: vec3;
  custom_model_data: number;
  tag: string;
  part_id: string;
  last_rotation: vec3 | undefined = undefined
  constructor(bioblockmodel: BioBlockModel, model: JavaModel, origin: vec3, rotation: vec3, part_id: string, custom_model_data: number) {
    this.bioblockmodel = bioblockmodel
    this.part_id = part_id
    this.model = model
    this.origin = origin
    this.rotation = rotation
    this.custom_model_data = custom_model_data
    this.tag = TAG_ENTITYPART(this.bioblockmodel.model.name, this.part_id)
  }

  exportSummon(func: Function): void {
    func.addCommand(
      `summon armor_stand ~ ~ ~ {Tags:[${TAG_TEMP},${this.tag},${TAG_ALL}],Small:1b,Marker:1b,Invisible:1b,NoBasePlate:1b,ArmorItems:[{},{},{},{id:"${this.bioblockmodel.bioblock.model_item}",Count:1b,tag:{CustomModelData:${this.custom_model_data}}}]}`
    )
  }

  resetRotationCache() {
    this.last_rotation = undefined
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
  frames_folder: FunctionFolder;
  start_frame: number | undefined;
  id: number;
  effect_animator: BioBlock_effect_animator;
  animation_folder: FunctionFolder;
  api_function: Function | undefined;
  main_function: Function;

  constructor(bioblockmodel: BioBlockModel, animation: BBmodel_animation, animation_id: number, animations_folder: FunctionFolder, export_api: boolean = true) {
    this.bioblockmodel = bioblockmodel
    this.animation = animation
    this.effect_animator = new BioBlock_effect_animator(bioblockmodel, animation.effect_animator)

    this.api_function = export_api ? this.bioblockmodel.api_folder.function(`animation-${this.animation.name}`) : undefined
    this.animation_folder = animations_folder.child(this.animation.name)
    this.main_function = this.animation_folder.function('')
    this.frames_folder = this.animation_folder.child('frames')

    this.id = animation_id
  }

  writeAllFrameFunctions(tickCounter: Counter): void {
    this.bioblockmodel.outliner.forEach(outliner => outliner.resetRotationCache())
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

    if (this.api_function) {
      this.writeApiFunction()
    }
  }

  writeMainFunction(first_tick: number): void {
    const main_function: string[] = [
      `scoreboard players set @s ${SCORE_FRAME} ${first_tick}`,
      `schedule function ${this.frames_folder.function(first_tick.toString()).mcPath} 1 replace`
    ]
    this.main_function.addCommands(main_function)
  }

  writeApiFunction(): void {
    const commands = [
      `execute unless entity ${ENTITY_SELECTOR({ tags: { [this.bioblockmodel.tag]: true, [TAG_SLEEP]: false }, scores: {}, as_executer: true })} run tellraw @a {"color":"red","text":"Error from CommandEntity\\nfunction ${this.api_function?.mcPath} must be called as ${ENTITY_SELECTOR({ tags: { [this.bioblockmodel.tag]: true, [TAG_SLEEP]: false }, as_executer: true })}"}`,
      `execute if entity ${ENTITY_SELECTOR({ tags: { [this.bioblockmodel.tag]: true, [TAG_SLEEP]: false }, scores: {}, as_executer: true })} run scoreboard players set @s ${SCORE_NEXT} ${this.id}`
    ]
    this.api_function?.addCommands(commands)
  }

  preFrameFunction(tick: number): Function {
    return this.frames_folder.function(tick.toString() + '_')
  }

  frameFunction(tick: number): Function {
    return this.frames_folder.function(tick.toString())
  }

  writePreFrameFunction(tick: number, total_tick: number): void {
    const commands = [
      `execute unless entity @e[limit=1] run schedule function ${this.preFrameFunction(tick).mcPath} 1 replace`,
      `execute as ${ENTITY_SELECTOR({ tags: { [this.bioblockmodel.tag]: true, [TAG_SLEEP]: false }, scores: { [SCORE_FRAME]: total_tick.toString() } })} at @s rotated ~ 0 run function ${this.frameFunction(tick).mcPath}`
    ]
    this.preFrameFunction(tick).addCommands(commands)
  }

  writeFrameFunction(tick: number, total_tick: number, isLast: boolean, first_frame: number): void {
    // tpは3チックに一回でも滑らかに見えるのでtp出力するかの別
    const export_tp = tick % 3 == 0 || isLast
    const func = this.frameFunction(tick)

    func.addCommands([
      `scoreboard players operation _ ${SCORE_ID} = @s ${SCORE_ID}`,
      
      `data modify storage ${STORAGE_CORE} ids append value 0`,
      `execute store result storage ${STORAGE_CORE} ids[-1] int 1 run scoreboard players get @s ${SCORE_ID}`,

      `scoreboard players operation ${ENTITY_SELECTOR({ type: ENTITY_TYPES, tags: { [TAG_ALL]: true } })} ${SCORE_ID} -= _ ${SCORE_ID}`,
      `scoreboard players set @s ${SCORE_ID} 0`,
      `tag ${ENTITY_SELECTOR({ distance: '..32', type: ENTITY_TYPES, tags: { [TAG_ALL]: true }, scores: { [SCORE_ID]: '0' } })} add ${TAG_ACTIVE}`,
      `tag ${ENTITY_SELECTOR({ distance: '..32', type: ENTITY_TYPES, tags: { [TAG_ACTIVE]: true } })} remove ${TAG_GC}`,
    ])
    
    this.bioblockmodel.outliner.forEach(outliner => outliner.exportTpCommands(tick, UNIT_MATRIX, export_tp, func))
    
    func.addCommands([
      // TODO: effectAnimatorのoutline組み込み
      ...this.effect_animator.exportCommands(tick),
      '',
      `tag ${ENTITY_SELECTOR({ distance: '..32', type: ENTITY_TYPES, tags: { [TAG_ACTIVE]: true } })} remove ${TAG_ACTIVE}`,
      `execute store result score _ ${SCORE_ID} run data get storage ${STORAGE_CORE} ids[-1]`,
      `data remove storage ${STORAGE_CORE} ids[-1]`,
      `scoreboard players operation ${ENTITY_SELECTOR({ type: ENTITY_TYPES, tags: { [TAG_ALL]: true } })} ${SCORE_ID} += _ ${SCORE_ID}`,
      `scoreboard players operation @s ${SCORE_ID} = _ ${SCORE_ID}`
    ])
    if (isLast) {
      // 最後のtick
      switch (this.animation.loop) {
        case 'once':
          // 1tick後に__snooze__状態になる
          func.addCommands([
            `execute unless score @s ${SCORE_NEXT} matches 1..${this.bioblockmodel.animations.length} run scoreboard players set @s ${SCORE_FRAME} 0`,
            `execute unless score @s ${SCORE_NEXT} matches 1..${this.bioblockmodel.animations.length} run schedule function ${this.bioblockmodel.snooze.preFrameFunction(0).mcPath} 1`
          ])
          break;
        case 'hold':
          // 1tick後にこのファンクションを呼び出す
          func.addCommands([
            `execute unless score @s ${SCORE_NEXT} matches 1..${this.bioblockmodel.animations.length} run schedule function ${this.preFrameFunction(tick).mcPath} 1`
          ])
          break;
        case 'loop':
          // 1tick後にこのアニメーションの最初に戻る
          func.addCommands([
            `execute unless score @s ${SCORE_NEXT} matches 1..${this.bioblockmodel.animations.length} run scoreboard players set @s ${SCORE_FRAME} ${first_frame}`,
            `execute unless score @s ${SCORE_NEXT} matches 1..${this.bioblockmodel.animations.length} run schedule function ${this.preFrameFunction(0).mcPath} 1t`
          ])
          break;
        default:
          break;
      }
      func.addCommands(this.bioblockmodel.select_function.call())

    } else {
      // 最後でないtick
      func.addCommands([
        `scoreboard players set @s ${SCORE_FRAME} ${total_tick + 1}`,
        `schedule function ${this.preFrameFunction(tick + 1).mcPath} 1t replace`
      ])
    }
  }
}

class BioBlock_effect_animator {
  timeline: Timeline;
  exportCommands(tick: number): string[] {
    return this.timeline.eval(tick)
  }
  bioblockmodel: BioBlockModel;
  constructor(bioblockmodel: BioBlockModel, animator: BBmodel_effect_animator) {
    this.bioblockmodel = bioblockmodel
    this.timeline = new Timeline()
    animator.keyframes.forEach(keyframe => {
      if (isBBmodel_timeline_keyframe(keyframe)) {
        const script = keyframe.data_points[0].script
        script.split('\n+').forEach(command => {
          const [cmd, options] = this.decode_script(command)
          this.timeline.addScript(keyframe.time, cmd, options)
        });
      } else if (isBBmodel_sound_keyframe(keyframe)) {
        const sound_id = this.bioblockmodel.bioblock.sounds[extractFileName(keyframe.data_points[0].file)].id
        this.timeline.addScript(keyframe.time, `playsound ${SOUND_FILE(sound_id.toString())} hostile @a ~ ~ ~`, {})
      }
    })
  }
  decode_script = (script: string): [string, ScriptOptions] => {
    const matches = script.match(/^\s*\[((?:\s*\d+\s*\.\.\s*\d*\s*)?)((?:\s*@[a-zA-Z0-9_-]+\s*)?)\]\s*(.*)\s*/)
    const option: ScriptOptions = {}
    if (matches) {
      script = matches[3]
      const time = matches[1]
      if (time) {
        const segments = time.match(/\s*(\d+)\s*\.\.\s*(\d*)\s*/) as RegExpMatchArray
        option.time = {
          start: parseInt(segments[1]),
          end: segments[2] ? parseInt(segments[2]) : undefined
        }
      }
      const position = matches[2]
      if (position) {
        const segments = position.match(/\s*@([a-zA-Z0-9_-]+)\s*/) as RegExpMatchArray
        const name = segments[1]
        const outliners = this.bioblockmodel.outliner.flatMap(outline => outline.findOutliner(name))

        option.positions = outliners.map(outliner => {
          return () => {
            const [x, y, z] = getTranspose(outliner.matrix)
            const [yaw, pitch] = getRotation(outliner.matrix)
            console.log(yaw, pitch);
            return `execute positioned ^${- float_round(x / 16, 5)} ^${float_round(y / 16, 5)} ^${float_round(z / 16, 5)}` +
              ` rotated ~${-float_round(90 - yaw, 5)} ~${float_round(pitch, 5)} run `
          }
        })
      }
    }
    return [script, option]
  }
}