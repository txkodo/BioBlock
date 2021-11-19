import { Counter } from "./counter";
import { Path } from "./folder";

export const mcPath = (path: Path): string => `${path.segments[1]}:${path.segments.slice(3).join('/').replace(/\.[a-z_-]+$/, '')}`

export class Datapack {
  path: Path;
  namespaces: DatapackNamespace[];
  constructor() {
    this.path = new Path()
    this.namespaces = []
  }

  namespace(namespace: string) {
    const ns = new DatapackNamespace(this, namespace)
    this.namespaces.push(ns)
    return ns
  }

  export() {
    this.namespaces.forEach(namespace => namespace.export())
  }

  async exportZip(): Promise<Blob> {
    this.export()
    return this.path.exportZip()
  }
}

export class DatapackNamespace {
  private datapack: Datapack;
  path: Path;
  functionFolder: FunctionFolder;
  tagsFolder: TagsFolder;
  constructor(datapack: Datapack, namespace: string) {
    this.datapack = datapack
    this.path = datapack.path.child('data', namespace)
    this.functionFolder = new FunctionFolder(this, this.path.child('functions'))
    this.tagsFolder = new TagsFolder(this, this.path.child('tags'))
  }

  export() {
    this.functionFolder.export()
    this.tagsFolder.export()
  }
}

type subcommand = string[]

export class EachTagsFolder {
  parent: TagsFolder | EachTagsFolder;
  path: Path;
  tags: { [key: string]: Tag };
  children: { [key: string]: EachTagsFolder };
  constructor(parent: TagsFolder | EachTagsFolder, path: Path) {
    this.parent = parent
    this.path = path
    this.tags = {}
    this.children = {}
  }
  export() {
    Object.values(this.children).forEach(child => child.export())
    Object.values(this.tags).forEach(child => child.export())
  }

  child(name: string) {
    if (this.children[name]) {
      return this.children[name]
    }
    const c = new EachTagsFolder(this, this.path.child(name))
    this.children[name] = c
    return c
  }

  tag(name: string, replace?: boolean) {
    name = `${name}.json`
    if (this.tags[name]) {
      return this.tags[name]
    }
    const f = new Tag(this.path.child(name), replace)

    this.tags[name] = f
    return f
  }
}

export class TagsFolder {
  parent: DatapackNamespace;
  func_path: Path;
  functions: EachTagsFolder;
  entity_types: EachTagsFolder;
  constructor(parent: DatapackNamespace, path: Path) {
    this.parent = parent
    this.func_path = path
    this.functions    = new EachTagsFolder(this, path.child('functions'))
    this.entity_types = new EachTagsFolder(this, path.child('entity_types'))
  }

  export():void{
    this.functions.export()
    this.entity_types.export()
  }
}

export class Tag {
  private path: Path;
  private values: string[];
  replace: boolean | undefined;
  constructor(path: Path,replace?:boolean) {
    this.path = path
    this.values = []
    this.replace = replace
  }

  addValue(...value:string[]):void {
    this.values.push(...value)
  }

  export() {
    this.path.write_json({values:this.values,replace:this.replace}, true)
  }
  
  get mcPath() {
    return mcPath(this.path)
  }
}

export class FunctionFolder {
  parent: DatapackNamespace | FunctionFolder;
  func_path: Path;
  functions: { [key: string]: Function };
  children: { [key: string]: FunctionFolder };

  constructor(parent: DatapackNamespace | FunctionFolder, path: Path) {
    this.parent = parent
    this.func_path = path
    this.functions = {}
    this.children = {}
  }

  function(name: string, embeddable?: boolean) {
    name = `${name}.mcfunction`
    if (this.functions[name]) {
      return this.functions[name]
    }
    const f = new Function(this.func_path.child(name), embeddable)

    this.functions[name] = f
    return f
  }

  export() {
    Object.values(this.children).forEach(child => child.export())
    Object.values(this.functions).forEach(child => child.export())
  }

  child(name: string) {
    if (this.children[name]) {
      return this.children[name]
    }
    const c = new FunctionFolder(this, this.func_path.child(name))
    this.children[name] = c
    return c
  }
}

export class Function {
  private path: Path;
  private embeddable: boolean;
  private commands: string[];
  private counter: Counter;
  private children: Function[];
  constructor(path: Path, embeddable?: boolean) {
    this.counter = new Counter()
    this.path = path
    this.embeddable = embeddable ?? false
    this.commands = []
    this.children = []
  }

  export() {
    this.path.write_text(this.commands.join('\n'), true)
    this.children.forEach(func => func.export())
  }

  get mcPath() {
    return mcPath(this.path)
  }

  call(): string[] {
    if (this.commands.length < 2 && this.embeddable) {
      return this.commands
    } else {
      return [`function ${this.mcPath}`]
    }
  }

  addCommand(command: string, subcommands?: subcommand) {
    const joined = subcommands?.join(' ')
    this.commands.push((joined ? `execute ${joined} run ` : '') + command)
  }

  addCommands(commands: string[], subcommands?: subcommand, name?: string) {
    if ((subcommands ?? []).length === 0) {
      this.commands.push(...commands)
    } else {
      const child = this.childFunction(name ?? this.counter.next().toString(), true)
      child.addCommands(commands)
      const call = child.call()
      if (call.length === 1) {
        this.addCommand(call[0], subcommands)
      }
    }
  }

  childFunction(name: string, embeddable?: boolean) {
    const f = new Function(this.path.parent.child(this.path.stem, name + '.mcfunction'), embeddable)
    this.children.push(f)
    return f
  }
}
