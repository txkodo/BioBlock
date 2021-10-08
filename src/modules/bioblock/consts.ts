export const SCORE_ID_GLOBAL = '$GLOBAL'
export const SCORE_ID    = 'CmdEnt_Id'
export const SCORE_FRAME = 'CmdEnt_Frame'
export const SCORE_NEXT  = 'CmdEnt_Next'

export const TAG_ALL      = 'CmdEnt'
export const TAG_TEMP     = 'CmdEnt_'
export const TAG_ACTIVE   = 'CmdEnt_ACTIVE'
export const TAG_GC       = 'CmdEnt_GC'
export const TAG_SLEEP    = 'CmdEnt_SLEEP'

export const NAMESPACE    = 'cmdent'

export const TAG_ENTITY   = (entityname:string) => `CmdEnt-${entityname}`
export const TAG_ENTITYPART = (entityname:string,partid:string) => `CmdEnt-${entityname}-${partid}`

export const ANIMATION_FUNCTION = (animation_name:string) => `animation-${animation_name}.mcfunction`

type selector_arguments = {
  tags?:{[i:string]:boolean}
  scores?:{[i:string]:string}
  single?:boolean
  as_executer?:boolean
}

export const ARMORSTAND_SELECTOR = (arg:selector_arguments):string => {
  const tags = arg.tags
  const str_tag = tags?Object.keys(tags).map(tag => `,tag=${tags[tag]?'':'!'}${tag}`).join(''):''

  const scores = arg.scores
  let str_score = scores?Object.keys(scores).map(key => `${key}=${scores[key]}`).join(','):''
  str_score = str_score?`,scores={${str_score}}`:''

  return `${arg.as_executer?'@s':'@e'}[${arg.single?'limit=1,':''}type=armor_stand${str_tag}${str_score}]`
}
