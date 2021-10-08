// import { ModelConvertError } from "./error";
// import { BBAnimation } from "../model/animation";
// import { BBmodel } from "../model/bbmodel";
// import { Texture } from "../model/texture";
// import { Counter } from "../util/counter";
// import { mcPath } from "../util/datapack";
// import { Path } from "../util/folder";
// import { CEAnimation, CEItemModel, CEAnimatedOutliner } from "./animation";
// import { ARMORSTAND_SELECTOR, NAMESPACE, SCORE_FRAME, SCORE_ID, SCORE_ID_GLOBAL, SCORE_NEXT, TAG_ACTIVE, TAG_ALL, TAG_ENTITY, TAG_GC, TAG_SLEEP, TAG_TEMP } from "./consts";
// import { model_override } from "./resourcepack";

// export class CEPack {
//   bbmodels: BBmodel[];
//   resourcepack: Path;
//   datapack: Path;
//   commandEntities: CE[];
//   model_item_namespace: string;
//   model_item_name: string;
//   funcstions_folder: Path;
//   models_folder: Path;
//   textures_folder: Path;

//   constructor(bbmodels: BBmodel[], model_item: string, custom_model_data_start:number = 0) {

//     this.bbmodels = bbmodels
//     this.resourcepack = new Path()
//     this.datapack = new Path()

//     if (! model_item.match(/[a-z_-]+(:[a-z_-]+)?/)){
//       throw new ModelConvertError('item name is invalid. use {namespace}:{item} or {item} like "minecraft:bone"')
//     }

//     const splitted = model_item.split(':')
//     this.model_item_namespace = splitted[1]?splitted[0]:'minecraft'
//     this.model_item_name = splitted[splitted.length-1]

//     const customModelDataCounter = new Counter(custom_model_data_start)
//     this.funcstions_folder = this.datapack.child('data', NAMESPACE, 'functions')
//     this.models_folder = this.resourcepack.child('assets',NAMESPACE,'models', NAMESPACE)
//     this.textures_folder = this.resourcepack.child('assets',NAMESPACE,'textures', NAMESPACE)

//     this.commandEntities = bbmodels.map(bbmodel => 
//       new CE(this, bbmodel, this.funcstions_folder, this.models_folder,this.textures_folder,customModelDataCounter))
//   }

//   export(): [Path, Path] {
//     const model_overrides = this.commandEntities.flatMap(entity => entity.export())

//     this.write_init_function()

//     this.write_itemmodel(model_overrides)

//     this.write_datapack_mcmeta()
//     this.write_resourcepack_mcmeta()
//     return [this.datapack, this.resourcepack]
//   }

//   get model_item():string{
//     return `${this.model_item_namespace}:${this.model_item_name}`
//   }

//   write_datapack_mcmeta(){
//     const content = {
//       pack: {
//         pack_format: 7,
//         description: 'datapack for "Command Entity" by @txkodo'
//       }
//     }
//     this.datapack.child('pack.mcmeta').write_json(content,true)
//   }

//   write_resourcepack_mcmeta(){
//     const content = {
//       pack: {
//         pack_format: 7,
//         description: 'resourcepack for "Command Entity" by @txkodo'
//       }
//     }
//     this.resourcepack.child('pack.mcmeta').write_json(content,true)
//   }

//   write_init_function(){
//     const initfunc = [
//       `scoreboard objectives add ${SCORE_FRAME} dummy`,
//       `scoreboard objectives add ${SCORE_ID} dummy`,
//       `scoreboard objectives add ${SCORE_NEXT} dummy`,
//       `scoreboard objectives add ${SCORE_ID} dummy`,
//       `scoreboard players set ${SCORE_ID_GLOBAL} ${SCORE_ID} 0`,
//     ]
//     this.funcstions_folder.child('init.mcfunction').write_text(initfunc.join('\n'),true)
//   }

//   write_itemmodel(model_overrides: model_override[]) {
//     const item_model = {
//       parent: "item/generated",
//       textures: {
//         layer0: "items/bone"
//       },
//       overrides:model_overrides
//     }
//     this.resourcepack.child('assets',this.model_item_namespace,'models','item',this.model_item_name + '.json').write_text(JSON.stringify(item_model),true)
//   }
// }

// export class CE {
//   pack: CEPack;
//   bbmodel: BBmodel;
//   itemModels: CEItemModel[];
//   commandEntityAnimations: CEAnimation[];
//   tag: string;
//   functions_folder: Path;
//   models_folder: Path;
//   textures_folder: Path;
//   core_folder: Path;
//   select_function: any;
//   awake_function: Path;
//   sleep_function: Path;
//   summon_function: Path;
//   snooze: CEAnimation;
//   api_folder: Path;

//   constructor(pack: CEPack, bbmodel: BBmodel, functions:Path,models:Path,textures:Path,customModelDataCounter: Counter) {
//     this.bbmodel = bbmodel

//     this.functions_folder = functions.child(this.bbmodel.name)
//     this.core_folder = this.functions_folder.child('core')
//     this.api_folder  = this.functions_folder.child('api')
    
//     this.models_folder = models.child(this.bbmodel.name)
//     this.textures_folder = textures.child(this.bbmodel.name)


//     this.select_function = this.core_folder.child('__select__.mcfunction')
//     this.sleep_function = this.core_folder.child('__sleep__.mcfunction')
//     this.awake_function = this.core_folder.child('__awake__.mcfunction')
//     this.summon_function = this.core_folder.child('__summon__.mcfunction')

