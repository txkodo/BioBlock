import JSZip from "jszip"

export class DirectoryError extends Error {
  constructor(message?: string | undefined) {
    super(message)
  }
}

export class Directory {
  obj: { [index: string]: string | Blob | Directory }
  constructor() {
    this.obj = {}
  }

  getValue(keys: string[]): string | Blob | Directory {
    if (keys.length == 0) {
      return this
    }
    if (keys.length == 1) {
      return this.obj[keys[0]]
    } else {
      const o = this.obj[keys[0]]
      // 存在しない場合エラー
      if (!o) { throw new DirectoryError('directory not exists.') }
      if (o instanceof Directory) {
        return o.getValue(keys.slice(1))
      } else {
        // ファイルでない場合エラー
        throw new DirectoryError('non directory object has no child.')
      }
    }
  }

  setValue(keys: string[], value: string | Blob | Directory, parent: boolean = false) {
    const o = this.obj[keys[0]]
    if (keys.length == 1) {
      if (o instanceof Directory) {
        if (!(value instanceof Directory)) {
          throw new DirectoryError('you cannnot overwrite directory with file.')
        }
      } else {
        this.obj[keys[0]] = value
      }
    } else {
      // 存在しない場合エラー
      if (o === undefined) {
        if (parent) {
          // 親フォルダを作成
          this.obj[keys[0]] = new Directory();
          (this.obj[keys[0]] as Directory).setValue(keys.slice(1), value, parent)
        } else {
          // エラー
          throw new DirectoryError('directory not exists.')
        }
      } else if (o instanceof Directory) {
        o.setValue(keys.slice(1), value, parent)
      } else {
        // ファイルでない場合エラー
        throw new DirectoryError('non directory object has no child.')
      }
    }
  }

  exportZip(zip?: JSZip) {
    const _zip = zip ?? (new JSZip())

    Object.keys(this.obj).forEach(key => {
      const value = this.obj[key]
      if (value instanceof Directory) {
        const child = _zip.folder(key)
        if (child) {
          value.exportZip(child)
        }
      } else if (typeof value == 'string') {
        _zip.file(key, value)
      } else {
        _zip.file(key, value, { binary: true })
      }
    })
    return _zip
  }
}

export class Path {
  root_path: Path
  root: Directory
  segments: string[]

  constructor(root: Directory | null = null, ...segments: string[]) {
    this.root_path = segments.length == 0 ? this : new Path(root)
    this.root = root ?? new Directory()
    this.segments = segments
  }

  child(...segments: string[]){
    return new Path(this.root,...this.segments.concat(segments))
  }

  get parent(){
    return this.parents(1)
  }

  parents(rank: number){
    if (this.segments.length >= rank) {
      return new Path(this.root,...this.segments.slice(0, -rank))
    } else {
      throw new DirectoryError('root directory has no parent.')
    }
  }

  exists(): boolean {
    return this.root.getValue(this.segments) !== undefined
  }

  makedir(name: string, parent: boolean = false) {
    this.root.setValue(this.segments.concat([name]), new Directory(), parent)
  }

  write_text(text: string, parent: boolean = false) {
    this.root.setValue(this.segments, text, parent)
  }

  write_bytes(blob: Blob, parent: boolean = false) {
    this.root.setValue(this.segments, blob, parent)
  }

  async exportZip():Promise<Blob> {
    const folder = this.root.getValue(this.segments)
    if (folder instanceof Directory) {
      return await folder.exportZip().generateAsync({type:"blob"})
    }
    throw new DirectoryError('cannot create zip from non-directory object.')
  }
}

// // example

// // zip(Blob)を保存するためには file-saver が必要
// import { saveAs } from 'file-saver';

// const example = async () => {
//   const path = new Path()
//   path.child('fizz','buzz.text').write_text('qux',true)

//   saveAs(await path.exportZip(),'fuga')
// }
