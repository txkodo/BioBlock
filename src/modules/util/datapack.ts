import { Directory, DirectoryError, Path } from "./folder";


export const mcPath = (path:Path):string => `${path.segments[1]}:${path.segments.slice(3).join('/').replace(/.mcfunction$/,'')}`
