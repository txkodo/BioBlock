export const SCORE_ID_GLOBAL = '$GLOBAL'
export const SCORE_ID    = 'BioBlock_Id'
export const SCORE_FRAME = 'BioBlock_Frame'
export const SCORE_NEXT  = 'BioBlock_Next'

export const TAG_ALL      = 'BioBlock'
export const TAG_TEMP     = 'BioBlock_'
export const TAG_ACTIVE   = 'BioBlock_ACTIVE'
export const TAG_GC       = 'BioBlock_GC'
export const TAG_SLEEP    = 'BioBlock_SLEEP'
export const TAG_HITBOX   = 'BioBlock_HITBOX'

export const NAMESPACE    = 'bioblock'

export const ENTITY_TYPES = '#bioblock:core/main'

export const TAG_ENTITY   = (entityname:string) => `BioBlock-${entityname}`
export const TAG_ENTITYPART = (entityname:string,partid:string) => `BioBlock-${entityname}-${partid}`
export const TAG_ENTITYHITBOX = (entityname:string,partname:string) => `BioBlock-${entityname}--${partname}`

export const SOUND_FILE   = (filename:string) => `bioblock:${filename}`

type selector_arguments = {
  type?:string
  tags?:{[i:string]:boolean}
  scores?:{[i:string]:string}
  single?:boolean
  as_executer?:boolean
  distance?:string
}

export const ENTITY_SELECTOR = (arg:selector_arguments):string => {
  const selector:string[] = []

  if(arg.single){
    selector.push('limit=1')
  }

  if(arg.distance){
    selector.push(`distance=${arg.distance}`)
  }

  if (arg.type){
    selector.push(`type=${arg.type}`)
  }
  
  const tags = arg.tags
  if (tags){
    selector.push(Object.keys(tags).map(tag => `tag=${tags[tag]?'':'!'}${tag}`).join(','))
  }

  const scores = arg.scores
  if (scores){
    selector.push('scores={' + Object.keys(scores).map(key => `${key}=${scores[key]}`).join(',') + '}')
  }

  return `${arg.as_executer?'@s':'@e'}[${selector.join(',')}]`
}
