import { BBmodel } from "../model/bbmodel";
import { Counter } from "../util/counter";
import { Path } from "../util/folder";
import { CommandEntityAnimation, CommandEntityItemModel, CommandEntityOutliner } from "./animation";
import { ARMORSTAND_SELECTOR, SCORE_FRAME, SCORE_ID, TAG_ALL, TAG_ENTITY, TAG_TEMP } from "./consts";


export class CommandEntityPack{
  bbmodels:BBmodel[];
  resourcepack: Path;
  datapack: Path;
  commandEntities: CommandEntity[];
  model_item:string

  constructor(bbmodels:BBmodel[],model_item:string){
    this.model_item = model_item
    this.bbmodels = bbmodels
    this.resourcepack = new Path()
    this.datapack     = new Path()
    const customModelDataCounter = new Counter()
    this.commandEntities = bbmodels.map( bbmodel => new CommandEntity(this,bbmodel,customModelDataCounter))
  }

  export():[Path,Path]{
    const datapack = new Path()
    const resourcepack = new Path()
    this.commandEntities.forEach(entity=>entity.export(datapack.child('data','command_entity','functions'),resourcepack))
    return [datapack,resourcepack]
  }
}

export class CommandEntity{
  pack: CommandEntityPack;
  bbmodel: BBmodel;
  itemModels: CommandEntityItemModel[];
  commandEntityAnimations: CommandEntityAnimation[];
  tag: string;

  constructor(pack:CommandEntityPack,bbmodel:BBmodel, customModelDataCounter:Counter){
    this.pack = pack
    this.bbmodel    = bbmodel
    this.tag = TAG_ENTITY(bbmodel.name)
    this.itemModels = bbmodel.elements.map( (element,i) => {
      return new CommandEntityItemModel(this,element,bbmodel.name,i.toString(),customModelDataCounter.next())
    })
    this.commandEntityAnimations = bbmodel.animations.map( animation => {
      return new CommandEntityAnimation(this,animation,bbmodel.outliner,this.itemModels)
    })
  }

  writeSummonCommands(core_folder:Path):void{
    let summon_commands = [
      `summon armor_stand ~ ~ ~ {Tags:[${TAG_TEMP},${this.tag},${TAG_ALL}],Marker:1b,Invisible:1b,NoBasePlate:1b}`,
      `scoreboard players set ${ARMORSTAND_SELECTOR([TAG_TEMP],{},true)} ${SCORE_FRAME} 0`,
      ...this.itemModels.map(element => element.exportSummonCommand()),
      `scoreboard players set ${ARMORSTAND_SELECTOR([TAG_TEMP])} ${SCORE_ID} 0`,
      `tag ${ARMORSTAND_SELECTOR([TAG_TEMP])} remove ${TAG_TEMP}`
    ]
    core_folder.child('summon.mcfunction').write_text(summon_commands.join('\n'),true)
  }

  export(fucntions_folder:Path,resourcepack:Path){
    //// Datapack
    const core_folder = fucntions_folder.child(this.bbmodel.name,'core')
    // summon
    this.writeSummonCommands(core_folder)
    //animate
    const tickCounter = new Counter()
    this.commandEntityAnimations.map(animation => animation.writeAllFrameFunctions(tickCounter,core_folder.child('animations')) )

    //// Resourcepack
  }
}
