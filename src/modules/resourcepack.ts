import { directoryHierarchy } from "./file"

export type recursive<T> = {
  [index:string]:T|recursive<T>
}

type resource = {
  'pack.mcmeta':string
  assets:{
    [namespace:string]:{
      textures?:recursive<Blob>
      models?:recursive<string>
      blockstates?:recursive<string>
    }
  }
}

export interface resourcepack extends directoryHierarchy,resource{}