//     this.pack = pack
//     this.tag = TAG_ENTITY(bbmodel.name)
//     this.itemModels = bbmodel.elements.map((element, i) => {
//       return new CEItemModel(this, element, this.models_folder, this.textures_folder, bbmodel.name,i.toString(), customModelDataCounter.next())
//     })
//     this.commandEntityAnimations = bbmodel.animations.map((animation,i) => {
//       return new CEAnimation(this, animation, i + 1, bbmodel.outliner,this.core_folder.child('animations'),this.itemModels)
//     })
    
//     const snooze_animation:BBAnimation = new BBAnimation({
//       name: '__snooze__',
//       loop: 'hold',
//       length: 0.05,
//       animators: []
//     })
//     this.snooze = new CEAnimation(this, snooze_animation, -1, bbmodel.outliner,this.core_folder,this.itemModels)
//   }

//   writeSummonCommands(): void {
//     let summon_commands = [
//       `summon armor_stand ~ ~ ~ {Tags:[${TAG_TEMP},${this.tag},${TAG_ALL}],Marker:1b,Invisible:1b,NoBasePlate:1b}`,
//       `scoreboard players set ${ARMORSTAND_SELECTOR({tags:{[TAG_TEMP]:true},single:true})} ${SCORE_FRAME} 0`,
//       ...this.itemModels.map(element => element.exportSummonCommand()),
//       `scoreboard players operation ${ARMORSTAND_SELECTOR({tags:{[TAG_TEMP]:true}})} ${SCORE_ID} = ${SCORE_ID_GLOBAL} ${SCORE_ID}`,
//       `scoreboard players add ${SCORE_ID_GLOBAL} ${SCORE_ID} 1`,
//       `tag ${ARMORSTAND_SELECTOR({tags:{[TAG_TEMP]:true}})} remove ${TAG_TEMP}`,
//       `schedule function ${mcPath(this.snooze.frames_folder.child('0_'))} 1`
//     ]
//     this.summon_function.write_text(summon_commands.join('\n'), true)
//   }

//   writeAwakeCommands(): void {
//     const commands = [
//       `scoreboard players operation _ ${SCORE_ID} = @s ${SCORE_ID}`,
//       `scoreboard players operation @e[type=armor_stand,tag=${TAG_ALL}] ${SCORE_ID} -= _ ${SCORE_ID}`,
//       `tag ${ARMORSTAND_SELECTOR({tags:{[TAG_ALL]:true},scores:{[SCORE_ID]:'0'}})} add ${TAG_ACTIVE}`,
//       `tag ${ARMORSTAND_SELECTOR({tags:{[TAG_ACTIVE]:true}})} add ${TAG_SLEEP}`,
//       `tag ${ARMORSTAND_SELECTOR({tags:{[TAG_ACTIVE]:true}})} remove ${TAG_GC}`,
//       `tag ${ARMORSTAND_SELECTOR({tags:{[TAG_ACTIVE]:true}})} remove ${TAG_ACTIVE}`,
//       `scoreboard players operation ${ARMORSTAND_SELECTOR({tags:{[TAG_ALL]:true}})} ${SCORE_ID} += _ ${SCORE_ID}`,
//     ]
//     this.sleep_function.write_text(commands.join('\n'), true)
//   }

//   writeSleepCommands(): void {
//     const commands = [
//       `scoreboard players operation _ ${SCORE_ID} = @s ${SCORE_ID}`,
//       `scoreboard players operation @e[type=armor_stand,tag=${TAG_ALL}] ${SCORE_ID} -= _ ${SCORE_ID}`,
//       `tag ${ARMORSTAND_SELECTOR({tags:{[TAG_ALL]:true},scores:{[SCORE_ID]:'0'}})} add ${TAG_ACTIVE}`,
//       `tag ${ARMORSTAND_SELECTOR({tags:{[TAG_ACTIVE]:true}})} remove ${TAG_SLEEP}`,
//       `tag ${ARMORSTAND_SELECTOR({tags:{[TAG_ACTIVE]:true}})} remove ${TAG_GC}`,
//       `tag ${ARMORSTAND_SELECTOR({tags:{[TAG_ACTIVE]:true}})} remove ${TAG_ACTIVE}`,
//       `scoreboard players operation ${ARMORSTAND_SELECTOR({tags:{[TAG_ALL]:true}})} ${SCORE_ID} += _ ${SCORE_ID}`,
//     ]
//     this.awake_function.write_text(commands.join('\n'), true)
//   }

//   writeSelectCommands(): void {
//     const commands = this.commandEntityAnimations.flatMap( animation => [
//       `execute if score @s ${SCORE_NEXT} matches ${animation.id} run scoreboard players set @s ${SCORE_FRAME} ${animation.start_frame}`,
//       `execute if score @s ${SCORE_NEXT} matches ${animation.id} run schedule function ${mcPath(animation.frames_folder.child('0_'))} 1`
//     ])

//     commands.push(`scoreboard players set @s ${SCORE_NEXT} 0`)
//     this.select_function.write_text(commands.join('\n'), true)
//   }

//   export(): model_override[] {
//     //// Datapack
//     const core_folder = this.functions_folder.child('core')
//     // summon
//     this.writeSummonCommands()
//     // awake
//     this.writeAwakeCommands()
//     // sleep
//     this.writeSleepCommands()

//     const tickCounter = new Counter()
//     // snooze
//     this.snooze.writeAllFrameFunctions(tickCounter,false)
//     // animate
//     this.commandEntityAnimations.map(animation => animation.writeAllFrameFunctions(tickCounter))

//     // select
//     this.writeSelectCommands()

//     //// Resourcepack
//     const model_overrides: model_override[] = this.itemModels.map(itemmodel => itemmodel.writeModel())

//     return model_overrides
//   }
// }
