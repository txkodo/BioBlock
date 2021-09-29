export const SCORE_ID    = 'CmdEnt_Id'
export const SCORE_FRAME = 'CmdEnt_Frame'
export const SCORE_NEXT  = 'CmdEnt_Next'

export const TAG_ALL      = 'CmdEnt'
export const TAG_TEMP     = 'CmdEnt_'
export const TAG_ACTIVE   = 'CmdEnt_ACTIVE'
export const TAG_GC       = 'CmdEnt_GC'


export const NAMESPACE    = 'cmdent'

export const TAG_ENTITY   = (entityname:string) => `CmdEnt_${entityname}`
export const TAG_ENTITYPART = (entityname:string,partid:string) => `CmdEnt_${entityname}-${partid}`

export const ARMORSTAND_SELECTOR = (tags:string[] = [],scores:{[score:string]:string} = {},single:boolean=false):string => {
  let str_tag   = tags.map(tag => `,tag=${tag}`).join('')
  
  let str_score = Object.keys(scores).map(key => `${key}=${scores[key]}`).join(',')
  str_score = str_score?`,scores={${str_score}}`:''

  return `@e[${single?'limit=1,':''}type=armor_stand${str_tag}${str_score}]`
}

