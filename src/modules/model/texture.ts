import { base64ToBlob, merge_directoryHierarchy } from "../file"
import { recursive, resourcepack } from "../resourcepack"

interface texture {
  namespace: string
  folder: string
  name: string
  source: string
  id: string
}

export class Texture implements texture {
  namespace: string
  folder: string
  name: string
  source: string
  id: string
  constructor(texture: texture) {
    this.namespace = texture.namespace
    this.folder = texture.folder
    this.id = texture.id
    this.name = texture.name
    this.source = texture.source
  }

  getFile() {
    return base64ToBlob(this.source.substring(this.source.indexOf(',') + 1), 'image/png')
  }

  exportJavaModel(resourcepack: resourcepack) {
    let file: recursive<Blob> = {}
    file[this.name] = this.getFile()

    const segments = this.folder.split('/').reverse()
    for (let segment of segments) {
      let _file = file
      file = {}
      file[segment] = _file
    }
    const pack:any = {assets:{}}
    pack.assets[this.namespace] = { textures : file }
    merge_directoryHierarchy(resourcepack,pack)
  }
}
