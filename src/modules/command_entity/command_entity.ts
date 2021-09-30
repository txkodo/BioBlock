import { ModelConvertError } from "../error";
import { BBmodel } from "../model/bbmodel";
import { Texture } from "../model/texture";
import { Counter } from "../util/counter";
import { Path } from "../util/folder";
import { CommandEntityAnimation, CommandEntityItemModel, CommandEntityOutliner } from "./animation";
import { ARMORSTAND_SELECTOR, NAMESPACE, SCORE_FRAME, SCORE_ID, TAG_ALL, TAG_ENTITY, TAG_TEMP } from "./consts";
import { model_override } from "./resourcepack";

export class CommandEntityPack {
  bbmodels: BBmodel[];
  resourcepack: Path;
  datapack: Path;
  commandEntities: CommandEntity[];
  model_item_namespace: string;
  model_item_name: string;

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
    this.commandEntities = bbmodels.map(bbmodel => new CommandEntity(this, bbmodel, customModelDataCounter))
  }

  export(): [Path, Path] {
    const datapack = new Path()
    const resourcepack = new Path()
    const model_overrides = this.commandEntities.flatMap(entity => entity.export(
      datapack.child('data', NAMESPACE, 'functions'),
      resourcepack.child('assets',NAMESPACE,'models', NAMESPACE),
      resourcepack.child('assets',NAMESPACE,'textures', NAMESPACE),
      ))

    this.write_itemmodel(model_overrides,resourcepack.child('assets',this.model_item_namespace,'models','item',this.model_item_name + '.json'))

    this.write_datapack_mcmeta(datapack)
    this.write_resourcepack_mcmeta(resourcepack)
    return [datapack, resourcepack]
  }

  get model_item():string{
    return `${this.model_item_namespace}:${this.model_item_name}`
  }

  write_datapack_mcmeta(datapack:Path){
    const content = {
      pack: {
        pack_format: 7,
        description: 'datapack for "Command Entity" by @txkodo'
      }
    }
    datapack.child('pack.mcmeta').write_json(content,true)
  }

  write_resourcepack_mcmeta(resourcepack:Path){
    const content = {
      pack: {
        pack_format: 7,
        description: 'resourcepack for "Command Entity" by @txkodo'
      }
    }
    resourcepack.child('pack.mcmeta').write_json(content,true)
  }

  write_itemmodel(model_overrides: model_override[], models_items_item_path: Path) {
    const item_model = {
      parent: "item/generated",
      textures: {
        layer0: "items/bone"
      },
      overrides:model_overrides
    }
    models_items_item_path.write_text(JSON.stringify(item_model),true)
  }
}

export class CommandEntity {
  pack: CommandEntityPack;
  bbmodel: BBmodel;
  itemModels: CommandEntityItemModel[];
  commandEntityAnimations: CommandEntityAnimation[];
  tag: string;

  constructor(pack: CommandEntityPack, bbmodel: BBmodel, customModelDataCounter: Counter) {
    this.pack = pack
    this.bbmodel = bbmodel
    this.tag = TAG_ENTITY(bbmodel.name)
    this.itemModels = bbmodel.elements.map((element, i) => {
      return new CommandEntityItemModel(this, element, bbmodel.name, i.toString(), customModelDataCounter.next())
    })
    this.commandEntityAnimations = bbmodel.animations.map(animation => {
      return new CommandEntityAnimation(this, animation, bbmodel.outliner, this.itemModels)
    })
  }

  writeSummonCommands(core_folder: Path): void {
    let summon_commands = [
      `summon armor_stand ~ ~ ~ {Tags:[${TAG_TEMP},${this.tag},${TAG_ALL}],Marker:1b,Invisible:1b,NoBasePlate:1b}`,
      `scoreboard players set ${ARMORSTAND_SELECTOR([TAG_TEMP], {}, true)} ${SCORE_FRAME} 0`,
      ...this.itemModels.map(element => element.exportSummonCommand()),
      `scoreboard players set ${ARMORSTAND_SELECTOR([TAG_TEMP])} ${SCORE_ID} 0`,
      `tag ${ARMORSTAND_SELECTOR([TAG_TEMP])} remove ${TAG_TEMP}`
    ]
    core_folder.child('summon.mcfunction').write_text(summon_commands.join('\n'), true)
  }

  export(fucntions_folder: Path, model_folder: Path, texture_folder: Path): model_override[] {
    //// Datapack
    const core_folder = fucntions_folder.child(this.bbmodel.name, 'core')
    // summon
    this.writeSummonCommands(core_folder)
    //animate
    const tickCounter = new Counter()
    this.commandEntityAnimations.map(animation => animation.writeAllFrameFunctions(tickCounter, core_folder.child('animations')))

    //// Resourcepack
    const model_overrides: model_override[] = this.itemModels.map(itemmodel => itemmodel.writeModel(model_folder.child(this.bbmodel.name),texture_folder.child(this.bbmodel.name)))

    return model_overrides
  }
}
