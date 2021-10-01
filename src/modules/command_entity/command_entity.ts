import { ModelConvertError } from "../error";
import { BBmodel } from "../model/bbmodel";
import { Texture } from "../model/texture";
import { Counter } from "../util/counter";
import { Path } from "../util/folder";
import { CommandEntityAnimation, CommandEntityItemModel, CommandEntityOutliner } from "./animation";
import { ARMORSTAND_SELECTOR, NAMESPACE, SCORE_FRAME, SCORE_ID, SCORE_ID_GLOBAL, SCORE_NEXT, TAG_ALL, TAG_ENTITY, TAG_TEMP } from "./consts";
import { model_override } from "./resourcepack";

export class CommandEntityPack {
  bbmodels: BBmodel[];
  resourcepack: Path;
  datapack: Path;
  commandEntities: CommandEntity[];
  model_item_namespace: string;
  model_item_name: string;
  funcstions_folder: Path;
  models_folder: Path;
  textures_folder: Path;
  functions_path: any;

  constructor(bbmodels: BBmodel[], model_item: string) {

    this.bbmodels = bbmodels
    this.resourcepack = new Path()
    this.datapack = new Path()

    if (! model_item.match(/[a-z_-]+(:[a-z_-]+)?/)){
      throw new ModelConvertError('item name is invalid. use {namespace}:{item} or {item} like "minecraft:bone"')
    }

    const splitted = model_item.split(':')
    this.model_item_namespace = splitted[1]?splitted[0]:'minecraft'
    this.model_item_name = splitted[splitted.length-1]

    const customModelDataCounter = new Counter()
    this.funcstions_folder = this.datapack.child('data', NAMESPACE, 'functions')
    this.models_folder = this.resourcepack.child('assets',NAMESPACE,'models', NAMESPACE)
    this.textures_folder = this.resourcepack.child('assets',NAMESPACE,'textures', NAMESPACE)

    this.commandEntities = bbmodels.map(bbmodel => 
      new CommandEntity(this, bbmodel, this.funcstions_folder, this.models_folder,this.textures_folder,customModelDataCounter))
  }

  export(): [Path, Path] {
    const model_overrides = this.commandEntities.flatMap(entity => entity.export())

    this.write_init_function()

    this.write_itemmodel(model_overrides)

    this.write_datapack_mcmeta()
    this.write_resourcepack_mcmeta()
    return [this.datapack, this.resourcepack]
  }

  get model_item():string{
    return `${this.model_item_namespace}:${this.model_item_name}`
  }

  write_datapack_mcmeta(){
    const content = {
      pack: {
        pack_format: 7,
        description: 'datapack for "Command Entity" by @txkodo'
      }
    }
    this.datapack.child('pack.mcmeta').write_json(content,true)
  }

  write_resourcepack_mcmeta(){
    const content = {
      pack: {
        pack_format: 7,
        description: 'resourcepack for "Command Entity" by @txkodo'
      }
    }
    this.resourcepack.child('pack.mcmeta').write_json(content,true)
  }

  write_init_function(){
    const initfunc = [
      `scoreboard objectives add ${SCORE_FRAME} dummy`,
      `scoreboard objectives add ${SCORE_ID} dummy`,
      `scoreboard objectives add ${SCORE_NEXT} dummy`,
      `scoreboard objectives add ${SCORE_ID} dummy`,
      `scoreboard players set ${SCORE_ID_GLOBAL} ${SCORE_ID} 0`,
    ]
    this.functions_path.child('init.mcfunction').write_text(initfunc.join('\n'),true)
  }

  write_itemmodel(model_overrides: model_override[]) {
    const item_model = {
      parent: "item/generated",
      textures: {
        layer0: "items/bone"
      },
      overrides:model_overrides
    }
    this.resourcepack.child('assets',this.model_item_namespace,'models','item',this.model_item_name + '.json').write_text(JSON.stringify(item_model),true)
  }
}

export class CommandEntity {
  pack: CommandEntityPack;
  bbmodel: BBmodel;
  itemModels: CommandEntityItemModel[];
  commandEntityAnimations: CommandEntityAnimation[];
  tag: string;
  functions_folder: Path;
  models_folder: Path;
  textures_folder: Path;
  core_folder: Path;
  select_function: any;
  awake_function: Path;
  sleep_function: Path;
  summon_function: Path;

  constructor(pack: CommandEntityPack, bbmodel: BBmodel, functions:Path,models:Path,textures:Path,customModelDataCounter: Counter) {
    this.bbmodel = bbmodel

    this.functions_folder = functions.child(this.bbmodel.name)
    this.core_folder = this.functions_folder.child('core')
    this.models_folder = models.child(this.bbmodel.name)
    this.textures_folder = textures.child(this.bbmodel.name)

    this.select_function = this.core_folder.child('__select__')
    this.sleep_function = this.core_folder.child('__sleep__')
    this.awake_function = this.core_folder.child('__awake__')
    this.summon_function = this.core_folder.child('__summon__')

    this.pack = pack
    this.tag = TAG_ENTITY(bbmodel.name)
    this.itemModels = bbmodel.elements.map((element, i) => {
      return new CommandEntityItemModel(this, element, this.models_folder, this.textures_folder, bbmodel.name,i.toString(), customModelDataCounter.next())
    })
    this.commandEntityAnimations = bbmodel.animations.map(animation => {
      return new CommandEntityAnimation(this, animation, bbmodel.outliner,this.core_folder.child('animations'),this.itemModels)
    })
  }

  writeSummonCommands(): void {
    let summon_commands = [
      `summon armor_stand ~ ~ ~ {Tags:[${TAG_TEMP},${this.tag},${TAG_ALL}],Marker:1b,Invisible:1b,NoBasePlate:1b}`,
      `scoreboard players set ${ARMORSTAND_SELECTOR([TAG_TEMP], {}, true)} ${SCORE_FRAME} 0`,
      ...this.itemModels.map(element => element.exportSummonCommand()),
      `scoreboard players operation ${ARMORSTAND_SELECTOR([TAG_TEMP])} ${SCORE_ID} = ${SCORE_ID_GLOBAL} ${SCORE_ID}`,
      `scoreboard players add ${SCORE_ID_GLOBAL} ${SCORE_ID} 1`,
      `tag ${ARMORSTAND_SELECTOR([TAG_TEMP])} remove ${TAG_TEMP}`
    ]
    this.summon_function.write_text(summon_commands.join('\n'), true)
  }

  export(): model_override[] {
    //// Datapack
    const core_folder = this.functions_folder.child('core')
    // summon
    this.writeSummonCommands()
    //animate
    const tickCounter = new Counter()
    this.commandEntityAnimations.map(animation => animation.writeAllFrameFunctions(tickCounter))

    //// Resourcepack
    const model_overrides: model_override[] = this.itemModels.map(itemmodel => itemmodel.writeModel())

    return model_overrides
  }
}
